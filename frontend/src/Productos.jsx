import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Productos.css';

const API_URL = 'http://localhost:8000/api';

// Opciones para los selectores
const UNIDADES_MEDIDA = [
  { value: 'UND', label: 'Unidad' },
  { value: 'CAJA', label: 'Caja' },
  { value: 'PIEZA', label: 'Pieza' }
];

const CATEGORIAS = [
  { value: 'INSTRUMENTO', label: 'Instrumento' },
  { value: 'ACCESORIO', label: 'Accesorio' },
  { value: 'REPUESTO', label: 'Repuesto' }
];

function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 10;
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' o 'edit'
  const [productoActual, setProductoActual] = useState(null);
  
  // Confirmación de eliminación
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  
  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio_unitario: '',
    unidad_medida: 'UND',
    categoria: 'INSTRUMENTO',
    activo: true
  });
  
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/productos/`);
      setProductos(response.data);
      setError('');
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setError('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  // ==================== FILTRADO Y BÚSQUEDA ====================
  
  const productosFiltrados = productos.filter(producto => {
    const matchSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       producto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = !filtroCategoria || producto.categoria === filtroCategoria;
    const matchEstado = filtroEstado === '' || 
                       (filtroEstado === 'true' ? producto.activo : !producto.activo);
    
    return matchSearch && matchCategoria && matchEstado;
  });

  // ==================== PAGINACIÓN ====================
  
  const indexUltimo = paginaActual * productosPorPagina;
  const indexPrimero = indexUltimo - productosPorPagina;
  const productosActuales = productosFiltrados.slice(indexPrimero, indexUltimo);
  const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);

  const cambiarPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);
  };

  // ==================== MODAL ====================
  
  const abrirModalCrear = () => {
    setModalMode('create');
    setFormData({
      nombre: '',
      descripcion: '',
      precio_unitario: '',
      unidad_medida: 'UND',
      categoria: 'INSTRUMENTO',
      activo: true
    });
    setFormErrors({});
    setShowModal(true);
  };

  const abrirModalEditar = (producto) => {
    setModalMode('edit');
    setProductoActual(producto);
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio_unitario: producto.precio_unitario,
      unidad_medida: producto.unidad_medida,
      categoria: producto.categoria,
      activo: producto.activo
    });
    setFormErrors({});
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setProductoActual(null);
    setFormData({
      nombre: '',
      descripcion: '',
      precio_unitario: '',
      unidad_medida: 'UND',
      categoria: 'INSTRUMENTO',
      activo: true
    });
    setFormErrors({});
  };

  // ==================== VALIDACIÓN ====================
  
  const validarFormulario = () => {
    const errors = {};
    
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }
    
    if (!formData.precio_unitario || formData.precio_unitario <= 0) {
      errors.precio_unitario = 'El precio debe ser mayor a 0';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ==================== CRUD ====================
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }

    try {
      if (modalMode === 'create') {
        await axios.post(`${API_URL}/productos/`, formData);
      } else {
        await axios.put(`${API_URL}/productos/${productoActual.id_producto}/`, formData);
      }
      
      await cargarProductos();
      cerrarModal();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      setFormErrors({ submit: 'Error al guardar el producto' });
    }
  };

  const confirmarEliminar = (producto) => {
    setProductoAEliminar(producto);
    setShowDeleteConfirm(true);
  };

  const handleEliminar = async () => {
    try {
      await axios.delete(`${API_URL}/productos/${productoAEliminar.id_producto}/`);
      await cargarProductos();
      setShowDeleteConfirm(false);
      setProductoAEliminar(null);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar el producto');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Limpiar error del campo cuando el usuario escribe
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="productos-loading">
        <div className="spinner"></div>
        <p>Cargando productos...</p>
      </div>
    );
  }

  return (
    <div className="productos-container">
      {/* Header */}
      <div className="productos-header">
        <h1>🎸 Productos</h1>
        <button className="btn-crear" onClick={abrirModalCrear}>
          <span>➕</span> Nuevo Producto
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="productos-filtros">
        <div className="filtro-busqueda">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-busqueda"
          />
        </div>

        <div className="filtros-grupo">
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="filtro-select"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="filtro-select"
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Información */}
      <div className="productos-info">
        <p>Mostrando {productosActuales.length} de {productosFiltrados.length} productos</p>
      </div>

      {/* Tabla */}
      {error && <div className="error-message">{error}</div>}
      
      {productosActuales.length === 0 ? (
        <div className="no-productos">
          <p>No se encontraron productos</p>
        </div>
      ) : (
        <div className="tabla-container">
          <table className="productos-tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Unidad</th>
                <th>Fecha Registro</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosActuales.map(producto => (
                <tr key={producto.id_producto}>
                  <td className="nombre-cell">{producto.nombre}</td>
                  <td className="descripcion-cell">{producto.descripcion || '-'}</td>
                  <td>
                    <span className={`badge badge-${producto.categoria.toLowerCase()}`}>
                      {CATEGORIAS.find(c => c.value === producto.categoria)?.label}
                    </span>
                  </td>
                  <td className="precio-cell">Bs. {parseFloat(producto.precio_unitario).toFixed(2)}</td>
                  <td>{UNIDADES_MEDIDA.find(u => u.value === producto.unidad_medida)?.label}</td>
                  <td>{new Date(producto.fecha_registro).toLocaleDateString('es-BO')}</td>
                  <td>
                    <span className={`badge badge-${producto.activo ? 'activo' : 'inactivo'}`}>
                      {producto.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="acciones-cell">
                    <button
                      className="btn-accion btn-editar"
                      onClick={() => abrirModalEditar(producto)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-accion btn-eliminar"
                      onClick={() => confirmarEliminar(producto)}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="paginacion">
          <button
            onClick={() => cambiarPagina(paginaActual - 1)}
            disabled={paginaActual === 1}
            className="btn-paginacion"
          >
            ← Anterior
          </button>
          
          <div className="paginacion-numeros">
            {[...Array(totalPaginas)].map((_, index) => (
              <button
                key={index + 1}
                onClick={() => cambiarPagina(index + 1)}
                className={`btn-pagina ${paginaActual === index + 1 ? 'active' : ''}`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => cambiarPagina(paginaActual + 1)}
            disabled={paginaActual === totalPaginas}
            className="btn-paginacion"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'create' ? '➕ Nuevo Producto' : '✏️ Editar Producto'}</h2>
              <button className="btn-cerrar" onClick={cerrarModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                {/* Nombre */}
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className={formErrors.nombre ? 'input-error' : ''}
                    placeholder="Ej: Guitarra Acústica Yamaha"
                  />
                  {formErrors.nombre && <span className="error-text">{formErrors.nombre}</span>}
                </div>

                {/* Categoría */}
                <div className="form-group">
                  <label>Categoría *</label>
                  <select
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                  >
                    {CATEGORIAS.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Precio */}
                <div className="form-group">
                  <label>Precio Unitario (Bs.) *</label>
                  <input
                    type="number"
                    name="precio_unitario"
                    value={formData.precio_unitario}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className={formErrors.precio_unitario ? 'input-error' : ''}
                    placeholder="0.00"
                  />
                  {formErrors.precio_unitario && <span className="error-text">{formErrors.precio_unitario}</span>}
                </div>

                {/* Unidad de Medida */}
                <div className="form-group">
                  <label>Unidad de Medida *</label>
                  <select
                    name="unidad_medida"
                    value={formData.unidad_medida}
                    onChange={handleChange}
                  >
                    {UNIDADES_MEDIDA.map(unidad => (
                      <option key={unidad.value} value={unidad.value}>{unidad.label}</option>
                    ))}
                  </select>
                </div>

                {/* Descripción - Full Width */}
                <div className="form-group form-group-full">
                  <label>Descripción</label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Descripción detallada del producto..."
                  />
                </div>

                {/* Estado */}
                <div className="form-group form-group-checkbox">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="activo"
                      checked={formData.activo}
                      onChange={handleChange}
                    />
                    <span>Producto activo</span>
                  </label>
                </div>
              </div>

              {formErrors.submit && (
                <div className="error-message">{formErrors.submit}</div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn-cancelar" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-guardar">
                  {modalMode === 'create' ? 'Crear Producto' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminar */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Confirmar Eliminación</h2>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que deseas eliminar el producto:</p>
              <p className="producto-eliminar-nombre"><strong>{productoAEliminar?.nombre}</strong>?</p>
              <p className="warning-text">Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancelar" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </button>
              <button className="btn-eliminar-confirmar" onClick={handleEliminar}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Productos;