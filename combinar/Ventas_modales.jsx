/* ================================================================
   MODALES PARA VENTAS.JSX
   ================================================================
   
   Este código va ANTES del cierre del return() y ANTES del </div> final
   del componente Ventas.
   
   Agrégalo en Ventas.jsx después de la paginación y antes de:
   </div>  ← cierre de ventas-container
*/

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