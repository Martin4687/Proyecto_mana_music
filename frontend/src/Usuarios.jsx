import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const ROL_CONFIG = {
  ADMIN:    { label: 'Administrador', color: '#7c3aed', bg: '#ede9fe', icon: '👑' },
  VENDEDOR: { label: 'Vendedor',      color: '#0891b2', bg: '#e0f2fe', icon: '🛒' },
};

// ── Estilos ───────────────────────────────────────────────────
const S = {
  page: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: '#f0f4f8', minHeight: '100vh',
    padding: '28px 32px', color: '#1e293b',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 3 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 },
  statCard: (color) => ({
    background: '#fff', borderRadius: 10, padding: '14px 18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `3px solid ${color}`,
  }),
  statLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  statValue: (color) => ({ fontSize: 22, fontWeight: 700, color }),
  card: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' },
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
    background: bg, color, whiteSpace: 'nowrap',
  }),
  activoDot: (activo) => ({
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: activo ? '#10b981' : '#94a3b8', marginRight: 6,
  }),
  // Botones
  btnPrimary: {
    background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  btnSecondary: {
    background: '#fff', color: '#334155', border: '1px solid #e2e8f0',
    borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnSm: (bg, color) => ({
    background: bg, color, border: 'none', borderRadius: 6,
    padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  }),
  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
  },
  modal: (maxW = 560) => ({
    background: '#fff', borderRadius: 14, width: '100%', maxWidth: maxW,
    maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  }),
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
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 },
  formGroupFull: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14, gridColumn: '1 / -1' },
  label: { fontSize: 12, fontWeight: 600, color: '#475569' },
  labelOpt: { fontSize: 11, color: '#94a3b8', fontWeight: 400 },
  input: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#1e293b', outline: 'none',
  },
  select: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#1e293b', background: '#fff', outline: 'none',
  },
  sectionTitle: {
    fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
    letterSpacing: '0.5px', marginBottom: 14, marginTop: 4,
    paddingBottom: 8, borderBottom: '1px solid #f1f5f9',
  },
  errorBox: { background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  successBox: { background: '#d1fae5', color: '#065f46', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 },
  btnIcon: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px 7px', borderRadius: 5, fontSize: 16, color: '#64748b' },
  avatarCircle: (rol) => ({
    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0,
    background: ROL_CONFIG[rol]?.bg || '#f1f5f9',
    color: ROL_CONFIG[rol]?.color || '#64748b',
  }),
};

// ── Modal Crear/Editar Usuario ────────────────────────────────
function ModalUsuario({ usuario, onClose, onGuardar }) {
  const isEdit = !!usuario;
  const [form, setForm] = useState({
    nombres:          usuario?.nombres || '',
    apellido_paterno: usuario?.apellido_pat || '',
    apellido_materno: usuario?.apellido_mat || '',
    ci:               usuario?.ci || '',
    telefono:         usuario?.telefono || '',
    email:            usuario?.email || '',
    rol:              usuario?.rol || 'VENDEDOR',
    activo:           usuario?.activo ?? true,
    password:         '',
    confirmar:        '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validar = () => {
    if (!form.nombres.trim()) return 'El nombre es obligatorio.';
    if (!form.apellido_paterno.trim()) return 'El apellido paterno es obligatorio.';
    if (!form.apellido_materno.trim()) return 'El apellido materno es obligatorio.';
    if (!form.ci.trim()) return 'El CI es obligatorio.';
    if (!form.email.trim()) return 'El email es obligatorio.';
    if (!isEdit) {
      if (!form.password) return 'La contraseña es obligatoria.';
      if (form.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
      if (form.password !== form.confirmar) return 'Las contraseñas no coinciden.';
    }
    return null;
  };

  const handleGuardar = async () => {
    const err = validar();
    if (err) { setError(err); return; }
    setError(''); setGuardando(true);
    try {
      const payload = {
        nombres: form.nombres, apellido_paterno: form.apellido_paterno,
        apellido_materno: form.apellido_materno, ci: form.ci,
        telefono: form.telefono, email: form.email,
        rol: form.rol, activo: form.activo,
      };
      if (!isEdit) payload.password = form.password;

      if (isEdit) {
        await axios.put(`${API_URL}/usuarios/${usuario.id_usuario}/`, payload);
      } else {
        await axios.post(`${API_URL}/usuarios/`, payload);
      }
      onGuardar();
    } catch (e) {
      const data = e.response?.data;
      const msg = data?.email?.[0] || data?.ci?.[0] || data?.error || 'Error al guardar el usuario.';
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal(640)}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>{isEdit ? '✏️ Editar usuario' : '➕ Nuevo usuario'}</h2>
          <button style={S.btnIcon} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          {error && <div style={S.errorBox}>⚠️ {error}</div>}

          <div style={S.sectionTitle}>👤 Datos personales</div>
          <div style={S.formGrid}>
            <div style={S.formGroupFull}>
              <label style={S.label}>Nombres *</label>
              <input style={S.input} placeholder="Nombres completos"
                value={form.nombres} onChange={(e) => set('nombres', e.target.value)} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Apellido paterno *</label>
              <input style={S.input} placeholder="Apellido paterno"
                value={form.apellido_paterno} onChange={(e) => set('apellido_paterno', e.target.value)} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Apellido materno *</label>
              <input style={S.input} placeholder="Apellido materno"
                value={form.apellido_materno} onChange={(e) => set('apellido_materno', e.target.value)} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>CI *</label>
              <input style={S.input} placeholder="Cédula de identidad"
                value={form.ci} onChange={(e) => set('ci', e.target.value)} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Teléfono <span style={S.labelOpt}>(opcional)</span></label>
              <input style={S.input} placeholder="Ej. 70012345"
                value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
            </div>
          </div>

          <div style={S.sectionTitle}>🔐 Acceso al sistema</div>
          <div style={S.formGrid}>
            <div style={S.formGroupFull}>
              <label style={S.label}>Email *</label>
              <input style={S.input} type="email" placeholder="correo@ejemplo.com"
                value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Rol</label>
              <select style={S.select} value={form.rol} onChange={(e) => set('rol', e.target.value)}>
                <option value="ADMIN">👑 Administrador</option>
                <option value="VENDEDOR">🛒 Vendedor</option>
              </select>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Estado</label>
              <select style={S.select} value={form.activo}
                onChange={(e) => set('activo', e.target.value === 'true')}>
                <option value="true">🟢 Activo</option>
                <option value="false">⚪ Inactivo</option>
              </select>
            </div>
            {!isEdit && (
              <>
                <div style={S.formGroup}>
                  <label style={S.label}>Contraseña *</label>
                  <input style={S.input} type="password" placeholder="Mínimo 6 caracteres"
                    value={form.password} onChange={(e) => set('password', e.target.value)} />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Confirmar contraseña *</label>
                  <input style={S.input} type="password" placeholder="Repite la contraseña"
                    value={form.confirmar} onChange={(e) => set('confirmar', e.target.value)} />
                </div>
              </>
            )}
          </div>
        </div>
        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose} disabled={guardando}>Cancelar</button>
          <button style={{ ...S.btnPrimary, opacity: guardando ? 0.7 : 1 }}
            onClick={handleGuardar} disabled={guardando}>
            {guardando ? '⏳ Guardando...' : isEdit ? '💾 Guardar cambios' : '💾 Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Cambiar Contraseña ──────────────────────────────────
function ModalPassword({ usuario, onClose }) {
  const [form, setForm] = useState({ nueva: '', confirmar: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  const handleGuardar = async () => {
    if (form.nueva.length < 6) { setError('Mínimo 6 caracteres.'); return; }
    if (form.nueva !== form.confirmar) { setError('Las contraseñas no coinciden.'); return; }
    setError(''); setGuardando(true);
    try {
      await axios.patch(
        `${API_URL}/usuarios/${usuario.id_usuario}/cambiar-password/`,
        { nueva_password: form.nueva }
      );
      setExito(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al cambiar la contraseña.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal(420)}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>🔑 Cambiar contraseña</h2>
          <button style={S.btnIcon} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#475569' }}>
            Usuario: <strong>{usuario.nombre_completo}</strong>
          </div>
          {error && <div style={S.errorBox}>⚠️ {error}</div>}
          {exito && <div style={S.successBox}>✅ Contraseña actualizada correctamente.</div>}
          <div style={S.formGroup}>
            <label style={S.label}>Nueva contraseña</label>
            <input style={S.input} type="password" placeholder="Mínimo 6 caracteres"
              value={form.nueva} onChange={(e) => setForm({ ...form, nueva: e.target.value })} />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Confirmar contraseña</label>
            <input style={S.input} type="password" placeholder="Repite la contraseña"
              value={form.confirmar} onChange={(e) => setForm({ ...form, confirmar: e.target.value })} />
          </div>
        </div>
        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose} disabled={guardando}>Cancelar</button>
          <button style={{ ...S.btnPrimary, opacity: guardando ? 0.7 : 1 }}
            onClick={handleGuardar} disabled={guardando || exito}>
            {guardando ? '⏳ Guardando...' : '🔑 Cambiar contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modalPassword, setModalPassword] = useState(null);
  const [editando, setEditando] = useState(null);
  const [procesando, setProcesando] = useState(null);
  const [filtros, setFiltros] = useState({ rol: '', activo: '', busqueda: '' });

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtros.rol) params.append('rol', filtros.rol);
      if (filtros.activo !== '') params.append('activo', filtros.activo);
      if (filtros.busqueda) params.append('busqueda', filtros.busqueda);

      const [usersRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/usuarios/?${params.toString()}`),
        axios.get(`${API_URL}/usuarios/stats/`),
      ]);
      setUsuarios(usersRes.data);
      setStats(statsRes.data);
    } catch (e) {
      console.error('Error cargando usuarios:', e);
    } finally {
      setLoading(false);
    }
  }, [filtros.rol, filtros.activo, filtros.busqueda]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const toggleActivo = async (u) => {
    setProcesando(u.id_usuario);
    try {
      await axios.patch(`${API_URL}/usuarios/${u.id_usuario}/toggle-activo/`);
      await cargarDatos();
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setProcesando(null);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return <span style={{ color: '#cbd5e1' }}>Nunca</span>;
    return new Date(fecha).toLocaleDateString('es-BO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div style={S.page}>
      {/* Encabezado */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>👥 Usuarios</h1>
          <p style={S.subtitle}>Gestión de acceso y permisos · {usuarios.length} registros</p>
        </div>
        <button style={S.btnPrimary} onClick={() => { setEditando(null); setModalUsuario(true); }}>
          ➕ Nuevo usuario
        </button>
      </div>

      {/* Stats */}
      <div style={S.statsRow}>
        {[
          { label: 'Total usuarios',   value: stats.total     || 0, color: '#1e40af' },
          { label: 'Activos',          value: stats.activos   || 0, color: '#059669' },
          { label: 'Administradores',  value: stats.admins    || 0, color: '#7c3aed' },
          { label: 'Vendedores',       value: stats.vendedores|| 0, color: '#0891b2' },
        ].map(({ label, value, color }) => (
          <div key={label} style={S.statCard(color)}>
            <div style={S.statLabel}>{label}</div>
            <div style={S.statValue(color)}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={S.card}>
        {/* Filtros */}
        <div style={S.filtersBar}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Filtros:</span>
          <input style={{ ...S.filterInput, minWidth: 220 }}
            placeholder="🔍 Nombre o email"
            value={filtros.busqueda}
            onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
          />
          <select style={S.filterInput} value={filtros.rol}
            onChange={(e) => setFiltros({ ...filtros, rol: e.target.value })}>
            <option value="">Todos los roles</option>
            <option value="ADMIN">👑 Administrador</option>
            <option value="VENDEDOR">🛒 Vendedor</option>
          </select>
          <select style={S.filterInput} value={filtros.activo}
            onChange={(e) => setFiltros({ ...filtros, activo: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="true">🟢 Activos</option>
            <option value="false">⚪ Inactivos</option>
          </select>
          <button style={{ ...S.btnSecondary, fontSize: 12 }}
            onClick={() => setFiltros({ rol: '', activo: '', busqueda: '' })}>
            ✕ Limpiar
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                {['Usuario', 'Email', 'CI', 'Teléfono', 'Rol', 'Último acceso', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={S.emptyRow}>Cargando usuarios...</td></tr>
              ) : usuarios.length === 0 ? (
                <tr><td colSpan={8} style={S.emptyRow}>
                  No se encontraron usuarios.<br />
                  <span style={{ fontSize: 12 }}>Presiona "Nuevo usuario" para agregar uno.</span>
                </td></tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id_usuario}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}>

                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={S.avatarCircle(u.rol)}>
                          {u.nombres?.charAt(0)}{u.apellido_pat?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                            {u.nombre_completo}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            ID #{u.id_usuario}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ ...S.td, color: '#1e40af' }}>{u.email}</td>
                    <td style={{ ...S.td, color: '#64748b', fontSize: 12 }}>{u.ci || '—'}</td>
                    <td style={{ ...S.td, color: '#64748b', fontSize: 12 }}>{u.telefono || '—'}</td>

                    <td style={S.td}>
                      <span style={S.badge(ROL_CONFIG[u.rol]?.color, ROL_CONFIG[u.rol]?.bg)}>
                        {ROL_CONFIG[u.rol]?.icon} {ROL_CONFIG[u.rol]?.label}
                      </span>
                    </td>

                    <td style={{ ...S.td, fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatFecha(u.ultimo_acceso)}
                    </td>

                    <td style={S.td}>
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={S.activoDot(u.activo)} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: u.activo ? '#059669' : '#94a3b8' }}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </span>
                    </td>

                    <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button style={S.btnSm('#fef3c7', '#d97706')}
                          onClick={() => { setEditando(u); setModalUsuario(true); }}>
                          ✏️
                        </button>
                        <button style={S.btnSm('#e0f2fe', '#0369a1')}
                          onClick={() => setModalPassword(u)}
                          title="Cambiar contraseña">
                          🔑
                        </button>
                        <button
                          style={{
                            ...S.btnSm(u.activo ? '#fee2e2' : '#d1fae5', u.activo ? '#dc2626' : '#059669'),
                            opacity: procesando === u.id_usuario ? 0.6 : 1,
                          }}
                          disabled={procesando === u.id_usuario}
                          onClick={() => toggleActivo(u)}>
                          {procesando === u.id_usuario ? '⏳' : u.activo ? '🔴' : '🟢'}
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

      {modalUsuario && (
        <ModalUsuario
          usuario={editando}
          onClose={() => { setModalUsuario(false); setEditando(null); }}
          onGuardar={() => { setModalUsuario(false); setEditando(null); cargarDatos(); }}
        />
      )}
      {modalPassword && (
        <ModalPassword
          usuario={modalPassword}
          onClose={() => { setModalPassword(null); cargarDatos(); }}
        />
      )}
    </div>
  );
}