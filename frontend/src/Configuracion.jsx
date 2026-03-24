import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const MONEDAS = [
  { codigo: 'BOB', nombre: 'Boliviano', simbolo: 'Bs.' },
  { codigo: 'USD', nombre: 'Dólar estadounidense', simbolo: '$' },
  { codigo: 'EUR', nombre: 'Euro', simbolo: '€' },
  { codigo: 'PEN', nombre: 'Sol peruano', simbolo: 'S/.' },
  { codigo: 'ARS', nombre: 'Peso argentino', simbolo: '$' },
  { codigo: 'CLP', nombre: 'Peso chileno', simbolo: '$' },
  { codigo: 'BRL', nombre: 'Real brasileño', simbolo: 'R$' },
];

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
    marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 3 },
  // Tabs
  tabsRow: {
    display: 'flex', gap: 4, marginBottom: 24,
    background: '#fff', borderRadius: 10, padding: 4,
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    width: 'fit-content',
  },
  tab: (active) => ({
    padding: '9px 20px', borderRadius: 7, border: 'none',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.15s',
    background: active ? '#1e40af' : 'transparent',
    color: active ? '#fff' : '#64748b',
  }),
  // Layout
  twoCol: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
  },
  card: {
    background: '#fff', borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden',
  },
  cardHeader: {
    padding: '16px 22px', borderBottom: '1px solid #f1f5f9',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 7 },
  cardBody: { padding: '20px 22px' },
  cardFooter: {
    padding: '14px 22px', borderTop: '1px solid #f1f5f9',
    display: 'flex', justifyContent: 'flex-end', gap: 10,
  },
  // Form
  formGroup: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  formGroupFull: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14, gridColumn: '1 / -1' },
  label: { fontSize: 12, fontWeight: 600, color: '#475569' },
  labelOpt: { fontSize: 11, color: '#94a3b8', fontWeight: 400 },
  input: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#1e293b', outline: 'none',
    transition: 'border-color 0.15s',
  },
  select: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#1e293b', background: '#fff', outline: 'none',
  },
  textarea: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#1e293b', outline: 'none', resize: 'vertical', minHeight: 70,
  },
  // Buttons
  btnPrimary: {
    background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8,
    padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  btnSecondary: {
    background: '#fff', color: '#334155', border: '1px solid #e2e8f0',
    borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnDanger: {
    background: 'none', color: '#dc2626', border: 'none',
    borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  btnWarning: {
    background: '#fef3c7', color: '#d97706', border: 'none',
    borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  // Alertas
  successBox: {
    background: '#d1fae5', color: '#065f46', padding: '10px 14px',
    borderRadius: 8, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7,
  },
  errorBox: {
    background: '#fee2e2', color: '#dc2626', padding: '10px 14px',
    borderRadius: 8, fontSize: 13, marginBottom: 14,
  },
  // Tabla categorías
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px',
    background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
  },
  td: { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  emptyRow: { textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 },
  activoDot: (activo) => ({
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: activo ? '#10b981' : '#94a3b8', marginRight: 6,
  }),
  // Preview moneda
  previewBox: {
    background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10,
    padding: '14px 18px', marginTop: 16,
  },
  previewLabel: { fontSize: 11, color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 },
  previewValue: { fontSize: 22, fontWeight: 700, color: '#0c4a6e' },
  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
  },
  modal: {
    background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 },
  modalBody: { padding: '18px 22px' },
  modalFooter: {
    padding: '14px 22px', borderTop: '1px solid #f1f5f9',
    display: 'flex', justifyContent: 'flex-end', gap: 10,
  },
  btnIcon: {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '4px 7px', borderRadius: 5, fontSize: 15, color: '#64748b',
  },
};

// ── Modal Categoría ───────────────────────────────────────────
function ModalCategoria({ categoria, onClose, onGuardar }) {
  const isEdit = !!categoria;
  const [form, setForm] = useState({
    nombre: categoria?.nombre || '',
    descripcion: categoria?.descripcion || '',
    activo: categoria?.activo ?? true,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setError(''); setGuardando(true);
    try {
      if (isEdit) {
        await axios.put(`${API_URL}/categorias/${categoria.id_categoria}/`, form);
      } else {
        await axios.post(`${API_URL}/categorias/`, form);
      }
      onGuardar();
    } catch (e) {
      const msg = e.response?.data?.nombre?.[0] || 'Error al guardar la categoría.';
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>{isEdit ? '✏️ Editar categoría' : '➕ Nueva categoría'}</h2>
          <button style={S.btnIcon} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          {error && <div style={S.errorBox}>⚠️ {error}</div>}
          <div style={S.formGroup}>
            <label style={S.label}>Nombre *</label>
            <input style={S.input} placeholder="Ej. Instrumentos de cuerda"
              value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Descripción <span style={S.labelOpt}>(opcional)</span></label>
            <textarea style={S.textarea} placeholder="Descripción de la categoría..."
              value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.activo}
              onChange={() => setForm({ ...form, activo: !form.activo })}
              style={{ width: 15, height: 15 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Categoría activa</span>
          </label>
        </div>
        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose} disabled={guardando}>Cancelar</button>
          <button style={{ ...S.btnPrimary, opacity: guardando ? 0.7 : 1 }}
            onClick={handleGuardar} disabled={guardando}>
            {guardando ? '⏳ Guardando...' : isEdit ? '💾 Guardar cambios' : '💾 Crear categoría'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Datos de la tienda ───────────────────────────────────
function TabTienda() {
  const [form, setForm] = useState({
    nombre_tienda: '', direccion: '', telefono: '',
    email: '', ruc_nit: '', moneda: 'BOB', simbolo_moneda: 'Bs.',
  });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await axios.get(`${API_URL}/configuracion/tienda/`);
        setForm(res.data);
      } catch (e) {
        console.error('Error cargando config:', e);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const set = (campo, val) => setForm((f) => ({ ...f, [campo]: val }));

  const handleGuardar = async () => {
    if (!form.nombre_tienda.trim()) { setError('El nombre de la tienda es obligatorio.'); return; }
    setError(''); setGuardando(true); setExito(false);
    try {
      await axios.put(`${API_URL}/configuracion/tienda/`, form);
      setExito(true);
      setTimeout(() => setExito(false), 3000);
    } catch (e) {
      setError('Error al guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>;

  return (
    <div style={S.twoCol}>
      {/* Datos generales */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <h3 style={S.cardTitle}>🏪 Información del negocio</h3>
        </div>
        <div style={S.cardBody}>
          {exito && <div style={S.successBox}>✅ Configuración guardada correctamente.</div>}
          {error && <div style={S.errorBox}>⚠️ {error}</div>}

          <div style={S.formGroup}>
            <label style={S.label}>Nombre de la tienda *</label>
            <input style={S.input} placeholder="Ej. Mana Music"
              value={form.nombre_tienda} onChange={(e) => set('nombre_tienda', e.target.value)} />
          </div>

          <div style={S.formGrid}>
            <div style={S.formGroup}>
              <label style={S.label}>Teléfono <span style={S.labelOpt}>(opcional)</span></label>
              <input style={S.input} placeholder="Ej. 70012345"
                value={form.telefono || ''} onChange={(e) => set('telefono', e.target.value)} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Email <span style={S.labelOpt}>(opcional)</span></label>
              <input style={S.input} type="email" placeholder="tienda@email.com"
                value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>

          <div style={S.formGroup}>
            <label style={S.label}>NIT / RUC <span style={S.labelOpt}>(opcional)</span></label>
            <input style={S.input} placeholder="Número de identificación tributaria"
              value={form.ruc_nit || ''} onChange={(e) => set('ruc_nit', e.target.value)} />
          </div>

          <div style={S.formGroup}>
            <label style={S.label}>Dirección <span style={S.labelOpt}>(opcional)</span></label>
            <textarea style={S.textarea} placeholder="Dirección de la tienda..."
              value={form.direccion || ''} onChange={(e) => set('direccion', e.target.value)} />
          </div>
        </div>
        <div style={S.cardFooter}>
          <button style={{ ...S.btnPrimary, opacity: guardando ? 0.7 : 1 }}
            onClick={handleGuardar} disabled={guardando}>
            {guardando ? '⏳ Guardando...' : '💾 Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Moneda */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <h3 style={S.cardTitle}>💰 Moneda y formato</h3>
        </div>
        <div style={S.cardBody}>
          <div style={S.formGroup}>
            <label style={S.label}>Moneda</label>
            <select style={S.select} value={form.moneda}
              onChange={(e) => {
                const moneda = MONEDAS.find((m) => m.codigo === e.target.value);
                set('moneda', e.target.value);
                if (moneda) set('simbolo_moneda', moneda.simbolo);
              }}>
              {MONEDAS.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.simbolo} — {m.nombre} ({m.codigo})
                </option>
              ))}
            </select>
          </div>

          <div style={S.formGroup}>
            <label style={S.label}>Símbolo a mostrar</label>
            <input style={{ ...S.input, maxWidth: 100 }} placeholder="Bs."
              value={form.simbolo_moneda || ''} onChange={(e) => set('simbolo_moneda', e.target.value)} />
            <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
              Puedes personalizar el símbolo que aparece en precios.
            </span>
          </div>

          {/* Vista previa */}
          <div style={S.previewBox}>
            <div style={S.previewLabel}>Vista previa de precios</div>
            <div style={S.previewValue}>
              {form.simbolo_moneda} 1,250.00
            </div>
            <div style={{ fontSize: 12, color: '#0369a1', marginTop: 6 }}>
              Código: {form.moneda} · Símbolo: {form.simbolo_moneda}
            </div>
          </div>
        </div>
        <div style={S.cardFooter}>
          <button style={{ ...S.btnPrimary, opacity: guardando ? 0.7 : 1 }}
            onClick={handleGuardar} disabled={guardando}>
            {guardando ? '⏳ Guardando...' : '💾 Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Categorías ───────────────────────────────────────────
function TabCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [procesando, setProcesando] = useState(null);
  const [filtro, setFiltro] = useState('');

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/categorias/`);
      setCategorias(res.data);
    } catch (e) {
      console.error('Error cargando categorías:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleActivo = async (cat) => {
    setProcesando(cat.id_categoria);
    try {
      await axios.patch(`${API_URL}/categorias/${cat.id_categoria}/toggle-activo/`);
      await cargar();
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setProcesando(null);
    }
  };

  const categoriasFiltradas = categorias.filter((c) =>
    !filtro || c.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  const totalActivas = categorias.filter((c) => c.activo).length;
  const totalProductos = categorias.reduce((s, c) => s + (c.total_productos || 0), 0);

  return (
    <>
      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total categorías', value: categorias.length, color: '#1e40af' },
          { label: 'Activas',          value: totalActivas,      color: '#059669' },
          { label: 'Productos totales',value: totalProductos,    color: '#7c3aed' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#fff', borderRadius: 10, padding: '14px 18px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `3px solid ${color}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        {/* Header con filtro y botón */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <input
            style={{ ...S.input, minWidth: 220 }}
            placeholder="🔍 Buscar categoría..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <button style={S.btnPrimary} onClick={() => { setEditando(null); setModal(true); }}>
            ➕ Nueva categoría
          </button>
        </div>

        {/* Tabla */}
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                {['Categoría', 'Descripción', 'Productos', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={S.emptyRow}>Cargando categorías...</td></tr>
              ) : categoriasFiltradas.length === 0 ? (
                <tr><td colSpan={5} style={S.emptyRow}>
                  {filtro ? 'No se encontraron categorías.' : 'No hay categorías. Crea la primera.'}
                </td></tr>
              ) : (
                categoriasFiltradas.map((cat) => (
                  <tr key={cat.id_categoria}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}>

                    <td style={{ ...S.td, fontWeight: 600, color: '#0f172a' }}>
                      {cat.nombre}
                    </td>

                    <td style={{ ...S.td, color: '#64748b', maxWidth: 260 }}>
                      {cat.descripcion
                        ? (cat.descripcion.length > 60 ? cat.descripcion.slice(0, 60) + '...' : cat.descripcion)
                        : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>

                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span style={{
                        background: '#eff6ff', color: '#1e40af',
                        padding: '3px 10px', borderRadius: 20,
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {cat.total_productos}
                      </span>
                    </td>

                    <td style={S.td}>
                      <span style={{ display: 'flex', alignItems: 'center', fontSize: 13 }}>
                        <span style={S.activoDot(cat.activo)} />
                        <span style={{ color: cat.activo ? '#059669' : '#94a3b8', fontWeight: 600 }}>
                          {cat.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </span>
                    </td>

                    <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button style={S.btnWarning}
                          onClick={() => { setEditando(cat); setModal(true); }}>
                          ✏️ Editar
                        </button>
                        <button
                          style={{
                            background: cat.activo ? '#fee2e2' : '#d1fae5',
                            color: cat.activo ? '#dc2626' : '#059669',
                            border: 'none', borderRadius: 6, padding: '5px 10px',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            opacity: procesando === cat.id_categoria ? 0.6 : 1,
                          }}
                          disabled={procesando === cat.id_categoria}
                          onClick={() => toggleActivo(cat)}
                        >
                          {procesando === cat.id_categoria ? '⏳' : cat.activo ? '🔴 Desactivar' : '🟢 Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ModalCategoria
          categoria={editando}
          onClose={() => { setModal(false); setEditando(null); }}
          onGuardar={() => { setModal(false); setEditando(null); cargar(); }}
        />
      )}
    </>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function Configuracion() {
  const [tab, setTab] = useState('tienda');

  const TABS = [
    { key: 'tienda',     label: '🏪 Datos de la tienda' },
    { key: 'categorias', label: '🏷️ Categorías' },
  ];

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>⚙️ Configuración</h1>
        <p style={S.subtitle}>Gestiona los datos y parámetros del sistema</p>
      </div>

      {/* Tabs */}
      <div style={S.tabsRow}>
        {TABS.map((t) => (
          <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'tienda'     && <TabTienda />}
      {tab === 'categorias' && <TabCategorias />}
    </div>
  );
}