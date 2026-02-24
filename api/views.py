from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, Q, F
from decimal import Decimal
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
        fecha_venta=hoy
    ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    
    # Ventas del mes
    ventas_mes = Venta.objects.filter(
        fecha_venta__gte=inicio_mes
    ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
    
    # Compras del mes
    compras_mes = Compra.objects.filter(
        fecha_compra__gte=inicio_mes
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
            fecha_venta=fecha
        ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
        
        ventas_7_dias.append({
            'fecha': fecha.strftime('%Y-%m-%d'),
            'dia': fecha.strftime('%a'),  # Lun, Mar, Mié...
            'total': float(total_dia)
        })
    
    # ==================== ACTIVIDAD RECIENTE ====================
    
    ultimas_ventas = Venta.objects.select_related(
        'id_producto'
    ).order_by('-fecha_venta', '-id_venta').values(
        'id_venta',
        'id_producto__nombre',
        'fecha_venta',
        'total'
    )[:5]
    
    actividad_reciente = []
    for venta in ultimas_ventas:
        # Calcular tiempo transcurrido
        if venta['fecha_venta'] == hoy:
            tiempo = 'Hoy'
        elif venta['fecha_venta'] == hoy - timedelta(days=1):
            tiempo = 'Ayer'
        else:
            dias = (hoy - venta['fecha_venta']).days
            tiempo = f'Hace {dias} días'
        
        actividad_reciente.append({
            'id': venta['id_venta'],
            'producto': venta['id_producto__nombre'],
            'fecha': venta['fecha_venta'].strftime('%Y-%m-%d'),
            'tiempo': tiempo,
            'total': float(venta['total'])
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