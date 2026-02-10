from django.core.management.base import BaseCommand
from api.models import (
    HistorialInventario, OrdenReabastecimiento, DetalleCompra, DetalleVenta,
    Compra, Venta, ClasificacionAbc, SegmentoKmeans, ProductoProveedor,
    Inventario, Usuario, Persona, Proveedor, Producto, Rol
)


class Command(BaseCommand):
    help = 'Eliminar todos los datos de prueba (mantiene las tablas intactas)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirmar',
            action='store_true',
            help='Confirmar que deseas eliminar todos los datos',
        )

    def handle(self, *args, **kwargs):
        confirmar = kwargs.get('confirmar')
        
        self.stdout.write(self.style.WARNING('\n' + '='*70))
        self.stdout.write(self.style.WARNING('⚠️  ADVERTENCIA: ELIMINACIÓN DE DATOS'))
        self.stdout.write(self.style.WARNING('='*70 + '\n'))
        
        if not confirmar:
            self.stdout.write(self.style.ERROR('Este comando eliminará TODOS los datos de las siguientes tablas:\n'))
            self.stdout.write('  • Historial de Inventario')
            self.stdout.write('  • Órdenes de Reabastecimiento')
            self.stdout.write('  • Detalles de Compra')
            self.stdout.write('  • Detalles de Venta')
            self.stdout.write('  • Compras')
            self.stdout.write('  • Ventas')
            self.stdout.write('  • Clasificaciones ABC')
            self.stdout.write('  • Segmentos K-means')
            self.stdout.write('  • Producto-Proveedor')
            self.stdout.write('  • Inventarios')
            self.stdout.write('  • Usuarios')
            self.stdout.write('  • Personas')
            self.stdout.write('  • Proveedores')
            self.stdout.write('  • Productos')
            self.stdout.write('  • Roles')
            
            self.stdout.write(self.style.WARNING('\n⚠️  Las tablas NO se eliminarán, solo sus datos.'))
            self.stdout.write(self.style.WARNING('⚠️  Esta acción NO se puede deshacer.\n'))
            self.stdout.write(self.style.ERROR('Para ejecutar, usa: python manage.py limpiar_datos --confirmar\n'))
            return
        
        # Preguntar una vez más
        self.stdout.write(self.style.ERROR('\n¿Estás ABSOLUTAMENTE seguro de que deseas eliminar todos los datos?'))
        respuesta = input('Escribe "SI" (en mayúsculas) para confirmar: ')
        
        if respuesta != 'SI':
            self.stdout.write(self.style.SUCCESS('\n✓ Operación cancelada. No se eliminó ningún dato.\n'))
            return
        
        self.stdout.write(self.style.WARNING('\n🗑️  Eliminando datos...\n'))
        
        try:
            # IMPORTANTE: Eliminar en orden inverso a la creación para respetar las FK
            
            # Nivel 3 (más dependencias)
            count = HistorialInventario.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Historial de Inventario: {count} registros eliminados')
            
            count = OrdenReabastecimiento.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Órdenes de Reabastecimiento: {count} registros eliminados')
            
            # Nivel 2
            count = DetalleCompra.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Detalles de Compra: {count} registros eliminados')
            
            count = DetalleVenta.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Detalles de Venta: {count} registros eliminados')
            
            count = Compra.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Compras: {count} registros eliminados')
            
            count = Venta.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Ventas: {count} registros eliminados')
            
            count = Usuario.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Usuarios: {count} registros eliminados')
            
            # Nivel 1
            count = ClasificacionAbc.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Clasificaciones ABC: {count} registros eliminados')
            
            count = SegmentoKmeans.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Segmentos K-means: {count} registros eliminados')
            
            count = ProductoProveedor.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Producto-Proveedor: {count} registros eliminados')
            
            count = Inventario.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Inventarios: {count} registros eliminados')
            
            count = Persona.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Personas: {count} registros eliminados')
            
            # Nivel 0 (sin dependencias)
            count = Proveedor.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Proveedores: {count} registros eliminados')
            
            count = Producto.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Productos: {count} registros eliminados')
            
            count = Rol.objects.all().delete()[0]
            self.stdout.write(f'  ✓ Roles: {count} registros eliminados')
            
            self.stdout.write(self.style.SUCCESS('\n✅ ¡Todos los datos han sido eliminados exitosamente!'))
            self.stdout.write(self.style.SUCCESS('✅ Las tablas siguen intactas y listas para nuevos datos.\n'))
            
            # Verificar que las tablas están vacías
            self.stdout.write(self.style.WARNING('📊 Verificación final:\n'))
            
            tablas = [
                ('Roles', Rol),
                ('Personas', Persona),
                ('Usuarios', Usuario),
                ('Productos', Producto),
                ('Proveedores', Proveedor),
                ('Inventarios', Inventario),
                ('Ventas', Venta),
                ('Compras', Compra),
            ]
            
            for nombre, modelo in tablas:
                count = modelo.objects.count()
                if count == 0:
                    self.stdout.write(f'  ✓ {nombre}: 0 registros')
                else:
                    self.stdout.write(self.style.WARNING(f'  ⚠️  {nombre}: {count} registros (algunos quedaron)'))
            
            self.stdout.write(self.style.SUCCESS('\n🎉 Base de datos limpia y lista para el desarrollo.\n'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error al eliminar datos: {str(e)}\n'))
            self.stdout.write(self.style.WARNING('Algunos datos pueden haber sido eliminados antes del error.'))
            self.stdout.write(self.style.WARNING('Ejecuta el comando de nuevo para terminar la limpieza.\n'))