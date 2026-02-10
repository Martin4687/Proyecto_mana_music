import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.core.management.base import BaseCommand
from api.models import (
    Rol, Persona, Usuario, Producto, Proveedor, ProductoProveedor,
    Inventario, Venta, DetalleVenta, Compra, DetalleCompra
)
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
import random


class Command(BaseCommand):
    help = 'Poblar la base de datos con datos de prueba'

    def handle(self, *args, **kwargs):
        self.stdout.write("🚀 Iniciando población de base de datos...\n")

        # ==================== ROLES ====================
        self.stdout.write("\n📋 Creando Roles...")
        roles_data = [
            {'nombre_rol': 'Administrador'},
            {'nombre_rol': 'Vendedor'},
            {'nombre_rol': 'Almacenero'},
            {'nombre_rol': 'Gerente'},
        ]

        roles = []
        for rol_data in roles_data:
            rol, created = Rol.objects.get_or_create(**rol_data)
            roles.append(rol)
            if created:
                self.stdout.write(f"  ✓ Rol creado: {rol.nombre_rol}")

        # ==================== PERSONAS ====================
        self.stdout.write("\n👥 Creando Personas...")
        personas_data = [
            {
                'id_rol': roles[0],
                'nombres': 'Juan Carlos',
                'apellido_paterno': 'Pérez',
                'apellido_materno': 'González',
                'ci': '12345678',
                'telefono': '70123456'
            },
            {
                'id_rol': roles[1],
                'nombres': 'María Elena',
                'apellido_paterno': 'Rodríguez',
                'apellido_materno': 'López',
                'ci': '23456789',
                'telefono': '71234567'
            },
            {
                'id_rol': roles[2],
                'nombres': 'Pedro José',
                'apellido_paterno': 'Martínez',
                'apellido_materno': 'Sánchez',
                'ci': '34567890',
                'telefono': '72345678'
            },
            {
                'id_rol': roles[3],
                'nombres': 'Ana Sofía',
                'apellido_paterno': 'García',
                'apellido_materno': 'Fernández',
                'ci': '45678901',
                'telefono': '73456789'
            },
        ]

        personas = []
        for persona_data in personas_data:
            persona, created = Persona.objects.get_or_create(
                ci=persona_data['ci'],
                defaults=persona_data
            )
            personas.append(persona)
            if created:
                self.stdout.write(f"  ✓ Persona creada: {persona}")

        # ==================== USUARIOS ====================
        self.stdout.write("\n🔐 Creando Usuarios...")
        usuarios_data = [
            {
                'id_persona': personas[0],
                'email': 'admin@manamusic.com',
                'password_hash': 'hashed_password_1',
                'activo': True
            },
            {
                'id_persona': personas[1],
                'email': 'vendedor@manamusic.com',
                'password_hash': 'hashed_password_2',
                'activo': True
            },
            {
                'id_persona': personas[2],
                'email': 'almacen@manamusic.com',
                'password_hash': 'hashed_password_3',
                'activo': True
            },
            {
                'id_persona': personas[3],
                'email': 'gerente@manamusic.com',
                'password_hash': 'hashed_password_4',
                'activo': True
            },
        ]

        usuarios = []
        for usuario_data in usuarios_data:
            usuario, created = Usuario.objects.get_or_create(
                email=usuario_data['email'],
                defaults=usuario_data
            )
            usuarios.append(usuario)
            if created:
                self.stdout.write(f"  ✓ Usuario creado: {usuario.email}")

        # ==================== PRODUCTOS ====================
        self.stdout.write("\n📦 Creando Productos...")
        productos_data = [
            {
                'nombre': 'Guitarra Acústica Yamaha',
                'descripcion': 'Guitarra acústica de 6 cuerdas',
                'precio_unitario': Decimal('1500.00'),
                'unidad_medida': 'UND',
                'categoria': 'PRODUCTO_TERMINADO'
            },
            {
                'nombre': 'Cuerdas para Guitarra',
                'descripcion': 'Set de 6 cuerdas de acero',
                'precio_unitario': Decimal('45.00'),
                'unidad_medida': 'UND',
                'categoria': 'INSUMO'
            },
            {
                'nombre': 'Piano Digital Casio',
                'descripcion': 'Piano digital de 88 teclas',
                'precio_unitario': Decimal('3500.00'),
                'unidad_medida': 'UND',
                'categoria': 'PRODUCTO_TERMINADO'
            },
            {
                'nombre': 'Batería Acústica Pearl',
                'descripcion': 'Set completo de batería acústica',
                'precio_unitario': Decimal('5000.00'),
                'unidad_medida': 'UND',
                'categoria': 'PRODUCTO_TERMINADO'
            },
            {
                'nombre': 'Baquetas de Batería',
                'descripcion': 'Par de baquetas profesionales',
                'precio_unitario': Decimal('35.00'),
                'unidad_medida': 'UND',
                'categoria': 'INSUMO'
            },
            {
                'nombre': 'Amplificador Marshall',
                'descripcion': 'Amplificador de guitarra 50W',
                'precio_unitario': Decimal('2200.00'),
                'unidad_medida': 'UND',
                'categoria': 'PRODUCTO_TERMINADO'
            },
            {
                'nombre': 'Cable de Audio Jack',
                'descripcion': 'Cable de audio profesional 3m',
                'precio_unitario': Decimal('75.00'),
                'unidad_medida': 'UND',
                'categoria': 'INSUMO'
            },
            {
                'nombre': 'Micrófono Shure SM58',
                'descripcion': 'Micrófono dinámico profesional',
                'precio_unitario': Decimal('650.00'),
                'unidad_medida': 'UND',
                'categoria': 'PRODUCTO_TERMINADO'
            },
        ]

        productos = []
        for producto_data in productos_data:
            producto, created = Producto.objects.get_or_create(
                nombre=producto_data['nombre'],
                defaults=producto_data
            )
            productos.append(producto)
            if created:
                self.stdout.write(f"  ✓ Producto creado: {producto.nombre}")

        # ==================== PROVEEDORES ====================
        self.stdout.write("\n🏢 Creando Proveedores...")
        proveedores_data = [
            {
                'nombre': 'Distribuidora Musical S.A.',
                'contacto': 'Carlos Méndez',
                'telefono': '22123456',
                'email': 'ventas@distmusical.com',
                'direccion': 'Av. Principal #123, La Paz'
            },
            {
                'nombre': 'Importadora de Instrumentos',
                'contacto': 'Laura Torres',
                'telefono': '22234567',
                'email': 'contacto@importinst.com',
                'direccion': 'Calle Comercio #456, La Paz'
            },
            {
                'nombre': 'Accesorios Musicales Ltda.',
                'contacto': 'Roberto Vargas',
                'telefono': '22345678',
                'email': 'info@accmusical.com',
                'direccion': 'Zona Sur, Calle 15 #789'
            },
        ]

        proveedores = []
        for proveedor_data in proveedores_data:
            proveedor, created = Proveedor.objects.get_or_create(
                email=proveedor_data['email'],
                defaults=proveedor_data
            )
            proveedores.append(proveedor)
            if created:
                self.stdout.write(f"  ✓ Proveedor creado: {proveedor.nombre}")

        # ==================== PRODUCTO-PROVEEDOR ====================
        self.stdout.write("\n🔗 Creando relaciones Producto-Proveedor...")
        producto_proveedor_data = [
            {'id_producto': productos[0], 'id_proveedor': proveedores[0], 'precio_compra': Decimal('1200.00'), 'tiempo_entrega_dias': 5, 'es_proveedor_principal': True},
            {'id_producto': productos[2], 'id_proveedor': proveedores[0], 'precio_compra': Decimal('2800.00'), 'tiempo_entrega_dias': 7, 'es_proveedor_principal': True},
            {'id_producto': productos[5], 'id_proveedor': proveedores[0], 'precio_compra': Decimal('1800.00'), 'tiempo_entrega_dias': 5, 'es_proveedor_principal': True},
            {'id_producto': productos[3], 'id_proveedor': proveedores[1], 'precio_compra': Decimal('4000.00'), 'tiempo_entrega_dias': 10, 'es_proveedor_principal': True},
            {'id_producto': productos[7], 'id_proveedor': proveedores[1], 'precio_compra': Decimal('520.00'), 'tiempo_entrega_dias': 7, 'es_proveedor_principal': True},
            {'id_producto': productos[1], 'id_proveedor': proveedores[2], 'precio_compra': Decimal('35.00'), 'tiempo_entrega_dias': 2, 'es_proveedor_principal': True},
            {'id_producto': productos[4], 'id_proveedor': proveedores[2], 'precio_compra': Decimal('28.00'), 'tiempo_entrega_dias': 2, 'es_proveedor_principal': True},
            {'id_producto': productos[6], 'id_proveedor': proveedores[2], 'precio_compra': Decimal('60.00'), 'tiempo_entrega_dias': 3, 'es_proveedor_principal': True},
        ]

        for pp_data in producto_proveedor_data:
            pp, created = ProductoProveedor.objects.get_or_create(
                id_producto=pp_data['id_producto'],
                id_proveedor=pp_data['id_proveedor'],
                defaults=pp_data
            )
            if created:
                self.stdout.write(f"  ✓ Relación creada: {pp}")

        # ==================== INVENTARIOS ====================
        self.stdout.write("\n📊 Creando Inventarios...")
        for producto in productos:
            stock_actual = random.randint(5, 50)
            inventario, created = Inventario.objects.get_or_create(
                id_producto=producto,
                defaults={
                    'stock_actual': stock_actual,
                    'stock_minimo': 5,
                    'stock_maximo': 100,
                    'punto_reorden': 10,
                    'demanda_promedio_diaria': Decimal('2.5'),
                    'tiempo_entrega_dias': 5,
                    'stock_seguridad': 3,
                    'ultima_venta': date.today() - timedelta(days=random.randint(1, 30)),
                    'ultima_compra': date.today() - timedelta(days=random.randint(1, 60)),
                    'estado_inventario': 'NORMAL' if stock_actual > 10 else 'BAJO'
                }
            )
            if created:
                self.stdout.write(f"  ✓ Inventario creado: {producto.nombre} - Stock: {stock_actual}")

        # ==================== COMPRAS ====================
        self.stdout.write("\n🛒 Creando Compras...")
        for i in range(5):
            producto = random.choice(productos)
            proveedor = random.choice(proveedores)
            cantidad = random.randint(5, 20)
            precio_unitario = producto.precio_unitario * Decimal('0.8')
            
            compra = Compra.objects.create(
                id_proveedor=proveedor,
                id_producto=producto,
                total=cantidad * precio_unitario
            )
            
            DetalleCompra.objects.create(
                id_compra=compra,
                id_producto=producto,
                cantidad=cantidad,
                subtotal=cantidad * precio_unitario
            )
            
            self.stdout.write(f"  ✓ Compra creada: {compra}")

        # ==================== VENTAS ====================
        self.stdout.write("\n💰 Creando Ventas...")
        for i in range(10):
            producto = random.choice(productos)
            cantidad = random.randint(1, 5)
            
            venta = Venta.objects.create(
                id_producto=producto,
                total=cantidad * producto.precio_unitario
            )
            
            DetalleVenta.objects.create(
                id_venta=venta,
                id_producto=producto,
                cantidad=cantidad,
                precio_unitario=producto.precio_unitario
            )
            
            self.stdout.write(f"  ✓ Venta creada: {venta}")

        self.stdout.write("\n✅ ¡Base de datos poblada exitosamente!")
        self.stdout.write(f"\n📈 Resumen:")
        self.stdout.write(f"  - Roles: {Rol.objects.count()}")
        self.stdout.write(f"  - Personas: {Persona.objects.count()}")
        self.stdout.write(f"  - Usuarios: {Usuario.objects.count()}")
        self.stdout.write(f"  - Productos: {Producto.objects.count()}")
        self.stdout.write(f"  - Proveedores: {Proveedor.objects.count()}")
        self.stdout.write(f"  - Inventarios: {Inventario.objects.count()}")
        self.stdout.write(f"  - Compras: {Compra.objects.count()}")
        self.stdout.write(f"  - Ventas: {Venta.objects.count()}")
        
        self.stdout.write(self.style.SUCCESS('\n🎉 ¡Proceso completado!'))