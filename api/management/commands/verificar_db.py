from django.core.management.base import BaseCommand
from django.db import connection
from api.models import (
    Rol, Persona, Usuario, Producto, Venta, DetalleVenta,
    Inventario, Compra, DetalleCompra, OrdenReabastecimiento,
    Proveedor, HistorialInventario, ProductoProveedor,
    SegmentoKmeans, ClasificacionAbc
)


class Command(BaseCommand):
    help = 'Verificar la integridad de la base de datos'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS('🔍 VERIFICACIÓN DE BASE DE DATOS - MANA MUSIC'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))

        # ==================== CONTEO DE REGISTROS ====================
        self.stdout.write(self.style.WARNING('📊 CONTEO DE REGISTROS POR TABLA:\n'))
        
        tablas = [
            ('Roles', Rol),
            ('Personas', Persona),
            ('Usuarios', Usuario),
            ('Productos', Producto),
            ('Proveedores', Proveedor),
            ('Producto-Proveedor', ProductoProveedor),
            ('Inventarios', Inventario),
            ('Ventas', Venta),
            ('Detalles de Venta', DetalleVenta),
            ('Compras', Compra),
            ('Detalles de Compra', DetalleCompra),
            ('Órdenes de Reabastecimiento', OrdenReabastecimiento),
            ('Historial de Inventario', HistorialInventario),
            ('Segmentos K-means', SegmentoKmeans),
            ('Clasificaciones ABC', ClasificacionAbc),
        ]
        
        total_registros = 0
        for nombre, modelo in tablas:
            count = modelo.objects.count()
            total_registros += count
            status = '✓' if count > 0 else '✗'
            color = self.style.SUCCESS if count > 0 else self.style.ERROR
            self.stdout.write(color(f'  {status} {nombre:.<40} {count:>5} registros'))
        
        self.stdout.write(f'\n  Total de registros en la BD: {total_registros}\n')

        # ==================== VERIFICAR RELACIONES ====================
        self.stdout.write(self.style.WARNING('\n🔗 VERIFICACIÓN DE RELACIONES:\n'))
        
        # 1. Personas tienen roles
        personas_sin_rol = Persona.objects.filter(id_rol__isnull=True).count()
        self.verificar('Todas las personas tienen rol asignado', personas_sin_rol == 0)
        
        # 2. Usuarios tienen personas
        usuarios_sin_persona = Usuario.objects.filter(id_persona__isnull=True).count()
        self.verificar('Todos los usuarios tienen persona asignada', usuarios_sin_persona == 0)
        
        # 3. Inventarios tienen productos
        inventarios_sin_producto = Inventario.objects.filter(id_producto__isnull=True).count()
        self.verificar('Todos los inventarios tienen producto asignado', inventarios_sin_producto == 0)
        
        # 4. Ventas tienen productos
        ventas_sin_producto = Venta.objects.filter(id_producto__isnull=True).count()
        self.verificar('Todas las ventas tienen producto asignado', ventas_sin_producto == 0)
        
        # 5. Compras tienen proveedor y producto
        compras_sin_proveedor = Compra.objects.filter(id_proveedor__isnull=True).count()
        compras_sin_producto = Compra.objects.filter(id_producto__isnull=True).count()
        self.verificar('Todas las compras tienen proveedor y producto', 
                      compras_sin_proveedor == 0 and compras_sin_producto == 0)
        
        # 6. DetalleVenta tiene venta y producto
        detalles_venta_invalidos = DetalleVenta.objects.filter(
            id_venta__isnull=True
        ).count() + DetalleVenta.objects.filter(id_producto__isnull=True).count()
        self.verificar('Todos los detalles de venta son válidos', detalles_venta_invalidos == 0)
        
        # 7. DetalleCompra tiene compra y producto
        detalles_compra_invalidos = DetalleCompra.objects.filter(
            id_compra__isnull=True
        ).count() + DetalleCompra.objects.filter(id_producto__isnull=True).count()
        self.verificar('Todos los detalles de compra son válidos', detalles_compra_invalidos == 0)

        # ==================== DATOS DE EJEMPLO ====================
        self.stdout.write(self.style.WARNING('\n📋 EJEMPLOS DE DATOS:\n'))
        
        # Mostrar algunos roles
        self.stdout.write('  Roles registrados:')
        for rol in Rol.objects.all()[:5]:
            self.stdout.write(f'    • {rol.nombre_rol}')
        
        # Mostrar algunos productos
        self.stdout.write('\n  Productos registrados:')
        for producto in Producto.objects.all()[:5]:
            self.stdout.write(f'    • {producto.nombre} - ${producto.precio_unitario} ({producto.categoria})')
        
        # Mostrar algunos proveedores
        self.stdout.write('\n  Proveedores registrados:')
        for proveedor in Proveedor.objects.all()[:3]:
            self.stdout.write(f'    • {proveedor.nombre} - {proveedor.email}')
        
        # Mostrar inventario
        self.stdout.write('\n  Estado del inventario:')
        for inv in Inventario.objects.all()[:5]:
            self.stdout.write(
                f'    • {inv.id_producto.nombre}: Stock={inv.stock_actual}, '
                f'Mín={inv.stock_minimo}, Máx={inv.stock_maximo}, Estado={inv.estado_inventario}'
            )

        # ==================== VALIDACIONES DE NEGOCIO ====================
        self.stdout.write(self.style.WARNING('\n💼 VALIDACIONES DE NEGOCIO:\n'))
        
        # 1. Stock actual no debe ser negativo
        inventarios_negativos = Inventario.objects.filter(stock_actual__lt=0).count()
        self.verificar('No hay stock negativo', inventarios_negativos == 0)
        
        # 2. Precios deben ser mayores a 0
        productos_precio_invalido = Producto.objects.filter(precio_unitario__lte=0).count()
        self.verificar('Todos los productos tienen precio válido', productos_precio_invalido == 0)
        
        # 3. Cantidades en ventas deben ser mayores a 0
        detalles_venta_invalidos = DetalleVenta.objects.filter(cantidad__lte=0).count()
        self.verificar('Todas las cantidades de venta son válidas', detalles_venta_invalidos == 0)
        
        # 4. Subtotales calculados correctamente en ventas
        detalles_incorrectos = 0
        for detalle in DetalleVenta.objects.all():
            subtotal_esperado = detalle.cantidad * detalle.precio_unitario
            if abs(detalle.subtotal - subtotal_esperado) > 0.01:
                detalles_incorrectos += 1
        self.verificar('Subtotales de ventas calculados correctamente', detalles_incorrectos == 0)
        
        # 5. Stock mínimo menor que stock máximo
        inventarios_config_invalida = Inventario.objects.filter(
            stock_minimo__gte=models.F('stock_maximo')
        ).count()
        self.verificar('Configuración de stock (mín < máx) es válida', inventarios_config_invalida == 0)
        
        # 6. Emails únicos en usuarios
        emails_duplicados = Usuario.objects.values('email').annotate(
            count=models.Count('email')
        ).filter(count__gt=1).count()
        self.verificar('No hay emails duplicados en usuarios', emails_duplicados == 0)
        
        # 7. CIs únicos en personas
        cis_duplicados = Persona.objects.values('ci').annotate(
            count=models.Count('ci')
        ).filter(count__gt=1).count()
        self.verificar('No hay CIs duplicados en personas', cis_duplicados == 0)

        # ==================== ESTADÍSTICAS ====================
        self.stdout.write(self.style.WARNING('\n📈 ESTADÍSTICAS:\n'))
        
        # Total de ventas
        from django.db.models import Sum, Avg, Count
        total_ventas = Venta.objects.aggregate(total=Sum('total'))['total'] or 0
        self.stdout.write(f'  💰 Total de ventas: ${total_ventas:.2f}')
        
        # Total de compras
        total_compras = Compra.objects.aggregate(total=Sum('total'))['total'] or 0
        self.stdout.write(f'  🛒 Total de compras: ${total_compras:.2f}')
        
        # Promedio de precio de productos
        precio_promedio = Producto.objects.filter(activo=True).aggregate(
            promedio=Avg('precio_unitario')
        )['promedio'] or 0
        self.stdout.write(f'  📊 Precio promedio de productos: ${precio_promedio:.2f}')
        
        # Productos más vendidos
        self.stdout.write('\n  🏆 Top 3 productos más vendidos:')
        productos_vendidos = DetalleVenta.objects.values(
            'id_producto__nombre'
        ).annotate(
            total_vendido=Sum('cantidad')
        ).order_by('-total_vendido')[:3]
        
        for i, item in enumerate(productos_vendidos, 1):
            self.stdout.write(f'    {i}. {item["id_producto__nombre"]}: {item["total_vendido"]} unidades')
        
        # Inventarios críticos
        inventarios_criticos = Inventario.objects.filter(
            stock_actual__lte=models.F('stock_minimo')
        ).count()
        color = self.style.ERROR if inventarios_criticos > 0 else self.style.SUCCESS
        self.stdout.write(color(f'\n  ⚠️  Productos con stock crítico: {inventarios_criticos}'))
        
        if inventarios_criticos > 0:
            self.stdout.write('\n  Productos que requieren reabastecimiento:')
            for inv in Inventario.objects.filter(stock_actual__lte=models.F('stock_minimo'))[:5]:
                self.stdout.write(
                    f'    • {inv.id_producto.nombre}: Stock actual={inv.stock_actual}, '
                    f'Mínimo={inv.stock_minimo}'
                )

        # ==================== VERIFICACIÓN DE TABLAS EN PostgreSQL ====================
        self.stdout.write(self.style.WARNING('\n🗄️  TABLAS EN POSTGRESQL:\n'))
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)
            tablas_db = cursor.fetchall()
            
            self.stdout.write(f'  Total de tablas creadas: {len(tablas_db)}')
            self.stdout.write('\n  Tablas del sistema:')
            for tabla in tablas_db:
                tabla_nombre = tabla[0]
                if not tabla_nombre.startswith('django_') and not tabla_nombre.startswith('auth_'):
                    cursor.execute(f"SELECT COUNT(*) FROM {tabla_nombre};")
                    count = cursor.fetchone()[0]
                    self.stdout.write(f'    • {tabla_nombre}: {count} registros')

        # ==================== RESUMEN FINAL ====================
        self.stdout.write(self.style.SUCCESS('\n' + '='*70))
        self.stdout.write(self.style.SUCCESS('✅ VERIFICACIÓN COMPLETADA'))
        self.stdout.write(self.style.SUCCESS('='*70 + '\n'))

    def verificar(self, mensaje, condicion):
        """Helper para verificar condiciones"""
        if condicion:
            self.stdout.write(self.style.SUCCESS(f'  ✓ {mensaje}'))
        else:
            self.stdout.write(self.style.ERROR(f'  ✗ {mensaje}'))


# Importar models para las validaciones
from django.db import models