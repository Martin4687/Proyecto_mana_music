from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, Q
from .models import (
    Rol, Persona, Usuario, Producto, Venta, DetalleVenta,
    Inventario, Compra, DetalleCompra, OrdenReabastecimiento,
    Proveedor, HistorialInventario, ProductoProveedor,
    SegmentoKmeans, ClasificacionAbc
)
from .serializers import (
    RolSerializer, PersonaSerializer, UsuarioSerializer,
    ProductoSerializer, VentaSerializer, DetalleVentaSerializer,
    InventarioSerializer, CompraSerializer, DetalleCompraSerializer,
    OrdenReabastecimientoSerializer, ProveedorSerializer,
    HistorialInventarioSerializer, ProductoProveedorSerializer,
    SegmentoKmeansSerializer, ClasificacionAbcSerializer
)


class RolViewSet(viewsets.ModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    

class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.select_related('id_rol').all()
    serializer_class = PersonaSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombres', 'apellido_paterno', 'apellido_materno', 'ci']
    ordering_fields = ['apellido_paterno', 'nombres', 'ci']


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.select_related('id_persona', 'id_persona__id_rol').all()
    serializer_class = UsuarioSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['email', 'id_persona__nombres', 'id_persona__apellido_paterno']
    
    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Obtener solo usuarios activos"""
        usuarios = self.queryset.filter(activo=True)
        serializer = self.get_serializer(usuarios, many=True)
        return Response(serializer.data)


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion', 'categoria']
    ordering_fields = ['nombre', 'precio_unitario', 'fecha_registro']
    
    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Obtener solo productos activos"""
        productos = self.queryset.filter(activo=True)
        serializer = self.get_serializer(productos, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def por_categoria(self, request):
        """Obtener productos agrupados por categoría"""
        categoria = request.query_params.get('categoria', None)
        if categoria:
            productos = self.queryset.filter(categoria=categoria, activo=True)
            serializer = self.get_serializer(productos, many=True)
            return Response(serializer.data)
        
        # Retornar todas las categorías
        categorias = self.queryset.values('categoria').annotate(
            total=Count('id_producto')
        )
        return Response(categorias)
    
    @action(detail=False, methods=['get'])
    def mas_vendidos(self, request):
        """Obtener los productos más vendidos"""
        productos_vendidos = DetalleVenta.objects.values(
            'id_producto', 'id_producto__nombre'
        ).annotate(
            total_vendido=Sum('cantidad'),
            ingresos_totales=Sum('subtotal')
        ).order_by('-total_vendido')[:10]
        
        return Response(productos_vendidos)


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'contacto', 'email', 'telefono']
    
    @action(detail=True, methods=['get'])
    def productos(self, request, pk=None):
        """Obtener productos de un proveedor"""
        proveedor = self.get_object()
        relaciones = ProductoProveedor.objects.filter(
            id_proveedor=proveedor, activo=True
        )
        serializer = ProductoProveedorSerializer(relaciones, many=True)
        return Response(serializer.data)


class ProductoProveedorViewSet(viewsets.ModelViewSet):
    queryset = ProductoProveedor.objects.select_related(
        'id_producto', 'id_proveedor'
    ).all()
    serializer_class = ProductoProveedorSerializer
    
    @action(detail=False, methods=['get'])
    def principales(self, request):
        """Obtener solo proveedores principales"""
        relaciones = self.queryset.filter(
            es_proveedor_principal=True, activo=True
        )
        serializer = self.get_serializer(relaciones, many=True)
        return Response(serializer.data)


class InventarioViewSet(viewsets.ModelViewSet):
    queryset = Inventario.objects.select_related('id_producto').all()
    serializer_class = InventarioSerializer
    
    @action(detail=False, methods=['get'])
    def stock_bajo(self, request):
        """Productos con stock por debajo del mínimo"""
        inventarios = self.queryset.filter(
            stock_actual__lte=models.F('stock_minimo')
        )
        serializer = self.get_serializer(inventarios, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stock_critico(self, request):
        """Productos con stock crítico"""
        inventarios = self.queryset.filter(estado_inventario='CRITICO')
        serializer = self.get_serializer(inventarios, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def necesitan_reorden(self, request):
        """Productos que necesitan reabastecimiento"""
        inventarios = self.queryset.filter(
            stock_actual__lte=models.F('punto_reorden')
        )
        serializer = self.get_serializer(inventarios, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Resumen del estado del inventario"""
        total_productos = self.queryset.count()
        stock_normal = self.queryset.filter(estado_inventario='NORMAL').count()
        stock_bajo = self.queryset.filter(estado_inventario='BAJO').count()
        stock_critico = self.queryset.filter(estado_inventario='CRITICO').count()
        stock_sobre = self.queryset.filter(estado_inventario='SOBRESTOCK').count()
        
        valor_total = self.queryset.aggregate(
            valor=Sum(models.F('stock_actual') * models.F('id_producto__precio_unitario'))
        )['valor'] or 0
        
        return Response({
            'total_productos': total_productos,
            'normal': stock_normal,
            'bajo': stock_bajo,
            'critico': stock_critico,
            'sobrestock': stock_sobre,
            'valor_total_inventario': float(valor_total)
        })


class VentaViewSet(viewsets.ModelViewSet):
    queryset = Venta.objects.select_related('id_producto').all()
    serializer_class = VentaSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['fecha_venta', 'total']
    ordering = ['-fecha_venta']
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Estadísticas de ventas"""
        total_ventas = self.queryset.aggregate(total=Sum('total'))['total'] or 0
        promedio_venta = self.queryset.aggregate(promedio=Avg('total'))['promedio'] or 0
        total_transacciones = self.queryset.count()
        
        return Response({
            'total_ventas': float(total_ventas),
            'promedio_venta': float(promedio_venta),
            'total_transacciones': total_transacciones
        })
    
    @action(detail=False, methods=['get'])
    def por_fecha(self, request):
        """Ventas filtradas por rango de fechas"""
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        
        ventas = self.queryset
        if fecha_inicio:
            ventas = ventas.filter(fecha_venta__gte=fecha_inicio)
        if fecha_fin:
            ventas = ventas.filter(fecha_venta__lte=fecha_fin)
        
        serializer = self.get_serializer(ventas, many=True)
        return Response(serializer.data)


class DetalleVentaViewSet(viewsets.ModelViewSet):
    queryset = DetalleVenta.objects.select_related(
        'id_venta', 'id_producto'
    ).all()
    serializer_class = DetalleVentaSerializer


class CompraViewSet(viewsets.ModelViewSet):
    queryset = Compra.objects.select_related(
        'id_proveedor', 'id_producto'
    ).all()
    serializer_class = CompraSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['fecha_compra', 'total']
    ordering = ['-fecha_compra']
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Estadísticas de compras"""
        total_compras = self.queryset.aggregate(total=Sum('total'))['total'] or 0
        promedio_compra = self.queryset.aggregate(promedio=Avg('total'))['promedio'] or 0
        total_transacciones = self.queryset.count()
        
        return Response({
            'total_compras': float(total_compras),
            'promedio_compra': float(promedio_compra),
            'total_transacciones': total_transacciones
        })
    
    @action(detail=False, methods=['get'])
    def por_proveedor(self, request):
        """Compras agrupadas por proveedor"""
        compras_proveedor = self.queryset.values(
            'id_proveedor', 'id_proveedor__nombre'
        ).annotate(
            total_compras=Sum('total'),
            cantidad_compras=Count('id_compra')
        ).order_by('-total_compras')
        
        return Response(compras_proveedor)


class DetalleCompraViewSet(viewsets.ModelViewSet):
    queryset = DetalleCompra.objects.select_related(
        'id_compra', 'id_producto'
    ).all()
    serializer_class = DetalleCompraSerializer


class OrdenReabastecimientoViewSet(viewsets.ModelViewSet):
    queryset = OrdenReabastecimiento.objects.select_related(
        'id_producto', 'id_usuario', 'id_compra'
    ).all()
    serializer_class = OrdenReabastecimientoSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['fecha_sugerencia', 'prioridad', 'estado']
    ordering = ['-fecha_sugerencia']
    
    @action(detail=False, methods=['get'])
    def pendientes(self, request):
        """Órdenes pendientes de aprobación"""
        ordenes = self.queryset.filter(estado='PENDIENTE')
        serializer = self.get_serializer(ordenes, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def urgentes(self, request):
        """Órdenes urgentes"""
        ordenes = self.queryset.filter(
            prioridad='URGENTE',
            estado__in=['PENDIENTE', 'APROBADA']
        )
        serializer = self.get_serializer(ordenes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprobar una orden de reabastecimiento"""
        orden = self.get_object()
        from django.utils import timezone
        
        orden.estado = 'APROBADA'
        orden.fecha_aprobacion = timezone.now()
        orden.save()
        
        serializer = self.get_serializer(orden)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Rechazar una orden de reabastecimiento"""
        orden = self.get_object()
        
        orden.estado = 'RECHAZADA'
        orden.save()
        
        serializer = self.get_serializer(orden)
        return Response(serializer.data)


class HistorialInventarioViewSet(viewsets.ModelViewSet):
    queryset = HistorialInventario.objects.select_related(
        'id_producto', 'id_usuario'
    ).all()
    serializer_class = HistorialInventarioSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['fecha_registro']
    ordering = ['-fecha_registro']
    
    @action(detail=False, methods=['get'])
    def por_producto(self, request):
        """Historial de un producto específico"""
        producto_id = request.query_params.get('producto_id')
        if producto_id:
            historial = self.queryset.filter(id_producto=producto_id)
            serializer = self.get_serializer(historial, many=True)
            return Response(serializer.data)
        return Response({'error': 'producto_id requerido'}, status=400)


class SegmentoKmeansViewSet(viewsets.ModelViewSet):
    queryset = SegmentoKmeans.objects.select_related('id_producto').all()
    serializer_class = SegmentoKmeansSerializer
    
    @action(detail=False, methods=['get'])
    def por_cluster(self, request):
        """Productos agrupados por cluster"""
        cluster = request.query_params.get('cluster')
        if cluster:
            segmentos = self.queryset.filter(cluster_label=cluster)
            serializer = self.get_serializer(segmentos, many=True)
            return Response(serializer.data)
        
        # Retornar resumen de clusters
        clusters = self.queryset.values('cluster_label').annotate(
            total=Count('id_segmento')
        ).order_by('cluster_label')
        return Response(clusters)


class ClasificacionAbcViewSet(viewsets.ModelViewSet):
    queryset = ClasificacionAbc.objects.select_related('id_producto').all()
    serializer_class = ClasificacionAbcSerializer
    
    @action(detail=False, methods=['get'])
    def por_categoria(self, request):
        """Productos por categoría ABC"""
        categoria = request.query_params.get('categoria', 'A')
        clasificaciones = self.queryset.filter(categoria_abc=categoria)
        serializer = self.get_serializer(clasificaciones, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Resumen de clasificación ABC"""
        total_a = self.queryset.filter(categoria_abc='A').count()
        total_b = self.queryset.filter(categoria_abc='B').count()
        total_c = self.queryset.filter(categoria_abc='C').count()
        
        ventas_a = self.queryset.filter(categoria_abc='A').aggregate(
            total=Sum('ventas_acumuladas')
        )['total'] or 0
        ventas_b = self.queryset.filter(categoria_abc='B').aggregate(
            total=Sum('ventas_acumuladas')
        )['total'] or 0
        ventas_c = self.queryset.filter(categoria_abc='C').aggregate(
            total=Sum('ventas_acumuladas')
        )['total'] or 0
        
        return Response({
            'categoria_A': {
                'productos': total_a,
                'ventas': float(ventas_a)
            },
            'categoria_B': {
                'productos': total_b,
                'ventas': float(ventas_b)
            },
            'categoria_C': {
                'productos': total_c,
                'ventas': float(ventas_c)
            }
        })


# Importar models para las anotaciones
from django.db import models