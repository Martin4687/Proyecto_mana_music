"""
Signals para crear inventario automáticamente al crear un producto
Ubicación: api/signals.py
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from api.models import Producto, Inventario, DetalleVenta, DetalleCompra, HistorialInventario


@receiver(post_save, sender=Producto)
def crear_inventario_automatico(sender, instance, created, **kwargs):
    """
    Signal que se ejecuta después de guardar un Producto.
    Si es un producto nuevo (created=True), crea automáticamente
    su registro de inventario con valores por defecto.
    """
    if created:
        # Solo crear si no existe (por seguridad)
        inventario, creado = Inventario.objects.get_or_create(
            id_producto=instance,
            defaults={
                'stock_actual': 0,              # Inicia en 0 hasta que haya una compra
                'stock_minimo': 5,              # Mínimo razonable
                'stock_maximo': 100,            # Máximo por defecto
                'punto_reorden': 10,            # Reordenar cuando llegue a 10
                'stock_seguridad': 3,           # Stock de seguridad de 3 unidades
                'demanda_promedio_diaria': 1.0, # 1 unidad por día (conservador)
                'tiempo_entrega_dias': 5,       # 5 días de tiempo de entrega
                'estado_inventario': 'CRITICO'  # CRITICO porque stock_actual = 0
            }
        )
        
        if creado:
            print(f"✓ Inventario creado automáticamente para: {instance.nombre}")
        else:
            print(f"• Inventario ya existía para: {instance.nombre}")

def calcular_estado(inventario):
    if inventario.stock_actual <= 0:
        return 'CRITICO'
    elif inventario.stock_actual < inventario.stock_minimo:
        return 'BAJO'
    elif inventario.stock_actual > inventario.stock_maximo:
        return 'SOBRESTOCK'
    return 'NORMAL'


def actualizar_inventario(id_producto, delta, campo_fecha=None,
                          tipo_movimiento=None, observaciones='', id_usuario=None):
    try:
        inventario = Inventario.objects.get(id_producto=id_producto)
        stock_anterior = inventario.stock_actual
        inventario.stock_actual = stock_anterior + delta
        if campo_fecha:
            setattr(inventario, campo_fecha, timezone.now().date())
        inventario.estado_inventario = calcular_estado(inventario)
        inventario.save()

        if tipo_movimiento:
            try:
                HistorialInventario.objects.create(
                    id_producto=id_producto,
                    id_usuario_id=id_usuario,
                    stock_anterior=stock_anterior,
                    stock_nuevo=inventario.stock_actual,
                    tipo_movimiento=tipo_movimiento,
                    observaciones=observaciones,
                )
                print(f'[signals] Historial creado: {tipo_movimiento}')
            except Exception as e:
                print(f'[signals] No se pudo registrar historial: {e}')

    except Inventario.DoesNotExist:
        pass


# ========== VENTAS ==========

@receiver(post_save, sender=DetalleVenta)
def descontar_stock_venta(sender, instance, created, **kwargs):
    if created:
        actualizar_inventario(
            id_producto=instance.id_producto,
            delta=-instance.cantidad,
            campo_fecha='ultima_venta',
            tipo_movimiento='SALIDA_VENTA',
            observaciones=f'Venta #{instance.id_venta_id}',
        )

@receiver(post_delete, sender=DetalleVenta)
def restaurar_stock_venta(sender, instance, **kwargs):
    actualizar_inventario(
        id_producto=instance.id_producto,
        delta=+instance.cantidad,
        tipo_movimiento='AJUSTE_POSITIVO',
        observaciones=f'Anulación venta #{instance.id_venta_id}',
    )


# ========== COMPRAS ==========

@receiver(post_save, sender=DetalleCompra)
def aumentar_stock_compra(sender, instance, created, **kwargs):
    if created and instance.id_compra.estado == 'RECIBIDA':
        actualizar_inventario(
            id_producto=instance.id_producto,
            delta=+instance.cantidad,
            campo_fecha='ultima_compra',
            tipo_movimiento='ENTRADA_COMPRA',
            observaciones=f'Compra #{instance.id_compra_id}',
        )

@receiver(post_delete, sender=DetalleCompra)
def restaurar_stock_compra(sender, instance, **kwargs):
    if instance.id_compra.estado == 'RECIBIDA':
        actualizar_inventario(
            id_producto=instance.id_producto,
            delta=-instance.cantidad,
            tipo_movimiento='AJUSTE_NEGATIVO',
            observaciones=f'Anulación compra #{instance.id_compra_id}',
    )

