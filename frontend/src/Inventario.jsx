import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Inventario.css';

const API_URL = 'http://localhost:8000/api';

// Motivos de ajuste
const MOTIVOS_AJUSTE = [
  { value: 'INVENTARIO_FISICO', label: 'Ajuste por inventario físico' },
  { value: 'CORRECCION_ERROR', label: 'Corrección de error' }
];

function Inventario() {
  const [inventarios, setInventarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  
  // Filas expandidas
  const [filasExpandidas, setFilasExpandidas] = useState(new Set());
  
  // Modales
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [inventarioActual, setInventarioActual] = useState(null);
  
  // Estadísticas
  const [estadisticas, setEstadisticas] = useState(null);
  
  // Formularios
  const [configData, setConfigData] = useState({});
  const [ajusteData, setAjusteData] = useState({
    tipo: 'AGREGAR',
    cantidad: '',
    motivo: 'INVENTARIO_FISICO',
    observaciones: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [inventariosRes, estadisticasRes] = await Promise.all([
        axios.get(`${API_URL}/inventarios/`),
        axios.get(`${API_URL}/inventarios/resumen/`)
      ]);
      
      setInventarios(inventariosRes.data);
      setEstadisticas(estadisticasRes.data);
      setError('');
    } catch (error) {
      console.error('Error al cargar inventario:', error);
      setError('Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  // ==================== FILTRADO ====================
  
  const inventariosFiltrados = inventarios.filter(inv => {
    const producto = inv.id_producto || inv.producto_info;
    const nombreProducto = producto?.nombre || '';
    
    const matchSearch = nombreProducto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = !filtroEstado || inv.estado_inventario === filtroEstado;
    const matchCategoria = !filtroCategoria || producto?.categoria === filtroCategoria;
    
    return matchSearch && matchEstado && matchCategoria;
  });

  // ==================== EXPANDIR/COLAPSAR ====================
  
  const toggleFila = (id) => {
    const nuevasFilas = new Set(filasExpandidas);
    if (nuevasFilas.has(id)) {
      nuevasFilas.delete(id);
    } else {
      nuevasFilas.add(id);
    }
    setFilasExpandidas(nuevasFilas);
  };

  // ==================== MODALES ====================
  
  const abrirDetalles = (inventario) => {
    setInventarioActual(inventario);
    setShowDetallesModal(true);
  };

  const abrirConfig = (inventario) => {
    setInventarioActual(inventario);
    setConfigData({
      stock_minimo: inventario.stock_minimo,
      stock_maximo: inventario.stock_maximo,
      punto_reorden: inventario.punto_reorden,
      stock_seguridad: inventario.stock_seguridad,
      demanda_promedio_diaria: inventario.demanda_promedio_diaria,
      tiempo_entrega_dias: inventario.tiempo_entrega_dias
    });
    setShowConfigModal(true);
  };

  const abrirAjuste = (inventario) => {
    setInventarioActual(inventario);
    setAjusteData({
      tipo: 'AGREGAR',
      cantidad: '',
      motivo: 'INVENTARIO_FISICO',
      observaciones: ''
    });
    setShowAjusteModal(true);
  };

  const cerrarModales = () => {
    setShowDetallesModal(false);
    setShowConfigModal(false);
    setShowAjusteModal(false);
    setInventarioActual(null);
    setConfigData({});
    setAjusteData({
      tipo: 'AGREGAR',
      cantidad: '',
      motivo: 'INVENTARIO_FISICO',
      observaciones: ''
    });
  };

  // ==================== ACCIONES ====================
  
  const handleGuardarConfig = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/inventarios/${inventarioActual.id_inventario}/`, configData);
      await cargarDatos();
      cerrarModales();
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Error al guardar la configuración');
    }
  };

const handleAjustarStock = async (e) => {
  e.preventDefault();
  
  if (!ajusteData.cantidad || ajusteData.cantidad <= 0) {
    alert('Debe ingresar una cantidad válida');
    return;
  }

  try {
    const cantidad = parseInt(ajusteData.cantidad);
    const nuevoStock = ajusteData.tipo === 'AGREGAR' 
      ? inventarioActual.stock_actual + cantidad
      : inventarioActual.stock_actual - cantidad;

    if (nuevoStock < 0) {
      alert('El stock no puede ser negativo');
      return;
    }

    // CORRECCIÓN: Obtener el ID del producto correctamente
    const productoId = inventarioActual.producto_info?.id_producto || 
                      inventarioActual.id_producto?.id_producto || 
                      inventarioActual.id_producto;

    // CORRECCIÓN: Enviar todos los campos requeridos con el ID del producto (no el objeto)
    const dataActualizada = {
      id_producto: productoId,  // ← Solo el ID (número), NO el objeto completo
      stock_actual: nuevoStock,
      stock_minimo: inventarioActual.stock_minimo,
      stock_maximo: inventarioActual.stock_maximo,
      punto_reorden: inventarioActual.punto_reorden,
      stock_seguridad: inventarioActual.stock_seguridad,
      demanda_promedio_diaria: inventarioActual.demanda_promedio_diaria,
      tiempo_entrega_dias: inventarioActual.tiempo_entrega_dias
    };

    console.log('Datos a enviar:', dataActualizada); // Para debugging

    // Actualizar stock
    await axios.put(
      `${API_URL}/inventarios/${inventarioActual.id_inventario}/`, 
      dataActualizada
    );

    // Registrar en historial (si el endpoint existe)
    try {
      const userId = JSON.parse(localStorage.getItem('user'))?.id || 1;
      
      await axios.post(`${API_URL}/historial-inventario/`, {
        id_producto: productoId,
        id_usuario: userId,
        stock_anterior: inventarioActual.stock_actual,
        stock_nuevo: nuevoStock,
        tipo_movimiento: ajusteData.tipo === 'AGREGAR' ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
        observaciones: `${MOTIVOS_AJUSTE.find(m => m.value === ajusteData.motivo)?.label || ajusteData.motivo}. ${ajusteData.observaciones || ''}`
      });
    } catch (histError) {
      console.warn('No se pudo registrar en historial:', histError);
    }

    await cargarDatos();
    cerrarModales();
  } catch (error) {
    console.error('Error completo:', error);
    console.error('Respuesta del servidor:', error.response?.data);
    
    // Mostrar mensaje de error más específico
    if (error.response?.data) {
      const errorMsg = JSON.stringify(error.response.data);
      alert(`Error al ajustar el stock: ${errorMsg}`);
    } else {
      alert('Error al ajustar el stock. Revisa la consola para más detalles.');
    }
  }
};

  const exportarExcel = () => {
    // Crear CSV simple
    const headers = ['Producto', 'Stock Actual', 'Stock Mínimo', 'Stock Máximo', 'Estado', 'Valor'];
    const rows = inventariosFiltrados.map(inv => {
      const producto = inv.id_producto || inv.producto_info;
      const valor = inv.stock_actual * (producto?.precio_unitario || 0);
      return [
        producto?.nombre || 'N/A',
        inv.stock_actual,
        inv.stock_minimo,
        inv.stock_maximo,
        inv.estado_inventario,
        `Bs. ${valor.toFixed(2)}`
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==================== UTILIDADES ====================
  
  const calcularPorcentajeStock = (actual, maximo) => {
    if (maximo === 0) return 0;
    return Math.min((actual / maximo) * 100, 100);
  };

  const getColorEstado = (estado) => {
    const colores = {
      'NORMAL': 'success',
      'BAJO': 'warning',
      'CRITICO': 'danger',
      'SOBRESTOCK': 'info'
    };
    return colores[estado] || 'secondary';
  };

  const getIconoEstado = (estado) => {
    const iconos = {
      'NORMAL': '🟢',
      'BAJO': '🟡',
      'CRITICO': '🔴',
      'SOBRESTOCK': '🔵'
    };
    return iconos[estado] || '⚪';
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="inventario-loading">
        <div className="spinner"></div>
        <p>Cargando inventario...</p>
      </div>
    );
  }

  return (
    <div className="inventario-container">
      {/* Header */}
      <div className="inventario-header">
        <h1>📦 Inventario - Vista General</h1>
        <button className="btn-exportar" onClick={exportarExcel}>
          <span>📥</span> Exportar Excel
        </button>
      </div>

      {/* Alertas */}
      {estadisticas && (
        <div className="alertas-grid">
          <div className="alerta-card critico">
            <div className="alerta-icon">🔴</div>
            <div className="alerta-content">
              <div className="alerta-numero">{estadisticas.critico || 0}</div>
              <div className="alerta-label">Crítico</div>
            </div>
          </div>

          <div className="alerta-card bajo">
            <div className="alerta-icon">🟡</div>
            <div className="alerta-content">
              <div className="alerta-numero">{estadisticas.bajo || 0}</div>
              <div className="alerta-label">Bajo</div>
            </div>
          </div>

          <div className="alerta-card normal">
            <div className="alerta-icon">🟢</div>
            <div className="alerta-content">
              <div className="alerta-numero">{estadisticas.normal || 0}</div>
              <div className="alerta-label">Normal</div>
            </div>
          </div>

          <div className="alerta-card sobrestock">
            <div className="alerta-icon">🔵</div>
            <div className="alerta-content">
              <div className="alerta-numero">{estadisticas.sobrestock || 0}</div>
              <div className="alerta-label">Sobrestock</div>
            </div>
          </div>
        </div>
      )}

      {/* Resumen */}
      {estadisticas && (
        <div className="inventario-resumen">
          <div className="resumen-item">
            <span className="resumen-label">Total de productos:</span>
            <span className="resumen-valor">{estadisticas.total_productos || 0}</span>
          </div>
          <div className="resumen-divider">|</div>
          <div className="resumen-item">
            <span className="resumen-label">Valor total inventario:</span>
            <span className="resumen-valor">Bs. {(estadisticas.valor_total || 0).toLocaleString('es-BO', {minimumFractionDigits: 2})}</span>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="inventario-filtros">
        <div className="filtro-busqueda">
          <input
            type="text"
            placeholder="🔍 Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-busqueda"
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="filtro-select"
        >
          <option value="">Todos los estados</option>
          <option value="NORMAL">Normal</option>
          <option value="BAJO">Bajo</option>
          <option value="CRITICO">Crítico</option>
          <option value="SOBRESTOCK">Sobrestock</option>
        </select>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="filtro-select"
        >
          <option value="">Todas las categorías</option>
          <option value="INSTRUMENTO">Instrumento</option>
          <option value="ACCESORIO">Accesorio</option>
          <option value="REPUESTO">Repuesto</option>
        </select>
      </div>

      {/* Info */}
      <div className="inventario-info">
        <p>Mostrando {inventariosFiltrados.length} productos</p>
      </div>

      {/* Tabla Expandible */}
      {error && <div className="error-message">{error}</div>}
      
      <div className="tabla-container">
        <table className="inventario-tabla">
          <thead>
            <tr>
              <th style={{width: '40px'}}></th>
              <th>Producto</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Mín / Máx</th>
              <th>Última Venta</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {inventariosFiltrados.map(inv => {
              const producto = inv.id_producto || inv.producto_info;
              const isExpanded = filasExpandidas.has(inv.id_inventario);
              const porcentaje = calcularPorcentajeStock(inv.stock_actual, inv.stock_maximo);

              return (
                <React.Fragment key={inv.id_inventario}>
                  {/* Fila principal */}
                  <tr className="fila-principal">
                    <td>
                      <button
                        className="btn-expand"
                        onClick={() => toggleFila(inv.id_inventario)}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </td>
                    <td className="producto-cell">
                      <strong>{producto?.nombre || 'N/A'}</strong>
                    </td>
                    <td>
                      <div className="stock-info">
                        <span className="stock-numero">{inv.stock_actual}</span>
                        <div className="stock-barra">
                          <div 
                            className={`stock-progreso stock-progreso-${getColorEstado(inv.estado_inventario)}`}
                            style={{width: `${porcentaje}%`}}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${getColorEstado(inv.estado_inventario)}`}>
                        {getIconoEstado(inv.estado_inventario)} {inv.estado_inventario}
                      </span>
                    </td>
                    <td className="min-max-cell">
                      {inv.stock_minimo} / {inv.stock_maximo}
                    </td>
                    <td>
                      {inv.ultima_venta ? new Date(inv.ultima_venta).toLocaleDateString('es-BO') : 'Sin ventas'}
                    </td>
                    <td className="acciones-cell">
                      <button
                        className="btn-accion btn-detalles"
                        onClick={() => abrirDetalles(inv)}
                        title="Ver detalles"
                      >
                        📊
                      </button>
                      <button
                        className="btn-accion btn-config"
                        onClick={() => abrirConfig(inv)}
                        title="Configurar"
                      >
                        ⚙️
                      </button>
                      <button
                        className="btn-accion btn-ajuste"
                        onClick={() => abrirAjuste(inv)}
                        title="Ajustar stock"
                      >
                        ➕➖
                      </button>
                    </td>
                  </tr>

                  {/* Fila expandida */}
                  {isExpanded && (
                    <tr className="fila-expandida">
                      <td colSpan="7">
                        <div className="detalles-expandidos">
                          <div className="detalles-grid">
                            <div className="detalle-item">
                              <span className="detalle-label">Punto de Reorden:</span>
                              <span className="detalle-valor">{inv.punto_reorden}</span>
                            </div>
                            <div className="detalle-item">
                              <span className="detalle-label">Stock de Seguridad:</span>
                              <span className="detalle-valor">{inv.stock_seguridad}</span>
                            </div>
                            <div className="detalle-item">
                              <span className="detalle-label">Demanda Promedio Diaria:</span>
                              <span className="detalle-valor">{inv.demanda_promedio_diaria}</span>
                            </div>
                            <div className="detalle-item">
                              <span className="detalle-label">Tiempo de Entrega:</span>
                              <span className="detalle-valor">{inv.tiempo_entrega_dias} días</span>
                            </div>
                            <div className="detalle-item">
                              <span className="detalle-label">Última Compra:</span>
                              <span className="detalle-valor">
                                {inv.ultima_compra ? new Date(inv.ultima_compra).toLocaleDateString('es-BO') : 'Sin compras'}
                              </span>
                            </div>
                            <div className="detalle-item">
                              <span className="detalle-label">Valor en Stock:</span>
                              <span className="detalle-valor destacado">
                                Bs. {(inv.stock_actual * (producto?.precio_unitario || 0)).toLocaleString('es-BO', {minimumFractionDigits: 2})}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {inventariosFiltrados.length === 0 && (
          <div className="no-resultados">
            <p>No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* Modal Ver Detalles */}
      {showDetallesModal && inventarioActual && (
        <div className="modal-overlay" onClick={cerrarModales}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Detalles de Inventario</h2>
              <button className="btn-cerrar" onClick={cerrarModales}>✕</button>
            </div>
            
            <div className="modal-body">
              <h3 className="producto-nombre">
                {(inventarioActual.id_producto || inventarioActual.producto_info)?.nombre}
              </h3>
              
              <div className="detalles-completos">
                <div className="detalle-grupo">
                  <h4>Stock</h4>
                  <div className="detalle-row">
                    <span>Stock Actual:</span>
                    <strong>{inventarioActual.stock_actual}</strong>
                  </div>
                  <div className="detalle-row">
                    <span>Stock Mínimo:</span>
                    <span>{inventarioActual.stock_minimo}</span>
                  </div>
                  <div className="detalle-row">
                    <span>Stock Máximo:</span>
                    <span>{inventarioActual.stock_maximo}</span>
                  </div>
                  <div className="detalle-row">
                    <span>Punto de Reorden:</span>
                    <span>{inventarioActual.punto_reorden}</span>
                  </div>
                  <div className="detalle-row">
                    <span>Stock de Seguridad:</span>
                    <span>{inventarioActual.stock_seguridad}</span>
                  </div>
                </div>

                <div className="detalle-grupo">
                  <h4>Demanda y Entrega</h4>
                  <div className="detalle-row">
                    <span>Demanda Promedio Diaria:</span>
                    <span>{inventarioActual.demanda_promedio_diaria}</span>
                  </div>
                  <div className="detalle-row">
                    <span>Tiempo de Entrega:</span>
                    <span>{inventarioActual.tiempo_entrega_dias} días</span>
                  </div>
                </div>

                <div className="detalle-grupo">
                  <h4>Movimientos</h4>
                  <div className="detalle-row">
                    <span>Última Venta:</span>
                    <span>
                      {inventarioActual.ultima_venta 
                        ? new Date(inventarioActual.ultima_venta).toLocaleDateString('es-BO')
                        : 'Sin ventas'}
                    </span>
                  </div>
                  <div className="detalle-row">
                    <span>Última Compra:</span>
                    <span>
                      {inventarioActual.ultima_compra 
                        ? new Date(inventarioActual.ultima_compra).toLocaleDateString('es-BO')
                        : 'Sin compras'}
                    </span>
                  </div>
                </div>

                <div className="detalle-grupo">
                  <h4>Valoración</h4>
                  <div className="detalle-row">
                    <span>Precio Unitario:</span>
                    <span>
                      Bs. {parseFloat(
                        (inventarioActual.producto_info || inventarioActual.id_producto)?.precio_unitario || 0
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="detalle-row destacado">
                    <span>Valor Total en Stock:</span>
                    <strong>
                      Bs. {(() => {
                        const precio = parseFloat(
                          (inventarioActual.producto_info || inventarioActual.id_producto)?.precio_unitario || 0
                        );
                        const stock = parseFloat(inventarioActual.stock_actual || 0);
                        const valor = precio * stock;
                        return valor.toLocaleString('es-BO', {minimumFractionDigits: 2});
                      })()}
                    </strong>
                  </div>
                </div>

                <div className="detalle-grupo">
                  <h4>Estado</h4>
                  <div className="detalle-row">
                    <span>Estado del Inventario:</span>
                    <span className={`badge badge-${getColorEstado(inventarioActual.estado_inventario)}`}>
                      {getIconoEstado(inventarioActual.estado_inventario)} {inventarioActual.estado_inventario}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-cancelar" onClick={cerrarModales}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configurar */}
      {showConfigModal && inventarioActual && (
        <div className="modal-overlay" onClick={cerrarModales}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ Configurar Inventario</h2>
              <button className="btn-cerrar" onClick={cerrarModales}>✕</button>
            </div>
            
            <form onSubmit={handleGuardarConfig}>
              <div className="modal-body">
                <h3 className="producto-nombre">
                  {(inventarioActual.id_producto || inventarioActual.producto_info)?.nombre}
                </h3>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Stock Mínimo</label>
                    <input
                      type="number"
                      value={configData.stock_minimo}
                      onChange={(e) => setConfigData({...configData, stock_minimo: e.target.value})}
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock Máximo</label>
                    <input
                      type="number"
                      value={configData.stock_maximo}
                      onChange={(e) => setConfigData({...configData, stock_maximo: e.target.value})}
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Punto de Reorden</label>
                    <input
                      type="number"
                      value={configData.punto_reorden}
                      onChange={(e) => setConfigData({...configData, punto_reorden: e.target.value})}
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock de Seguridad</label>
                    <input
                      type="number"
                      value={configData.stock_seguridad}
                      onChange={(e) => setConfigData({...configData, stock_seguridad: e.target.value})}
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Demanda Promedio Diaria</label>
                    <input
                      type="number"
                      step="0.1"
                      value={configData.demanda_promedio_diaria}
                      onChange={(e) => setConfigData({...configData, demanda_promedio_diaria: e.target.value})}
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Tiempo de Entrega (días)</label>
                    <input
                      type="number"
                      value={configData.tiempo_entrega_dias}
                      onChange={(e) => setConfigData({...configData, tiempo_entrega_dias: e.target.value})}
                      min="0"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-cancelar" onClick={cerrarModales}>
                  Cancelar
                </button>
                <button type="submit" className="btn-guardar">
                  Guardar Configuración
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajustar Stock */}
      {showAjusteModal && inventarioActual && (
        <div className="modal-overlay" onClick={cerrarModales}>
          <div className="modal-content modal-ajuste" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕➖ Ajustar Stock</h2>
              <button className="btn-cerrar" onClick={cerrarModales}>✕</button>
            </div>
            
            <form onSubmit={handleAjustarStock}>
              <div className="modal-body">
                <h3 className="producto-nombre">
                  {(inventarioActual.id_producto || inventarioActual.producto_info)?.nombre}
                </h3>
                
                <div className="stock-actual-info">
                  <span>Stock Actual:</span>
                  <strong>{inventarioActual.stock_actual}</strong>
                </div>

                <div className="form-group">
                  <label>Tipo de Ajuste</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="tipo"
                        value="AGREGAR"
                        checked={ajusteData.tipo === 'AGREGAR'}
                        onChange={(e) => setAjusteData({...ajusteData, tipo: e.target.value})}
                      />
                      <span>➕ Agregar</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="tipo"
                        value="REDUCIR"
                        checked={ajusteData.tipo === 'REDUCIR'}
                        onChange={(e) => setAjusteData({...ajusteData, tipo: e.target.value})}
                      />
                      <span>➖ Reducir</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Cantidad *</label>
                  <input
                    type="number"
                    value={ajusteData.cantidad}
                    onChange={(e) => setAjusteData({...ajusteData, cantidad: e.target.value})}
                    min="1"
                    required
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Motivo *</label>
                  <select
                    value={ajusteData.motivo}
                    onChange={(e) => setAjusteData({...ajusteData, motivo: e.target.value})}
                    required
                  >
                    {MOTIVOS_AJUSTE.map(motivo => (
                      <option key={motivo.value} value={motivo.value}>
                        {motivo.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Observaciones</label>
                  <textarea
                    value={ajusteData.observaciones}
                    onChange={(e) => setAjusteData({...ajusteData, observaciones: e.target.value})}
                    rows="3"
                    placeholder="Detalles adicionales del ajuste..."
                  />
                </div>

                {ajusteData.cantidad && (
                  <div className="preview-ajuste">
                    <span>Nuevo stock será:</span>
                    <strong className={ajusteData.tipo === 'AGREGAR' ? 'positivo' : 'negativo'}>
                      {ajusteData.tipo === 'AGREGAR' 
                        ? inventarioActual.stock_actual + parseInt(ajusteData.cantidad || 0)
                        : inventarioActual.stock_actual - parseInt(ajusteData.cantidad || 0)}
                    </strong>
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-cancelar" onClick={cerrarModales}>
                  Cancelar
                </button>
                <button type="submit" className="btn-guardar">
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventario;