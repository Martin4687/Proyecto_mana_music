"""
api/isolation_forest_service.py

Fase 2 del pipeline ABC: Detección de anomalías con Isolation Forest.

Flujo:
  1. Para cada producto, recopila sus ventas individuales del período
  2. Entrena Isolation Forest sobre el conjunto completo de transacciones
  3. Marca transacciones anómalas
  4. Calcula qué % de las ventas de cada producto son anómalas
  5. Aplica un factor de penalización al score_abc según el nivel de anomalía
  6. Actualiza MetricaProducto con los resultados

El score_abc_ajustado es el que luego usa K-Means en lugar del score_abc crudo.
"""

import numpy as np
from decimal import Decimal
from datetime import date
from django.db.models import Avg

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from .models import DetalleVenta, MetricaProducto


# ── Configuración ─────────────────────────────────────────────

CONTAMINATION        = 0.08   # Proporción esperada de anomalías (8%)
N_ESTIMATORS         = 200    # Más árboles = más estabilidad
MAX_SAMPLES          = 'auto'
RANDOM_STATE         = 42

# Umbrales de penalización según % de transacciones anómalas
UMBRAL_LEVE     = 0.15   # 15%  → penalización leve
UMBRAL_MODERADO = 0.30   # 30%  → penalización moderada
UMBRAL_SEVERO   = 0.50   # 50%  → penalización severa

PENALIZACION_LEVE     = 0.90   # score * 0.90
PENALIZACION_MODERADA = 0.75   # score * 0.75
PENALIZACION_SEVERA   = 0.55   # score * 0.55
PENALIZACION_NINGUNA  = 1.00   # sin penalización


# ── Paso 1: Recopilar transacciones del período ───────────────

def obtener_transacciones_periodo(anio: int, mes: int) -> list[dict]:
    """
    Obtiene todas las transacciones de DetalleVenta del período
    con las features necesarias para Isolation Forest:

    - cantidad vendida en esa transacción
    - precio_unitario en esa transacción
    - subtotal
    - hora del día (0-23) — ventas a horas inusuales pueden ser anómalas
    - día de la semana (0=lunes, 6=domingo)
    - id del producto

    Devuelve lista de dicts, uno por transacción.
    """
    inicio = date(anio, mes, 1)
    fin    = date(anio + 1, 1, 1) if mes == 12 else date(anio, mes + 1, 1)

    detalles = DetalleVenta.objects.filter(
        id_venta__fecha_venta__date__gte=inicio,
        id_venta__fecha_venta__date__lt=fin,
        id_producto__activo=True,
    ).select_related('id_venta', 'id_producto')

    transacciones = []
    for d in detalles:
        fecha_venta = d.id_venta.fecha_venta
        transacciones.append({
            'id_transaccion':  d.id_detalleventa,
            'id_producto':     d.id_producto.id_producto,
            'nombre_producto': d.id_producto.nombre,
            'cantidad':        float(d.cantidad),
            'precio_unitario': float(d.precio_unitario),
            'subtotal':        float(d.subtotal),
            'hora':            fecha_venta.hour,
            'dia_semana':      fecha_venta.weekday(),   # 0=lun, 6=dom
            'dia_mes':         fecha_venta.day,
        })

    return transacciones


# ── Paso 2: Construir matriz de features ──────────────────────

def construir_features(transacciones: list) -> tuple[np.ndarray, list]:
    """
    Construye la matriz X para Isolation Forest.

    Features usadas:
      [0] cantidad         — volumen de la transacción
      [1] precio_unitario  — precio al que se vendió
      [2] subtotal         — monto total de la línea
      [3] hora             — hora del día
      [4] dia_semana       — día de la semana

    Devuelve (X_escalado, indices_originales).
    """
    if not transacciones:
        return np.array([]), []

    X_raw = np.array([
        [
            t['cantidad'],
            t['precio_unitario'],
            t['subtotal'],
            t['hora'],
            t['dia_semana'],
        ]
        for t in transacciones
    ], dtype=float)

    # Estandarizar para que ninguna feature domine por su escala
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_raw)

    return X_scaled, list(range(len(transacciones)))


# ── Paso 3: Ejecutar Isolation Forest ────────────────────────

def detectar_anomalias(X: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    Entrena Isolation Forest y devuelve:
      - labels: array de 1 (normal) y -1 (anómalo)
      - scores: array de scores de anomalía (más negativo = más anómalo)
    """
    if len(X) < 10:
        # Muy pocas muestras — no tiene sentido entrenar
        labels = np.ones(len(X), dtype=int)
        scores = np.zeros(len(X))
        return labels, scores

    modelo = IsolationForest(
        n_estimators=N_ESTIMATORS,
        max_samples=MAX_SAMPLES,
        contamination=CONTAMINATION,
        random_state=RANDOM_STATE,
        n_jobs=-1,   # usar todos los núcleos disponibles
    )

    labels = modelo.fit_predict(X)           # 1=normal, -1=anómalo
    scores = modelo.decision_function(X)     # score de anomalía

    return labels, scores


# ── Paso 4: Agregar resultados por producto ───────────────────

def agregar_por_producto(
    transacciones: list,
    labels: np.ndarray,
    scores: np.ndarray,
) -> dict:
    """
    Agrupa los resultados de Isolation Forest por producto.

    Devuelve dict:
    {
        id_producto: {
            'total_transacciones': int,
            'transacciones_anomalas': int,
            'pct_anomalas': float,
            'score_anomalia_promedio': float,
            'score_anomalia_min': float,     # el más negativo = peor anomalía
            'features_anomalas': list[str],  # qué features activaron la detección
            'es_anomalia': bool,
        }
    }
    """
    por_producto = {}

    for i, t in enumerate(transacciones):
        pid = t['id_producto']
        if pid not in por_producto:
            por_producto[pid] = {
                'total_transacciones':    0,
                'transacciones_anomalas': 0,
                'scores':                 [],
                'cantidades_anomalas':    [],
                'precios_anomalos':       [],
                'subtotales_anomalos':    [],
            }

        p = por_producto[pid]
        p['total_transacciones'] += 1
        p['scores'].append(float(scores[i]))

        if labels[i] == -1:
            p['transacciones_anomalas'] += 1
            p['cantidades_anomalas'].append(t['cantidad'])
            p['precios_anomalos'].append(t['precio_unitario'])
            p['subtotales_anomalos'].append(t['subtotal'])

    # Calcular métricas agregadas y determinar qué features son anómalas
    resultado = {}
    for pid, p in por_producto.items():
        total = p['total_transacciones']
        anomalas = p['transacciones_anomalas']
        pct = anomalas / total if total > 0 else 0.0

        score_promedio = float(np.mean(p['scores'])) if p['scores'] else 0.0
        score_min      = float(np.min(p['scores']))  if p['scores'] else 0.0

        # Identificar qué tipo de anomalía predomina
        features_anomalas = []
        if p['cantidades_anomalas']:
            med = np.median(p['cantidades_anomalas'])
            if med > 0:
                features_anomalas.append(f"cantidad inusual (mediana anómala: {med:.0f} uds)")
        if p['subtotales_anomalos']:
            med = np.median(p['subtotales_anomalos'])
            if med > 0:
                features_anomalas.append(f"monto inusual (mediana anómala: Bs. {med:.2f})")

        resultado[pid] = {
            'total_transacciones':    total,
            'transacciones_anomalas': anomalas,
            'pct_anomalas':           pct,
            'score_anomalia_promedio': score_promedio,
            'score_anomalia_min':      score_min,
            'features_anomalas':       features_anomalas,
            'es_anomalia':             pct >= UMBRAL_LEVE,
        }

    return resultado


# ── Paso 5: Calcular factor de penalización ───────────────────

def calcular_penalizacion(pct_anomalas: float, score_abc_original: float) -> tuple[float, float, str]:
    """
    Determina el factor de penalización según el porcentaje de
    transacciones anómalas y calcula el score ajustado.

    Devuelve (score_ajustado, factor_penalizacion, descripcion).
    """
    if pct_anomalas >= UMBRAL_SEVERO:
        factor = PENALIZACION_SEVERA
        desc   = (
            f"Penalización severa aplicada: {pct_anomalas*100:.1f}% de las "
            f"transacciones fueron detectadas como anómalas (umbral: "
            f"{UMBRAL_SEVERO*100:.0f}%). El score puede estar inflado por "
            f"eventos no representativos del comportamiento habitual."
        )
    elif pct_anomalas >= UMBRAL_MODERADO:
        factor = PENALIZACION_MODERADA
        desc   = (
            f"Penalización moderada aplicada: {pct_anomalas*100:.1f}% de las "
            f"transacciones fueron anómalas (umbral: {UMBRAL_MODERADO*100:.0f}%)."
        )
    elif pct_anomalas >= UMBRAL_LEVE:
        factor = PENALIZACION_LEVE
        desc   = (
            f"Penalización leve aplicada: {pct_anomalas*100:.1f}% de las "
            f"transacciones presentaron valores atípicos."
        )
    else:
        factor = PENALIZACION_NINGUNA
        desc   = None

    score_ajustado = round(score_abc_original * factor, 2)
    return score_ajustado, factor, desc


# ── Paso 6: Actualizar MetricaProducto ───────────────────────

def actualizar_metricas_con_anomalias(
    anomalias_por_producto: dict,
    anio: int,
    mes: int,
) -> int:
    """
    Actualiza los campos de anomalía en MetricaProducto para el período.
    Devuelve el número de productos marcados como anómalos.
    """
    total_anomalos = 0

    metricas = MetricaProducto.objects.filter(anio=anio, mes=mes)

    for metrica in metricas:
        pid = metrica.id_producto_id
        datos = anomalias_por_producto.get(pid)

        if datos is None:
            # Sin transacciones en el período — no es anómalo
            metrica.es_anomalia         = False
            metrica.score_anomalia      = None
            metrica.score_abc_ajustado  = metrica.score_abc
            metrica.factor_penalizacion = Decimal('1.000')
            metrica.detalle_anomalia    = None
        else:
            score_adj, factor, detalle = calcular_penalizacion(
                datos['pct_anomalas'],
                float(metrica.score_abc)
            )

            es_anomalia = datos['es_anomalia']
            if es_anomalia:
                total_anomalos += 1

                # Enriquecer detalle con features específicas
                if datos['features_anomalas'] and detalle:
                    detalle += f" Características anómalas: {'; '.join(datos['features_anomalas'])}."

            metrica.es_anomalia         = es_anomalia
            metrica.score_anomalia      = Decimal(str(round(datos['score_anomalia_promedio'], 4)))
            metrica.score_abc_ajustado  = Decimal(str(score_adj))
            metrica.factor_penalizacion = Decimal(str(factor))
            metrica.detalle_anomalia    = detalle

        metrica.save(update_fields=[
            'es_anomalia', 'score_anomalia',
            'score_abc_ajustado', 'factor_penalizacion', 'detalle_anomalia'
        ])

    return total_anomalos


# ── Función principal de la Fase 2 ───────────────────────────

def ejecutar_deteccion_anomalias(anio: int, mes: int) -> dict:
    """
    Pipeline completo de Isolation Forest para un período.

    Prerequisito: las MetricaProducto del período ya deben existir
    (creadas por la Fase 1 — calcular_scores).

    Devuelve resumen de la ejecución.
    """
    # 1. Obtener transacciones
    transacciones = obtener_transacciones_periodo(anio, mes)

    if not transacciones:
        return {
            'anomalias_detectadas': 0,
            'total_transacciones':  0,
            'productos_afectados':  0,
            'mensaje': 'Sin transacciones en el período.',
        }

    # 2. Construir features
    X, _ = construir_features(transacciones)

    # 3. Isolation Forest
    labels, scores = detectar_anomalias(X)

    # 4. Agregar por producto
    anomalias_por_producto = agregar_por_producto(transacciones, labels, scores)

    # 5. Actualizar MetricaProducto
    total_anomalos = actualizar_metricas_con_anomalias(
        anomalias_por_producto, anio, mes
    )

    total_anomalas_tx = int(np.sum(labels == -1))
    productos_afectados = sum(
        1 for d in anomalias_por_producto.values() if d['es_anomalia']
    )

    return {
        'anomalias_detectadas':  total_anomalas_tx,
        'total_transacciones':   len(transacciones),
        'pct_anomalas_global':   round(total_anomalas_tx / len(transacciones) * 100, 1),
        'productos_analizados':  len(anomalias_por_producto),
        'productos_afectados':   productos_afectados,
        'mensaje': (
            f"Isolation Forest completado: {total_anomalas_tx} transacciones anómalas "
            f"detectadas ({round(total_anomalas_tx/len(transacciones)*100,1)}%) "
            f"en {productos_afectados} productos."
        ),
    }