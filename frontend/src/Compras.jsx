import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

// ── Utilidades ────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(n || 0);

const ESTADO_CONFIG = {
  PENDIENTE:  { label: 'Pendiente',  color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  RECIBIDA:   { label: 'Recibida',   color: '#10b981', bg: '#d1fae5', icon: '✅' },
  CANCELADA:  { label: 'Cancelada',  color: '#ef4444', bg: '#fee2e2', icon: '❌' },
};

// ── Estilos base ──────────────────────────────────────────────
const S = {
  page: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: '#f0f4f8',
    minHeight: '100vh',
    padding: '28px 32px',
    color: '#1e293b',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 3,
  },
  refreshBtn: {
    background: '#1e40af',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  // Métricas
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '18px 20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    borderTop: '3px solid transparent',
  },
  metricIcon: {
    fontSize: 22,
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.1,
  },
  metricSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  // Layout 2 columnas
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: 20,
    marginBottom: 24,
  },
  // Cards genéricas
  card: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '16px 20px 12px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  cardBody: {
    padding: '12px 20px 16px',
  },
  // Alertas
  alertItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #f8fafc',
  },
  alertName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: 2,
  },
  alertSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  alertBadge: (pct) => ({
    fontSize: 12,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 20,
    background: pct <= 25 ? '#fee2e2' : pct <= 50 ? '#fef3c7' : '#d1fae5',
    color: pct <= 25 ? '#dc2626' : pct <= 50 ? '#d97706' : '#059669',
  }),
  // Tabla historial
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '11px 14px',
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
    verticalAlign: 'middle',
  },
  // Filtros
  filtersBar: {
    display: 'flex',
    gap: 10,
    padding: '14px 20px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterInput: {
    padding: '7px 11px',
    borderRadius: 7,
    border: '1px solid #e2e8f0',
    fontSize: 13,
    background: '#fff',
    color: '#334155',
    outline: 'none',
    minWidth: 130,
  },
  filterLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  clearBtn: {
    padding: '7px 12px',
    borderRadius: 7,
    border: '1px solid #e2e8f0',
    background: '#fff',
    fontSize: 12,
    color: '#64748b',
    cursor: 'pointer',
    fontWeight: 600,
  },
  // Estado badge
  estadoBadge: (estado) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 9px',
    borderRadius: 20,
    background: ESTADO_CONFIG[estado]?.bg || '#f1f5f9',
    color: ESTADO_CONFIG[estado]?.color || '#64748b',
  }),
  // Empty / loading
  emptyRow: {
    textAlign: 'center',
    padding: '32px 0',
    color: '#94a3b8',
    fontSize: 13,
  },
  // Donut chart estados
  estadoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f8fafc',
  },
  estadoDot: (color) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: color,
    display: 'inline-block',
    marginRight: 7,
  }),
};

// ── Componente principal ──────────────────────────────────────
export default function Compras() {
  const [data, setData] = useState(null);
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompras, setLoadingCompras] = useState(false);

  // Filtros historial
  const [filtros, setFiltros] = useState({
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
    busqueda: '',
  });

  // ── Carga dashboard ──
  const cargarDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/dashboard/compras/`);
      setData(res.data);
    } catch (err) {
      console.error('Error cargando dashboard compras:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Carga historial completo con filtros ──
  const cargarCompras = useCallback(async () => {
    try {
      setLoadingCompras(true);
      const params = new URLSearchParams();
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
      if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);

      const res = await axios.get(`${API_URL}/compras/?${params.toString()}`);
      setCompras(res.data);
    } catch (err) {
      console.error('Error cargando compras:', err);
    } finally {
      setLoadingCompras(false);
    }
  }, [filtros.estado, filtros.fecha_desde, filtros.fecha_hasta]);

  useEffect(() => { cargarDashboard(); }, [cargarDashboard]);
  useEffect(() => { cargarCompras(); }, [cargarCompras]);

  const limpiarFiltros = () =>
    setFiltros({ estado: '', fecha_desde: '', fecha_hasta: '', busqueda: '' });

  // Filtro búsqueda local por proveedor
  const comprasFiltradas = compras.filter((c) => {
    if (!filtros.busqueda) return true;
    const q = filtros.busqueda.toLowerCase();
    return (
      c.proveedor_nombre?.toLowerCase().includes(q) ||
      String(c.id_compra).includes(q)
    );
  });

  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📦</div>
          <p>Cargando módulo de compras...</p>
        </div>
      </div>
    );
  }

  const { metricas, alertas_reabastecimiento } = data || {};

  return (
    <div style={S.page}>

      {/* ── Encabezado ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>📦 Compras</h1>
          <p style={S.subtitle}>Vista general · Alertas · Historial</p>
        </div>
        <button style={S.refreshBtn} onClick={() => { cargarDashboard(); cargarCompras(); }}>
          🔄 Actualizar
        </button>
      </div>

      {/* ── Métricas ── */}
      <div style={S.metricsGrid}>
        <MetricCard
          icon="💸"
          label="Gasto del mes"
          value={fmt(metricas?.gasto_mes)}
          borderColor="#1e40af"
        />
        <MetricCard
          icon="📅"
          label="Gasto del año"
          value={fmt(metricas?.gasto_anio)}
          borderColor="#7c3aed"
        />
        <MetricCard
          icon="🛒"
          label="Compras este mes"
          value={metricas?.num_compras_mes ?? '—'}
          borderColor="#0891b2"
        />
        <MetricCard
          icon="🏆"
          label="Proveedor top"
          value={metricas?.top_proveedor?.nombre || '—'}
          sub={metricas?.top_proveedor?.gasto ? fmt(metricas.top_proveedor.gasto) : ''}
          borderColor="#059669"
          smallValue
        />
        <MetricCard
          icon="📦"
          label="Producto más comprado"
          value={metricas?.top_producto?.nombre || '—'}
          sub={metricas?.top_producto?.cantidad ? `${metricas.top_producto.cantidad} unidades` : ''}
          borderColor="#d97706"
          smallValue
        />
      </div>

      {/* ── Alertas + Estados ── */}
      <div style={S.twoCol}>

        {/* Estados de compras */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <h3 style={S.cardTitle}>📊 Estado de órdenes</h3>
          </div>
          <div style={S.cardBody}>
            {[
              { key: 'pendiente',  label: 'Pendiente',  color: '#f59e0b', count: metricas?.estados?.pendiente },
              { key: 'recibida',   label: 'Recibida',   color: '#10b981', count: metricas?.estados?.recibida },
              { key: 'cancelada',  label: 'Cancelada',  color: '#ef4444', count: metricas?.estados?.cancelada },
            ].map(({ key, label, color, count }) => {
              const total = (metricas?.estados?.pendiente || 0) +
                            (metricas?.estados?.recibida || 0) +
                            (metricas?.estados?.cancelada || 0);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key} style={S.estadoRow}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={S.estadoDot(color)} />
                    <span style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 80, height: 6, borderRadius: 3,
                      background: '#f1f5f9', overflow: 'hidden'
                    }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', minWidth: 24, textAlign: 'right' }}>
                      {count ?? 0}
                    </span>
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>
                Total registrado
              </p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '4px 0 0' }}>
                {(metricas?.estados?.pendiente || 0) +
                 (metricas?.estados?.recibida || 0) +
                 (metricas?.estados?.cancelada || 0)} compras
              </p>
            </div>
          </div>
        </div>

        {/* Alertas de reabastecimiento */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <h3 style={S.cardTitle}>
              🚨 Alertas de reabastecimiento
            </h3>
            <span style={{
              fontSize: 11, fontWeight: 700, background: '#fee2e2',
              color: '#dc2626', padding: '3px 9px', borderRadius: 20,
            }}>
              {alertas_reabastecimiento?.length ?? 0} productos
            </span>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {alertas_reabastecimiento?.length === 0 && (
              <div style={{ ...S.emptyRow, padding: '24px 20px' }}>
                ✅ No hay productos que requieran reabastecimiento
              </div>
            )}
            {alertas_reabastecimiento?.map((item) => {
              const pct = item.stock_maximo > 0
                ? Math.round((item.stock_actual / item.stock_maximo) * 100)
                : 0;
              return (
                <div key={item['id_producto__id_producto']} style={{ ...S.alertItem, padding: '10px 20px' }}>
                  <div>
                    <div style={S.alertName}>{item['id_producto__nombre']}</div>
                    <div style={S.alertSub}>
                      Stock: <b>{item.stock_actual}</b> · Mínimo: {item.stock_minimo} · Reorden: {item.punto_reorden}
                    </div>
                  </div>
                  <span style={S.alertBadge(pct)}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Historial completo ── */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <h3 style={S.cardTitle}>🗂️ Historial de compras</h3>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {comprasFiltradas.length} registro{comprasFiltradas.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filtros */}
        <div style={S.filtersBar}>
          <span style={S.filterLabel}>Filtros:</span>

          <input
            style={S.filterInput}
            placeholder="🔍 Proveedor o N° compra"
            value={filtros.busqueda}
            onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
          />

          <select
            style={S.filterInput}
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="RECIBIDA">Recibida</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          <span style={S.filterLabel}>Desde:</span>
          <input
            type="date"
            style={S.filterInput}
            value={filtros.fecha_desde}
            onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })}
          />

          <span style={S.filterLabel}>Hasta:</span>
          <input
            type="date"
            style={S.filterInput}
            value={filtros.fecha_hasta}
            onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
          />

          <button style={S.clearBtn} onClick={limpiarFiltros}>✕ Limpiar</button>
        </div>

        {/* Tabla */}
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                {['N°', 'Proveedor', 'Productos', 'Fecha', 'Estado', 'Forma de pago', 'Total'].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingCompras ? (
                <tr><td colSpan={7} style={S.emptyRow}>Cargando...</td></tr>
              ) : comprasFiltradas.length === 0 ? (
                <tr><td colSpan={7} style={S.emptyRow}>No se encontraron compras</td></tr>
              ) : (
                comprasFiltradas.map((compra) => {
                  const detalles = compra.detalles || [];
                  const nombres = detalles.map((d) => d.producto_info?.nombre || '');
                  const productosTexto = nombres.length === 0
                    ? '—'
                    : nombres.length === 1
                      ? nombres[0]
                      : `${nombres[0]} (+${nombres.length - 1} más)`;

                  const fecha = compra.fecha_compra
                    ? new Date(compra.fecha_compra).toLocaleDateString('es-BO')
                    : '—';

                  return (
                    <tr key={compra.id_compra} style={{ transition: 'background 0.1s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = ''}
                    >
                      <td style={{ ...S.td, fontWeight: 700, color: '#1e40af' }}>
                        #{compra.id_compra}
                      </td>
                      <td style={S.td}>{compra.proveedor_nombre || '—'}</td>
                      <td style={{ ...S.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {productosTexto}
                      </td>
                      <td style={{ ...S.td, whiteSpace: 'nowrap', color: '#64748b' }}>{fecha}</td>
                      <td style={S.td}>
                        <span style={S.estadoBadge(compra.estado)}>
                          {ESTADO_CONFIG[compra.estado]?.icon} {ESTADO_CONFIG[compra.estado]?.label || compra.estado}
                        </span>
                      </td>
                      <td style={{ ...S.td, color: '#64748b' }}>
                        {compra.forma_pago || '—'}
                      </td>
                      <td style={{ ...S.td, fontWeight: 700, color: '#059669' }}>
                        {fmt(compra.total)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente MetricCard ─────────────────────────────────
function MetricCard({ icon, label, value, sub, borderColor, smallValue }) {
  return (
    <div style={{ ...S.metricCard, borderTopColor: borderColor }}>
      <div style={S.metricIcon}>{icon}</div>
      <div style={S.metricLabel}>{label}</div>
      <div style={{ ...S.metricValue, fontSize: smallValue ? 16 : 22 }}>{value}</div>
      {sub && <div style={S.metricSub}>{sub}</div>}
    </div>
  );
}