from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import (
    RolViewSet, PersonaViewSet, UsuarioViewSet,
    ProductoViewSet, ProveedorViewSet, ProductoProveedorViewSet,
    InventarioViewSet, VentaViewSet, DetalleVentaViewSet,
    CompraViewSet, DetalleCompraViewSet, OrdenReabastecimientoViewSet,
    HistorialInventarioViewSet, SegmentoKmeansViewSet, ClasificacionAbcViewSet
)

# Crear el router
router = DefaultRouter()

# Registrar todos los viewsets
router.register(r'roles', RolViewSet, basename='rol')
router.register(r'personas', PersonaViewSet, basename='persona')
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'productos', ProductoViewSet, basename='producto')
router.register(r'proveedores', ProveedorViewSet, basename='proveedor')
router.register(r'productos-proveedores', ProductoProveedorViewSet, basename='producto-proveedor')
router.register(r'inventarios', InventarioViewSet, basename='inventario')
router.register(r'ventas', VentaViewSet, basename='venta')
router.register(r'detalles-venta', DetalleVentaViewSet, basename='detalle-venta')
router.register(r'compras', CompraViewSet, basename='compra')
router.register(r'detalles-compra', DetalleCompraViewSet, basename='detalle-compra')
router.register(r'ordenes-reabastecimiento', OrdenReabastecimientoViewSet, basename='orden-reabastecimiento')
router.register(r'historial-inventario', HistorialInventarioViewSet, basename='historial-inventario')
router.register(r'segmentos-kmeans', SegmentoKmeansViewSet, basename='segmento-kmeans')
router.register(r'clasificaciones-abc', ClasificacionAbcViewSet, basename='clasificacion-abc')

# URLs de la app
urlpatterns = [
    path('', include(router.urls)),
]

"""
ENDPOINTS DISPONIBLES:

ROLES:
- GET    /api/roles/                      - Listar todos los roles
- POST   /api/roles/                      - Crear un rol
- GET    /api/roles/{id}/                 - Detalle de un rol
- PUT    /api/roles/{id}/                 - Actualizar un rol
- DELETE /api/roles/{id}/                 - Eliminar un rol

PERSONAS:
- GET    /api/personas/                   - Listar todas las personas
- POST   /api/personas/                   - Crear una persona
- GET    /api/personas/{id}/              - Detalle de una persona
- PUT    /api/personas/{id}/              - Actualizar una persona
- DELETE /api/personas/{id}/              - Eliminar una persona

USUARIOS:
- GET    /api/usuarios/                   - Listar todos los usuarios
- GET    /api/usuarios/activos/           - Listar usuarios activos
- POST   /api/usuarios/                   - Crear un usuario
- GET    /api/usuarios/{id}/              - Detalle de un usuario
- PUT    /api/usuarios/{id}/              - Actualizar un usuario
- DELETE /api/usuarios/{id}/              - Eliminar un usuario

PRODUCTOS:
- GET    /api/productos/                  - Listar todos los productos
- GET    /api/productos/activos/          - Listar productos activos
- GET    /api/productos/por_categoria/    - Productos por categoría
- GET    /api/productos/mas_vendidos/     - Top productos más vendidos
- POST   /api/productos/                  - Crear un producto
- GET    /api/productos/{id}/             - Detalle de un producto
- PUT    /api/productos/{id}/             - Actualizar un producto
- DELETE /api/productos/{id}/             - Eliminar un producto

PROVEEDORES:
- GET    /api/proveedores/                - Listar todos los proveedores
- GET    /api/proveedores/{id}/productos/ - Productos de un proveedor
- POST   /api/proveedores/                - Crear un proveedor
- GET    /api/proveedores/{id}/           - Detalle de un proveedor
- PUT    /api/proveedores/{id}/           - Actualizar un proveedor
- DELETE /api/proveedores/{id}/           - Eliminar un proveedor

PRODUCTO-PROVEEDOR:
- GET    /api/productos-proveedores/      - Listar relaciones
- GET    /api/productos-proveedores/principales/ - Solo proveedores principales
- POST   /api/productos-proveedores/      - Crear relación
- GET    /api/productos-proveedores/{id}/ - Detalle de relación
- PUT    /api/productos-proveedores/{id}/ - Actualizar relación
- DELETE /api/productos-proveedores/{id}/ - Eliminar relación

INVENTARIOS:
- GET    /api/inventarios/                - Listar todos los inventarios
- GET    /api/inventarios/stock_bajo/     - Productos con stock bajo
- GET    /api/inventarios/stock_critico/  - Productos con stock crítico
- GET    /api/inventarios/necesitan_reorden/ - Productos que necesitan reorden
- GET    /api/inventarios/resumen/        - Resumen del inventario
- POST   /api/inventarios/                - Crear inventario
- GET    /api/inventarios/{id}/           - Detalle de inventario
- PUT    /api/inventarios/{id}/           - Actualizar inventario
- DELETE /api/inventarios/{id}/           - Eliminar inventario

VENTAS:
- GET    /api/ventas/                     - Listar todas las ventas
- GET    /api/ventas/estadisticas/        - Estadísticas de ventas
- GET    /api/ventas/por_fecha/?fecha_inicio=&fecha_fin= - Ventas por rango de fechas
- POST   /api/ventas/                     - Crear una venta
- GET    /api/ventas/{id}/                - Detalle de una venta
- PUT    /api/ventas/{id}/                - Actualizar una venta
- DELETE /api/ventas/{id}/                - Eliminar una venta

DETALLES DE VENTA:
- GET    /api/detalles-venta/             - Listar todos los detalles
- POST   /api/detalles-venta/             - Crear detalle de venta
- GET    /api/detalles-venta/{id}/        - Detalle específico
- PUT    /api/detalles-venta/{id}/        - Actualizar detalle
- DELETE /api/detalles-venta/{id}/        - Eliminar detalle

COMPRAS:
- GET    /api/compras/                    - Listar todas las compras
- GET    /api/compras/estadisticas/       - Estadísticas de compras
- GET    /api/compras/por_proveedor/      - Compras por proveedor
- POST   /api/compras/                    - Crear una compra
- GET    /api/compras/{id}/               - Detalle de una compra
- PUT    /api/compras/{id}/               - Actualizar una compra
- DELETE /api/compras/{id}/               - Eliminar una compra

DETALLES DE COMPRA:
- GET    /api/detalles-compra/            - Listar todos los detalles
- POST   /api/detalles-compra/            - Crear detalle de compra
- GET    /api/detalles-compra/{id}/       - Detalle específico
- PUT    /api/detalles-compra/{id}/       - Actualizar detalle
- DELETE /api/detalles-compra/{id}/       - Eliminar detalle

ÓRDENES DE REABASTECIMIENTO:
- GET    /api/ordenes-reabastecimiento/   - Listar todas las órdenes
- GET    /api/ordenes-reabastecimiento/pendientes/ - Órdenes pendientes
- GET    /api/ordenes-reabastecimiento/urgentes/ - Órdenes urgentes
- POST   /api/ordenes-reabastecimiento/{id}/aprobar/ - Aprobar orden
- POST   /api/ordenes-reabastecimiento/{id}/rechazar/ - Rechazar orden
- POST   /api/ordenes-reabastecimiento/   - Crear orden
- GET    /api/ordenes-reabastecimiento/{id}/ - Detalle de orden
- PUT    /api/ordenes-reabastecimiento/{id}/ - Actualizar orden
- DELETE /api/ordenes-reabastecimiento/{id}/ - Eliminar orden

HISTORIAL DE INVENTARIO:
- GET    /api/historial-inventario/       - Listar todo el historial
- GET    /api/historial-inventario/por_producto/?producto_id={id} - Historial de un producto
- POST   /api/historial-inventario/       - Crear registro
- GET    /api/historial-inventario/{id}/  - Detalle de registro
- PUT    /api/historial-inventario/{id}/  - Actualizar registro
- DELETE /api/historial-inventario/{id}/  - Eliminar registro

SEGMENTOS K-MEANS:
- GET    /api/segmentos-kmeans/           - Listar todos los segmentos
- GET    /api/segmentos-kmeans/por_cluster/?cluster={id} - Segmentos por cluster
- POST   /api/segmentos-kmeans/           - Crear segmento
- GET    /api/segmentos-kmeans/{id}/      - Detalle de segmento
- PUT    /api/segmentos-kmeans/{id}/      - Actualizar segmento
- DELETE /api/segmentos-kmeans/{id}/      - Eliminar segmento

CLASIFICACIONES ABC:
- GET    /api/clasificaciones-abc/        - Listar todas las clasificaciones
- GET    /api/clasificaciones-abc/por_categoria/?categoria={A|B|C} - Por categoría
- GET    /api/clasificaciones-abc/resumen/ - Resumen de clasificación
- POST   /api/clasificaciones-abc/        - Crear clasificación
- GET    /api/clasificaciones-abc/{id}/   - Detalle de clasificación
- PUT    /api/clasificaciones-abc/{id}/   - Actualizar clasificación
- DELETE /api/clasificaciones-abc/{id}/   - Eliminar clasificación
"""