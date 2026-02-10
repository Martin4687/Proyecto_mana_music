"""
Script para probar todos los endpoints de la API
Ejecutar: python manage.py test_api
"""

from django.core.management.base import BaseCommand
import requests
import json
from colorama import init, Fore, Style

init(autoreset=True)

class Command(BaseCommand):
    help = 'Probar todos los endpoints de la API'
    
    def __init__(self):
        super().__init__()
        self.base_url = 'http://localhost:8000/api'
        self.resultados = {
            'exitosos': 0,
            'fallidos': 0,
            'total': 0
        }

    def handle(self, *args, **kwargs):
        self.stdout.write(Fore.CYAN + Style.BRIGHT + '\n' + '='*80)
        self.stdout.write(Fore.CYAN + Style.BRIGHT + '🧪 PRUEBAS DE API - MANA MUSIC')
        self.stdout.write(Fore.CYAN + Style.BRIGHT + '='*80 + '\n')

        # Verificar que el servidor esté corriendo
        if not self.verificar_servidor():
            self.stdout.write(Fore.RED + '\n❌ El servidor no está corriendo en http://localhost:8000')
            self.stdout.write(Fore.YELLOW + '   Ejecuta: python manage.py runserver\n')
            return

        # Ejecutar todas las pruebas
        self.probar_roles()
        self.probar_personas()
        self.probar_usuarios()
        self.probar_productos()
        self.probar_proveedores()
        self.probar_inventarios()
        self.probar_ventas()
        self.probar_compras()
        self.probar_ordenes_reabastecimiento()
        
        # Mostrar resumen
        self.mostrar_resumen()

    def verificar_servidor(self):
        """Verificar que el servidor Django esté corriendo"""
        try:
            response = requests.get('http://localhost:8000', timeout=2)
            return True
        except requests.exceptions.ConnectionError:
            return False

    def test_endpoint(self, nombre, metodo, url, data=None, esperado=200):
        """Función helper para probar un endpoint"""
        self.resultados['total'] += 1
        
        try:
            if metodo == 'GET':
                response = requests.get(url)
            elif metodo == 'POST':
                response = requests.post(url, json=data)
            elif metodo == 'PUT':
                response = requests.put(url, json=data)
            elif metodo == 'DELETE':
                response = requests.delete(url)
            
            if response.status_code == esperado:
                self.resultados['exitosos'] += 1
                self.stdout.write(Fore.GREEN + f'  ✓ {nombre}' + Fore.WHITE + f' ({response.status_code})')
                return True, response
            else:
                self.resultados['fallidos'] += 1
                self.stdout.write(Fore.RED + f'  ✗ {nombre}' + Fore.WHITE + f' ({response.status_code}, esperado {esperado})')
                return False, response
        except Exception as e:
            self.resultados['fallidos'] += 1
            self.stdout.write(Fore.RED + f'  ✗ {nombre} - Error: {str(e)}')
            return False, None

    def probar_roles(self):
        """Probar endpoints de Roles"""
        self.stdout.write(Fore.YELLOW + '\n📋 Probando Roles:')
        
        # GET - Listar roles
        self.test_endpoint(
            'Listar roles',
            'GET',
            f'{self.base_url}/roles/'
        )
        
        # GET - Detalle de rol
        self.test_endpoint(
            'Detalle de rol (ID: 1)',
            'GET',
            f'{self.base_url}/roles/1/'
        )

    def probar_personas(self):
        """Probar endpoints de Personas"""
        self.stdout.write(Fore.YELLOW + '\n👥 Probando Personas:')
        
        # GET - Listar personas
        self.test_endpoint(
            'Listar personas',
            'GET',
            f'{self.base_url}/personas/'
        )
        
        # GET - Detalle de persona
        self.test_endpoint(
            'Detalle de persona (ID: 1)',
            'GET',
            f'{self.base_url}/personas/1/'
        )

    def probar_usuarios(self):
        """Probar endpoints de Usuarios"""
        self.stdout.write(Fore.YELLOW + '\n🔐 Probando Usuarios:')
        
        # GET - Listar usuarios
        self.test_endpoint(
            'Listar usuarios',
            'GET',
            f'{self.base_url}/usuarios/'
        )
        
        # GET - Usuarios activos
        self.test_endpoint(
            'Usuarios activos',
            'GET',
            f'{self.base_url}/usuarios/activos/'
        )

    def probar_productos(self):
        """Probar endpoints de Productos"""
        self.stdout.write(Fore.YELLOW + '\n📦 Probando Productos:')
        
        # GET - Listar productos
        exitoso, response = self.test_endpoint(
            'Listar productos',
            'GET',
            f'{self.base_url}/productos/'
        )
        
        # GET - Productos activos
        self.test_endpoint(
            'Productos activos',
            'GET',
            f'{self.base_url}/productos/activos/'
        )
        
        # GET - Productos por categoría
        self.test_endpoint(
            'Productos por categoría',
            'GET',
            f'{self.base_url}/productos/por_categoria/'
        )
        
        # GET - Productos más vendidos
        self.test_endpoint(
            'Productos más vendidos',
            'GET',
            f'{self.base_url}/productos/mas_vendidos/'
        )
        
        # GET - Detalle de producto
        if exitoso and response:
            data = response.json()
            if len(data) > 0:
                producto_id = data[0]['id_producto']
                self.test_endpoint(
                    f'Detalle de producto (ID: {producto_id})',
                    'GET',
                    f'{self.base_url}/productos/{producto_id}/'
                )

    def probar_proveedores(self):
        """Probar endpoints de Proveedores"""
        self.stdout.write(Fore.YELLOW + '\n🏢 Probando Proveedores:')
        
        # GET - Listar proveedores
        exitoso, response = self.test_endpoint(
            'Listar proveedores',
            'GET',
            f'{self.base_url}/proveedores/'
        )
        
        # GET - Productos de proveedor
        if exitoso and response:
            data = response.json()
            if len(data) > 0:
                proveedor_id = data[0]['id_proveedor']
                self.test_endpoint(
                    f'Productos del proveedor (ID: {proveedor_id})',
                    'GET',
                    f'{self.base_url}/proveedores/{proveedor_id}/productos/'
                )

    def probar_inventarios(self):
        """Probar endpoints de Inventarios"""
        self.stdout.write(Fore.YELLOW + '\n📊 Probando Inventarios:')
        
        # GET - Listar inventarios
        self.test_endpoint(
            'Listar inventarios',
            'GET',
            f'{self.base_url}/inventarios/'
        )
        
        # GET - Stock bajo
        self.test_endpoint(
            'Inventarios con stock bajo',
            'GET',
            f'{self.base_url}/inventarios/stock_bajo/'
        )
        
        # GET - Stock crítico
        self.test_endpoint(
            'Inventarios con stock crítico',
            'GET',
            f'{self.base_url}/inventarios/stock_critico/'
        )
        
        # GET - Necesitan reorden
        self.test_endpoint(
            'Inventarios que necesitan reorden',
            'GET',
            f'{self.base_url}/inventarios/necesitan_reorden/'
        )
        
        # GET - Resumen
        self.test_endpoint(
            'Resumen de inventarios',
            'GET',
            f'{self.base_url}/inventarios/resumen/'
        )

    def probar_ventas(self):
        """Probar endpoints de Ventas"""
        self.stdout.write(Fore.YELLOW + '\n💰 Probando Ventas:')
        
        # GET - Listar ventas
        self.test_endpoint(
            'Listar ventas',
            'GET',
            f'{self.base_url}/ventas/'
        )
        
        # GET - Estadísticas
        self.test_endpoint(
            'Estadísticas de ventas',
            'GET',
            f'{self.base_url}/ventas/estadisticas/'
        )
        
        # GET - Detalles de venta
        self.test_endpoint(
            'Listar detalles de venta',
            'GET',
            f'{self.base_url}/detalles-venta/'
        )

    def probar_compras(self):
        """Probar endpoints de Compras"""
        self.stdout.write(Fore.YELLOW + '\n🛒 Probando Compras:')
        
        # GET - Listar compras
        self.test_endpoint(
            'Listar compras',
            'GET',
            f'{self.base_url}/compras/'
        )
        
        # GET - Estadísticas
        self.test_endpoint(
            'Estadísticas de compras',
            'GET',
            f'{self.base_url}/compras/estadisticas/'
        )
        
        # GET - Por proveedor
        self.test_endpoint(
            'Compras por proveedor',
            'GET',
            f'{self.base_url}/compras/por_proveedor/'
        )
        
        # GET - Detalles de compra
        self.test_endpoint(
            'Listar detalles de compra',
            'GET',
            f'{self.base_url}/detalles-compra/'
        )

    def probar_ordenes_reabastecimiento(self):
        """Probar endpoints de Órdenes de Reabastecimiento"""
        self.stdout.write(Fore.YELLOW + '\n📋 Probando Órdenes de Reabastecimiento:')
        
        # GET - Listar órdenes
        self.test_endpoint(
            'Listar órdenes de reabastecimiento',
            'GET',
            f'{self.base_url}/ordenes-reabastecimiento/'
        )

    def mostrar_resumen(self):
        """Mostrar resumen de las pruebas"""
        self.stdout.write(Fore.CYAN + Style.BRIGHT + '\n' + '='*80)
        self.stdout.write(Fore.CYAN + Style.BRIGHT + '📊 RESUMEN DE PRUEBAS')
        self.stdout.write(Fore.CYAN + Style.BRIGHT + '='*80 + '\n')
        
        porcentaje = (self.resultados['exitosos'] / self.resultados['total'] * 100) if self.resultados['total'] > 0 else 0
        
        self.stdout.write(f'  Total de pruebas: {self.resultados["total"]}')
        self.stdout.write(Fore.GREEN + f'  ✓ Exitosas: {self.resultados["exitosos"]}')
        self.stdout.write(Fore.RED + f'  ✗ Fallidas: {self.resultados["fallidos"]}')
        self.stdout.write(f'  Porcentaje de éxito: {porcentaje:.1f}%\n')
        
        if self.resultados['fallidos'] == 0:
            self.stdout.write(Fore.GREEN + Style.BRIGHT + '🎉 ¡TODAS LAS PRUEBAS PASARON!\n')
        else:
            self.stdout.write(Fore.YELLOW + '⚠️  Algunas pruebas fallaron. Revisa los detalles arriba.\n')