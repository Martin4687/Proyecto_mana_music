import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

// ── Utilidades ────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(n || 0);

const TIPO_CONFIG = {
  LOCAL:      { label: 'Local',       color: '#0891b2', bg: '#e0f2fe' },
  IMPORTACION:{ label: 'Importación', color: '#7c3aed', bg: '#ede9fe' },
};

const ESTADO_COMPRA = {
  PENDIENTE: { label: 'Pendiente', color: '#d97706', bg: '#fef3c7' },
  RECIBIDA:  { label: 'Recibida',  color: '#059669', bg: '#d1fae5' },
  CANCELADA: { label: 'Cancelada', color: '#dc2626', bg: '#fee2e2' },
};

// ── Estilos ───────────────────────────────────────────────────
const S = {
  page: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: '#f0f4f8',
    minHeight: '100vh',
    padding: '28px 32px',
    color: '#1e293b',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 3 },
  btnPrimary: {
    background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  btnSecondary: {
    background: '#fff', color: '#334155', border: '1px solid #e2e8f0',
    borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnIcon: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '5px 8px', borderRadius: 6, fontSize: 14, color: '#64748b',
  },
  // Métricas rápidas
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14, marginBottom: 20,
  },
  statCard: {
    background: '#fff', borderRadius: 10, padding: '14px 18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '3px solid transparent',
  },
  statLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: 700, color: '#0f172a' },
  // Card
  card: {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden',
  },
  filtersBar: {
    display: 'flex', gap: 10, padding: '12px 20px',
    background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
    flexWrap: 'wrap', alignItems: 'center',
  },
  filterInput: {
    padding: '7px 11px', borderRadius: 7, border: '1px solid #e2e8f0',
    fontSize: 13, background: '#fff', color: '#334155', outline: 'none',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px',
    background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap',
  },
  td: { padding: '13px 16px', borderBottom: '1px solid #f1f5f9', color: '#334155', verticalAlign: 'middle' },
  emptyRow: { textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 13 },
  badge: (color, bg) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
    background: bg, color: color, whiteSpace: 'nowrap',
  }),
  activoBadge: (activo) => ({
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: activo ? '#10b981' : '#94a3b8', marginRight: 5,
  }),
  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
  },
  modal: {
    background: '#fff', borderRadius: 14, width: '100%',
    maxWidth: 580, maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalLg: {
    background: '#fff', borderRadius: 14, width: '100%',
    maxWidth: 780, maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    position: 'sticky', top: 0, background: '#fff', zIndex: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 },
  modalBody: { padding: '20px 24px' },
  modalFooter: {
    padding: '16px 24px', borderTop: '1px solid #f1f5f9',
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    position: 'sticky', bottom: 0, background: '#fff',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 6 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 5 },
  formGroupFull: { display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' },
  label: { fontSize: 12, fontWeight: 600, color: '#475569' },
  input: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#1e293b', outline: 'none',
  },
  select: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#1e293b', background: '#fff', outline: 'none',
  },
  textarea: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#1e293b', outline: 'none', resize: 'vertical', minHeight: 70,
  },
  checkRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', background: '#f8fafc', borderRadius: 8,
    marginTop: 8, cursor: 'pointer',
  },
  // Historial
  historialCard: {
    background: '#f8fafc', borderRadius: 8, padding: '12px 16px',
    marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  infoBox: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
    background: '#f0f9ff', borderRadius: 10, padding: '14px 18px', marginBottom: 18,
  },
  infoItem: { textAlign: 'center' },
  infoLabel: { fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' },
  infoValue: { fontSize: 17, fontWeight: 700, color: '#0f172a', marginTop: 2 },
  errorBox: {
    background: '#fee2e2', color: '#dc2626', padding: '10px 14px',
    borderRadius: 8, fontSize: 13, marginBottom: 14,
  },
};

// ── Modal formulario ──────────────────────────────────────────
function ModalFormulario({ proveedor, onClose, onGuardar }) {
  const isEdit = !!proveedor;
  const [form, setForm] = useState({
    nombre: proveedor?.nombre || '',
    contacto: proveedor?.contacto || '',
    telefono: proveedor?.telefono || '',
    email: proveedor?.email || '',
    direccion: proveedor?.direccion || '',
    nit: proveedor?.nit || '',
    tipo: proveedor?.tipo || 'LOCAL',
    activo: proveedor?.activo ?? true,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const set = (campo, val) => setForm((f) => ({ ...f, [campo]: val }));

  const validar = () => {
    if (!form.nombre.trim()) return 'El nombre es obligatorio.';
    if (!form.contacto.trim()) return 'El contacto es obligatorio.';
    if (!form.telefono.trim()) return 'El teléfono es obligatorio.';
    if (!form.email.trim()) return 'El email es obligatorio.';
    return null;
  };

  const handleGuardar = async () => {
    const err = validar();
    if (err) { setError(err); return; }
    setError('');
    setGuardando(true);
    try {
      if (isEdit) {
        await axios.put(`${API_URL}/proveedores/${proveedor.id_proveedor}/`, form);
      } else {
        await axios.post(`${API_URL}/proveedores/`, form);
      }
      onGuardar();
    } catch (e) {
      console.error('Error guardando proveedor:', e);
      setError('Error al guardar. Verifica los datos.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>{isEdit ? '✏️ Editar proveedor' : '➕ Nuevo proveedor'}</h2>
          <button style={{ ...S.btnIcon, fontSize: 18 }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          {error && <div style={S.errorBox}>⚠️ {error}</div>}

          <div style={S.formGrid}>
            <div style={S.formGroupFull}>
              <label style={S.label}>Nombre *</label>
              <input style={S.input} placeholder="Nombre del proveedor"
                value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>Contacto *</label>
              <input style={S.input} placeholder="Nombre del contacto"
                value={form.contacto} onChange={(e) => set('contacto', e.target.value)} />
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>Teléfono *</label>
              <input style={S.input} placeholder="Ej. 70012345"
                value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>Email *</label>
              <input style={S.input} type="email" placeholder="correo@empresa.com"
                value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>NIT <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
              <input style={S.input} placeholder="Ej. 1234567890"
                value={form.nit} onChange={(e) => set('nit', e.target.value)} />
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>Tipo de proveedor</label>
              <select style={S.select} value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                <option value="LOCAL">🏠 Local</option>
                <option value="IMPORTACION">✈️ Importación</option>
              </select>
            </div>

            <div style={S.formGroupFull}>
              <label style={S.label}>Dirección <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
              <textarea style={S.textarea} placeholder="Dirección del proveedor..."
                value={form.direccion} onChange={(e) => set('direccion', e.target.value)} />
            </div>

            <div style={S.formGroupFull}>
              <label
                style={S.checkRow}
                onClick={() => set('activo', !form.activo)}
              >
                <input
                  type="checkbox" checked={form.activo}
                  onChange={() => set('activo', !form.activo)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                    Proveedor activo
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                    Los proveedores inactivos no aparecen al crear órdenes de compra
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose} disabled={guardando}>Cancelar</button>
          <button
            style={{ ...S.btnPrimary, opacity: guardando ? 0.7 : 1 }}
            onClick={handleGuardar} disabled={guardando}
          >
            {guardando ? '⏳ Guardando...' : isEdit ? '💾 Guardar cambios' : '💾 Crear proveedor'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal historial de compras ────────────────────────────────
function ModalHistorial({ proveedorId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await axios.get(`${API_URL}/proveedores/${proveedorId}/historial-compras/`);
        setData(res.data);
      } catch (e) {
        console.error('Error cargando historial:', e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [proveedorId]);

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modalLg}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>
            📋 Historial de compras — {data?.proveedor || '...'}
          </h2>
          <button style={{ ...S.btnIcon, fontSize: 18 }} onClick={onClose}>✕</button>
        </div>

        <div style={S.modalBody}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>Cargando historial...</p>
          ) : !data ? (
            <p style={{ textAlign: 'center', color: '#94a3b8' }}>No se pudo cargar el historial.</p>
          ) : (
            <>
              {/* Resumen */}
              <div style={S.infoBox}>
                <div style={S.infoItem}>
                  <div style={S.infoLabel}>Total compras</div>
                  <div style={S.infoValue}>{data.total_compras}</div>
                </div>
                <div style={S.infoItem}>
                  <div style={S.infoLabel}>Monto total</div>
                  <div style={S.infoValue}>{fmt(data.monto_total)}</div>
                </div>
                <div style={S.infoItem}>
                  <div style={S.infoLabel}>Promedio por compra</div>
                  <div style={S.infoValue}>
                    {data.total_compras > 0 ? fmt(data.monto_total / data.total_compras) : '—'}
                  </div>
                </div>
              </div>

              {/* Lista de compras */}
              {data.compras.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                  📦 No hay compras registradas con este proveedor.
                </div>
              ) : (
                data.compras.map((c) => (
                  <div key={c.id_compra} style={S.historialCard}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, color: '#1e40af', fontSize: 13 }}>
                          #{c.id_compra}
                        </span>
                        <span style={S.badge(
                          ESTADO_COMPRA[c.estado]?.color || '#64748b',
                          ESTADO_COMPRA[c.estado]?.bg || '#f1f5f9'
                        )}>
                          {c.estado}
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{c.forma_pago}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#475569' }}>{c.productos}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{c.fecha}</div>
                    </div>
                    <span style={{ fontWeight: 700, color: '#059669', fontSize: 15 }}>
                      {fmt(c.total)}
                    </span>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalForm, setModalForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [historialId, setHistorialId] = useState(null);
  const [procesando, setProcesando] = useState(null);

  const [filtros, setFiltros] = useState({ tipo: '', activo: '', busqueda: '' });

  const cargarProveedores = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      if (filtros.activo !== '') params.append('activo', filtros.activo);

      const res = await axios.get(`${API_URL}/proveedores/?${params.toString()}`);
      setProveedores(res.data);
    } catch (e) {
      console.error('Error cargando proveedores:', e);
    } finally {
      setLoading(false);
    }
  }, [filtros.tipo, filtros.activo]);

  useEffect(() => { cargarProveedores(); }, [cargarProveedores]);

  const toggleActivo = async (proveedor) => {
    setProcesando(proveedor.id_proveedor);
    try {
      await axios.patch(`${API_URL}/proveedores/${proveedor.id_proveedor}/toggle-activo/`);
      await cargarProveedores();
    } catch (e) {
      console.error('Error toggling activo:', e);
    } finally {
      setProcesando(null);
    }
  };

  // Filtro local por búsqueda
  const proveedoresFiltrados = proveedores.filter((p) => {
    if (!filtros.busqueda) return true;
    const q = filtros.busqueda.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(q) ||
      p.contacto?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  // Métricas rápidas
  const totalActivos = proveedores.filter((p) => p.activo).length;
  const totalLocales = proveedores.filter((p) => p.tipo === 'LOCAL').length;
  const totalImportacion = proveedores.filter((p) => p.tipo === 'IMPORTACION').length;
  const montoTotal = proveedores.reduce((s, p) => s + (p.monto_total_compras || 0), 0);

  return (
    <div style={S.page}>

      {/* ── Encabezado ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🏢 Proveedores</h1>
          <p style={S.subtitle}>Gestión de proveedores · {proveedoresFiltrados.length} registros</p>
        </div>
        <button style={S.btnPrimary} onClick={() => { setEditando(null); setModalForm(true); }}>
          ➕ Nuevo proveedor
        </button>
      </div>

      {/* ── Métricas ── */}
      <div style={S.statsRow}>
        {[
          { label: 'Total proveedores', value: proveedores.length, color: '#1e40af' },
          { label: 'Activos',           value: totalActivos,        color: '#059669' },
          { label: 'Locales',           value: totalLocales,        color: '#0891b2' },
          { label: 'Importación',       value: totalImportacion,    color: '#7c3aed' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...S.statCard, borderLeftColor: color }}>
            <div style={S.statLabel}>{label}</div>
            <div style={{ ...S.statValue, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabla ── */}
      <div style={S.card}>

        {/* Filtros */}
        <div style={S.filtersBar}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Filtros:</span>

          <input
            style={{ ...S.filterInput, minWidth: 200 }}
            placeholder="🔍 Nombre, contacto o email"
            value={filtros.busqueda}
            onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
          />

          <select style={S.filterInput} value={filtros.tipo}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
            <option value="">Todos los tipos</option>
            <option value="LOCAL">🏠 Local</option>
            <option value="IMPORTACION">✈️ Importación</option>
          </select>

          <select style={S.filterInput} value={filtros.activo}
            onChange={(e) => setFiltros({ ...filtros, activo: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="true">🟢 Activos</option>
            <option value="false">⚪ Inactivos</option>
          </select>

          <button style={{ ...S.btnSecondary, fontSize: 12 }}
            onClick={() => setFiltros({ tipo: '', activo: '', busqueda: '' })}>
            ✕ Limpiar
          </button>
        </div>

        {/* Tabla */}
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                {['Proveedor', 'Contacto', 'Teléfono', 'Email', 'Tipo', 'NIT', 'Compras', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={S.emptyRow}>Cargando proveedores...</td></tr>
              ) : proveedoresFiltrados.length === 0 ? (
                <tr><td colSpan={9} style={S.emptyRow}>
                  No se encontraron proveedores.<br />
                  <span style={{ fontSize: 12 }}>Presiona "Nuevo proveedor" para agregar uno.</span>
                </td></tr>
              ) : (
                proveedoresFiltrados.map((p) => (
                  <tr key={p.id_proveedor}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}>

                    <td style={S.td}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.nombre}</div>
                      {p.direccion && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          📍 {p.direccion.length > 35 ? p.direccion.slice(0, 35) + '...' : p.direccion}
                        </div>
                      )}
                    </td>

                    <td style={S.td}>{p.contacto}</td>
                    <td style={{ ...S.td, whiteSpace: 'nowrap' }}>{p.telefono}</td>
                    <td style={{ ...S.td, color: '#1e40af' }}>{p.email}</td>

                    <td style={S.td}>
                      <span style={S.badge(
                        TIPO_CONFIG[p.tipo]?.color || '#64748b',
                        TIPO_CONFIG[p.tipo]?.bg || '#f1f5f9'
                      )}>
                        {p.tipo === 'LOCAL' ? '🏠' : '✈️'} {TIPO_CONFIG[p.tipo]?.label || p.tipo}
                      </span>
                    </td>

                    <td style={{ ...S.td, color: '#64748b', fontSize: 12 }}>
                      {p.nit || <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>

                    <td style={S.td}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.total_compras} compras</div>
                      <div style={{ fontSize: 11, color: '#059669' }}>{fmt(p.monto_total_compras)}</div>
                    </td>

                    <td style={S.td}>
                      <span style={{ display: 'flex', alignItems: 'center', fontSize: 13 }}>
                        <span style={S.activoBadge(p.activo)} />
                        <span style={{ color: p.activo ? '#059669' : '#94a3b8', fontWeight: 600 }}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </span>
                    </td>

                    <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {/* Historial */}
                        <button
                          style={{ ...S.btnSecondary, padding: '5px 10px', fontSize: 12 }}
                          onClick={() => setHistorialId(p.id_proveedor)}
                          title="Ver historial de compras"
                        >
                          📋
                        </button>

                        {/* Editar */}
                        <button
                          style={{
                            background: '#fef3c7', color: '#d97706', border: 'none',
                            borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                          }}
                          onClick={() => { setEditando(p); setModalForm(true); }}
                        >
                          ✏️ Editar
                        </button>

                        {/* Toggle activo */}
                        <button
                          style={{
                            background: p.activo ? '#fee2e2' : '#d1fae5',
                            color: p.activo ? '#dc2626' : '#059669',
                            border: 'none', borderRadius: 6, padding: '5px 10px',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            opacity: procesando === p.id_proveedor ? 0.6 : 1,
                          }}
                          disabled={procesando === p.id_proveedor}
                          onClick={() => toggleActivo(p)}
                        >
                          {procesando === p.id_proveedor ? '⏳' : p.activo ? '🔴 Desactivar' : '🟢 Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de tabla */}
        {proveedoresFiltrados.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {proveedoresFiltrados.length} proveedor{proveedoresFiltrados.length !== 1 ? 'es' : ''}
            </span>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              Monto total compras: <span style={{ color: '#059669' }}>{fmt(montoTotal)}</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Modales ── */}
      {modalForm && (
        <ModalFormulario
          proveedor={editando}
          onClose={() => { setModalForm(false); setEditando(null); }}
          onGuardar={() => { setModalForm(false); setEditando(null); cargarProveedores(); }}
        />
      )}

      {historialId && (
        <ModalHistorial
          proveedorId={historialId}
          onClose={() => setHistorialId(null)}
        />
      )}
    </div>
  );
}