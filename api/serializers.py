from rest_framework import serializers
from .models import (
    Rol, Persona, Usuario, Producto, Venta, DetalleVenta,
    Inventario, Compra, DetalleCompra, OrdenReabastecimiento,
    Proveedor, HistorialInventario, ProductoProveedor,
    SegmentoKmeans, ClasificacionAbc
)


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = '__all__'


class PersonaSerializer(serializers.ModelSerializer):
    nombre_rol = serializers.CharField(source='id_rol.nombre_rol', read_only=True)
    nombre_completo = serializers.SerializerMethodField()
    
    class Meta:
        model = Persona
        fields = '__all__'
    
    def get_nombre_completo(self, obj):
        return f"{obj.nombres} {obj.apellido_paterno} {obj.apellido_materno}"


class UsuarioSerializer(serializers.ModelSerializer):
    persona_info = PersonaSerializer(source='id_persona', read_only=True)
    email_persona = serializers.EmailField(source='id_persona.usuario.email', read_only=True)
    
    class Meta:
        model = Usuario
        fields = '__all__'
        extra_kwargs = {
            'password_hash': {'write_only': True}
        }


class ProductoSerializer(serializers.ModelSerializer):
    tiene_inventario = serializers.SerializerMethodField()
    stock_actual = serializers.SerializerMethodField()
    
    class Meta:
        model = Producto
        fields = '__all__'
    
    def get_tiene_inventario(self, obj):
        return hasattr(obj, 'inventario')
    
    def get_stock_actual(self, obj):
        if hasattr(obj, 'inventario'):
            return obj.inventario.stock_actual
        return None


class ProveedorSerializer(serializers.ModelSerializer):
    total_productos = serializers.SerializerMethodField()
    
    class Meta:
        model = Proveedor
        fields = '__all__'
    
    def get_total_productos(self, obj):
        return obj.producto_proveedores.count()


class ProductoProveedorSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='id_producto.nombre', read_only=True)
    proveedor_nombre = serializers.CharField(source='id_proveedor.nombre', read_only=True)
    
    class Meta:
        model = ProductoProveedor
        fields = '__all__'


class ProductoSimpleSerializer(serializers.ModelSerializer):
    """Serializer simple del producto para usar en Inventario"""
    class Meta:
        model = Producto
        fields = [
            'id_producto',
            'nombre',
            'descripcion',
            'precio_unitario',
            'categoria',
            'unidad_medida',
            'activo'
        ]

class InventarioSerializer(serializers.ModelSerializer):
    """Serializer de Inventario con datos del producto incluidos"""
    
    # Para lectura: incluir todos los datos del producto
    producto_info = ProductoSimpleSerializer(source='id_producto', read_only=True)
    
    # Para escritura: aceptar solo el ID
    id_producto = serializers.PrimaryKeyRelatedField(
        queryset=Producto.objects.all(),
        write_only=True
    )
    
    class Meta:
        model = Inventario
        fields = [
            'id_inventario',
            'id_producto',      # Para escritura (write_only)
            'producto_info',    # Para lectura (read_only)
            'stock_actual',
            'stock_minimo',
            'stock_maximo',
            'punto_reorden',
            'stock_seguridad',
            'demanda_promedio_diaria',
            'tiempo_entrega_dias',
            'ultima_venta',
            'ultima_compra',
            'fecha_actualizacion',
            'estado_inventario'
        ]
        read_only_fields = ['fecha_actualizacion', 'estado_inventario']

    def to_representation(self, instance):
        """
        Personalizar la representación para incluir datos del producto
        """
        representation = super().to_representation(instance)
        
        # Asegurarnos de que producto_info siempre exista
        if instance.id_producto:
            representation['producto_info'] = {
                'id_producto': instance.id_producto.id_producto,
                'nombre': instance.id_producto.nombre,
                'descripcion': instance.id_producto.descripcion,
                'precio_unitario': str(instance.id_producto.precio_unitario),
                'categoria': instance.id_producto.categoria,
                'unidad_medida': instance.id_producto.unidad_medida,
                'activo': instance.id_producto.activo
            }
        
        return representation

class VentaSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='id_producto.nombre', read_only=True)
    detalles = serializers.SerializerMethodField()
    
    class Meta:
        model = Venta
        fields = '__all__'
    
    def get_detalles(self, obj):
        detalles = obj.detalles.all()
        return DetalleVentaSerializer(detalles, many=True).data


class DetalleVentaSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='id_producto.nombre', read_only=True)
    venta_fecha = serializers.DateField(source='id_venta.fecha_venta', read_only=True)
    
    class Meta:
        model = DetalleVenta
        fields = '__all__'
        read_only_fields = ['subtotal']


class CompraSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='id_proveedor.nombre', read_only=True)
    producto_nombre = serializers.CharField(source='id_producto.nombre', read_only=True)
    detalles = serializers.SerializerMethodField()
    
    class Meta:
        model = Compra
        fields = '__all__'
    
    def get_detalles(self, obj):
        detalles = obj.detalles.all()
        return DetalleCompraSerializer(detalles, many=True).data


class DetalleCompraSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='id_producto.nombre', read_only=True)
    compra_fecha = serializers.DateField(source='id_compra.fecha_compra', read_only=True)
    
    class Meta:
        model = DetalleCompra
        fields = '__all__'


class OrdenReabastecimientoSerializer(serializers.ModelSerializer):
    producto_info = ProductoSerializer(source='id_producto', read_only=True)
    usuario_email = serializers.EmailField(source='id_usuario.email', read_only=True)
    compra_info = CompraSerializer(source='id_compra', read_only=True)
    dias_pendiente = serializers.SerializerMethodField()
    
    class Meta:
        model = OrdenReabastecimiento
        fields = '__all__'
    
    def get_dias_pendiente(self, obj):
        from django.utils import timezone
        if obj.estado == 'PENDIENTE':
            delta = timezone.now() - obj.fecha_sugerencia
            return delta.days
        return None


class UsuarioSimpleSerializer(serializers.ModelSerializer):
    """
    Serializer simple del usuario
    IMPORTANTE: Los campos nombres, apellidos están en Persona, no en Usuario
    """
    nombres = serializers.CharField(source='id_persona.nombres', read_only=True)
    apellido_paterno = serializers.CharField(source='id_persona.apellido_paterno', read_only=True)
    apellido_materno = serializers.CharField(source='id_persona.apellido_materno', read_only=True)
    
    class Meta:
        model = Usuario
        fields = [
            'id_usuario',
            'email',
            'nombres',
            'apellido_paterno',
            'apellido_materno'
        ]


class HistorialInventarioSerializer(serializers.ModelSerializer):
    """
    Serializer de Historial con datos anidados del producto y usuario
    """
    
    # Para LECTURA: incluir datos completos del producto y usuario
    producto_info = ProductoSimpleSerializer(source='id_producto', read_only=True)
    usuario_info = UsuarioSimpleSerializer(source='id_usuario', read_only=True)
    
    # Para ESCRITURA: aceptar solo los IDs
    id_producto = serializers.PrimaryKeyRelatedField(
        queryset=Producto.objects.all(),
        write_only=True
    )
    id_usuario = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        write_only=True
    )
    
    class Meta:
        model = HistorialInventario
        fields = [
            'id_historial',
            'id_producto',      # Solo para escritura
            'producto_info',    # Solo para lectura
            'id_usuario',       # Solo para escritura
            'usuario_info',     # Solo para lectura
            'stock_anterior',
            'stock_nuevo',
            'tipo_movimiento',
            'observaciones',
            'fecha_registro'  # ← Cambia esto si tu campo se llama diferente
        ]
        read_only_fields = ['id_historial', 'fecha_registro']


class SegmentoKmeansSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='id_producto.nombre', read_only=True)
    
    class Meta:
        model = SegmentoKmeans
        fields = '__all__'


class ClasificacionAbcSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='id_producto.nombre', read_only=True)
    porcentaje_ventas = serializers.SerializerMethodField()
    
    class Meta:
        model = ClasificacionAbc
        fields = '__all__'
    
    def get_porcentaje_ventas(self, obj):
        # Calcular porcentaje respecto al total de ventas
        total_ventas = ClasificacionAbc.objects.aggregate(
            total=serializers.models.Sum('ventas_acumuladas')
        )['total'] or 1
        
        if total_ventas > 0:
            return round((obj.ventas_acumuladas / total_ventas) * 100, 2)
        return 0