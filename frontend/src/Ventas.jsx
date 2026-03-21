import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Ventas.css';

const API_URL = 'http://localhost:8000/api';

const FORMAS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'QR', label: 'QR' }
];

function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroProducto, setFiltroProducto] = useState('');
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const ventasPorPagina = 10;
  
  // Modales
  const [showModalNueva, setShowModalNueva] = useState(false);
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalCancelar, setShowModalCancelar] = useState(false);
  const [ventaActual, setVentaActual] = useState(null);
  
  // Formulario
  const [carrito, setCarrito] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [formaPago, setFormaPago] = useState('EFECTIVO');
  const [observaciones, setObservaciones] = useState('');
  const [modoEdicion, setModoEdicion] = useState(false);
  
  // Resumen
  const [resumen, setResumen] = useState({
    total_hoy: 0,
    cantidad_hoy: 0,
    promedio_hoy: 0,
    total_mes: 0
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    calcularResumen();
  }, [ventas]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [ventasRes, productosRes, usuariosRes] = await Promise.all([
        axios.get(`${API_URL}/ventas/`),
        axios.get(`${API_URL}/productos/`),
        axios.get(`${API_URL}/usuarios/`)
      ]);
      
      setVentas(ventasRes.data);
      setProductos(productosRes.data.filter(p => p.activo));
      setUsuarios(usuariosRes.data);
      setError('');
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const calcularResumen = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    let ventasHoy = [];
    let ventasMes = [];
    
    ventas.forEach(venta => {
      const fechaVenta = new Date(venta.fecha_venta);
      fechaVenta.setHours(0, 0, 0, 0);
      
      if (fechaVenta.getTime() === hoy.getTime()) {
        ventasHoy.push(venta);
      }
      if (fechaVenta >= inicioMes) {
        ventasMes.push(venta);
      }
    });
    
    const totalHoy = ventasHoy.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    const totalMes = ventasMes.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    
    setResumen({
      total_hoy: totalHoy,
      cantidad_hoy: ventasHoy.length,
      promedio_hoy: ventasHoy.length > 0 ? totalHoy / ventasHoy.length : 0,
      total_mes: totalMes
    });
  };

  // FILTRADO
  const aplicarFiltros = () => {
    let resultado = [...ventas];

    if (filtroFechaDesde) {
      resultado = resultado.filter(venta => {
        const fechaVenta = new Date(venta.fecha_venta);
        const fechaDesde = new Date(filtroFechaDesde);
        return fechaVenta >= fechaDesde;
      });
    }

    if (filtroFechaHasta) {
      resultado = resultado.filter(venta => {
        const fechaVenta = new Date(venta.fecha_venta);
        const fechaHasta = new Date(filtroFechaHasta + 'T23:59:59');
        return fechaVenta <= fechaHasta;
      });
    }

    if (filtroUsuario) {
      resultado = resultado.filter(venta => {
        const usuarioId = venta.usuario_info?.id_usuario || venta.id_usuario;
        return usuarioId === parseInt(filtroUsuario);
      });
    }

    if (filtroProducto) {
      resultado = resultado.filter(venta => {
        if (!venta.detalles || !Array.isArray(venta.detalles)) return false;
        return venta.detalles.some(detalle => {
          const productoId = detalle.producto_info?.id_producto || detalle.id_producto;
          return productoId === parseInt(filtroProducto);
        });
      });
    }

    return resultado;
  };

  const ventasFiltradas = aplicarFiltros();

  // PAGINACIÓN
  const indexUltimo = paginaActual * ventasPorPagina;
  const indexPrimero = indexUltimo - ventasPorPagina;
  const ventasActuales = ventasFiltradas.slice(indexPrimero, indexUltimo);
  const totalPaginas = Math.ceil(ventasFiltradas.length / ventasPorPagina);

  const cambiarPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);
    window.scrollTo(0, 0);
  };

  // CARRITO
  const agregarAlCarrito = () => {
    if (!productoSeleccionado) {
      alert('Selecciona un producto');
      return;
    }

    const producto = productos.find(p => p.id_producto === parseInt(productoSeleccionado));
    if (!producto) return;

    const existe = carrito.find(item => item.producto.id_producto === producto.id_producto);
    if (existe) {
      alert('Este producto ya está en el carrito. Modifica su cantidad.');
      return;
    }

    setCarrito([...carrito, {
      producto: producto,
      cantidad: 1,
      precio_unitario: parseFloat(producto.precio_unitario),
      subtotal: parseFloat(producto.precio_unitario)
    }]);

    setProductoSeleccionado('');
  };

  const cambiarCantidad = (index, nuevaCantidad) => {
    if (nuevaCantidad < 1) return;
    const nuevoCarrito = [...carrito];
    nuevoCarrito[index].cantidad = parseInt(nuevaCantidad);
    nuevoCarrito[index].subtotal = nuevoCarrito[index].cantidad * nuevoCarrito[index].precio_unitario;
    setCarrito(nuevoCarrito);
  };

  const eliminarDelCarrito = (index) => {
    setCarrito(carrito.filter((_, i) => i !== index));
  };

  const calcularTotal = () => {
    return carrito.reduce((sum, item) => sum + item.subtotal, 0);
  };

  // VALIDAR STOCK
  const validarStockDisponible = async () => {
    try {
      for (const item of carrito) {
        const inventarioRes = await axios.get(`${API_URL}/inventarios/?producto=${item.producto.id_producto}`);
        
        if (inventarioRes.data.length === 0) {
          alert(`No hay inventario para ${item.producto.nombre}`);
          return false;
        }

        const inventario = inventarioRes.data[0];
        
        // En modo edición, sumar el stock de la venta original
        let stockDisponible = inventario.stock_actual;
        if (modoEdicion && ventaActual) {
          const detalleOriginal = ventaActual.detalles?.find(
            d => (d.producto_info?.id_producto || d.id_producto) === item.producto.id_producto
          );
          if (detalleOriginal) {
            stockDisponible += detalleOriginal.cantidad;
          }
        }
        
        if (stockDisponible < item.cantidad) {
          alert(`Stock insuficiente para ${item.producto.nombre}. Disponible: ${stockDisponible}`);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error validando stock:', error);
      alert('Error al validar stock');
      return false;
    }
  };

  // CREAR/EDITAR VENTA
  const handleGuardarVenta = async () => {
    if (carrito.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }

    const stockValido = await validarStockDisponible();
    if (!stockValido) return;

    try {
      const usuario = JSON.parse(localStorage.getItem('user'));
      const total = calcularTotal();

      const ventaData = {
        id_usuario: usuario.id,
        total: total.toFixed(2),
        forma_pago: formaPago,
        observaciones: observaciones
      };

      let ventaResponse;
      
      if (modoEdicion) {
        // EDITAR VENTA EXISTENTE
        ventaResponse = await axios.put(
          `${API_URL}/ventas/${ventaActual.id_venta}/`,
          ventaData
        );

        // Revertir stock de la venta original
        for (const detalle of ventaActual.detalles) {
          const productoId = detalle.producto_info?.id_producto || detalle.id_producto;
          await revertirStock(productoId, detalle.cantidad);
        }

        // Eliminar detalles antiguos
        await axios.delete(`${API_URL}/detalle-venta/por-venta/?venta=${ventaActual.id_venta}`);
      } else {
        // CREAR NUEVA VENTA
        ventaResponse = await axios.post(`${API_URL}/ventas/`, ventaData);
      }

      const idVenta = ventaResponse.data.id_venta;

      // Crear detalles
      for (const item of carrito) {
        const detalleData = {
          id_venta: idVenta,
          id_producto: item.producto.id_producto,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario.toFixed(2),
          subtotal: item.subtotal.toFixed(2)
        };

        await axios.post(`${API_URL}/detalle-venta/`, detalleData);

        // Descontar stock
        await descontarStock(item.producto.id_producto, item.cantidad, idVenta);
      }

      await cargarDatos();
      cerrarModales();
      alert(modoEdicion ? 'Venta actualizada correctamente' : 'Venta registrada correctamente');
    } catch (error) {
      console.error('Error al guardar venta:', error);
      alert('Error al guardar la venta');
    }
  };

  const descontarStock = async (productoId, cantidad, idVenta) => {
    try {
      const inventarioRes = await axios.get(`${API_URL}/inventarios/?producto=${productoId}`);
      if (inventarioRes.data.length === 0) return;

      const inventario = inventarioRes.data[0];
      const nuevoStock = inventario.stock_actual - cantidad;

      await axios.patch(`${API_URL}/inventarios/${inventario.id_inventario}/`, {
        id_producto: productoId,
        stock_actual: nuevoStock,
        stock_minimo: inventario.stock_minimo,
        stock_maximo: inventario.stock_maximo,
        punto_reorden: inventario.punto_reorden,
        stock_seguridad: inventario.stock_seguridad,
        demanda_promedio_diaria: inventario.demanda_promedio_diaria,
        tiempo_entrega_dias: inventario.tiempo_entrega_dias
      });

      // Registrar en historial
      const usuario = JSON.parse(localStorage.getItem('user'));
      const historialData = {
        id_producto: productoId,
        id_usuario: usuario.id,
        stock_anterior: inventario.stock_actual,
        stock_nuevo: nuevoStock,
        tipo_movimiento: 'SALIDA_VENTA',
        observaciones: `Venta #${idVenta}`
      };
      console.log('Enviando historial:', historialData);
      try {
        await axios.post(`${API_URL}/historial-inventario/`, historialData);
      } catch (historialError) {
        console.error('Error historial - response data:', historialError.response?.data);
        // ✅ Esto mostrará exactamente qué campo está fallando
      }
    } catch (error) {
      console.error('Error al descontar stock:', error);
    }
  };

  const revertirStock = async (productoId, cantidad) => {
    try {
      const inventarioRes = await axios.get(`${API_URL}/inventarios/?producto=${productoId}`);
      if (inventarioRes.data.length === 0) return;

      const inventario = inventarioRes.data[0];
      const nuevoStock = inventario.stock_actual + cantidad;

      await axios.patch(`${API_URL}/inventarios/${inventario.id_inventario}/`, {
        id_producto: productoId,
        stock_actual: nuevoStock,
        stock_minimo: inventario.stock_minimo,
        stock_maximo: inventario.stock_maximo,
        punto_reorden: inventario.punto_reorden,
        stock_seguridad: inventario.stock_seguridad,
        demanda_promedio_diaria: inventario.demanda_promedio_diaria,
        tiempo_entrega_dias: inventario.tiempo_entrega_dias
      });
    } catch (error) {
      console.error('Error al revertir stock:', error);
    }
  };

  // MODALES
  const abrirModalNueva = () => {
    setModoEdicion(false);
    setCarrito([]);
    setFormaPago('EFECTIVO');
    setObservaciones('');
    setShowModalNueva(true);
  };

  const abrirModalDetalle = async (venta) => {
    try {
      const detallesRes = await axios.get(`${API_URL}/detalle-venta/por-venta/?venta=${venta.id_venta}`);
      setVentaActual({ ...venta, detalles: detallesRes.data });
      setShowModalDetalle(true);
    } catch (error) {
      console.error('Error al cargar detalles:', error);
      alert('Error al cargar los detalles de la venta');
    }
  };

  const abrirModalEditar = async (venta) => {
    // Verificar si puede editarse (24 horas)
    const fechaVenta = new Date(venta.fecha_venta);
    const ahora = new Date();
    const diferencia = ahora - fechaVenta;
    const horas = diferencia / (1000 * 60 * 60);

    if (horas > 24) {
      alert('Solo puedes editar ventas de las últimas 24 horas');
      return;
    }

    try {
      const detallesRes = await axios.get(`${API_URL}/detalle-venta/por-venta/?venta=${venta.id_venta}`);
      
      const carritoInicial = detallesRes.data.map(detalle => ({
        producto: detalle.producto_info || productos.find(p => p.id_producto === detalle.id_producto),
        cantidad: detalle.cantidad,
        precio_unitario: parseFloat(detalle.precio_unitario),
        subtotal: parseFloat(detalle.subtotal)
      }));

      setVentaActual({ ...venta, detalles: detallesRes.data });
      setCarrito(carritoInicial);
      setFormaPago(venta.forma_pago || 'EFECTIVO');
      setObservaciones(venta.observaciones || '');
      setModoEdicion(true);
      setShowModalEditar(true);
    } catch (error) {
      console.error('Error al cargar venta:', error);
      alert('Error al cargar la venta');
    }
  };

  const abrirModalCancelar = (venta) => {
    // Verificar si puede cancelarse (mismo día)
    const fechaVenta = new Date(venta.fecha_venta);
    const hoy = new Date();
    fechaVenta.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    if (fechaVenta.getTime() !== hoy.getTime()) {
      alert('Solo puedes cancelar ventas del mismo día');
      return;
    }

    setVentaActual(venta);
    setShowModalCancelar(true);
  };

  const handleCancelarVenta = async () => {
    try {
      // Obtener detalles
      const detallesRes = await axios.get(`${API_URL}/detalle-venta/por-venta/?venta=${ventaActual.id_venta}`);

      // Devolver stock
      const usuario = JSON.parse(localStorage.getItem('user'));
      
      for (const detalle of detallesRes.data) {
        const productoId = detalle.producto_info?.id_producto || detalle.id_producto;
        
        // Obtener inventario
        const inventarioRes = await axios.get(`${API_URL}/inventarios/?producto=${productoId}`);
        if (inventarioRes.data.length === 0) continue;

        const inventario = inventarioRes.data[0];
        const nuevoStock = inventario.stock_actual + detalle.cantidad;

        // Actualizar inventario
        await axios.put(`${API_URL}/inventarios/${inventario.id_inventario}/`, {
          id_producto: productoId,
          stock_actual: nuevoStock,
          stock_minimo: inventario.stock_minimo,
          stock_maximo: inventario.stock_maximo,
          punto_reorden: inventario.punto_reorden,
          stock_seguridad: inventario.stock_seguridad,
          demanda_promedio_diaria: inventario.demanda_promedio_diaria,
          tiempo_entrega_dias: inventario.tiempo_entrega_dias
        });

        // Registrar en historial
        await axios.post(`${API_URL}/historial-inventario/`, {
          id_producto: productoId,
          id_usuario: usuario.id,
          stock_anterior: inventario.stock_actual,
          stock_nuevo: nuevoStock,
          tipo_movimiento: 'DEVOLUCION_CLIENTE',
          observaciones: `Cancelación de Venta #${ventaActual.id_venta}`
        });
      }

      // Eliminar detalles
      await axios.delete(`${API_URL}/detalle-venta/por-venta/?venta=${ventaActual.id_venta}`);

      // Eliminar venta
      await axios.delete(`${API_URL}/ventas/${ventaActual.id_venta}/`);

      await cargarDatos();
      cerrarModales();
      alert('Venta cancelada correctamente');
    } catch (error) {
      console.error('Error al cancelar venta:', error);
      alert('Error al cancelar la venta');
    }
  };

  const cerrarModales = () => {
    setShowModalNueva(false);
    setShowModalDetalle(false);
    setShowModalEditar(false);
    setShowModalCancelar(false);
    setVentaActual(null);
    setCarrito([]);
    setFormaPago('EFECTIVO');
    setObservaciones('');
    setModoEdicion(false);
  };

  // EXPORTAR
  const exportarExcel = () => {
    const headers = ['Fecha', 'N° Venta', 'Productos', 'Forma Pago', 'Total', 'Vendedor'];
    
    const rows = ventasFiltradas.map(venta => {
      const numProductos = venta.detalles?.length || 0;
      const vendedor = venta.usuario_info ? 
        `${venta.usuario_info.nombres} ${venta.usuario_info.apellido_paterno}` : 
        'N/A';
      
      return [
        new Date(venta.fecha_venta).toLocaleString('es-BO'),
        `#${venta.id_venta}`,
        `${numProductos} items`,
        FORMAS_PAGO.find(f => f.value === venta.forma_pago)?.label || venta.forma_pago,
        `Bs. ${parseFloat(venta.total).toFixed(2)}`,
        vendedor
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
    link.setAttribute('download', `ventas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const imprimirTicket = (venta) => {
    const ventana = window.open('', '_blank');
    const productos = venta.detalles?.map(d => `
      <tr>
        <td>${d.producto_info?.nombre || 'Producto'}</td>
        <td>${d.cantidad}</td>
        <td>Bs. ${parseFloat(d.precio_unitario).toFixed(2)}</td>
        <td>Bs. ${parseFloat(d.subtotal).toFixed(2)}</td>
      </tr>
    `).join('') || '';

    ventana.document.write(`
      <html>
        <head>
          <title>Ticket Venta #${venta.id_venta}</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h2>MANA MUSIC</h2>
          <p><strong>Venta #${venta.id_venta}</strong></p>
          <p>Fecha: ${new Date(venta.fecha_venta).toLocaleString('es-BO')}</p>
          <p>Forma de Pago: ${FORMAS_PAGO.find(f => f.value === venta.forma_pago)?.label || venta.forma_pago}</p>
          <hr>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${productos}
            </tbody>
          </table>
          <div class="total">TOTAL: Bs. ${parseFloat(venta.total).toFixed(2)}</div>
          ${venta.observaciones ? `<p><strong>Observaciones:</strong> ${venta.observaciones}</p>` : ''}
          <p style="text-align: center; margin-top: 40px;">¡Gracias por su compra!</p>
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.print();
  };

  const limpiarFiltros = () => {
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroUsuario('');
    setFiltroProducto('');
    setPaginaActual(1);
  };

  if (loading) {
    return (
      <div className="ventas-loading">
        <div className="spinner"></div>
        <p>Cargando ventas...</p>
      </div>
    );
  }

  // Continúa en el siguiente mensaje debido al límite...
  return (
    <div className="ventas-container">
      {/* HEADER */}
      <div className="ventas-header">
        <h1>💰 Ventas</h1>
        <div className="header-acciones">
          <button className="btn-exportar" onClick={exportarExcel}>
            <span>📥</span> Exportar
          </button>
          <button className="btn-nueva" onClick={abrirModalNueva}>
            <span>➕</span> Nueva Venta
          </button>
        </div>
      </div>

      {/* RESUMEN */}
      <div className="resumen-grid">
        <div className="resumen-card hoy">
          <div className="resumen-icon">💰</div>
          <div className="resumen-content">
            <div className="resumen-numero">Bs. {resumen.total_hoy.toLocaleString('es-BO', {minimumFractionDigits: 2})}</div>
            <div className="resumen-label">Total Hoy</div>
          </div>
        </div>

        <div className="resumen-card cantidad">
          <div className="resumen-icon">📊</div>
          <div className="resumen-content">
            <div className="resumen-numero">{resumen.cantidad_hoy}</div>
            <div className="resumen-label">Ventas Hoy</div>
          </div>
        </div>

        <div className="resumen-card promedio">
          <div className="resumen-icon">📈</div>
          <div className="resumen-content">
            <div className="resumen-numero">Bs. {resumen.promedio_hoy.toLocaleString('es-BO', {minimumFractionDigits: 2})}</div>
            <div className="resumen-label">Promedio</div>
          </div>
        </div>

        <div className="resumen-card mes">
          <div className="resumen-icon">📅</div>
          <div className="resumen-content">
            <div className="resumen-numero">Bs. {resumen.total_mes.toLocaleString('es-BO', {minimumFractionDigits: 2})}</div>
            <div className="resumen-label">Total Mes</div>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="ventas-filtros">
        <input
          type="date"
          value={filtroFechaDesde}
          onChange={(e) => { setFiltroFechaDesde(e.target.value); setPaginaActual(1); }}
          className="filtro-date"
        />

        <input
          type="date"
          value={filtroFechaHasta}
          onChange={(e) => { setFiltroFechaHasta(e.target.value); setPaginaActual(1); }}
          className="filtro-date"
        />

        <select
          value={filtroUsuario}
          onChange={(e) => { setFiltroUsuario(e.target.value); setPaginaActual(1); }}
          className="filtro-select"
        >
          <option value="">Todos los vendedores</option>
          {usuarios.map(user => (
            <option key={user.id_usuario} value={user.id_usuario}>
              {user.email}
            </option>
          ))}
        </select>

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

        {(filtroFechaDesde || filtroFechaHasta || filtroUsuario || filtroProducto) && (
          <button className="btn-limpiar" onClick={limpiarFiltros}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* INFO */}
      <div className="ventas-info">
        <p>Mostrando {ventasActuales.length} de {ventasFiltradas.length} ventas</p>
      </div>

      {/* TABLA - Continúa... */}
      {error && <div className="error-message">{error}</div>}
      
      {ventasFiltradas.length === 0 ? (
        <div className="no-resultados">
          <p>No se encontraron ventas</p>
          {(filtroFechaDesde || filtroFechaHasta || filtroUsuario || filtroProducto) && (
            <button className="btn-limpiar" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="tabla-container">
            <table className="ventas-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>N° Venta</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventasActuales.map(venta => {
                  const fechaVenta = new Date(venta.fecha_venta);
                  const ahora = new Date();
                  const hoy = new Date();
                  hoy.setHours(0, 0, 0, 0);
                  const fechaVentaSinHora = new Date(fechaVenta);
                  fechaVentaSinHora.setHours(0, 0, 0, 0);
                  
                  const puedeEditar = (ahora - fechaVenta) / (1000 * 60 * 60) <= 24;
                  const puedeCancelar = fechaVentaSinHora.getTime() === hoy.getTime();
                  
                  return (
                    <tr key={venta.id_venta}>
                      <td className="fecha-cell">
                        {fechaVenta.toLocaleString('es-BO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="numero-cell">#{venta.id_venta}</td>
                      <td>{venta.detalles?.length || 0} items</td>
                      <td className="total-cell">
                        Bs. {parseFloat(venta.total).toLocaleString('es-BO', {minimumFractionDigits: 2})}
                      </td>
                      <td className="acciones-cell">
                        <button
                          className="btn-accion btn-ver"
                          onClick={() => abrirModalDetalle(venta)}
                          title="Ver detalle"
                        >
                          👁️
                        </button>
                        {puedeEditar && (
                          <button
                            className="btn-accion btn-editar"
                            onClick={() => abrirModalEditar(venta)}
                            title="Editar"
                          >
                            ✏️
                          </button>
                        )}
                        {puedeCancelar && (
                          <button
                            className="btn-accion btn-cancelar"
                            onClick={() => abrirModalCancelar(venta)}
                            title="Cancelar"
                          >
                            ❌
                          </button>
                        )}
                        <button
                          className="btn-accion btn-imprimir"
                          onClick={() => imprimirTicket(venta)}
                          title="Imprimir"
                        >
                          🖨️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}
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
        </>
      )}

{/* MODAL NUEVA VENTA / EDITAR */}
{(showModalNueva || showModalEditar) && (
  <div className="modal-overlay" onClick={cerrarModales}>
    <div className="modal-content modal-venta" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>{modoEdicion ? '✏️ Editar Venta' : '➕ Nueva Venta'}</h2>
        <button className="btn-cerrar" onClick={cerrarModales}>✕</button>
      </div>

      <div className="modal-body">
        {/* Buscador de productos */}
        <div className="buscar-producto">
          <label>Buscar y agregar productos:</label>
          <div className="buscar-grupo">
            <select
              value={productoSeleccionado}
              onChange={(e) => setProductoSeleccionado(e.target.value)}
              className="select-producto"
            >
              <option value="">🔍 Seleccionar producto...</option>
              {productos.map(prod => (
                <option key={prod.id_producto} value={prod.id_producto}>
                  {prod.nombre} - Bs. {parseFloat(prod.precio_unitario).toFixed(2)}
                </option>
              ))}
            </select>
            <button onClick={agregarAlCarrito} className="btn-agregar">
              ➕ Agregar
            </button>
          </div>
        </div>

        {/* Carrito */}
        <div className="carrito">
          <h3>Carrito: ({carrito.length} productos)</h3>
          
          {carrito.length === 0 ? (
            <div className="carrito-vacio">
              <p>🛒 No hay productos en el carrito</p>
              <p className="text-muted">Selecciona productos para agregar</p>
            </div>
          ) : (
            <div className="carrito-items">
              {carrito.map((item, index) => (
                <div key={index} className="carrito-item">
                  <div className="item-info">
                    <strong>{item.producto.nombre}</strong>
                    <span className="item-precio">
                      Precio: Bs. {item.precio_unitario.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="item-cantidad">
                    <button
                      onClick={() => cambiarCantidad(index, item.cantidad - 1)}
                      className="btn-cant"
                      disabled={item.cantidad <= 1}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => cambiarCantidad(index, e.target.value)}
                      min="1"
                      className="input-cant"
                    />
                    <button
                      onClick={() => cambiarCantidad(index, item.cantidad + 1)}
                      className="btn-cant"
                    >
                      +
                    </button>
                  </div>

                  <div className="item-subtotal">
                    Bs. {item.subtotal.toFixed(2)}
                  </div>

                  <button
                    onClick={() => eliminarDelCarrito(index)}
                    className="btn-eliminar-item"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        {carrito.length > 0 && (
          <div className="venta-total">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>Bs. {calcularTotal().toFixed(2)}</span>
            </div>
            <div className="total-row total-final">
              <span>TOTAL:</span>
              <strong>Bs. {calcularTotal().toLocaleString('es-BO', {minimumFractionDigits: 2})}</strong>
            </div>
          </div>
        )}

        {/* Forma de pago */}
        <div className="form-group">
          <label>Forma de Pago *</label>
          <select
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value)}
            className="form-select"
          >
            {FORMAS_PAGO.map(forma => (
              <option key={forma.value} value={forma.value}>
                {forma.label}
              </option>
            ))}
          </select>
        </div>

        {/* Observaciones */}
        <div className="form-group">
          <label>Observaciones (opcional)</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas adicionales sobre la venta..."
            rows="3"
            className="form-textarea"
          />
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn-cancelar" onClick={cerrarModales}>
          Cancelar
        </button>
        <button 
          className="btn-guardar" 
          onClick={handleGuardarVenta}
          disabled={carrito.length === 0}
        >
          {modoEdicion ? 'Actualizar Venta' : 'Registrar Venta'}
        </button>
      </div>
    </div>
  </div>
)}

{/* MODAL VER DETALLE */}
{showModalDetalle && ventaActual && (
  <div className="modal-overlay" onClick={cerrarModales}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>👁️ Detalle de Venta #{ventaActual.id_venta}</h2>
        <button className="btn-cerrar" onClick={cerrarModales}>✕</button>
      </div>

      <div className="modal-body">
        <div className="detalle-info">
          <div className="info-row">
            <span className="info-label">Fecha:</span>
            <span>{new Date(ventaActual.fecha_venta).toLocaleString('es-BO')}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Forma de Pago:</span>
            <span>{FORMAS_PAGO.find(f => f.value === ventaActual.forma_pago)?.label || ventaActual.forma_pago}</span>
          </div>
          {ventaActual.usuario_info && (
            <div className="info-row">
              <span className="info-label">Vendedor:</span>
              <span>
                {ventaActual.usuario_info.nombres} {ventaActual.usuario_info.apellido_paterno}
              </span>
            </div>
          )}
        </div>

        <h4>Productos:</h4>
        <div className="productos-detalle">
          {ventaActual.detalles?.map((detalle, index) => (
            <div key={index} className="producto-detalle-item">
              <div className="producto-nombre">
                {detalle.producto_info?.nombre || 'Producto'}
              </div>
              <div className="producto-calculo">
                <span>{detalle.cantidad} × Bs. {parseFloat(detalle.precio_unitario).toFixed(2)}</span>
                <span className="producto-subtotal">
                  = Bs. {parseFloat(detalle.subtotal).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="detalle-total">
          <div className="total-row">
            <span>Subtotal:</span>
            <span>Bs. {parseFloat(ventaActual.total).toFixed(2)}</span>
          </div>
          <div className="total-row total-final">
            <span>TOTAL:</span>
            <strong>Bs. {parseFloat(ventaActual.total).toLocaleString('es-BO', {minimumFractionDigits: 2})}</strong>
          </div>
        </div>

        {ventaActual.observaciones && (
          <div className="observaciones-box">
            <strong>Observaciones:</strong>
            <p>{ventaActual.observaciones}</p>
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button className="btn-cancelar" onClick={cerrarModales}>
          Cerrar
        </button>
        <button className="btn-imprimir" onClick={() => imprimirTicket(ventaActual)}>
          🖨️ Imprimir Ticket
        </button>
      </div>
    </div>
  </div>
)}

{/* MODAL CANCELAR VENTA */}
{showModalCancelar && ventaActual && (
  <div className="modal-overlay" onClick={cerrarModales}>
    <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>⚠️ Cancelar Venta</h2>
      </div>
      
      <div className="modal-body">
        <p>¿Estás seguro de que deseas cancelar la venta #{ventaActual.id_venta}?</p>
        <p className="warning-text">
          Esta acción:
        </p>
        <ul className="warning-list">
          <li>✓ Devolverá el stock al inventario</li>
          <li>✓ Creará un registro en el historial</li>
          <li>✓ Eliminará permanentemente la venta</li>
        </ul>
        <p className="warning-text">
          <strong>Esta acción no se puede deshacer.</strong>
        </p>
      </div>
      
      <div className="modal-footer">
        <button className="btn-cancelar" onClick={cerrarModales}>
          No, mantener venta
        </button>
        <button className="btn-eliminar-confirmar" onClick={handleCancelarVenta}>
          Sí, cancelar venta
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

export default Ventas;