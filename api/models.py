from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

# ==================== TABLAS BASE (sin dependencias) ====================

class Rol(models.Model):
    """Tabla de roles de usuario"""
    id_rol = models.AutoField(primary_key=True)
    nombre_rol = models.CharField(max_length=20)
    
    class Meta:
        db_table = 'rol'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'
    
    def __str__(self):
        return self.nombre_rol

class ConfiguracionTienda(models.Model):
    """Configuración general de la tienda — registro único (singleton)"""
    id_config = models.AutoField(primary_key=True)
    nombre_tienda = models.CharField(max_length=100, default='Mi Tienda')
    direccion = models.TextField(blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(max_length=100, blank=True, null=True)
    ruc_nit = models.CharField(max_length=20, blank=True, null=True)
    moneda = models.CharField(max_length=10, default='BOB')
    simbolo_moneda = models.CharField(max_length=5, default='Bs.')
    fecha_actualizacion = models.DateTimeField(auto_now=True)
 
    class Meta:
        db_table = 'configuracion_tienda'
        verbose_name = 'Configuración de Tienda'
 
    def __str__(self):
        return self.nombre_tienda
 
    @classmethod
    def get_config(cls):
        """Retorna la configuración, creándola si no existe."""
        config, _ = cls.objects.get_or_create(id_config=1)
        return config
 
 
class Categoria(models.Model):
    """Categorías de productos gestionables"""
    id_categoria = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        db_table = 'categoria'
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        ordering = ['nombre']
 
    def __str__(self):
        return self.nombre

class Producto(models.Model):
    """Tabla de productos"""
    
    categoria = models.ForeignKey(
        'Categoria',
        on_delete=models.SET_NULL,
        db_column='id_categoria',
        related_name='productos',
        null=True,
        blank=True,
    )
    UNIDADES_MEDIDA = [
        ('UND', 'Unidad'),
        ('CAJA', 'Caja'),
        ('PIEZA', 'Pieza'),
    ]
    
    id_producto = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    precio_unitario = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    fecha_registro = models.DateField(auto_now_add=True)
    unidad_medida = models.CharField(max_length=20, choices=UNIDADES_MEDIDA)
    activo = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'producto'
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class Proveedor(models.Model):
    """Tabla de proveedores"""
    TIPOS = [
        ('LOCAL', 'Local'),
        ('IMPORTACION', 'Importación'),
    ]
    id_proveedor = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    contacto = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20)
    email = models.EmailField(max_length=100)
    direccion = models.TextField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    nit = models.CharField(max_length=20, blank=True, null=True)        # opcional
    tipo = models.CharField(max_length=15, choices=TIPOS, default='LOCAL')
    activo = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'proveedor'
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


# ==================== TABLAS DE PRIMER NIVEL (dependen de tablas base) ====================

class Persona(models.Model):
    """Tabla de personas"""
    id_persona = models.AutoField(primary_key=True)
    id_rol = models.ForeignKey(
        Rol, 
        on_delete=models.PROTECT,
        db_column='id_rol',
        related_name='personas'
    )
    nombres = models.CharField(max_length=100)
    apellido_paterno = models.CharField(max_length=50)
    apellido_materno = models.CharField(max_length=50)
    ci = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=15, blank=True, null=True)
    
    class Meta:
        db_table = 'persona'
        verbose_name = 'Persona'
        verbose_name_plural = 'Personas'
        ordering = ['apellido_paterno', 'apellido_materno', 'nombres']
    
    def __str__(self):
        return f"{self.nombres} {self.apellido_paterno} {self.apellido_materno}"

class Usuario(models.Model):
    """Tabla de usuarios"""
    ROLES = [('ADMIN', 'Administrador'), ('VENDEDOR', 'Vendedor')]
    id_usuario = models.AutoField(primary_key=True)
    id_persona = models.OneToOneField(
        Persona,
        on_delete=models.CASCADE,
        db_column='id_persona',
        related_name='usuario'
    )
    email = models.EmailField(max_length=100, unique=True)
    password_hash = models.CharField(max_length=255)
    fecha_registro = models.DateField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    rol = models.CharField(max_length=20, choices=ROLES, default='VENDEDOR')
    ultimo_acceso = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'usuario'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['email']

    @property
    def is_authenticated(self):
        return self.activo

    @property
    def is_anonymous(self):
        return False
    
    def __str__(self):
        return f"{self.email} - {self.id_persona}"


class Venta(models.Model):
    """Tabla de ventas"""

    FORMAS_PAGO = [
        ('EFECTIVO', 'Efectivo'),
        ('TARJETA', 'Tarjeta'),
        ('TRANSFERENCIA', 'Transferencia'),
        ('QR', 'QR'),
    ]

    id_venta = models.AutoField(primary_key=True)
    
    # ✅ AGREGAR: Campo de usuario
    id_usuario = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        db_column='id_usuario',
        related_name='ventas_realizadas'
    )
    
    # ❌ ELIMINAR: Esta línea NO debe estar
    # id_producto = models.ForeignKey(Producto, ...)
    
    fecha_venta = models.DateTimeField(auto_now_add=True)  # ← Cambiar a DateTimeField
    
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    forma_pago = models.CharField(
        max_length=20,
        choices=FORMAS_PAGO,
        default='EFECTIVO'
    )
    
    observaciones = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'venta'
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'
        ordering = ['-fecha_venta']
    
    def __str__(self):
        return f"Venta #{self.id_venta} - {self.fecha_venta}"


class Inventario(models.Model):
    """Tabla de inventario"""
    ESTADOS = [
        ('NORMAL', 'Normal'),
        ('BAJO', 'Bajo'),
        ('CRITICO', 'Crítico'),
        ('SOBRESTOCK', 'Sobrestock'),
    ]
    
    id_inventario = models.AutoField(primary_key=True)
    id_producto = models.OneToOneField(
        Producto,
        on_delete=models.CASCADE,
        db_column='id_producto',
        related_name='inventario'
    )
    stock_actual = models.IntegerField(validators=[MinValueValidator(0)])
    stock_minimo = models.IntegerField(validators=[MinValueValidator(0)])
    stock_maximo = models.IntegerField(validators=[MinValueValidator(0)])
    punto_reorden = models.IntegerField(validators=[MinValueValidator(0)])
    demanda_promedio_diaria = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    tiempo_entrega_dias = models.IntegerField(validators=[MinValueValidator(0)])
    stock_seguridad = models.IntegerField(validators=[MinValueValidator(0)])
    ultima_venta = models.DateField(blank=True, null=True)
    ultima_compra = models.DateField(blank=True, null=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    estado_inventario = models.CharField(max_length=20, choices=ESTADOS, default='NORMAL')
    
    class Meta:
        db_table = 'inventario'
        verbose_name = 'Inventario'
        verbose_name_plural = 'Inventarios'
    
    def __str__(self):
        return f"Inventario {self.id_producto.nombre} - Stock: {self.stock_actual}"


class ProductoProveedor(models.Model):
    """Tabla de relación producto-proveedor"""
    id_prodprov = models.AutoField(primary_key=True)
    id_producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        db_column='id_producto',
        related_name='producto_proveedores'
    )
    id_proveedor = models.ForeignKey(
        Proveedor,
        on_delete=models.CASCADE,
        db_column='id_proveedor',
        related_name='producto_proveedores'
    )
    tiempo_entrega_dias = models.IntegerField(validators=[MinValueValidator(0)])
    precio_compra = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    es_proveedor_principal = models.BooleanField(default=False)
    fecha_registro = models.DateField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'producto_proveedor'
        verbose_name = 'Producto-Proveedor'
        verbose_name_plural = 'Productos-Proveedores'
        unique_together = ['id_producto', 'id_proveedor']
    
    def __str__(self):
        return f"{self.id_producto.nombre} - {self.id_proveedor.nombre}"


class SegmentoKmeans(models.Model):
    """Tabla de segmentación K-means"""
    id_segmento = models.AutoField(primary_key=True)
    id_producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        db_column='id_producto',
        related_name='segmentos_kmeans'
    )
    cluster_label = models.IntegerField()
    fecha_segmento = models.DateField(auto_now_add=True)
    
    class Meta:
        db_table = 'segmento_kmeans'
        verbose_name = 'Segmento K-means'
        verbose_name_plural = 'Segmentos K-means'
        ordering = ['-fecha_segmento']
    
    def __str__(self):
        return f"Segmento {self.cluster_label} - {self.id_producto.nombre}"


class ClasificacionAbc(models.Model):
    """Tabla de clasificación ABC"""
    CATEGORIAS_ABC = [
        ('A', 'Categoría A'),
        ('B', 'Categoría B'),
        ('C', 'Categoría C'),
    ]
    
    id_clasificacion = models.AutoField(primary_key=True)
    id_producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        db_column='id_producto',
        related_name='clasificaciones_abc'
    )
    categoria_abc = models.CharField(max_length=1, choices=CATEGORIAS_ABC)
    fecha_clasificacion = models.DateField(auto_now_add=True)
    ventas_acumuladas = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    
    class Meta:
        db_table = 'clasificacion_abc'
        verbose_name = 'Clasificación ABC'
        verbose_name_plural = 'Clasificaciones ABC'
        ordering = ['categoria_abc', '-ventas_acumuladas']
    
    def __str__(self):
        return f"{self.id_producto.nombre} - Categoría {self.categoria_abc}"


# ==================== TABLAS DE SEGUNDO NIVEL ====================

class Compra(models.Model):
    """Tabla de compras"""
    ESTADOS = [
        ('PENDIENTE', 'Pendiente'),
        ('RECIBIDA', 'Recibida'),
        ('CANCELADA', 'Cancelada'),
    ]
    FORMAS_PAGO = [
        ('EFECTIVO', 'Efectivo'),
        ('TARJETA', 'Tarjeta'),
        ('TRANSFERENCIA', 'Transferencia'),
        ('CREDITO', 'Crédito'),
    ]
    id_compra = models.AutoField(primary_key=True)
    id_proveedor = models.ForeignKey(
        Proveedor,
        on_delete=models.PROTECT,
        db_column='id_proveedor',
        related_name='compras'
    )
    id_usuario = models.ForeignKey(        # ✅ AGREGADO
        Usuario,
        on_delete=models.PROTECT,
        db_column='id_usuario',
        related_name='compras',
        null=True, blank=True
    )
    fecha_compra = models.DateTimeField(auto_now_add=True)
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    estado = models.CharField(             # ✅ AGREGADO
        max_length=20,
        choices=ESTADOS,
        default='PENDIENTE'
    )
    forma_pago = models.CharField(         # ✅ AGREGADO
        max_length=20,
        choices=FORMAS_PAGO,
        default='EFECTIVO'
    )
    observaciones = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'compra'
        verbose_name = 'Compra'
        verbose_name_plural = 'Compras'
        ordering = ['-fecha_compra']
    
    def __str__(self):
        return f"Compra #{self.id_compra} - {self.id_proveedor.nombre}"


class DetalleVenta(models.Model):
    """Tabla de detalle de ventas"""
    id_detalleventa = models.AutoField(primary_key=True)
    id_venta = models.ForeignKey(
        Venta,
        on_delete=models.CASCADE,
        db_column='id_venta',
        related_name='detalleventa_set'
    )
    id_producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT,
        db_column='id_producto',
        related_name='detalles_venta'
    )
    cantidad = models.IntegerField(validators=[MinValueValidator(1)])
    precio_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    
    class Meta:
        db_table = 'detalleventa'
        verbose_name = 'Detalle de Venta'
        verbose_name_plural = 'Detalles de Ventas'
    
    def __str__(self):
        return f"Detalle Venta #{self.id_venta.id_venta} - {self.id_producto.nombre}"
    
    def save(self, *args, **kwargs):
        # Calcular subtotal automáticamente
        self.subtotal = self.cantidad * self.precio_unitario
        super().save(*args, **kwargs)


class DetalleCompra(models.Model):
    """Tabla de detalle de compras"""
    id_detallecompra = models.AutoField(primary_key=True)
    id_compra = models.ForeignKey(
        Compra,
        on_delete=models.CASCADE,
        db_column='id_compra',
        related_name='detalles'
    )
    id_producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT,
        db_column='id_producto',
        related_name='detalles_compra',
        null=True,  
        blank=True,
    )
    cantidad = models.IntegerField(validators=[MinValueValidator(1)])
    precio_unitario = models.DecimalField(  # ✅ AGREGADO
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    
    class Meta:
        db_table = 'detallecompra'
        verbose_name = 'Detalle de Compra'
        verbose_name_plural = 'Detalles de Compras'
    
    def __str__(self):
        return f"Detalle Compra #{self.id_compra.id_compra} - {self.id_producto.nombre}"


# ==================== TABLAS DE TERCER NIVEL ====================

class OrdenReabastecimiento(models.Model):
    """Tabla de órdenes de reabastecimiento"""
    ESTADOS = [
        ('PENDIENTE', 'Pendiente'),
        ('APROBADA', 'Aprobada'),
        ('RECHAZADA', 'Rechazada'),
        ('PROCESADA', 'Procesada'),
    ]
    
    PRIORIDADES = [
        ('BAJA', 'Baja'),
        ('MEDIA', 'Media'),
        ('ALTA', 'Alta'),
        ('URGENTE', 'Urgente'),
    ]
    
    MOTIVOS = [
        ('STOCK_BAJO', 'Stock Bajo'),
        ('STOCK_CRITICO', 'Stock Crítico'),
        ('REORDEN', 'Punto de Reorden'),
        ('DEMANDA_ALTA', 'Demanda Alta'),
        ('MANUAL', 'Manual'),
    ]
    
    id_orden = models.AutoField(primary_key=True)
    id_producto = models.ForeignKey(
        Producto,
        on_delete=models.PROTECT,
        db_column='id_producto',
        related_name='ordenes_reabastecimiento'
    )
    id_usuario = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        db_column='id_usuario',
        related_name='ordenes_reabastecimiento'
    )
    id_compra = models.ForeignKey(
        Compra,
        on_delete=models.SET_NULL,
        db_column='id_compra',
        related_name='ordenes_reabastecimiento',
        blank=True,
        null=True
    )
    cantidad_sugerida = models.IntegerField(validators=[MinValueValidator(1)])
    fecha_sugerencia = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    prioridad = models.CharField(max_length=10, choices=PRIORIDADES, default='MEDIA')
    motivo = models.CharField(max_length=50, choices=MOTIVOS)
    fecha_aprobacion = models.DateTimeField(blank=True, null=True)
    notas = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'orden_reabastecimiento'
        verbose_name = 'Orden de Reabastecimiento'
        verbose_name_plural = 'Órdenes de Reabastecimiento'
        ordering = ['-fecha_sugerencia', 'prioridad']
    
    def __str__(self):
        return f"Orden #{self.id_orden} - {self.id_producto.nombre} - {self.estado}"


class HistorialInventario(models.Model):
    """Tabla de historial de inventario"""
    TIPOS_MOVIMIENTO = [
        ('ENTRADA_COMPRA', 'Entrada por Compra'),
        ('SALIDA_VENTA', 'Salida por Venta'),
        ('AJUSTE_POSITIVO', 'Ajuste Positivo'),
        ('AJUSTE_NEGATIVO', 'Ajuste Negativo'),
        ('DEVOLUCION', 'Devolución'),
        ('MERMA', 'Merma'),
    ]
    
    id_historial = models.AutoField(primary_key=True)
    id_producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        db_column='id_producto',
        related_name='historial_inventario'
    )
    id_usuario = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='id_usuario',
        related_name='historial_inventario'
    )
    id_compra = models.ForeignKey(
        Compra,
        on_delete=models.SET_NULL,
        db_column='id_compra',
        related_name='historial_inventario',
        blank=True,
        null=True
    )
    id_venta = models.ForeignKey(
        Venta,
        on_delete=models.SET_NULL,
        db_column='id_venta',
        related_name='historial_inventario',
        blank=True,
        null=True
    )
    fecha_registro = models.DateTimeField(auto_now_add=True)
    stock_anterior = models.IntegerField()
    stock_nuevo = models.IntegerField()
    tipo_movimiento = models.CharField(max_length=20, choices=TIPOS_MOVIMIENTO)
    observaciones = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'historial_inventario'
        verbose_name = 'Historial de Inventario'
        verbose_name_plural = 'Historiales de Inventario'
        ordering = ['-fecha_registro']
    
    def __str__(self):
        return f"Historial #{self.id_historial} - {self.id_producto.nombre} - {self.tipo_movimiento}"