import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './ClasificacionABC.css';

const API_URL = 'http://localhost:8000/api';

const hoy = new Date();
const MES_ACTUAL  = hoy.getMonth() + 1;
const ANIO_ACTUAL = hoy.getFullYear();

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

// ── Utilidades ────────────────────────────────────────────────

const fmt = (n) =>
  `Bs. ${parseFloat(n || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

const META_CAT = {
  A: { color: 'cat-a', label: 'A',  titulo: 'Alta Prioridad',   desc: 'Productos estrella — mayor valor para la tienda',    emoji: '⭐' },
  B: { color: 'cat-b', label: 'B',  titulo: 'Prioridad Media',  desc: 'Productos con rendimiento intermedio',               emoji: '📦' },
  C: { color: 'cat-c', label: 'C',  titulo: 'Baja Prioridad',   desc: 'Productos de baja rotación o valor menor',          emoji: '🔵' },
};

const META_TENDENCIA = {
  SUBIENDO: { icon: '↑', clase: 'tend-up',    label: 'Subiendo' },
  ESTABLE:  { icon: '→', clase: 'tend-stable', label: 'Estable' },
  BAJANDO:  { icon: '↓', clase: 'tend-down',   label: 'Bajando' },
};

// ── Componentes menores ───────────────────────────────────────

function BadgeCategoria({ cat }) {
  const meta = META_CAT[cat] || META_CAT.C;
  return <span className={`badge-cat ${meta.color}`}>{meta.emoji} {meta.label}</span>;
}

function BadgeTendencia({ tendencia }) {
  const meta = META_TENDENCIA[tendencia] || META_TENDENCIA.ESTABLE;
  return <span className={`badge-tend ${meta.clase}`}>{meta.icon} {meta.label}</span>;
}

function BadgeCambio({ hubo_cambio, anterior, actual }) {
  if (!hubo_cambio || !anterior) return null;
  const orden = { A: 3, B: 2, C: 1 };
  const subio = orden[actual] > orden[anterior];
  return (
    <span className={`badge-cambio ${subio ? 'cambio-sube' : 'cambio-baja'}`}>
      {anterior} → {actual}
    </span>
  );
}

// ── Panel de control ──────────────────────────────────────────

function PanelControl({ resumen, anio, mes, onEjecutar, ejecutando }) {
  const ultima = resumen?.ultima_ejecucion;
  const sil = ultima?.silhouette_score;

  const calidadClustering = sil === null || sil === undefined ? '—'
    : sil >= 0.7 ? 'Excelente'
    : sil >= 0.5 ? 'Buena'
    : sil >= 0.3 ? 'Aceptable'
    : 'Mejorable';

  return (
    <div className="panel-control">
      <div className="panel-info">
        <div className="panel-item">
          <span className="panel-label">Última ejecución</span>
          <span className="panel-valor">
            {ultima?.fecha
              ? new Date(ultima.fecha).toLocaleString('es-BO')
              : 'Nunca ejecutado'}
          </span>
        </div>
        <div className="panel-item">
          <span className="panel-label">Calidad del clustering</span>
          <span className="panel-valor">
            {sil !== null && sil !== undefined ? `${sil.toFixed(3)} — ${calidadClustering}` : '—'}
          </span>
        </div>
        <div className="panel-item">
          <span className="panel-label">Productos reclasificados</span>
          <span className="panel-valor">{resumen?.productos_reclasificados ?? '—'}</span>
        </div>
      </div>
      <button
        className={`btn-ejecutar ${ejecutando ? 'btn-ejecutando' : ''}`}
        onClick={onEjecutar}
        disabled={ejecutando}
      >
        {ejecutando ? (
          <><span className="spinner-sm" /> Analizando...</>
        ) : (
          <><span>🤖</span> Ejecutar Análisis K-Means</>
        )}
      </button>
    </div>
  );
}

// ── Cards de resumen ABC ──────────────────────────────────────

function ResumenABC({ resumen }) {
  if (!resumen) return null;
  const { conteo, pct_ingresos, ingresos_por_categoria, total_ingresos } = resumen;

  return (
    <div className="resumen-abc">
      {['A', 'B', 'C'].map(cat => {
        const meta = META_CAT[cat];
        return (
          <div key={cat} className={`resumen-card ${meta.color}`}>
            <div className="resumen-cat-header">
              <span className="resumen-emoji">{meta.emoji}</span>
              <div>
                <div className="resumen-cat-label">Categoría {cat}</div>
                <div className="resumen-cat-titulo">{meta.titulo}</div>
              </div>
            </div>
            <div className="resumen-cat-num">{conteo?.[cat] ?? 0}</div>
            <div className="resumen-cat-sub">productos</div>
            <div className="resumen-cat-ingresos">{fmt(ingresos_por_categoria?.[cat])}</div>
            <div className="resumen-cat-pct">{pct_ingresos?.[cat] ?? 0}% del total</div>
            <div className="resumen-barra-wrap">
              <div
                className="resumen-barra-fill"
                style={{ width: `${pct_ingresos?.[cat] ?? 0}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Modal historial ───────────────────────────────────────────

function ModalHistorial({ producto, datos, onCerrar }) {
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-hist" onClick={e => e.stopPropagation()}>
        <div className="modal-hist-header">
          <h3>📊 Historial de Clasificación</h3>
          <button className="btn-cerrar" onClick={onCerrar}>✕</button>
        </div>
        <div className="modal-hist-subheader">
          <strong>{producto?.nombre}</strong>
          <span>{producto?.categoria}</span>
        </div>

        {datos.length === 0 ? (
          <p className="modal-empty">Sin historial disponible.</p>
        ) : (
          <div className="hist-timeline">
            {datos.map((h, i) => {
              const meta = META_CAT[h.clasificacion] || META_CAT.C;
              return (
                <div key={i} className={`hist-item ${meta.color}`}>
                  <div className="hist-periodo">{MESES[h.mes - 1]} {h.anio}</div>
                  <div className="hist-cat">
                    <BadgeCategoria cat={h.clasificacion} />
                    {h.hubo_cambio && (
                      <BadgeCambio
                        hubo_cambio={h.hubo_cambio}
                        anterior={h.categoria_anterior}
                        actual={h.clasificacion}
                      />
                    )}
                  </div>
                  <div className="hist-datos">
                    <span>{fmt(h.ingresos_totales)}</span>
                    <span>{h.unidades_vendidas} uds.</span>
                    <BadgeTendencia tendencia={h.tendencia} />
                    {h.variacion_ingresos_pct !== null && (
                      <span className={h.variacion_ingresos_pct >= 0 ? 'col-pos' : 'col-neg'}>
                        {h.variacion_ingresos_pct >= 0 ? '+' : ''}{h.variacion_ingresos_pct?.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="hist-score">Score: {h.score_abc?.toFixed(1)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

function ClasificacionABC() {
  const [anio, setAnio]       = useState(ANIO_ACTUAL);
  const [mes,  setMes]        = useState(MES_ACTUAL);
  const [resumen, setResumen] = useState(null);
  const [datos,   setDatos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);
  const [filtrocat, setFiltrocat]   = useState('');
  const [filtroBusq, setFiltroBusq] = useState('');
  const [tabActual, setTabActual]   = useState('clasificacion');
  const [modalHist, setModalHist]   = useState(null);
  const [histDatos, setHistDatos]   = useState([]);
  const [resultado, setResultado]   = useState(null);
  const [anomalias, setAnomalias] = useState(null);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [detalleProducto, setDetalleProducto] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [resRes, claRes, anomRes] = await Promise.all([
        axios.get(`${API_URL}/abc/resumen/`,         { params: { anio, mes } }),
        axios.get(`${API_URL}/abc/clasificaciones/`, { params: { anio, mes } }),
        axios.get(`${API_URL}/abc/anomalias/`,       { params: { anio, mes } }),
      ]);
      setResumen(resRes.data);
      setDatos(claRes.data);
      setAnomalias(anomRes.data);
    } catch (e) {
      console.error('Error cargando ABC:', e);
    } finally {
      setLoading(false);
    }
  }, [anio, mes]);

  useEffect(() => { cargar(); }, [cargar]);

  const ejecutarAnalisis = async () => {
    setEjecutando(true);
    setResultado(null);
    try {
      const res = await axios.post(`${API_URL}/abc/ejecutar/`, { anio, mes });
      setResultado(res.data);
      await cargar();
    } catch (e) {
      setResultado({ exito: false, mensaje: 'Error al ejecutar el análisis.' });
    } finally {
      setEjecutando(false);
    }
  };

  const abrirHistorial = async (producto) => {
    setModalHist(producto);
    try {
      const res = await axios.get(`${API_URL}/abc/historial/${producto.id_producto}/`);
      setHistDatos(res.data);
    } catch (e) {
      setHistDatos([]);
    }
  };

  // Filtrado
  const datosFiltrados = datos.filter(d => {
    const pasaCat  = !filtrocat  || d.clasificacion === filtrocat;
    const pasaBusq = !filtroBusq || d.nombre.toLowerCase().includes(filtroBusq.toLowerCase());
    return pasaCat && pasaBusq;
  });

  if (loading) {
    return (
      <div className="abc-loading">
        <div className="spinner" />
        <p>Cargando clasificación ABC...</p>
      </div>
    );
  }

  const abrirDetalle = async (producto) => {
    setModalDetalle(producto);
    try {
      const res = await axios.get(
        `${API_URL}/abc/detalle/${producto.id_producto}/`,
        { params: { anio, mes } }
      );
      setDetalleProducto(res.data);
    } catch (e) {
      setDetalleProducto(null);
    }
  };

  return (
    <div className="abc-container">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="abc-header">
        <div className="abc-titulo">
          <h1>🤖 Clasificación ABC</h1>
          <p>Análisis automático con algoritmo K-Means</p>
        </div>
        <div className="abc-periodo">
          <div className="periodo-grupo">
            <label>Mes</label>
            <select
              value={mes}
              onChange={e => setMes(parseInt(e.target.value))}
              className="select-periodo"
            >
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="periodo-grupo">
            <label>Año</label>
            <select
              value={anio}
              onChange={e => setAnio(parseInt(e.target.value))}
              className="select-periodo"
            >
              {[ANIO_ACTUAL - 1, ANIO_ACTUAL].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Panel de control ──────────────────────────────── */}
      <PanelControl
        resumen={resumen}
        anio={anio}
        mes={mes}
        onEjecutar={ejecutarAnalisis}
        ejecutando={ejecutando}
      />

      {/* ── Resultado de ejecución ────────────────────────── */}
      {resultado && (
        <div className={`resultado-banner ${resultado.exito ? 'banner-ok' : 'banner-error'}`}>
          {resultado.exito ? (
            <>
              <strong>✅ Análisis completado</strong> — {resultado.productos_procesados} productos
              procesados, {resultado.productos_reclasificados} reclasificados.
              Calidad del clustering (silhouette): <strong>{resultado.silhouette_score?.toFixed(3)}</strong>.
              Distribución: <strong>{resultado.conteo_abc?.A} A</strong> /
              <strong> {resultado.conteo_abc?.B} B</strong> /
              <strong> {resultado.conteo_abc?.C} C</strong>.
            </>
          ) : (
            <><strong>❌ Error</strong> — {resultado.mensaje || resultado.error}</>
          )}
          <button className="banner-cerrar" onClick={() => setResultado(null)}>✕</button>
        </div>
      )}

      {/* ── Resumen ABC ───────────────────────────────────── */}
      <ResumenABC resumen={resumen} />

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="abc-tabs">
        {[
          { id: 'clasificacion', label: '📋 Clasificación' },
          { id: 'anomalias',     label: `⚠️ Anomalías${anomalias?.total_anomalos > 0 ? ` (${anomalias.total_anomalos})` : ''}` },
          { id: 'ejecuciones',   label: '⚙️ Historial de Ejecuciones' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`abc-tab-btn ${tabActual === tab.id ? 'tab-activo' : ''}`}
            onClick={() => setTabActual(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Clasificación ────────────────────────────── */}
      {tabActual === 'clasificacion' && (
        <div className="abc-contenido">
          {/* Filtros */}
          <div className="abc-filtros">
            <input
              type="text"
              placeholder="🔍 Buscar producto..."
              value={filtroBusq}
              onChange={e => setFiltroBusq(e.target.value)}
              className="filtro-busq"
            />
            <div className="cat-chips">
              {['', 'A', 'B', 'C'].map(c => (
                <button
                  key={c}
                  className={`cat-chip ${!c ? 'chip-all' : `chip-${c.toLowerCase()}`} ${filtrocat === c ? 'chip-activo' : ''}`}
                  onClick={() => setFiltrocat(c)}
                >
                  {!c ? 'Todos' : `${META_CAT[c].emoji} ${c} — ${META_CAT[c].titulo}`}
                  {c && <span className="chip-count">{resumen?.conteo?.[c] ?? 0}</span>}
                </button>
              ))}
            </div>
            <span className="filtro-count">
              {datosFiltrados.length} de {datos.length} productos
            </span>
          </div>

          {/* Tabla */}
          {datosFiltrados.length === 0 ? (
            <div className="abc-empty">
              <div className="empty-icon">🤖</div>
              <p>
                {datos.length === 0
                  ? 'No hay datos para este período. Ejecuta el análisis primero.'
                  : 'No se encontraron productos con los filtros aplicados.'}
              </p>
              {datos.length === 0 && (
                <button className="btn-ejecutar-vacio" onClick={ejecutarAnalisis} disabled={ejecutando}>
                  {ejecutando ? 'Analizando...' : '🤖 Ejecutar Análisis'}
                </button>
              )}
            </div>
          ) : (
            <div className="tabla-wrap">
              <table className="abc-tabla">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Stock</th>
                    <th>Unidades Vendidas</th>
                    <th>Ingresos</th>
                    <th>Score</th>
                    <th>Tendencia</th>
                    <th>% Ingresos</th>
                    <th>Cambio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {datosFiltrados.map((d, i) => (
                    <tr key={i} className={`fila-${d.clasificacion.toLowerCase()}`}>
                      <td>
                        <div className="prod-nombre">{d.nombre}</div>
                        <div className="prod-cat">{d.categoria}</div>
                      </td>
                      <td><BadgeCategoria cat={d.clasificacion} /></td>
                      <td>{fmt(d.precio)}</td>
                      <td>
                        <span className={d.stock <= 5 ? 'stock-bajo' : ''}>{d.stock}</span>
                      </td>
                      <td>{d.unidades_vendidas}</td>
                      <td>{fmt(d.ingresos_totales)}</td>
                      <td>
                        <div className="score-wrap">
                          <div className="score-bar" style={{
                            width: `${Math.min(d.score_abc, 100)}%`,
                            background: d.clasificacion === 'A' ? '#16a34a'
                              : d.clasificacion === 'B' ? '#d97706' : '#3b82f6'
                          }} />
                          <span className="score-val">{d.score_abc?.toFixed(1)}</span>
                        </div>
                      </td>
                      <td><BadgeTendencia tendencia={d.tendencia} /></td>
                      <td>
                        <div className="pct-wrap">
                          <span>{d.pct_ingresos_global?.toFixed(1)}%</span>
                          <span className="pct-acum">Acum: {d.pct_ingresos_acumulado?.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        <BadgeCambio
                          hubo_cambio={d.hubo_cambio}
                          anterior={d.categoria_anterior}
                          actual={d.clasificacion}
                        />
                        {!d.hubo_cambio && <span className="sin-cambio">—</span>}
                      </td>
                      <td>
                        <button
                          className="btn-historial"
                          onClick={() => abrirHistorial(d)}
                          title="Ver historial"
                        >
                          📈
                        </button>
                        <button
                          className="btn-detalle"
                          onClick={() => abrirDetalle(d)}
                          title="Ver detalle completo"
                        >
                          🔍
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Ejecuciones ──────────────────────────────── */}
      {tabActual === 'ejecuciones' && (
        <div className="abc-contenido">
          <h3 className="secc-titulo">Historial de Ejecuciones del Modelo</h3>
          {resumen?.historial_ejecuciones?.length === 0 ? (
            <div className="abc-empty">
              <p>No hay ejecuciones registradas aún.</p>
            </div>
          ) : (
            <table className="abc-tabla">
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Procesados</th>
                  <th>Reclasificados</th>
                  <th>Silhouette Score</th>
                </tr>
              </thead>
              <tbody>
                {(resumen?.historial_ejecuciones || []).map((e, i) => (
                  <tr key={i}>
                    <td>{MESES[e.mes_analizado - 1]} {e.anio_analizado}</td>
                    <td className="col-fecha">
                      {e.fecha_inicio
                        ? new Date(e.fecha_inicio).toLocaleString('es-BO')
                        : '—'}
                    </td>
                    <td>
                      <span className={`badge-estado-ej ${e.estado.toLowerCase()}`}>
                        {e.estado === 'EXITOSO' ? '✅' : e.estado === 'ERROR' ? '❌' : '⚠️'} {e.estado}
                      </span>
                    </td>
                    <td>{e.productos_procesados}</td>
                    <td>{e.productos_reclasificados}</td>
                    <td>
                      {e.silhouette_score != null
                        ? <span className={
                            e.silhouette_score >= 0.5 ? 'sil-bueno'
                            : e.silhouette_score >= 0.3 ? 'sil-medio' : 'sil-bajo'
                          }>
                            {e.silhouette_score.toFixed(3)}
                          </span>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Modal historial ───────────────────────────────── */}
      {modalHist && (
        <ModalHistorial
          producto={modalHist}
          datos={histDatos}
          onCerrar={() => { setModalHist(null); setHistDatos([]); }}
        />
      )}

      {/* ── Tab: Anomalías ───────────────────────────────── */}
      {tabActual === 'anomalias' && (
        <div className="abc-contenido">
          {!anomalias || anomalias.total_anomalos === 0 ? (
            <div className="abc-empty">
              <div className="empty-icon">✅</div>
              <p>No se detectaron anomalías en este período.</p>
              <p className="empty-sub">
                Isolation Forest analizó todas las transacciones y no encontró
                valores atípicos significativos.
              </p>
            </div>
          ) : (
            <>
              <div className="anomalias-header">
                <div className="anomalia-aviso">
                  <span className="aviso-icon">⚠️</span>
                  <div>
                    <strong>{anomalias.total_anomalos} productos</strong> presentaron
                    transacciones atípicas. Sus scores ABC fueron ajustados
                    automáticamente para evitar clasificaciones infladas.
                  </div>
                </div>
              </div>

              <div className="tabla-wrap">
                <table className="abc-tabla">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Score Original</th>
                      <th>Score Ajustado</th>
                      <th>Reducción</th>
                      <th>Factor</th>
                      <th>Detalle</th>
                      <th>Ver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalias.productos.map((p, i) => (
                      <tr key={i} className="fila-anomalia">
                        <td>
                          <div className="prod-nombre">{p.nombre}</div>
                          <div className="prod-cat">{p.categoria}</div>
                        </td>
                        <td><BadgeCategoria cat={p.clasificacion} /></td>
                        <td>
                          <span className="score-original">{p.score_abc_original?.toFixed(1)}</span>
                        </td>
                        <td>
                          <span className="score-ajustado">{p.score_abc_ajustado?.toFixed(1)}</span>
                        </td>
                        <td>
                          <span className="reduccion-score">
                            -{p.reduccion_score?.toFixed(1)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-factor ${
                            p.factor_penalizacion < 0.60 ? 'factor-severo'
                            : p.factor_penalizacion < 0.80 ? 'factor-moderado'
                            : 'factor-leve'
                          }`}>
                            ×{p.factor_penalizacion?.toFixed(2)}
                          </span>
                        </td>
                        <td className="detalle-anomalia-cell">
                          {p.detalle_anomalia || '—'}
                        </td>
                        <td>
                          <button
                            className="btn-detalle"
                            onClick={() => abrirDetalle(p)}
                            title="Ver detalle"
                          >
                            🔍
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

    {/* ── Modal detalle producto ────────────────────────── */}
    {modalDetalle && (
      <div className="modal-overlay" onClick={() => { setModalDetalle(null); setDetalleProducto(null); }}>
        <div className="modal-hist modal-detalle" onClick={e => e.stopPropagation()}>
          <div className="modal-hist-header">
            <h3>🔍 Detalle del Producto</h3>
            <button className="btn-cerrar" onClick={() => { setModalDetalle(null); setDetalleProducto(null); }}>✕</button>
          </div>

          {!detalleProducto ? (
            <div className="modal-empty"><div className="spinner" /></div>
          ) : (
            <div className="detalle-body">
              {/* Identificación */}
              <div className="detalle-seccion">
                <div className="detalle-grid-2">
                  <div className="detalle-campo">
                    <span className="detalle-label">Nombre</span>
                    <span className="detalle-valor">{detalleProducto.nombre}</span>
                  </div>
                  <div className="detalle-campo">
                    <span className="detalle-label">Categoría</span>
                    <span className="detalle-valor">{detalleProducto.categoria}</span>
                  </div>
                  <div className="detalle-campo">
                    <span className="detalle-label">Precio</span>
                    <span className="detalle-valor">{fmt(detalleProducto.precio)}</span>
                  </div>
                  <div className="detalle-campo">
                    <span className="detalle-label">Stock actual</span>
                    <span className="detalle-valor">{detalleProducto.stock}</span>
                  </div>
                  <div className="detalle-campo">
                    <span className="detalle-label">Clasificación</span>
                    <BadgeCategoria cat={detalleProducto.clasificacion} />
                  </div>
                  <div className="detalle-campo">
                    <span className="detalle-label">Tendencia</span>
                    <BadgeTendencia tendencia={detalleProducto.tendencia} />
                  </div>
                </div>
              </div>

              {/* Métricas de ventas */}
              <div className="detalle-seccion">
                <h4 className="detalle-seccion-titulo">📊 Métricas del Período</h4>
                <div className="detalle-grid-3">
                  {[
                    { label: 'Ingresos',         valor: fmt(detalleProducto.ingresos_totales) },
                    { label: 'Unidades',          valor: detalleProducto.unidades_vendidas },
                    { label: 'Transacciones',     valor: detalleProducto.num_transacciones },
                    { label: 'Días con venta',    valor: detalleProducto.dias_con_venta },
                    { label: 'Frecuencia',        valor: `${(detalleProducto.frecuencia_venta * 100).toFixed(1)}%` },
                    { label: 'Rotación',          valor: detalleProducto.rotacion_inventario?.toFixed(2) },
                    { label: 'Ticket promedio',   valor: fmt(detalleProducto.ticket_promedio) },
                    { label: 'Variación ingresos',
                      valor: detalleProducto.variacion_ingresos_pct !== null
                        ? `${detalleProducto.variacion_ingresos_pct >= 0 ? '+' : ''}${detalleProducto.variacion_ingresos_pct?.toFixed(1)}%`
                        : 'N/A',
                      clase: detalleProducto.variacion_ingresos_pct >= 0 ? 'col-pos' : 'col-neg'
                    },
                  ].map((item, i) => (
                    <div key={i} className="detalle-metrica">
                      <span className="detalle-metrica-label">{item.label}</span>
                      <span className={`detalle-metrica-valor ${item.clase || ''}`}>{item.valor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scores */}
              <div className="detalle-seccion">
                <h4 className="detalle-seccion-titulo">🎯 Scores ABC</h4>
                <div className="scores-comparativa">
                  <div className="score-box score-original-box">
                    <div className="score-box-label">Score Original</div>
                    <div className="score-box-valor">{detalleProducto.score_abc?.toFixed(2)}</div>
                    <div className="score-box-sub">Calculado por K-Means</div>
                  </div>
                  <div className="score-arrow">
                    {detalleProducto.es_anomalia ? '→ ⚠️ →' : '→ ✅ →'}
                  </div>
                  <div className={`score-box ${detalleProducto.es_anomalia ? 'score-ajustado-box' : 'score-ok-box'}`}>
                    <div className="score-box-label">Score Ajustado</div>
                    <div className="score-box-valor">{detalleProducto.score_abc_ajustado?.toFixed(2)}</div>
                    <div className="score-box-sub">
                      Factor: ×{detalleProducto.factor_penalizacion?.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Anomalía */}
              {detalleProducto.es_anomalia && (
                <div className="detalle-seccion">
                  <h4 className="detalle-seccion-titulo">⚠️ Detección de Anomalías</h4>
                  <div className="anomalia-detalle-box">
                    <div className="anomalia-score-row">
                      <span className="detalle-label">Score Isolation Forest</span>
                      <span className={`score-if ${detalleProducto.score_anomalia < -0.1 ? 'if-anomalo' : 'if-normal'}`}>
                        {detalleProducto.score_anomalia?.toFixed(4)}
                      </span>
                    </div>
                    <p className="anomalia-descripcion">{detalleProducto.detalle_anomalia}</p>
                  </div>
                </div>
              )}

              {/* Confianza */}
              <div className="detalle-seccion">
                <div className="confianza-wrap">
                  <span className="detalle-label">Confianza de clasificación</span>
                  <div className="confianza-barra-wrap">
                    <div
                      className="confianza-barra"
                      style={{ width: `${(detalleProducto.confianza || 0) * 100}%` }}
                    />
                  </div>
                  <span className="confianza-valor">
                    {((detalleProducto.confianza || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    </div>

    
  );
}

export default ClasificacionABC;