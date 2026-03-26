from rest_framework import serializers
from .models import (
    Rol, Persona, Usuario, Producto, Venta, DetalleVenta,
    Inventario, Compra, DetalleCompra, OrdenReabastecimiento,
    Proveedor, HistorialInventario, ProductoProveedor,
    SegmentoKmeans, ClasificacionAbc, ConfiguracionTienda, Categoria, 
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

class UsuarioListSerializer(serializers.ModelSerializer):
    """Para listar usuarios con datos de persona incluidos"""
    nombres        = serializers.CharField(source='id_persona.nombres',           read_only=True)
    apellido_pat   = serializers.CharField(source='id_persona.apellido_paterno',  read_only=True)
    apellido_mat   = serializers.CharField(source='id_persona.apellido_materno',  read_only=True)
    ci             = serializers.CharField(source='id_persona.ci',                read_only=True)
    telefono       = serializers.CharField(source='id_persona.telefono',          read_only=True)
    nombre_completo = serializers.SerializerMethodField()
 
    class Meta:
        model = Usuario
        fields = [
            'id_usuario',
            'email',
            'rol',
            'activo',
            'fecha_registro',
            'ultimo_acceso',
            'nombres',
            'apellido_pat',
            'apellido_mat',
            'ci',
            'telefono',
            'nombre_completo',
        ]
        read_only_fields = ['id_usuario', 'fecha_registro', 'ultimo_acceso']
 
    def get_nombre_completo(self, obj):
        p = obj.id_persona
        return f"{p.nombres} {p.apellido_paterno} {p.apellido_materno}"
 
 
class UsuarioCreateSerializer(serializers.ModelSerializer):
    """Para crear un usuario junto con sus datos de persona"""
    # Campos de Persona
    nombres           = serializers.CharField(write_only=True)
    apellido_paterno  = serializers.CharField(write_only=True)
    apellido_materno  = serializers.CharField(write_only=True)
    ci                = serializers.CharField(write_only=True)
    telefono          = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password          = serializers.CharField(write_only=True, min_length=6)
 
    class Meta:
        model = Usuario
        fields = [
            'email', 'rol', 'activo',
            'nombres', 'apellido_paterno', 'apellido_materno', 'ci', 'telefono',
            'password',
        ]
 
    def validate_email(self, value):
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con este email.")
        return value
 
    def validate_ci(self, value):
        if Persona.objects.filter(ci=value).exists():
            raise serializers.ValidationError("Ya existe una persona con este CI.")
        return value
 
    def create(self, validated_data):
        from django.contrib.auth.hashers import make_password
        from .models import Rol
 
        # Separar campos de Persona
        nombres          = validated_data.pop('nombres')
        apellido_paterno = validated_data.pop('apellido_paterno')
        apellido_materno = validated_data.pop('apellido_materno')
        ci               = validated_data.pop('ci')
        telefono         = validated_data.pop('telefono', '')
        password         = validated_data.pop('password')
 
        # Obtener rol según el rol del usuario (ADMIN → id_rol=1, VENDEDOR → id_rol=2)
        # Ajusta los IDs según los que tengas en tu tabla Rol
        rol_nombre = validated_data.get('rol', 'VENDEDOR')
        rol_map = {'ADMIN': 'Administrador', 'VENDEDOR': 'Vendedor'}
        rol_obj = Rol.objects.filter(nombre_rol=rol_map.get(rol_nombre, 'Vendedor')).first()
        if not rol_obj:
            rol_obj = Rol.objects.first()
 
        # Crear Persona
        persona = Persona.objects.create(
            id_rol=rol_obj,
            nombres=nombres,
            apellido_paterno=apellido_paterno,
            apellido_materno=apellido_materno,
            ci=ci,
            telefono=telefono,
        )
 
        # Crear Usuario
        usuario = Usuario.objects.create(
            id_persona=persona,
            password_hash=make_password(password),
            **validated_data,
        )
        return usuario
 
 
class UsuarioUpdateSerializer(serializers.ModelSerializer):
    """Para editar datos básicos y de persona"""
    nombres          = serializers.CharField()
    apellido_paterno = serializers.CharField()
    apellido_materno = serializers.CharField()
    ci               = serializers.CharField()
    telefono         = serializers.CharField(required=False, allow_blank=True)
 
    class Meta:
        model = Usuario
        fields = ['email', 'rol', 'activo', 'nombres', 'apellido_paterno', 'apellido_materno', 'ci', 'telefono']
 
    def validate_email(self, value):
        if Usuario.objects.filter(email=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("Ya existe un usuario con este email.")
        return value
 
    def update(self, instance, validated_data):
        # Actualizar Persona
        persona = instance.id_persona
        persona.nombres          = validated_data.pop('nombres', persona.nombres)
        persona.apellido_paterno = validated_data.pop('apellido_paterno', persona.apellido_paterno)
        persona.apellido_materno = validated_data.pop('apellido_materno', persona.apellido_materno)
        persona.ci               = validated_data.pop('ci', persona.ci)
        persona.telefono         = validated_data.pop('telefono', persona.telefono)
        persona.save()
        # Actualizar Usuario
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

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
    total_compras = serializers.SerializerMethodField()
    monto_total_compras = serializers.SerializerMethodField()
 
    class Meta:
        model = Proveedor
        fields = [
            'id_proveedor',
            'nombre',
            'contacto',
            'telefono',
            'email',
            'direccion',
            'nit',
            'tipo',
            'activo',
            'fecha_registro',
            'total_compras',
            'monto_total_compras',
        ]
        read_only_fields = ['id_proveedor', 'fecha_registro']
 
    def get_total_compras(self, obj):
        return obj.compras.count()
 
    def get_monto_total_compras(self, obj):
        from django.db.models import Sum
        result = obj.compras.aggregate(total=Sum('total'))['total']
        return float(result) if result else 0.0


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
    #id_producto = serializers.PrimaryKeyRelatedField(
    #    queryset=Producto.objects.all(),
    #    write_only=True
    #)
    
    class Meta:
        model = Inventario
        fields = [
            'id_inventario',      # Para escritura (write_only)
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
        read_only_fields = ['id_inventario','fecha_actualizacion', 'estado_inventario']

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


class DetalleCompraSerializer(serializers.ModelSerializer):
    producto_info = ProductoSimpleSerializer(source='id_producto', read_only=True)
 
    class Meta:
        model = DetalleCompra
        fields = [
            'id_detallecompra',
            'id_compra',
            'id_producto',
            'producto_info',
            'cantidad',
            'precio_unitario',
            'subtotal',
        ]
        read_only_fields = ['id_detallecompra']
        extra_kwargs = {
            'id_producto': {'required': False, 'allow_null': True}  # ✅ permitir null
        }
 
 
class CompraSerializer(serializers.ModelSerializer):
    detalles = DetalleCompraSerializer(many=True, read_only=True)
    proveedor_nombre = serializers.CharField(
        source='id_proveedor.nombre', read_only=True
    )
    usuario_nombre = serializers.SerializerMethodField()
 
    class Meta:
        model = Compra
        fields = [
            'id_compra',
            'id_proveedor',
            'proveedor_nombre',
            'id_usuario',
            'usuario_nombre',
            'fecha_compra',
            'total',
            'estado',
            'forma_pago',
            'observaciones',
            'detalles',
        ]
        read_only_fields = ['id_compra', 'fecha_compra']
 
    def get_usuario_nombre(self, obj):
        if obj.id_usuario and obj.id_usuario.id_persona:
            return obj.id_usuario.id_persona.nombres
        return ''



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
    
# ============== SERIALIZERS ANIDADOS ==============

class UsuarioVentaSerializer(serializers.ModelSerializer):
    """Serializer del usuario para ventas"""
    nombres = serializers.CharField(source='id_persona.nombres', read_only=True)
    apellido_paterno = serializers.CharField(source='id_persona.apellido_paterno', read_only=True)
    apellido_materno = serializers.CharField(source='id_persona.apellido_materno', read_only=True)
    
    class Meta:
        model = Usuario
        fields = ['id_usuario', 'email', 'nombres', 'apellido_paterno', 'apellido_materno']


class ProductoVentaSerializer(serializers.ModelSerializer):
    """Serializer del producto para detalle de venta"""
    class Meta:
        model = Producto
        fields = ['id_producto', 'nombre', 'precio_unitario', 'categoria', 'unidad_medida']


# ============== DETALLE VENTA SERIALIZER ==============

class DetalleVentaSerializer(serializers.ModelSerializer):
    """Serializer para detalle de venta con información del producto"""
    
    # Para lectura: incluir datos del producto
    producto_info = ProductoVentaSerializer(source='id_producto', read_only=True)
    
    # Para escritura: aceptar solo IDs
    id_venta = serializers.PrimaryKeyRelatedField(
        queryset=Venta.objects.all(),
        write_only=True
    )
    id_producto = serializers.PrimaryKeyRelatedField(
        queryset=Producto.objects.all(),
        write_only=True
    )
    
    class Meta:
        model = DetalleVenta
        fields = [
            'id_detalleventa',
            'id_venta',
            'id_producto',
            'producto_info',
            'cantidad',
            'precio_unitario',
            'subtotal'
        ]
    
    def validate(self, data):
        """Validar que el subtotal sea correcto"""
        if 'cantidad' in data and 'precio_unitario' in data:
            subtotal_calculado = data['cantidad'] * data['precio_unitario']
            if 'subtotal' in data and abs(float(data['subtotal']) - float(subtotal_calculado)) > 0.01:
                raise serializers.ValidationError(
                    "El subtotal no coincide con cantidad × precio_unitario"
                )
        return data


# ============== VENTA SERIALIZER ==============

class VentaSerializer(serializers.ModelSerializer):
    """
    Serializer para venta con información del usuario y detalles
    """
    
    # Para lectura: incluir usuario y detalles
    usuario_info = UsuarioVentaSerializer(source='id_usuario', read_only=True)
    detalles = DetalleVentaSerializer(many=True, read_only=True, source='detalleventa_set')
    
    # Para escritura: aceptar solo ID de usuario
    id_usuario = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        write_only=True
    )
    
    class Meta:
        model = Venta
        fields = [
            'id_venta',
            'id_usuario',
            'usuario_info',
            'fecha_venta',
            'total',
            'forma_pago',
            'observaciones',
            'detalles'
        ]
        read_only_fields = ['id_venta', 'fecha_venta']
    
    def validate_total(self, value):
        """Validar que el total sea positivo"""
        if value <= 0:
            raise serializers.ValidationError("El total debe ser mayor a 0")
        return value


# ============== SERIALIZER PARA CREAR VENTA COMPLETA ==============

class VentaCompletaSerializer(serializers.Serializer):
    """
    Serializer para crear una venta con sus detalles en una sola operación
    """
    id_usuario = serializers.IntegerField()
    forma_pago = serializers.ChoiceField(choices=['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR'])
    observaciones = serializers.CharField(required=False, allow_blank=True)
    
    detalles = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    
    def validate_detalles(self, value):
        """Validar estructura de detalles"""
        for detalle in value:
            if 'id_producto' not in detalle:
                raise serializers.ValidationError("Cada detalle debe tener id_producto")
            if 'cantidad' not in detalle:
                raise serializers.ValidationError("Cada detalle debe tener cantidad")
            if 'precio_unitario' not in detalle:
                raise serializers.ValidationError("Cada detalle debe tener precio_unitario")
            
            # Validar tipos
            try:
                int(detalle['id_producto'])
                int(detalle['cantidad'])
                float(detalle['precio_unitario'])
            except (ValueError, TypeError):
                raise serializers.ValidationError("Tipos de datos inválidos en detalles")
        
        return value
    
    def validate(self, data):
        """Validar que el usuario exista"""
        try:
            Usuario.objects.get(id_usuario=data['id_usuario'])
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Usuario no encontrado")
        
        return data
    

class ConfiguracionTiendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionTienda
        fields = [
            'id_config',
            'nombre_tienda',
            'direccion',
            'telefono',
            'email',
            'ruc_nit',
            'moneda',
            'simbolo_moneda',
            'fecha_actualizacion',
        ]
        read_only_fields = ['id_config', 'fecha_actualizacion']
 
 
class CategoriaSerializer(serializers.ModelSerializer):
    total_productos = serializers.SerializerMethodField()
 
    class Meta:
        model = Categoria
        fields = [
            'id_categoria',
            'nombre',
            'descripcion',
            'activo',
            'fecha_registro',
            'total_productos',
        ]
        read_only_fields = ['id_categoria', 'fecha_registro']
 
    def get_total_productos(self, obj):
        return obj.productos.filter(activo=True).count()