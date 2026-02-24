"""
Signals para crear inventario automáticamente al crear un producto
Ubicación: api/signals.py
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from api.models import Producto, Inventario


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