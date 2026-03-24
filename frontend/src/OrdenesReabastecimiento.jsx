import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

// ── Utilidades ────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(n || 0);

const ESTADO_CONFIG = {
  PENDIENTE: { label: 'Pendiente', color: '#d97706', bg: '#fef3c7', icon: '⏳' },
  RECIBIDA:  { label: 'Recibida',  color: '#059669', bg: '#d1fae5', icon: '✅' },
  CANCELADA: { label: 'Cancelada', color: '#dc2626', bg: '#fee2e2', icon: '❌' },
};

const FORMAS_PAGO = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO'];

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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 3 },
  btnPrimary: {
    background: '#1e40af',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  btnSecondary: {
    background: '#fff',
    color: '#334155',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDanger: {
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: 6,
    padding: '6px 11px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSuccess: {
    background: '#d1fae5',
    color: '#059669',
    border: 'none',
    borderRadius: 6,
    padding: '6px 11px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnWarning: {
    background: '#fef3c7',
    color: '#d97706',
    border: 'none',
    borderRadius: 6,
    padding: '6px 11px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnIcon: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '5px 8px',
    borderRadius: 6,
    fontSize: 14,
    color: '#64748b',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    overflow: 'hidden',
    marginBottom: 0,
  },
  cardHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 },
  filtersBar: {
    display: 'flex',
    gap: 10,
    padding: '12px 20px',
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
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
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
  td: { padding: '11px 14px', borderBottom: '1px solid #f1f5f9', color: '#334155', verticalAlign: 'middle' },
  emptyRow: { textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 },
  estadoBadge: (estado) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
    background: ESTADO_CONFIG[estado]?.bg || '#f1f5f9',
    color: ESTADO_CONFIG[estado]?.color || '#64748b',
    whiteSpace: 'nowrap',
  }),
  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
  },
  modal: {
    background: '#fff', borderRadius: 14,
    width: '100%', maxWidth: 860,
    maxHeight: '92vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    position: 'sticky', top: 0, background: '#fff', zIndex: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 },
  modalBody: { padding: '20px 24px' },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #f1f5f9',
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    position: 'sticky', bottom: 0, background: '#fff',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 },
  formGroup: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, fontWeight: 600, color: '#475569' },
  input: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#1e293b', outline: 'none',
    transition: 'border-color 0.15s',
  },
  select: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#1e293b', outline: 'none', background: '#fff',
  },
  textarea: {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 13, color: '#1e293b', outline: 'none', resize: 'vertical', minHeight: 70,
  },
  divider: { borderTop: '1px solid #f1f5f9', margin: '18px 0' },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 },
  // Carrito
  carritoTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 14 },
  carritoTh: {
    padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px',
    background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
  },
  carritoTd: { padding: '8px 10px', borderBottom: '1px solid #f8fafc', verticalAlign: 'middle' },
  carritoInput: {
    padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0',
    fontSize: 13, width: '100%', outline: 'none', boxSizing: 'border-box',
  },
  totalBox: {
    display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12,
    padding: '12px 0', borderTop: '2px solid #f1f5f9',
  },
  addRowBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: '#eff6ff', color: '#1e40af', border: '1px dashed #93c5fd',
    borderRadius: 7, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    width: '100%', justifyContent: 'center', marginBottom: 12,
  },
  // Autocomplete
  autocompleteWrap: { position: 'relative', width: '100%' },
  autocompleteDropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100,
    maxHeight: 200, overflowY: 'auto',
  },
  autocompleteItem: {
    padding: '9px 12px', cursor: 'pointer', fontSize: 13, color: '#334155',
    borderBottom: '1px solid #f8fafc',
  },
  // Detalle modal
  detalleItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid #f8fafc',
  },
};

// ── Fila de producto en el carrito ────────────────────────────
function FilaProducto({ fila, index, productos, onChange, onRemove }) {
  const [query, setQuery] = useState(fila.nombre_producto || '');
  const [sugerencias, setSugerencias] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const wrapRef = useRef(null);

  // ✅ Solo sincronizar desde el padre cuando el valor externo cambia
  // y el input no tiene foco (evita sobreescribir lo que el usuario escribe)
  const inputRef = useRef(null);
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setQuery(fila.nombre_producto || '');
    }
  }, [fila.nombre_producto]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSug(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleQueryChange = (val) => {
    setQuery(val);
    onChange(index, 'nombre_producto', val);  // ✅ siempre sincroniza al carrito
    onChange(index, 'id_producto', null);
    if (val.length >= 1) {
      const filtrados = productos.filter((p) =>
        p.nombre.toLowerCase().includes(val.toLowerCase())
      );
      setSugerencias(filtrados.slice(0, 8));
      setShowSug(filtrados.length > 0);
    } else {
      setSugerencias([]);
      setShowSug(false);
    }
  };

  // ✅ Al salir del input, asegura que el texto escrito quede en el carrito
  const handleBlur = () => {
    onChange(index, 'nombre_producto', query);
    setTimeout(() => setShowSug(false), 150);
  };

  const seleccionarProducto = (p) => {
    setQuery(p.nombre);
    setShowSug(false);
    onChange(index, 'nombre_producto', p.nombre);
    onChange(index, 'id_producto', p.id_producto);
    onChange(index, 'precio_unitario', p.precio_unitario || '');
  };

  return (
    <tr>
      {/* Producto */}
      <td style={S.carritoTd}>
        <div ref={wrapRef} style={S.autocompleteWrap}>
          <input
            ref={inputRef}
            style={S.carritoInput}
            placeholder="Escribe el producto..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onBlur={handleBlur}
            onFocus={() => {
              if (sugerencias.length > 0) setShowSug(true);
            }}
          />
          {showSug && (
            <div style={S.autocompleteDropdown}>
              {sugerencias.map((p) => (
                <div
                  key={p.id_producto}
                  style={S.autocompleteItem}
                  onMouseDown={() => seleccionarProducto(p)}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  {p.nombre}
                  <span style={{ color: '#94a3b8', marginLeft: 8, fontSize: 11 }}>
                    {fmt(p.precio_unitario)}
                  </span>
                </div>
              ))}
              {/* Opción de usar el texto escrito si no coincide con ningún producto */}
              {!sugerencias.find(p => p.nombre.toLowerCase() === query.toLowerCase()) && query.length > 1 && (
                <div
                  style={{ ...S.autocompleteItem, color: '#1e40af', fontStyle: 'italic' }}
                  onMouseDown={() => {
                    setShowSug(false);
                    onChange(index, 'nombre_producto', query);
                    onChange(index, 'id_producto', null);
                  }}
                >
                  ✏️ Usar "{query}" como producto nuevo
                </div>
              )}
            </div>
          )}
        </div>
      </td>

      {/* Cantidad */}
      <td style={{ ...S.carritoTd, width: 90 }}>
        <input
          style={S.carritoInput}
          type="number"
          min="1"
          placeholder="1"
          value={fila.cantidad}
          onChange={(e) => onChange(index, 'cantidad', e.target.value)}
        />
      </td>

      {/* Precio unitario */}
      <td style={{ ...S.carritoTd, width: 120 }}>
        <input
          style={S.carritoInput}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={fila.precio_unitario}
          onChange={(e) => onChange(index, 'precio_unitario', e.target.value)}
        />
      </td>

      {/* Subtotal */}
      <td style={{ ...S.carritoTd, width: 110, fontWeight: 600, color: '#059669' }}>
        {fmt((parseFloat(fila.cantidad) || 0) * (parseFloat(fila.precio_unitario) || 0))}
      </td>

      {/* Eliminar */}
      <td style={{ ...S.carritoTd, width: 44, textAlign: 'center' }}>
        <button style={S.btnIcon} onClick={() => onRemove(index)} title="Eliminar">🗑️</button>
      </td>
    </tr>
  );
}

// ── Modal de formulario (crear/editar) ────────────────────────
function ModalFormulario({ orden, proveedores, productos, onClose, onGuardar }) {
  const isEdit = !!orden;

  const [form, setForm] = useState({
    id_proveedor: orden?.id_proveedor || '',
    forma_pago: orden?.forma_pago || 'EFECTIVO',
    estado: orden?.estado || 'PENDIENTE',
    observaciones: orden?.observaciones || '',
  });

  const [carrito, setCarrito] = useState(() => {
    if (orden?.detalles?.length > 0) {
      return orden.detalles.map((d) => ({
        id_producto: d.id_producto,
        nombre_producto: d.producto_info?.nombre || '',
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
      }));
    }
    return [{ id_producto: null, nombre_producto: '', cantidad: '', precio_unitario: '' }];
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const totalCarrito = carrito.reduce(
    (sum, f) => sum + (parseFloat(f.cantidad) || 0) * (parseFloat(f.precio_unitario) || 0),
    0
  );

  const agregarFila = () =>
    setCarrito([...carrito, { id_producto: null, nombre_producto: '', cantidad: '', precio_unitario: '' }]);

  const cambiarFila = (index, campo, valor) => {
    const nuevo = [...carrito];
    nuevo[index] = { ...nuevo[index], [campo]: valor };
    setCarrito(nuevo);
  };

  const eliminarFila = (index) => {
    if (carrito.length === 1) return;
    setCarrito(carrito.filter((_, i) => i !== index));
  };

  const getFilasValidas = () =>
    carrito.filter((f) => (f.nombre_producto || '').trim().length > 0);

  const validar = () => {
    if (!form.id_proveedor) return 'Selecciona un proveedor.';
    const filasValidas = getFilasValidas();
    if (filasValidas.length === 0)
      return 'Agrega al menos un producto con nombre, cantidad y precio.';
    for (const f of filasValidas) {
      if (!f.cantidad || parseFloat(f.cantidad) <= 0)
        return `Cantidad inválida en "${f.nombre_producto}".`;
      if (f.precio_unitario === '' || f.precio_unitario === null || parseFloat(f.precio_unitario) < 0)
        return `Precio inválido en "${f.nombre_producto}".`;
    }
    return null;
  };

  const handleGuardar = async () => {
    const err = validar();
    if (err) { setError(err); return; }
    setError('');
    setGuardando(true);

    const filasValidas = getFilasValidas();

    try {
      const usuario = JSON.parse(localStorage.getItem('user'));

      const ventaData = {
        id_proveedor: form.id_proveedor,
        id_usuario: usuario?.id,
        forma_pago: form.forma_pago,
        estado: form.estado,
        observaciones: form.observaciones,
        total: totalCarrito.toFixed(2),
      };

      let ordenRes;
      if (isEdit) {
        ordenRes = await axios.put(`${API_URL}/compras/${orden.id_compra}/`, ventaData);
        await axios.delete(`${API_URL}/detalle-compra/por-compra/?compra=${orden.id_compra}`);
      } else {
        ordenRes = await axios.post(`${API_URL}/compras/`, ventaData);
      }

      const idCompra = ordenRes.data.id_compra;

      for (const fila of filasValidas) {
        const detalleData = {
          id_compra: idCompra,
          id_producto: fila.id_producto,
          cantidad: parseInt(fila.cantidad),
          precio_unitario: parseFloat(fila.precio_unitario).toFixed(2),
          subtotal: ((parseFloat(fila.cantidad) || 0) * (parseFloat(fila.precio_unitario) || 0)).toFixed(2),
        };

        // ✅ Agrega esto temporalmente
        console.log('Enviando detalle:', detalleData);
        try {
          await axios.post(`${API_URL}/detalle-compra/`, detalleData);
        } catch (e) {
          console.error('Error detalle - response:', e.response?.data);
          throw e;
        }
      }

      onGuardar();
    } catch (e) {
      console.error('Error guardando orden:', e);
      setError('Error al guardar la orden. Verifica los datos.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>
            {isEdit ? '✏️ Editar orden de compra' : '➕ Nueva orden de compra'}
          </h2>
          <button style={{ ...S.btnIcon, fontSize: 18 }} onClick={onClose}>✕</button>
        </div>

        <div style={S.modalBody}>
          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Datos generales */}
          <p style={S.sectionTitle}>📋 Datos generales</p>
          <div style={S.formGrid}>
            <div style={S.formGroup}>
              <label style={S.label}>Proveedor *</label>
              <select
                style={S.select}
                value={form.id_proveedor}
                onChange={(e) => setForm({ ...form, id_proveedor: e.target.value })}
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map((p) => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>Forma de pago</label>
              <select
                style={S.select}
                value={form.forma_pago}
                onChange={(e) => setForm({ ...form, forma_pago: e.target.value })}
              >
                {FORMAS_PAGO.map((f) => (
                  <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>Estado</label>
              <select
                style={S.select}
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                <option value="PENDIENTE">⏳ Pendiente</option>
                <option value="RECIBIDA">✅ Recibida</option>
                <option value="CANCELADA">❌ Cancelada</option>
              </select>
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>Observaciones</label>
              <textarea
                style={S.textarea}
                placeholder="Notas adicionales..."
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              />
            </div>
          </div>

          <div style={S.divider} />

          {/* Carrito de productos */}
          <p style={S.sectionTitle}>🛒 Productos de la orden</p>

          <table style={S.carritoTable}>
            <thead>
              <tr>
                {['Producto', 'Cantidad', 'Precio unitario', 'Subtotal', ''].map((h) => (
                  <th key={h} style={S.carritoTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carrito.map((fila, i) => (
                <FilaProducto
                  key={i}
                  fila={fila}
                  index={i}
                  productos={productos}
                  onChange={cambiarFila}
                  onRemove={eliminarFila}
                />
              ))}
            </tbody>
          </table>

          <button style={S.addRowBtn} onClick={agregarFila}>
            ＋ Agregar producto
          </button>

          <div style={S.totalBox}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total de la orden:</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{fmt(totalCarrito)}</span>
          </div>
        </div>

        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose} disabled={guardando}>Cancelar</button>
          <button
            style={{ ...S.btnPrimary, opacity: guardando ? 0.7 : 1 }}
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? '⏳ Guardando...' : isEdit ? '💾 Actualizar orden' : '💾 Crear orden'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de detalle (solo lectura) ──────────────────────────
function ModalDetalle({ orden, onClose }) {
  if (!orden) return null;

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...S.modal, maxWidth: 600 }}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>🔍 Detalle de orden #{orden.id_compra}</h2>
          <button style={{ ...S.btnIcon, fontSize: 18 }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>

          {/* Info general */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              ['Proveedor', orden.proveedor_nombre || '—'],
              ['Estado', <span style={S.estadoBadge(orden.estado)}>{ESTADO_CONFIG[orden.estado]?.icon} {ESTADO_CONFIG[orden.estado]?.label}</span>],
              ['Forma de pago', orden.forma_pago || '—'],
              ['Fecha', orden.fecha_compra ? new Date(orden.fecha_compra).toLocaleDateString('es-BO') : '—'],
            ].map(([label, val]) => (
              <div key={label}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 3 }}>{label}</p>
                <p style={{ margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{val}</p>
              </div>
            ))}
          </div>

          {orden.observaciones && (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#475569' }}>
              📝 {orden.observaciones}
            </div>
          )}

          <div style={S.divider} />
          <p style={S.sectionTitle}>📦 Productos</p>

          {(orden.detalles || []).length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Sin detalles registrados.</p>
          ) : (
            (orden.detalles || []).map((d, i) => (
              <div key={i} style={S.detalleItem}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                    {d.producto_info?.nombre || '—'}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                    {d.cantidad} unid. × {fmt(d.precio_unitario)}
                  </p>
                </div>
                <span style={{ fontWeight: 700, color: '#059669', fontSize: 14 }}>
                  {fmt(d.subtotal)}
                </span>
              </div>
            ))
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, paddingTop: 12, borderTop: '2px solid #f1f5f9' }}>
            <span style={{ fontSize: 13, color: '#64748b', marginRight: 12 }}>Total:</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{fmt(orden.total)}</span>
          </div>
        </div>
        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function OrdenesReabastecimiento() {
  const [ordenes, setOrdenes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalFormulario, setModalFormulario] = useState(false);
  const [ordenEditando, setOrdenEditando] = useState(null);
  const [modalDetalle, setModalDetalle] = useState(null);

  const [filtros, setFiltros] = useState({ estado: '', busqueda: '', fecha_desde: '', fecha_hasta: '' });
  const [procesando, setProcesando] = useState(null); // id de la orden que se está procesando

  // ── Carga de datos ──
  const cargarDatos = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
      if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);

      const [ordenesRes, provsRes, prodsRes] = await Promise.all([
        axios.get(`${API_URL}/compras/?${params.toString()}`),
        axios.get(`${API_URL}/proveedores/`),
        axios.get(`${API_URL}/productos/`),
      ]);
      setOrdenes(ordenesRes.data);
      setProveedores(provsRes.data);
      setProductos(prodsRes.data);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, [filtros.estado, filtros.fecha_desde, filtros.fecha_hasta]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Marcar como recibida (actualiza inventario) ──
  const marcarRecibida = async (orden) => {
    if (!window.confirm(`¿Confirmas que la orden #${orden.id_compra} fue recibida? El stock se actualizará automáticamente.`)) return;
    setProcesando(orden.id_compra);
    try {
      // 1. Actualizar estado
      await axios.patch(`${API_URL}/compras/${orden.id_compra}/`, { estado: 'RECIBIDA' });

      // 2. Por cada detalle, aumentar stock y registrar historial
      const usuario = JSON.parse(localStorage.getItem('user'));
      for (const detalle of orden.detalles || []) {
        if (!detalle.id_producto) continue;
        try {
          const invRes = await axios.get(`${API_URL}/inventarios/?producto=${detalle.id_producto}`);
          if (invRes.data.length === 0) continue;
          const inv = invRes.data[0];
          const nuevoStock = inv.stock_actual + detalle.cantidad;

          await axios.patch(`${API_URL}/inventarios/${inv.id_inventario}/`, {
            stock_actual: nuevoStock,
            ultima_compra: new Date().toISOString(),
          });

          await axios.post(`${API_URL}/historial-inventario/`, {
            id_producto: detalle.id_producto,
            id_usuario: usuario?.id,
            stock_anterior: inv.stock_actual,
            stock_nuevo: nuevoStock,
            tipo_movimiento: 'ENTRADA_COMPRA',
            observaciones: `Compra #${orden.id_compra}`,
          });
        } catch (e) {
          console.error(`Error actualizando stock del producto ${detalle.id_producto}:`, e);
        }
      }
      await cargarDatos();
      alert(`✅ Orden #${orden.id_compra} marcada como recibida. Stock actualizado.`);
    } catch (e) {
      console.error('Error al marcar como recibida:', e);
      alert('Error al procesar la orden.');
    } finally {
      setProcesando(null);
    }
  };

  // ── Cancelar orden ──
  const cancelarOrden = async (orden) => {
    if (!window.confirm(`¿Cancelar la orden #${orden.id_compra}? Esta acción no afecta el inventario.`)) return;
    setProcesando(orden.id_compra);
    try {
      await axios.patch(`${API_URL}/compras/${orden.id_compra}/`, { estado: 'CANCELADA' });
      await cargarDatos();
    } catch (e) {
      console.error('Error al cancelar:', e);
      alert('Error al cancelar la orden.');
    } finally {
      setProcesando(null);
    }
  };

  // ── Filtro local por búsqueda ──
  const ordenesFiltradas = ordenes.filter((o) => {
    if (!filtros.busqueda) return true;
    const q = filtros.busqueda.toLowerCase();
    return (
      String(o.id_compra).includes(q) ||
      o.proveedor_nombre?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={S.page}>

      {/* ── Encabezado ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🛒 Órdenes de reabastecimiento</h1>
          <p style={S.subtitle}>Gestión de compras · {ordenesFiltradas.length} registros</p>
        </div>
        <button style={S.btnPrimary} onClick={() => { setOrdenEditando(null); setModalFormulario(true); }}>
          ➕ Nueva orden
        </button>
      </div>

      {/* ── Tabla ── */}
      <div style={S.card}>
        {/* Filtros */}
        <div style={S.filtersBar}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Filtros:</span>
          <input
            style={S.filterInput}
            placeholder="🔍 Proveedor o N° orden"
            value={filtros.busqueda}
            onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
          />
          <select
            style={S.filterInput}
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">⏳ Pendiente</option>
            <option value="RECIBIDA">✅ Recibida</option>
            <option value="CANCELADA">❌ Cancelada</option>
          </select>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Desde:</span>
          <input type="date" style={S.filterInput} value={filtros.fecha_desde}
            onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })} />
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Hasta:</span>
          <input type="date" style={S.filterInput} value={filtros.fecha_hasta}
            onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })} />
          <button style={{ ...S.btnSecondary, fontSize: 12 }}
            onClick={() => setFiltros({ estado: '', busqueda: '', fecha_desde: '', fecha_hasta: '' })}>
            ✕ Limpiar
          </button>
        </div>

        {/* Tabla de órdenes */}
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                {['N°', 'Proveedor', 'Productos', 'Fecha', 'Estado', 'Forma pago', 'Total', 'Acciones'].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={S.emptyRow}>Cargando órdenes...</td></tr>
              ) : ordenesFiltradas.length === 0 ? (
                <tr><td colSpan={8} style={S.emptyRow}>
                  No hay órdenes registradas.<br />
                  <span style={{ fontSize: 12 }}>Presiona "Nueva orden" para comenzar.</span>
                </td></tr>
              ) : (
                ordenesFiltradas.map((orden) => {
                  const detalles = orden.detalles || [];
                  const nombres = detalles.map((d) => d.producto_info?.nombre).filter(Boolean);
                  const productosTexto = nombres.length === 0 ? '—'
                    : nombres.length === 1 ? nombres[0]
                    : `${nombres[0]} (+${nombres.length - 1} más)`;

                  const fecha = orden.fecha_compra
                    ? new Date(orden.fecha_compra).toLocaleDateString('es-BO')
                    : '—';

                  const enProceso = procesando === orden.id_compra;

                  return (
                    <tr key={orden.id_compra}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                      <td style={{ ...S.td, fontWeight: 700, color: '#1e40af' }}>#{orden.id_compra}</td>
                      <td style={S.td}>{orden.proveedor_nombre || '—'}</td>
                      <td style={{ ...S.td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {productosTexto}
                      </td>
                      <td style={{ ...S.td, color: '#64748b', whiteSpace: 'nowrap' }}>{fecha}</td>
                      <td style={S.td}>
                        <span style={S.estadoBadge(orden.estado)}>
                          {ESTADO_CONFIG[orden.estado]?.icon} {ESTADO_CONFIG[orden.estado]?.label}
                        </span>
                      </td>
                      <td style={{ ...S.td, color: '#64748b' }}>{orden.forma_pago || '—'}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: '#059669' }}>{fmt(orden.total)}</td>
                      <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          {/* Ver detalle */}
                          <button
                            style={{ ...S.btnSecondary, padding: '5px 10px', fontSize: 12 }}
                            onClick={() => setModalDetalle(orden)}
                          >
                            👁️
                          </button>

                          {/* Editar — solo PENDIENTE */}
                          {orden.estado === 'PENDIENTE' && (
                            <button
                              style={{ ...S.btnWarning }}
                              onClick={() => { setOrdenEditando(orden); setModalFormulario(true); }}
                            >
                              ✏️ Editar
                            </button>
                          )}

                          {/* Marcar recibida — solo PENDIENTE */}
                          {orden.estado === 'PENDIENTE' && (
                            <button
                              style={{ ...S.btnSuccess, opacity: enProceso ? 0.6 : 1 }}
                              disabled={enProceso}
                              onClick={() => marcarRecibida(orden)}
                            >
                              {enProceso ? '⏳' : '✅ Recibida'}
                            </button>
                          )}

                          {/* Cancelar — solo PENDIENTE */}
                          {orden.estado === 'PENDIENTE' && (
                            <button
                              style={{ ...S.btnDanger, opacity: enProceso ? 0.6 : 1 }}
                              disabled={enProceso}
                              onClick={() => cancelarOrden(orden)}
                            >
                              ❌ Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modales ── */}
      {modalFormulario && (
        <ModalFormulario
          orden={ordenEditando}
          proveedores={proveedores}
          productos={productos}
          onClose={() => { setModalFormulario(false); setOrdenEditando(null); }}
          onGuardar={() => { setModalFormulario(false); setOrdenEditando(null); cargarDatos(); }}
        />
      )}

      {modalDetalle && (
        <ModalDetalle
          orden={modalDetalle}
          onClose={() => setModalDetalle(null)}
        />
      )}
    </div>
  );
}