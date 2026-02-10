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


class InventarioSerializer(serializers.ModelSerializer):
    producto_info = ProductoSerializer(source='id_producto', read_only=True)
    porcentaje_stock = serializers.SerializerMethodField()
    necesita_reorden = serializers.SerializerMethodField()
    
    class Meta:
        model = Inventario
        fields = '__all__'
    
    def get_porcentaje_stock(self, obj):
        if obj.stock_maximo > 0:
            return round((obj.stock_actual / obj.stock_maximo) * 100, 2)
        return 0
    
    def get_necesita_reorden(self, obj):
        return obj.stock_actual <= obj.punto_reorden


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


class HistorialInventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='id_producto.nombre', read_only=True)
    usuario_email = serializers.EmailField(source='id_usuario.email', read_only=True)
    diferencia = serializers.SerializerMethodField()
    
    class Meta:
        model = HistorialInventario
        fields = '__all__'
    
    def get_diferencia(self, obj):
        return obj.stock_nuevo - obj.stock_anterior


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