"""
api/abc_service.py
Pipeline de Clasificación ABC — Fase 1
Algoritmo: K-Means (scikit-learn)
"""

import numpy as np
from datetime import datetime, date
from decimal import Decimal
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone

from .models import (
    Producto, Inventario, Venta, DetalleVenta,
    MetricaProducto, ClasificacionAbc, EjecucionModelo
)

# scikit-learn — instalar: pip install scikit-learn
from sklearn.cluster import KMeans
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import silhouette_score


# ── Configuración del análisis ────────────────────────────────

PESOS_SCORE = {
    'ingresos_totales':  0.35,
    'unidades_vendidas': 0.25,
    'frecuencia_venta':  0.20,
    'rotacion':          0.10,
    'ticket_promedio':   0.10,
}

UMBRAL_TENDENCIA_SUBIENDO = 15.0   # +15% vs período anterior
UMBRAL_TENDENCIA_BAJANDO  = -15.0  # -15% vs período anterior
DIAS_MES = 30


# ── Paso 1: Calcular métricas por producto ────────────────────

def calcular_metricas_periodo(anio: int, mes: int) -> list[dict]:
    """
    Extrae y calcula todas las métricas necesarias para cada producto
    en el período indicado. Devuelve lista de dicts con la estructura:
    nombre, precio, fecha_registro, categoria, stock + métricas de ventas.
    """
    # Rango de fechas del período
    inicio = date(anio, mes, 1)
    if mes == 12:
        fin = date(anio + 1, 1, 1)
    else:
        fin = date(anio, mes + 1, 1)

    # Todos los productos activos
    productos = Producto.objects.filter(activo=True).select_related(
        'categoria', 'inventario'
    )

    metricas = []

    for producto in productos:
        # Stock actual
        try:
            inv = producto.inventario
            stock_actual = inv.stock_actual
        except Exception:
            stock_actual = 0

        # Ventas del período para este producto
        detalles = DetalleVenta.objects.filter(
            id_producto=producto,
            id_venta__fecha_venta__date__gte=inicio,
            id_venta__fecha_venta__date__lt=fin,
        ).select_related('id_venta')

        agg = detalles.aggregate(
            total_unidades=Sum('cantidad'),
            total_ingresos=Sum('subtotal'),
            total_transacciones=Count('id_detalleventa'),
        )

        unidades      = agg['total_unidades'] or 0
        ingresos      = float(agg['total_ingresos'] or 0)
        transacciones = agg['total_transacciones'] or 0

        # Días únicos con al menos una venta
        dias_con_venta = detalles.values(
            'id_venta__fecha_venta__date'
        ).distinct().count()

        # Métricas derivadas
        frecuencia = dias_con_venta / DIAS_MES if DIAS_MES > 0 else 0
        stock_promedio = max(stock_actual, 1)
        rotacion = unidades / stock_promedio if stock_promedio > 0 else 0
        ticket   = ingresos / transacciones if transacciones > 0 else 0

        metricas.append({
            # Snapshot del producto (estructura del ejemplo)
            'id_producto':       producto.id_producto,
            'nombre':            producto.nombre,
            'precio':            float(producto.precio_unitario),
            'fecha_registro':    producto.fecha_registro,
            'categoria':         producto.categoria.nombre if producto.categoria else 'Sin categoría',
            'stock':             stock_actual,

            # Métricas del período
            'unidades_vendidas':  unidades,
            'ingresos_totales':   ingresos,
            'num_transacciones':  transacciones,
            'dias_con_venta':     dias_con_venta,
            'frecuencia_venta':   frecuencia,
            'rotacion_inventario': rotacion,
            'ticket_promedio':    ticket,
        })

    return metricas


def calcular_variaciones(metricas_actual: list, anio: int, mes: int) -> list:
    """
    Agrega variaciones porcentuales comparando con el período anterior
    y determina la tendencia de cada producto.
    """
    # Período anterior
    if mes == 1:
        anio_ant, mes_ant = anio - 1, 12
    else:
        anio_ant, mes_ant = anio, mes - 1

    for m in metricas_actual:
        try:
            metrica_ant = MetricaProducto.objects.get(
                id_producto_id=m['id_producto'],
                anio=anio_ant, mes=mes_ant
            )
            u_ant = metrica_ant.unidades_vendidas
            i_ant = float(metrica_ant.ingresos_totales)

            var_u = ((m['unidades_vendidas'] - u_ant) / u_ant * 100) if u_ant > 0 else None
            var_i = ((m['ingresos_totales']  - i_ant) / i_ant * 100) if i_ant > 0 else None

            m['variacion_unidades_pct'] = round(var_u, 2) if var_u is not None else None
            m['variacion_ingresos_pct'] = round(var_i, 2) if var_i is not None else None

            if var_i is None:
                m['tendencia'] = 'ESTABLE'
            elif var_i >= UMBRAL_TENDENCIA_SUBIENDO:
                m['tendencia'] = 'SUBIENDO'
            elif var_i <= UMBRAL_TENDENCIA_BAJANDO:
                m['tendencia'] = 'BAJANDO'
            else:
                m['tendencia'] = 'ESTABLE'

        except MetricaProducto.DoesNotExist:
            m['variacion_unidades_pct'] = None
            m['variacion_ingresos_pct'] = None
            m['tendencia'] = 'ESTABLE'

    return metricas_actual


# ── Paso 2: Calcular score compuesto ─────────────────────────

def calcular_scores(metricas: list) -> list:
    """
    Normaliza cada métrica a [0,1] y calcula el score_abc ponderado.
    El score es el que alimenta el K-Means.
    """
    campos = ['ingresos_totales', 'unidades_vendidas',
              'frecuencia_venta', 'rotacion_inventario', 'ticket_promedio']

    # Extraer valores para normalización
    valores = {c: np.array([m[c] for m in metricas], dtype=float) for c in campos}

    # Normalizar con MinMaxScaler (evita que ingresos domine por su escala)
    normalizados = {}
    for c in campos:
        v = valores[c].reshape(-1, 1)
        rango = v.max() - v.min()
        if rango == 0:
            normalizados[c] = np.zeros(len(metricas))
        else:
            normalizados[c] = MinMaxScaler().fit_transform(v).flatten()

    # Score ponderado
    for i, m in enumerate(metricas):
        score = (
            PESOS_SCORE['ingresos_totales']  * normalizados['ingresos_totales'][i] +
            PESOS_SCORE['unidades_vendidas'] * normalizados['unidades_vendidas'][i] +
            PESOS_SCORE['frecuencia_venta']  * normalizados['frecuencia_venta'][i] +
            PESOS_SCORE['rotacion']          * normalizados['rotacion_inventario'][i] +
            PESOS_SCORE['ticket_promedio']   * normalizados['ticket_promedio'][i]
        ) * 100
        m['score_abc'] = round(float(score), 2)

    return metricas


# ── Paso 3: K-Means clustering ────────────────────────────────

def ejecutar_kmeans(metricas: list) -> tuple[list, float]:
    """
    Ejecuta K-Means con k=3 usando las métricas normalizadas.
    Devuelve las métricas enriquecidas con cluster y label ABC,
    más el silhouette_score (calidad del clustering, -1 a 1).
    """
    if len(metricas) < 3:
        # Con menos de 3 productos, clasificación manual por score
        for m in metricas:
            m['cluster'] = 0
            m['categoria_abc'] = 'A' if m['score_abc'] >= 60 else ('B' if m['score_abc'] >= 30 else 'C')
            m['distancia_centroide'] = 0.0
            m['confianza'] = 1.0
        return metricas, 1.0

    # Features para K-Means: score + métricas individuales normalizadas
    campos_kmeans = ['score_abc', 'ingresos_totales', 'unidades_vendidas',
                     'frecuencia_venta', 'rotacion_inventario']

    X_raw = np.array([[m[c] for c in campos_kmeans] for m in metricas], dtype=float)
    scaler = MinMaxScaler()
    X = scaler.fit_transform(X_raw)

    # K-Means con múltiples inicializaciones para mayor estabilidad
    kmeans = KMeans(n_clusters=3, n_init=20, random_state=42)
    labels = kmeans.fit_predict(X)

    # Calcular distancias al centroide de cada punto
    centroides = kmeans.cluster_centers_
    distancias = np.linalg.norm(X - centroides[labels], axis=1)

    # Silhouette score (calidad del clustering)
    sil = silhouette_score(X, labels) if len(set(labels)) > 1 else 0.0

    # Asignar A/B/C según el score promedio de cada cluster
    scores_por_cluster = {}
    for cluster_id in range(3):
        indices = [i for i, l in enumerate(labels) if l == cluster_id]
        if indices:
            scores_por_cluster[cluster_id] = np.mean([metricas[i]['score_abc'] for i in indices])
        else:
            scores_por_cluster[cluster_id] = 0

    # El cluster con score más alto → A, medio → B, bajo → C
    ranking = sorted(scores_por_cluster.keys(), key=lambda k: scores_por_cluster[k], reverse=True)
    mapa_cluster_abc = {ranking[0]: 'A', ranking[1]: 'B', ranking[2]: 'C'}

    # Calcular confianza: a mayor distancia al centroide, menor confianza
    max_dist = distancias.max() if distancias.max() > 0 else 1.0

    for i, m in enumerate(metricas):
        m['cluster'] = int(labels[i])
        m['categoria_abc'] = mapa_cluster_abc[labels[i]]
        m['distancia_centroide'] = round(float(distancias[i]), 4)
        # Confianza: 1.0 si distancia=0, ~0.5 si distancia=max
        m['confianza'] = round(1.0 - (float(distancias[i]) / max_dist) * 0.5, 3)

    return metricas, round(float(sil), 4)


# ── Paso 4: Calcular Pareto ───────────────────────────────────

def calcular_pareto(metricas: list) -> list:
    """
    Calcula el % de ingresos que representa cada producto
    sobre el total del período (análisis de Pareto 80/20).
    """
    total_ingresos = sum(m['ingresos_totales'] for m in metricas)
    if total_ingresos == 0:
        for m in metricas:
            m['pct_ingresos_global'] = 0.0
            m['pct_ingresos_acumulado'] = 0.0
        return metricas

    # Ordenar por ingresos descendente para el acumulado
    ordenados = sorted(metricas, key=lambda x: x['ingresos_totales'], reverse=True)
    acumulado = 0.0
    pct_acum_map = {}

    for m in ordenados:
        pct = (m['ingresos_totales'] / total_ingresos) * 100
        acumulado += pct
        pct_acum_map[m['id_producto']] = {
            'pct_global': round(pct, 2),
            'pct_acumulado': round(acumulado, 2),
        }

    for m in metricas:
        datos = pct_acum_map[m['id_producto']]
        m['pct_ingresos_global']    = datos['pct_global']
        m['pct_ingresos_acumulado'] = datos['pct_acumulado']

    return metricas


# ── Paso 5: Persistir resultados ──────────────────────────────

def guardar_resultados(metricas: list, anio: int, mes: int) -> int:
    """
    Guarda o actualiza MetricaProducto y ClasificacionAbc.
    Devuelve el número de productos reclasificados.
    """
    reclasificados = 0

    for m in metricas:
        # Guardar o actualizar MetricaProducto
        metrica_obj, _ = MetricaProducto.objects.update_or_create(
            id_producto_id=m['id_producto'],
            anio=anio,
            mes=mes,
            defaults={
                'nombre_producto':    m['nombre'],
                'precio_unitario':    Decimal(str(m['precio'])),
                'categoria_nombre':   m['categoria'],
                'stock_al_calcular':  m['stock'],
                'unidades_vendidas':  m['unidades_vendidas'],
                'ingresos_totales':   Decimal(str(m['ingresos_totales'])),
                'num_transacciones':  m['num_transacciones'],
                'dias_con_venta':     m['dias_con_venta'],
                'frecuencia_venta':   Decimal(str(round(m['frecuencia_venta'], 3))),
                'rotacion_inventario': Decimal(str(round(m['rotacion_inventario'], 3))),
                'ticket_promedio':    Decimal(str(round(m['ticket_promedio'], 2))),
                'variacion_unidades_pct': m.get('variacion_unidades_pct'),
                'variacion_ingresos_pct': m.get('variacion_ingresos_pct'),
                'tendencia':          m.get('tendencia', 'ESTABLE'),
                'score_abc':          Decimal(str(m['score_abc'])),
            }
        )

        # Buscar clasificación anterior
        try:
            clf_anterior = ClasificacionAbc.objects.filter(
                id_producto_id=m['id_producto']
            ).exclude(anio=anio, mes=mes).order_by('-anio', '-mes').first()
            cat_anterior = clf_anterior.categoria_abc if clf_anterior else None
        except Exception:
            cat_anterior = None

        # Determinar si hubo cambio y el motivo
        hubo_cambio = cat_anterior is not None and cat_anterior != m['categoria_abc']
        if hubo_cambio:
            reclasificados += 1
            orden = {'A': 3, 'B': 2, 'C': 1}
            if orden[m['categoria_abc']] > orden[cat_anterior]:
                motivo = 'AUMENTO_VENTAS' if m.get('tendencia') == 'SUBIENDO' else 'REACTIVACION'
            else:
                motivo = 'DESCENSO_VENTAS' if m['unidades_vendidas'] > 0 else 'SIN_MOVIMIENTO'
        else:
            motivo = 'CALCULO_INICIAL' if cat_anterior is None else None

        # Guardar ClasificacionAbc
        ClasificacionAbc.objects.update_or_create(
            id_producto_id=m['id_producto'],
            anio=anio,
            mes=mes,
            defaults={
                'id_metrica':             metrica_obj,
                'categoria_abc':          m['categoria_abc'],
                'categoria_anterior':     cat_anterior,
                'hubo_cambio':            hubo_cambio,
                'motivo_cambio':          motivo,
                'cluster_kmeans':         m.get('cluster'),
                'distancia_centroide':    m.get('distancia_centroide'),
                'confianza':              Decimal(str(m.get('confianza', 1.0))),
                'pct_ingresos_global':    Decimal(str(m.get('pct_ingresos_global', 0))),
                'pct_ingresos_acumulado': Decimal(str(m.get('pct_ingresos_acumulado', 0))),
                'ventas_acumuladas':      Decimal(str(m['ingresos_totales'])),
            }
        )

    return reclasificados


# ── Pipeline principal ────────────────────────────────────────

def ejecutar_analisis_abc(anio: int = None, mes: int = None) -> dict:
    """
    Ejecuta el pipeline completo de Clasificación ABC:
    1. Calcular métricas
    2. Calcular variaciones y tendencias
    3. Calcular scores
    4. K-Means
    5. Pareto
    6. Guardar resultados

    Si no se especifica período, usa el mes actual.
    """
    if anio is None or mes is None:
        hoy = date.today()
        anio = hoy.year
        mes  = hoy.month

    ejecucion = EjecucionModelo.objects.create(
        fecha_inicio=timezone.now(),
        anio_analizado=anio,
        mes_analizado=mes,
        estado='EXITOSO',
    )

    try:
        # 1. Métricas base
        metricas = calcular_metricas_periodo(anio, mes)

        if not metricas:
            ejecucion.estado = 'PARCIAL'
            ejecucion.error_log = 'No hay productos activos para analizar.'
            ejecucion.fecha_fin = timezone.now()
            ejecucion.save()
            return {'exito': False, 'mensaje': 'No hay productos activos.'}

        # 2. Variaciones y tendencias
        metricas = calcular_variaciones(metricas, anio, mes)

        # 3. Scores
        metricas = calcular_scores(metricas)

        # 4. K-Means
        metricas, sil_score = ejecutar_kmeans(metricas)

        # 5. Pareto
        metricas = calcular_pareto(metricas)

        # 6. Guardar
        reclasificados = guardar_resultados(metricas, anio, mes)

        # Conteo por categoría
        conteo = {'A': 0, 'B': 0, 'C': 0}
        for m in metricas:
            conteo[m['categoria_abc']] += 1

        # Actualizar registro de ejecución
        ejecucion.fecha_fin              = timezone.now()
        ejecucion.productos_procesados   = len(metricas)
        ejecucion.productos_reclasificados = reclasificados
        ejecucion.silhouette_score       = Decimal(str(sil_score))
        ejecucion.estado                 = 'EXITOSO'
        ejecucion.save()

        return {
            'exito': True,
            'periodo': f'{anio}/{mes:02d}',
            'productos_procesados': len(metricas),
            'productos_reclasificados': reclasificados,
            'silhouette_score': sil_score,
            'conteo_abc': conteo,
            'mensaje': f'Análisis completado: {len(metricas)} productos clasificados.'
        }

    except Exception as e:
        ejecucion.estado    = 'ERROR'
        ejecucion.error_log = str(e)
        ejecucion.fecha_fin = timezone.now()
        ejecucion.save()
        raise e