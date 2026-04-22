import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './HistorialInventario.css';

const API_URL = 'http://localhost:8000/api';

// Configuración de tipos de movimiento
const TIPOS_MOVIMIENTO = {
  // Valores nuevos (desde signals.py)
  'ENTRADA_COMPRA':      { label: 'Compra',        icon: '🟢', color: 'success', tipo: 'entrada' },
  'SALIDA_VENTA':        { label: 'Venta',          icon: '🔴', color: 'danger',  tipo: 'salida'  },
  'AJUSTE_POSITIVO':     { label: 'Ajuste +',       icon: '⚙️', color: 'info',    tipo: 'entrada' },
  'AJUSTE_NEGATIVO':     { label: 'Ajuste -',       icon: '⚙️', color: 'warning', tipo: 'salida'  },
  // Valores legacy (por si hay registros anteriores)
  'COMPRA':              { label: 'Compra',         icon: '🟢', color: 'success', tipo: 'entrada' },
  'VENTA':               { label: 'Venta',          icon: '🔴', color: 'danger',  tipo: 'salida'  },
  'DEVOLUCION_CLIENTE':  { label: 'Dev. Cliente',   icon: '🔄', color: 'success', tipo: 'entrada' },
  'DEVOLUCION_PROVEEDOR':{ label: 'Dev. Proveedor', icon: '🔄', color: 'danger',  tipo: 'salida'  },
  'MERMA':               { label: 'Merma',          icon: '⚠️', color: 'danger',  tipo: 'salida'  },
  'INVENTARIO_FISICO':   { label: 'Inv. Físico',    icon: '📦', color: 'info',    tipo: 'ajuste'  },
};

function HistorialInventario() {
  const [historial, setHistorial] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [filtroProducto, setFiltroProducto] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 30;
  
  // Filas expandidas
  const [filasExpandidas, setFilasExpandidas] = useState(new Set());
  
  // Resumen
  const [resumen, setResumen] = useState({
    total_movimientos: 0,
    total_entradas: 0,
    total_salidas: 0,
    total_ajustes: 0
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    calcularResumen();
  }, [historial]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [historialRes, productosRes] = await Promise.all([
        axios.get(`${API_URL}/historial-inventario/`),
        axios.get(`${API_URL}/productos/`)
      ]);
      
      setHistorial(historialRes.data);
      setProductos(productosRes.data);
      setError('');
    } catch (error) {
      console.error('Error al cargar historial:', error);
      setError('Error al cargar el historial de movimientos');
    } finally {
      setLoading(false);
    }
  };

  // ==================== CÁLCULO DE RESUMEN ====================
  
  const calcularResumen = () => {
    const historialFiltrado = aplicarFiltros();
    
    let entradas = 0;
    let salidas = 0;
    let ajustes = 0;

    historialFiltrado.forEach(mov => {
      const config = TIPOS_MOVIMIENTO[mov.tipo_movimiento];
      if (config) {
        if (config.tipo === 'entrada') entradas++;
        else if (config.tipo === 'salida') salidas++;
        else if (config.tipo === 'ajuste') ajustes++;
      }
    });

    setResumen({
      total_movimientos: historialFiltrado.length,
      total_entradas: entradas,
      total_salidas: salidas,
      total_ajustes: ajustes
    });
  };

  // ==================== FILTRADO ====================
  
  const aplicarFiltros = () => {
    let resultado = [...historial];

    // Filtro por producto
    if (filtroProducto) {
      resultado = resultado.filter(mov => {
        const productoId = mov.id_producto?.id_producto || mov.id_producto;
        return productoId === parseInt(filtroProducto);
      });
    }

    // Filtro por fecha desde
    if (filtroFechaDesde) {
      resultado = resultado.filter(mov => {
        const fechaMov = new Date(mov.fecha_registro);
        const fechaDesde = new Date(filtroFechaDesde);
        return fechaMov >= fechaDesde;
      });
    }

    // Filtro por fecha hasta
    if (filtroFechaHasta) {
      resultado = resultado.filter(mov => {
        const fechaMov = new Date(mov.fecha_registro);
        const fechaHasta = new Date(filtroFechaHasta + 'T23:59:59');
        return fechaMov <= fechaHasta;
      });
    }

    // Ordenar por fecha más reciente primero
    resultado.sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro));

    return resultado;
  };

  const historialFiltrado = aplicarFiltros();

  // ==================== PAGINACIÓN ====================
  
  const indexUltimo = paginaActual * registrosPorPagina;
  const indexPrimero = indexUltimo - registrosPorPagina;
  const movimientosActuales = historialFiltrado.slice(indexPrimero, indexUltimo);
  const totalPaginas = Math.ceil(historialFiltrado.length / registrosPorPagina);

  const cambiarPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);
    window.scrollTo(0, 0);
  };

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

  // ==================== EXPORTAR A EXCEL ====================
  
  const exportarExcel = () => {
    const headers = ['Fecha/Hora', 'Producto', 'Tipo', 'Stock Anterior', 'Stock Nuevo', 'Cambio', 'Usuario', 'Observaciones'];
    
    const rows = historialFiltrado.map(mov => {
      const producto = mov.producto_info || productos.find(p => p.id_producto === (mov.id_producto?.id_producto || mov.id_producto));
      const usuario = mov.usuario_info || { nombres: 'N/A', apellido_paterno: '' };
      const config = TIPOS_MOVIMIENTO[mov.tipo_movimiento] || { label: mov.tipo_movimiento };
      const cambio = mov.stock_nuevo - mov.stock_anterior;
      
      return [
        new Date(mov.fecha_registro).toLocaleString('es-BO'),
        producto?.nombre || 'N/A',
        config.label,
        mov.stock_anterior,
        mov.stock_nuevo,
        cambio > 0 ? `+${cambio}` : cambio,
        `${usuario.nombres} ${usuario.apellido_paterno}`.trim(),
        mov.observaciones || '-'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historial_inventario_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==================== UTILIDADES ====================
  
  const getNombreProducto = (movimiento) => {
    const producto = movimiento.producto_info || productos.find(p => p.id_producto === (movimiento.id_producto?.id_producto || movimiento.id_producto));
    return producto?.nombre || 'N/A';
  };

  const getNombreUsuario = (movimiento) => {
    const usuario = movimiento.usuario_info;
    if (!usuario) return 'Sistema';
    return `${usuario.nombres || ''} ${usuario.apellido_paterno || ''}`.trim() || 'Sistema';
  };

  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calcularCambio = (movimiento) => {
    const cambio = movimiento.stock_nuevo - movimiento.stock_anterior;
    return {
      valor: cambio,
      texto: cambio > 0 ? `+${cambio}` : `${cambio}`,
      clase: cambio > 0 ? 'positivo' : cambio < 0 ? 'negativo' : 'neutro'
    };
  };

  // ==================== LIMPIAR FILTROS ====================
  
  const limpiarFiltros = () => {
    setFiltroProducto('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setPaginaActual(1);
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="historial-loading">
        <div className="spinner"></div>
        <p>Cargando historial...</p>
      </div>
    );
  }

  return (
    <div className="historial-container">
      {/* Header */}
      <div className="historial-header">
        <h1>📋 Historial de Movimientos</h1>
        <button className="btn-exportar" onClick={exportarExcel}>
          <span>📥</span> Exportar Excel
        </button>
      </div>

      {/* Resumen Estadístico */}
      <div className="resumen-grid">
        <div className="resumen-card entradas">
          <div className="resumen-icon">🟢</div>
          <div className="resumen-content">
            <div className="resumen-numero">{resumen.total_entradas}</div>
            <div className="resumen-label">Entradas</div>
          </div>
        </div>

        <div className="resumen-card salidas">
          <div className="resumen-icon">🔴</div>
          <div className="resumen-content">
            <div className="resumen-numero">{resumen.total_salidas}</div>
            <div className="resumen-label">Salidas</div>
          </div>
        </div>

        <div className="resumen-card ajustes">
          <div className="resumen-icon">⚙️</div>
          <div className="resumen-content">
            <div className="resumen-numero">{resumen.total_ajustes}</div>
            <div className="resumen-label">Ajustes</div>
          </div>
        </div>

        <div className="resumen-card total">
          <div className="resumen-icon">📦</div>
          <div className="resumen-content">
            <div className="resumen-numero">{resumen.total_movimientos}</div>
            <div className="resumen-label">Total Movimientos</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="historial-filtros">
        <select
          value={filtroProducto}
          onChange={(e) => { setFiltroProducto(e.target.value); setPaginaActual(1); }}
          className="filtro-select"
        >
          <option value="">Todos los productos</option>
          {productos.map(prod => (
            <option key={prod.id_producto} value={prod.id_producto}>
              {prod.nombre}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filtroFechaDesde}
          onChange={(e) => { setFiltroFechaDesde(e.target.value); setPaginaActual(1); }}
          className="filtro-date"
          placeholder="Desde"
        />

        <input
          type="date"
          value={filtroFechaHasta}
          onChange={(e) => { setFiltroFechaHasta(e.target.value); setPaginaActual(1); }}
          className="filtro-date"
          placeholder="Hasta"
        />

        {(filtroProducto || filtroFechaDesde || filtroFechaHasta) && (
          <button className="btn-limpiar" onClick={limpiarFiltros}>
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      {/* Info */}
      <div className="historial-info">
        <p>Mostrando {movimientosActuales.length} de {historialFiltrado.length} movimientos</p>
      </div>

      {/* Tabla */}
      {error && <div className="error-message">{error}</div>}
      
      {historialFiltrado.length === 0 ? (
        <div className="no-resultados">
          <p>No se encontraron movimientos</p>
          {(filtroProducto || filtroFechaDesde || filtroFechaHasta) && (
            <button className="btn-limpiar" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="tabla-container">
          <table className="historial-tabla">
            <thead>
              <tr>
                <th style={{width: '40px'}}></th>
                <th>Fecha/Hora</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cambio</th>
                <th>Stock</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movimientosActuales.map(mov => {
                const isExpanded = filasExpandidas.has(mov.id_historial);
                const config = TIPOS_MOVIMIENTO[mov.tipo_movimiento] || { icon: '❓', label: mov.tipo_movimiento, color: 'secondary' };
                const cambio = calcularCambio(mov);
                const tieneObservaciones = mov.observaciones && mov.observaciones.trim() !== '';

                return (
                  <React.Fragment key={mov.id_historial}>
                    {/* Fila principal */}
                    <tr className="fila-principal">
                      <td>
                        {tieneObservaciones && (
                          <button
                            className="btn-expand"
                            onClick={() => toggleFila(mov.id_historial)}
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        )}
                      </td>
                      <td className="fecha-cell">
                        {formatearFecha(mov.fecha_registro)}
                      </td>
                      <td className="producto-cell">
                        {getNombreProducto(mov)}
                      </td>
                      <td>
                        <span className={`badge badge-${config.color}`}>
                          {config.icon} {config.label}
                        </span>
                      </td>
                      <td>
                        <span className={`cambio cambio-${cambio.clase}`}>
                          {cambio.texto}
                        </span>
                      </td>
                      <td className="stock-cell">
                        {mov.stock_anterior} → {mov.stock_nuevo}
                      </td>
                      <td className="usuario-cell">
                        {getNombreUsuario(mov)}
                      </td>
                    </tr>

                    {/* Fila expandida con observaciones */}
                    {isExpanded && tieneObservaciones && (
                      <tr className="fila-expandida">
                        <td colSpan="7">
                          <div className="observaciones-expandidas">
                            <strong>Observaciones:</strong>
                            <p>{mov.observaciones}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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
            {[...Array(totalPaginas)].map((_, index) => {
              const numeroPagina = index + 1;
              // Mostrar solo páginas cercanas a la actual
              if (
                numeroPagina === 1 ||
                numeroPagina === totalPaginas ||
                (numeroPagina >= paginaActual - 2 && numeroPagina <= paginaActual + 2)
              ) {
                return (
                  <button
                    key={numeroPagina}
                    onClick={() => cambiarPagina(numeroPagina)}
                    className={`btn-pagina ${paginaActual === numeroPagina ? 'active' : ''}`}
                  >
                    {numeroPagina}
                  </button>
                );
              } else if (
                numeroPagina === paginaActual - 3 ||
                numeroPagina === paginaActual + 3
              ) {
                return <span key={numeroPagina} className="paginacion-dots">...</span>;
              }
              return null;
            })}
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
    </div>
  );
}

export default HistorialInventario;