from rest_framework import viewsets, filters, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.db.models import Sum, Count, Avg, Q, F, ProtectedError
from datetime import datetime, timedelta
from decimal import Decimal
from .models import (
    Rol, Persona, Usuario, Producto, Venta, DetalleVenta,
    Inventario, Compra, DetalleCompra, OrdenReabastecimiento,
    Proveedor, HistorialInventario, ProductoProveedor,
    SegmentoKmeans, ClasificacionAbc, Categoria
)
from .serializers import (
    RolSerializer, PersonaSerializer, UsuarioSerializer,
    ProductoSerializer, VentaSerializer, DetalleVentaSerializer,
    InventarioSerializer, CompraSerializer, DetalleCompraSerializer,
    OrdenReabastecimientoSerializer, ProveedorSerializer,
    HistorialInventarioSerializer, ProductoProveedorSerializer,
    SegmentoKmeansSerializer, ClasificacionAbcSerializer, CategoriaSerializer,
    UsuarioListSerializer, UsuarioCreateSerializer, UsuarioUpdateSerializer
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
 
    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCreateSerializer
        if self.action in ['update', 'partial_update']:
            return UsuarioUpdateSerializer
        return UsuarioListSerializer
 
    def get_queryset(self):
        queryset = Usuario.objects.select_related('id_persona').all()
        rol     = self.request.query_params.get('rol')
        activo  = self.request.query_params.get('activo')
        busqueda = self.request.query_params.get('busqueda')
 
        if rol:
            queryset = queryset.filter(rol=rol)
        if activo is not None and activo != '':
            queryset = queryset.filter(activo=activo.lower() == 'true')
        if busqueda:
            queryset = queryset.filter(
                Q(email__icontains=busqueda) |
                Q(id_persona__nombres__icontains=busqueda) |
                Q(id_persona__apellido_paterno__icontains=busqueda)
            )
        return queryset.order_by('id_persona__apellido_paterno')
 
    @action(detail=True, methods=['patch'], url_path='toggle-activo')
    def toggle_activo(self, request, pk=None):
        usuario = self.get_object()
        usuario.activo = not usuario.activo
        usuario.save()
        return Response({
            'id_usuario': usuario.id_usuario,
            'activo': usuario.activo,
            'mensaje': f"Usuario {'activado' if usuario.activo else 'desactivado'} correctamente."
        })
 
    @action(detail=True, methods=['patch'], url_path='cambiar-password')
    def cambiar_password(self, request, pk=None):
        from django.contrib.auth.hashers import make_password
        usuario = self.get_object()
        nueva = request.data.get('nueva_password', '')
        if len(nueva) < 6:
            return Response(
                {'error': 'La contraseña debe tener al menos 6 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        usuario.password_hash = make_password(nueva)
        usuario.save()
        return Response({'mensaje': 'Contraseña actualizada correctamente.'})
 
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        total     = Usuario.objects.count()
        activos   = Usuario.objects.filter(activo=True).count()
        admins    = Usuario.objects.filter(rol='ADMIN').count()
        vendedores = Usuario.objects.filter(rol='VENDEDOR').count()
        return Response({
            'total': total,
            'activos': activos,
            'admins': admins,
            'vendedores': vendedores,
        })

class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion', 'categoria']
    ordering_fields = ['nombre', 'precio_unitario', 'fecha_registro']
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError:
            return Response(
                {'error': 'No se puede eliminar este producto porque tiene ventas o compras asociadas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
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
    serializer_class = ProveedorSerializer
 
    def get_queryset(self):
        queryset = Proveedor.objects.prefetch_related('compras')
 
        tipo = self.request.query_params.get('tipo')
        activo = self.request.query_params.get('activo')
        busqueda = self.request.query_params.get('busqueda')
 
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == 'true')
        if busqueda:
            queryset = queryset.filter(nombre__icontains=busqueda)
 
        return queryset.order_by('nombre')
 
    @action(detail=True, methods=['get'], url_path='historial-compras')
    def historial_compras(self, request, pk=None):
        proveedor = self.get_object()
        compras = Compra.objects.filter(
            id_proveedor=proveedor
        ).prefetch_related('detalles__id_producto').order_by('-fecha_compra')
 
        resultado = []
        for compra in compras:
            detalles = compra.detalles.select_related('id_producto').all()
            nombres = [d.id_producto.nombre for d in detalles]
            if len(nombres) == 0:
                descripcion = 'Sin detalle'
            elif len(nombres) == 1:
                descripcion = nombres[0]
            else:
                descripcion = f"{nombres[0]} (+{len(nombres)-1} más)"
 
            resultado.append({
                'id_compra': compra.id_compra,
                'fecha': compra.fecha_compra.strftime('%Y-%m-%d') if hasattr(compra.fecha_compra, 'strftime') else str(compra.fecha_compra),
                'productos': descripcion,
                'total': float(compra.total),
                'estado': compra.estado,
                'forma_pago': compra.forma_pago,
            })
 
        return Response({
            'proveedor': proveedor.nombre,
            'total_compras': len(resultado),
            'monto_total': sum(c['total'] for c in resultado),
            'compras': resultado,
        })
 
    @action(detail=True, methods=['patch'], url_path='toggle-activo')
    def toggle_activo(self, request, pk=None):
        proveedor = self.get_object()
        proveedor.activo = not proveedor.activo
        proveedor.save()
        return Response({
            'id_proveedor': proveedor.id_proveedor,
            'activo': proveedor.activo,
            'mensaje': f"Proveedor {'activado' if proveedor.activo else 'desactivado'} correctamente."
        })


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
    def resumen(self, request):
        """
        Endpoint para obtener resumen del inventario
        GET /api/inventarios/resumen/
        """
        # Contar por estado
        estados = Inventario.objects.values('estado_inventario').annotate(
            count=Count('id_inventario')
        )
        
        # Inicializar contadores
        resumen = {
            'critico': 0,
            'bajo': 0,
            'normal': 0,
            'sobrestock': 0,
            'total_productos': 0,
            'valor_total': 0.0
        }
        
        # Llenar contadores de estados
        for estado in estados:
            key = estado['estado_inventario'].lower()
            if key in resumen:
                resumen[key] = estado['count']
        
        # Total de productos
        resumen['total_productos'] = Inventario.objects.count()
        
        # Calcular valor total del inventario
        valor_total = Decimal('0.00')
        
        for inventario in Inventario.objects.select_related('id_producto').all():
            try:
                # Obtener precio del producto
                precio = inventario.id_producto.precio_unitario or Decimal('0.00')
                stock = inventario.stock_actual or 0
                
                # Calcular valor de este producto
                valor = Decimal(str(precio)) * Decimal(str(stock))
                valor_total += valor
                
            except Exception as e:
                print(f"Error calculando valor para {inventario.id_inventario}: {e}")
                continue
        
        resumen['valor_total'] = float(valor_total)
        
        return Response(resumen)


class VentaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de ventas"""
    
    serializer_class = VentaSerializer
    
    def get_queryset(self):
        """Obtener queryset optimizado"""
        
        queryset = Venta.objects.select_related(
            'id_usuario',
            'id_usuario__id_persona'
        ).prefetch_related(
        'detalleventa_set__id_producto'
        )
        
        # Filtros
        fecha_desde = self.request.query_params.get('fecha_desde', None)
        if fecha_desde:
            try:
                fecha = datetime.strptime(fecha_desde, '%Y-%m-%d')
                queryset = queryset.filter(fecha_venta__gte=fecha)
            except ValueError:
                pass
        
        fecha_hasta = self.request.query_params.get('fecha_hasta', None)
        if fecha_hasta:
            try:
                fecha = datetime.strptime(fecha_hasta, '%Y-%m-%d')
                fecha = fecha.replace(hour=23, minute=59, second=59)
                queryset = queryset.filter(fecha_venta__lte=fecha)
            except ValueError:
                pass
        
        usuario = self.request.query_params.get('usuario', None)
        if usuario:
            queryset = queryset.filter(id_usuario=usuario)
        
        forma_pago = self.request.query_params.get('forma_pago', None)
        if forma_pago:
            queryset = queryset.filter(forma_pago=forma_pago)
        
        return queryset.order_by('-fecha_venta')
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Resumen estadístico"""
        hoy = datetime.now().date()
        inicio_mes = datetime(hoy.year, hoy.month, 1).date()
        
        ventas_hoy = Venta.objects.filter(fecha_venta__date=hoy)
        total_hoy = ventas_hoy.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
        cantidad_hoy = ventas_hoy.count()
        promedio_hoy = total_hoy / cantidad_hoy if cantidad_hoy > 0 else Decimal('0.00')
        
        ventas_mes = Venta.objects.filter(fecha_venta__date__gte=inicio_mes)
        total_mes = ventas_mes.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
        cantidad_mes = ventas_mes.count()
        
        total_general = Venta.objects.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
        cantidad_general = Venta.objects.count()
        
        return Response({
            'total_hoy': float(total_hoy),
            'cantidad_hoy': cantidad_hoy,
            'promedio_hoy': float(promedio_hoy),
            'total_mes': float(total_mes),
            'cantidad_mes': cantidad_mes,
            'total_general': float(total_general),
            'cantidad_general': cantidad_general
        })
    
    def destroy(self, request, *args, **kwargs):
        """Eliminar venta (solo mismo día)"""
        instance = self.get_object()
        fecha_venta = instance.fecha_venta.date()
        hoy = datetime.now().date()
        
        if fecha_venta != hoy:
            return Response(
                {'error': 'Solo puedes eliminar ventas del mismo día'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class DetalleVentaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de detalles de venta
    
    Endpoints:
    - GET /api/detalle-venta/ - Listar todos los detalles
    - POST /api/detalle-venta/ - Crear nuevo detalle
    - GET /api/detalle-venta/{id}/ - Obtener un detalle específico
    - PUT /api/detalle-venta/{id}/ - Actualizar un detalle
    - DELETE /api/detalle-venta/{id}/ - Eliminar un detalle
    """
    
    serializer_class = DetalleVentaSerializer
    
    def get_queryset(self):
        """
        Filtrar detalles por venta o producto con optimización
        """
        queryset = DetalleVenta.objects.select_related(
            'id_venta',
            'id_producto'
        )
        
        # Filtro por venta
        venta = self.request.query_params.get('venta', None)
        if venta:
            queryset = queryset.filter(id_venta=venta)
        
        # Filtro por producto
        producto = self.request.query_params.get('producto', None)
        if producto:
            queryset = queryset.filter(id_producto=producto)
        
        return queryset.order_by('-id_detalleventa')
    
    @action(detail=False, methods=['delete', 'get'], url_path='por-venta')
    def eliminar_por_venta(self, request):
        venta_id = request.query_params.get('venta', None)
        if not venta_id:
            return Response(
                {'error': 'Se requiere el parámetro venta'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if request.method == 'GET':
            detalles = DetalleVenta.objects.filter(
                id_venta=venta_id
            ).select_related('id_producto')
            serializer = DetalleVentaSerializer(detalles, many=True)
            return Response(serializer.data)
        
        eliminados, _ = DetalleVenta.objects.filter(id_venta=venta_id).delete()
        return Response(
            {'eliminados': eliminados},
            status=status.HTTP_204_NO_CONTENT
        )
    def perform_create(self, serializer):
        producto = serializer.validated_data.get('id_producto')
        cantidad = serializer.validated_data.get('cantidad')
        try:
            inventario = Inventario.objects.get(id_producto=producto)
            if inventario.stock_actual < cantidad:
                raise DRFValidationError(
                    {'cantidad': f'Stock insuficiente para {producto.nombre}. '
                                 f'Disponible: {inventario.stock_actual}'}
                )
        except Inventario.DoesNotExist:
            pass
        serializer.save()


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
        'id_producto', 'id_usuario',
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

"""
Agregar este ViewSet al final de tu archivo api/views.py
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Sum, Count, F, Q
from django.utils import timezone
from datetime import timedelta, date
from decimal import Decimal


@api_view(['GET'])
def dashboard_stats(request):
    """
    Endpoint unificado para todas las estadísticas del dashboard
    GET /api/dashboard/stats/
    """
    
    # ==================== ALERTAS DE STOCK ====================
    
    # Productos con stock crítico (stock actual <= stock mínimo)
    stock_critico = Inventario.objects.filter(
        stock_actual__lte=F('stock_minimo')
    ).select_related('id_producto').values(
        'id_producto__nombre',
        'stock_actual',
        'stock_minimo'
    )[:10]  # Top 10 más críticos
    
    # Productos sin movimiento (60 días sin ventas)
    fecha_limite = timezone.now() - timedelta(days=60)
    sin_movimiento = Inventario.objects.filter(
        Q(ultima_venta__lt=fecha_limite) | Q(ultima_venta__isnull=True)
    ).select_related('id_producto').values(
        'id_producto__nombre',
        'ultima_venta',
        'stock_actual'
    )[:10]  # Top 10 sin movimiento
    
    alertas = {
        'stock_critico': {
            'count': Inventario.objects.filter(stock_actual__lte=F('stock_minimo')).count(),
            'productos': list(stock_critico)
        },
        'sin_movimiento': {
            'count': Inventario.objects.filter(
                Q(ultima_venta__lt=fecha_limite) | Q(ultima_venta__isnull=True)
            ).count(),
            'productos': list(sin_movimiento)
        }
    }
    
    # ==================== RESUMEN FINANCIERO ====================
    
    hoy = timezone.now().date()
    inicio_mes = date(hoy.year, hoy.month, 1)
    
    # Ventas del día
    ventas_hoy = Venta.objects.filter(
        fecha_venta__date=hoy
    ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    
    # Ventas del mes
    ventas_mes = Venta.objects.filter(
        fecha_venta__date__gte=inicio_mes
    ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    
    # Compras del mes
    compras_mes = Compra.objects.filter(
        fecha_compra__date__gte=inicio_mes
    ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    
    # Calcular margen (simplificado: ventas - compras)
    if ventas_mes > 0:
        margen = ((ventas_mes - compras_mes) / ventas_mes * 100)
    else:
        margen = Decimal('0.00')
    
    resumen_financiero = {
        'ventas_hoy': float(ventas_hoy),
        'ventas_mes': float(ventas_mes),
        'compras_mes': float(compras_mes),
        'margen_porcentaje': float(margen),
        'ganancia_neta': float(ventas_mes - compras_mes)
    }
    
    # ==================== VENTAS ÚLTIMOS 7 DÍAS ====================
    
    ventas_7_dias = []
    for i in range(6, -1, -1):  # 6, 5, 4, 3, 2, 1, 0
        fecha = hoy - timedelta(days=i)
        total_dia = Venta.objects.filter(
            fecha_venta__date=fecha
        ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
        
        ventas_7_dias.append({
            'fecha': fecha.strftime('%Y-%m-%d'),
            'dia': fecha.strftime('%a'),  # Lun, Mar, Mié...
            'total': float(total_dia)
        })
    
    # ==================== ACTIVIDAD RECIENTE ====================
    
    ultimas_ventas = Venta.objects.select_related(
        'id_usuario', 'id_usuario__id_persona'
    ).order_by('-fecha_venta')[:10]

    actividad_reciente = []
    for venta in ultimas_ventas:
        # ✅ Usar filter directo en lugar de detalleventa_set
        detalles = DetalleVenta.objects.filter(
            id_venta=venta
        ).select_related('id_producto')

        nombres = [
            d.id_producto.nombre
            for d in detalles
            if d.id_producto is not None
        ]

        if len(nombres) == 0:
            nombre_producto = 'Sin detalle'
        elif len(nombres) == 1:
            nombre_producto = nombres[0]
        else:
            nombre_producto = f"{nombres[0]} (+{len(nombres)-1} más)"

        fecha = venta.fecha_venta.date() if hasattr(venta.fecha_venta, 'date') else venta.fecha_venta
        if fecha == hoy:
            tiempo = 'Hoy'
        elif fecha == hoy - timedelta(days=1):
            tiempo = 'Ayer'
        else:
            dias = (hoy - fecha).days
            tiempo = f'Hace {dias} días'

        actividad_reciente.append({
            'id': venta.id_venta,
            'producto': nombre_producto,
            'fecha': fecha.strftime('%Y-%m-%d'),
            'tiempo': tiempo,
            'total': float(venta.total)
        })
    
    # ==================== ESTADO DEL INVENTARIO ====================
    
    total_productos = Inventario.objects.count()
    
    # Contar por estado
    estado_counts = Inventario.objects.values('estado_inventario').annotate(
        count=Count('id_inventario')
    )
    
    estado_dict = {item['estado_inventario']: item['count'] for item in estado_counts}
    
    # Valor total del inventario
    valor_total = Inventario.objects.annotate(
        valor=F('stock_actual') * F('id_producto__precio_unitario')
    ).aggregate(total=Sum('valor'))['total'] or Decimal('0.00')
    
    estado_inventario = {
        'total_productos': total_productos,
        'normal': estado_dict.get('NORMAL', 0),
        'bajo': estado_dict.get('BAJO', 0),
        'critico': estado_dict.get('CRITICO', 0),
        'sobrestock': estado_dict.get('SOBRESTOCK', 0),
        'valor_total': float(valor_total)
    }
    
    # ==================== RESPUESTA COMPLETA ====================
    
    return Response({
        'alertas': alertas,
        'resumen_financiero': resumen_financiero,
        'ventas_7_dias': ventas_7_dias,
        'actividad_reciente': actividad_reciente,
        'estado_inventario': estado_inventario
    })


class CategoriaViewSet(viewsets.ModelViewSet):
    serializer_class = CategoriaSerializer
 
    def get_queryset(self):
        queryset = Categoria.objects.all()
        activo = self.request.query_params.get('activo')
        if activo is not None and activo != '':
            queryset = queryset.filter(activo=activo.lower() == 'true')
        return queryset.order_by('nombre')
 
    @action(detail=True, methods=['patch'], url_path='toggle-activo')
    def toggle_activo(self, request, pk=None):
        categoria = self.get_object()
        categoria.activo = not categoria.activo
        categoria.save()
        return Response({
            'id_categoria': categoria.id_categoria,
            'activo': categoria.activo,
            'mensaje': f"Categoría '{ categoria.nombre }' {'activada' if categoria.activo else 'desactivada'}."
        })
 

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import check_password
from rest_framework_simplejwt.tokens import RefreshToken
from api.models import Usuario
from api.serializers import UsuarioSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    Endpoint de login personalizado
    POST /api/auth/login/
    
    Body:
    {
        "email": "admin@manamusic.com",
        "password": "Admin123!"
    }
    
    Response:
    {
        "success": true,
        "message": "Login exitoso",
        "data": {
            "access": "token_de_acceso",
            "refresh": "token_de_refresco",
            "user": {
                "id": 1,
                "email": "admin@manamusic.com",
                "nombre_completo": "admin admin_ap admin_am",
                "rol": "Administrador",
                "rol_id": 1
            }
        }
    }
    """
    
    email = request.data.get('email')
    password = request.data.get('password')
    
    # Validar que se enviaron los datos
    if not email or not password:
        return Response({
            'success': False,
            'message': 'Email y contraseña son requeridos'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Buscar el usuario por email
        usuario = Usuario.objects.select_related(
            'id_persona',
            'id_persona__id_rol'
        ).get(email=email)
        
        # Verificar si el usuario está activo
        if not usuario.activo:
            return Response({
                'success': False,
                'message': 'Usuario inactivo. Contacte al administrador.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Verificar la contraseña
        if not check_password(password, usuario.password_hash):
            return Response({
                'success': False,
                'message': 'Credenciales incorrectas'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Generar tokens JWT
        refresh = RefreshToken()
        refresh['user_id'] = usuario.id_usuario
        refresh['email'] = usuario.email
        refresh['rol'] = usuario.id_persona.id_rol.nombre_rol
        refresh['rol_id'] = usuario.id_persona.id_rol.id_rol
        
        # Preparar datos del usuario
        user_data = {
            'id': usuario.id_usuario,
            'email': usuario.email,
            'nombre_completo': f"{usuario.id_persona.nombres} {usuario.id_persona.apellido_paterno} {usuario.id_persona.apellido_materno}",
            'nombres': usuario.id_persona.nombres,
            'apellido_paterno': usuario.id_persona.apellido_paterno,
            'apellido_materno': usuario.id_persona.apellido_materno,
            'ci': usuario.id_persona.ci,
            'telefono': usuario.id_persona.telefono,
            'rol': usuario.id_persona.id_rol.nombre_rol,
            'rol_id': usuario.id_persona.id_rol.id_rol,
            'activo': usuario.activo,
            'fecha_registro': usuario.fecha_registro
        }
        
        return Response({
            'success': True,
            'message': 'Login exitoso',
            'data': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': user_data
            }
        }, status=status.HTTP_200_OK)
        
    except Usuario.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Credenciales incorrectas'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error en el servidor: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """
    Refrescar el token de acceso
    POST /api/auth/refresh/
    
    Body:
    {
        "refresh": "token_de_refresco"
    }
    
    Response:
    {
        "success": true,
        "access": "nuevo_token_de_acceso"
    }
    """
    from rest_framework_simplejwt.tokens import RefreshToken
    
    refresh_token = request.data.get('refresh')
    
    if not refresh_token:
        return Response({
            'success': False,
            'message': 'Token de refresco requerido'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        refresh = RefreshToken(refresh_token)
        return Response({
            'success': True,
            'access': str(refresh.access_token)
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Token inválido o expirado'
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
def logout(request):
    """
    Cerrar sesión (en el frontend simplemente eliminar los tokens)
    POST /api/auth/logout/
    
    Response:
    {
        "success": true,
        "message": "Logout exitoso"
    }
    """
    # En JWT, el logout se maneja principalmente en el frontend
    # eliminando los tokens del localStorage
    
    # Opcionalmente, aquí podrías agregar el token a una blacklist
    # si implementas esa funcionalidad
    
    return Response({
        'success': True,
        'message': 'Sesión cerrada exitosamente'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def verify_token(request):
    """
    Verificar si el token es válido y obtener datos del usuario
    GET /api/auth/verify/
    
    Headers:
    Authorization: Bearer <token>
    
    Response:
    {
        "success": true,
        "user": {
            "id": 1,
            "email": "admin@manamusic.com",
            "rol": "Administrador",
            "rol_id": 1
        }
    }
    """
    # Si el decorador @api_view con autenticación JWT no falla,
    # significa que el token es válido
    
    try:
        # El usuario está en request.user si usas autenticación de Django
        # Pero como usamos nuestro modelo Usuario personalizado,
        # extraemos los datos del token
        
        from rest_framework_simplejwt.authentication import JWTAuthentication
        
        jwt_auth = JWTAuthentication()
        validated_token = jwt_auth.get_validated_token(
            jwt_auth.get_raw_token(
                jwt_auth.get_header(request)
            )
        )
        
        user_id = validated_token.get('user_id')
        
        usuario = Usuario.objects.select_related(
            'id_persona',
            'id_persona__id_rol'
        ).get(id_usuario=user_id)
        
        user_data = {
            'id': usuario.id_usuario,
            'email': usuario.email,
            'nombre_completo': f"{usuario.id_persona.nombres} {usuario.id_persona.apellido_paterno} {usuario.id_persona.apellido_materno}",
            'rol': usuario.id_persona.id_rol.nombre_rol,
            'rol_id': usuario.id_persona.id_rol.id_rol,
        }
        
        return Response({
            'success': True,
            'user': user_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Token inválido'
        }, status=status.HTTP_401_UNAUTHORIZED)
    

class CompraViewSet(viewsets.ModelViewSet):
    serializer_class = CompraSerializer
 
    def get_queryset(self):
        queryset = Compra.objects.select_related(
            'id_proveedor', 'id_usuario'
        ).prefetch_related('detalles__id_producto')
 
        proveedor = self.request.query_params.get('proveedor')
        estado = self.request.query_params.get('estado')
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
 
        if proveedor:
            queryset = queryset.filter(id_proveedor=proveedor)
        if estado:
            queryset = queryset.filter(estado=estado)
        if fecha_desde:
            queryset = queryset.filter(fecha_compra__date__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha_compra__date__lte=fecha_hasta)
 
        return queryset.order_by('-fecha_compra')
 
 
class DetalleCompraViewSet(viewsets.ModelViewSet):
    serializer_class = DetalleCompraSerializer
 
    def get_queryset(self):
        queryset = DetalleCompra.objects.select_related('id_compra', 'id_producto')
 
        compra = self.request.query_params.get('compra')
        if compra:
            queryset = queryset.filter(id_compra=compra)
 
        return queryset.order_by('-id_detallecompra')
 
    @action(detail=False, methods=['get', 'delete', 'post'], url_path='por-compra')
    def por_compra(self, request):
        compra_id = request.query_params.get('compra')
        if not compra_id:
            return Response(
                {'error': 'Se requiere el parámetro compra'},
                status=status.HTTP_400_BAD_REQUEST
            )
 
        if request.method == 'GET':
            detalles = DetalleCompra.objects.filter(
                id_compra=compra_id
            ).select_related('id_producto')
            serializer = DetalleCompraSerializer(detalles, many=True)
            return Response(serializer.data)
 
        if request.method == 'POST':
            data = request.data if isinstance(request.data, list) else [request.data]
            serializer = DetalleCompraSerializer(data=data, many=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
 
        # DELETE
        eliminados, _ = DetalleCompra.objects.filter(id_compra=compra_id).delete()
        return Response({'eliminados': eliminados}, status=status.HTTP_204_NO_CONTENT)
 
 
# ── Dashboard de compras ──────────────────────────────────────
@api_view(['GET'])
def dashboard_compras(request):
    hoy = timezone.now().date()
    inicio_mes = date(hoy.year, hoy.month, 1)
    inicio_anio = date(hoy.year, 1, 1)
 
    # Gasto del mes y del año
    gasto_mes = Compra.objects.filter(
        fecha_compra__date__gte=inicio_mes,
        estado__in=['PENDIENTE', 'RECIBIDA']
    ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
 
    gasto_anio = Compra.objects.filter(
        fecha_compra__date__gte=inicio_anio,
        estado__in=['PENDIENTE', 'RECIBIDA']
    ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
 
    # Número de compras del mes
    num_compras_mes = Compra.objects.filter(
        fecha_compra__date__gte=inicio_mes
    ).count()
 
    # Proveedor con más compras del mes
    top_proveedor = Compra.objects.filter(
        fecha_compra__date__gte=inicio_mes
    ).values(
        'id_proveedor__nombre'
    ).annotate(
        total_compras=Count('id_compra'),
        total_gasto=Sum('total')
    ).order_by('-total_gasto').first()
 
    # Producto más comprado del mes
    top_producto = DetalleCompra.objects.filter(
        id_compra__fecha_compra__date__gte=inicio_mes
    ).values(
        'id_producto__nombre'
    ).annotate(
        total_cantidad=Sum('cantidad')
    ).order_by('-total_cantidad').first()
 
    # Compras por estado
    estados = Compra.objects.values('estado').annotate(
        count=Count('id_compra')
    )
    estados_dict = {e['estado']: e['count'] for e in estados}
 
    # Últimas 7 compras para historial rápido
    ultimas_compras = Compra.objects.select_related(
        'id_proveedor'
    ).prefetch_related('detalles__id_producto').order_by('-fecha_compra')[:7]
 
    historial = []
    for compra in ultimas_compras:
        productos = compra.detalles.select_related('id_producto').all()
        nombres = [d.id_producto.nombre for d in productos if d.id_producto is not None]
        if len(nombres) == 1:
            descripcion = nombres[0]
        elif len(nombres) > 1:
            descripcion = f"{nombres[0]} (+{len(nombres)-1} más)"
        else:
            descripcion = 'Sin detalle'
 
        fecha = compra.fecha_compra.date() if hasattr(compra.fecha_compra, 'date') else compra.fecha_compra
        if fecha == hoy:
            tiempo = 'Hoy'
        elif fecha == hoy - timedelta(days=1):
            tiempo = 'Ayer'
        else:
            dias = (hoy - fecha).days
            tiempo = f'Hace {dias} días'
 
        historial.append({
            'id_compra': compra.id_compra,
            'proveedor': compra.id_proveedor.nombre,
            'productos': descripcion,
            'total': float(compra.total),
            'estado': compra.estado,
            'fecha': fecha.strftime('%Y-%m-%d'),
            'tiempo': tiempo,
        })
 
    # Alertas de reabastecimiento
    alertas_reabastecimiento = Inventario.objects.filter(
        stock_actual__lte=F('punto_reorden')
    ).select_related('id_producto').values(
        'id_producto__id_producto',
        'id_producto__nombre',
        'stock_actual',
        'punto_reorden',
        'stock_minimo',
        'stock_maximo',
    ).order_by('stock_actual')[:15]
 
    return Response({
        'metricas': {
            'gasto_mes': float(gasto_mes),
            'gasto_anio': float(gasto_anio),
            'num_compras_mes': num_compras_mes,
            'top_proveedor': {
                'nombre': top_proveedor['id_proveedor__nombre'] if top_proveedor else '—',
                'gasto': float(top_proveedor['total_gasto']) if top_proveedor else 0,
            },
            'top_producto': {
                'nombre': top_producto['id_producto__nombre'] if top_producto else '—',
                'cantidad': top_producto['total_cantidad'] if top_producto else 0,
            },
            'estados': {
                'pendiente': estados_dict.get('PENDIENTE', 0),
                'recibida': estados_dict.get('RECIBIDA', 0),
                'cancelada': estados_dict.get('CANCELADA', 0),
            }
        },
        'alertas_reabastecimiento': list(alertas_reabastecimiento),
        'historial_reciente': historial,
    })

