import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

const API_URL = 'http://localhost:8000/api';

function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarDatos();
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarDatos, 30000);
    return () => clearInterval(interval);
  }, []);

  const cargarDatos = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/stats/`);
      setData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
      setError('Error al cargar los datos. Por favor, recarga la página.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={cargarDatos}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Alertas - PRIORIDAD 1 */}
      <section className="dashboard-section alertas-section">
        <div className="alertas-container">
          <div className="alerta-card critico">
            <span className="alerta-icon">🔴</span>
            <div className="alerta-content">
              <div className="alerta-number">{data.alertas.stock_critico.count}</div>
              <div className="alerta-label">Stock Crítico</div>
            </div>
          </div>
          
          <div className="alerta-card sin-movimiento">
            <span className="alerta-icon">🟡</span>
            <div className="alerta-content">
              <div className="alerta-number">{data.alertas.sin_movimiento.count}</div>
              <div className="alerta-label">Sin Movimiento (60d)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Principal */}
      <div className="dashboard-grid">
        
        {/* Resumen Financiero - PRIORIDAD 2 */}
        <section className="dashboard-card financiero-card">
          <h2 className="card-title">💰 Resumen Financiero</h2>
          <div className="financiero-content">
            <div className="financiero-item">
              <span className="financiero-label">Ventas Hoy</span>
              <span className="financiero-value">${data.resumen_financiero.ventas_hoy.toLocaleString('es-BO', {minimumFractionDigits: 2})}</span>
            </div>
            
            <div className="financiero-item highlight">
              <span className="financiero-label">Ventas del Mes</span>
              <span className="financiero-value large">${data.resumen_financiero.ventas_mes.toLocaleString('es-BO', {minimumFractionDigits: 2})}</span>
            </div>
            
            <div className="financiero-item">
              <span className="financiero-label">Compras del Mes</span>
              <span className="financiero-value">${data.resumen_financiero.compras_mes.toLocaleString('es-BO', {minimumFractionDigits: 2})}</span>
            </div>
            
            <div className="financiero-divider"></div>
            
            <div className="financiero-item">
              <span className="financiero-label">Ganancia Neta</span>
              <span className={`financiero-value ${data.resumen_financiero.ganancia_neta >= 0 ? 'positive' : 'negative'}`}>
                ${data.resumen_financiero.ganancia_neta.toLocaleString('es-BO', {minimumFractionDigits: 2})}
              </span>
            </div>
            
            <div className="financiero-item">
              <span className="financiero-label">Margen</span>
              <span className="financiero-value">
                {data.resumen_financiero.margen_porcentaje.toFixed(1)}%
              </span>
            </div>
          </div>
        </section>

        {/* Clasificación ABC - PRIORIDAD 3 (DATOS DE EJEMPLO) */}
        <section className="dashboard-card abc-card">
          <h2 className="card-title">📊 Clasificación ABC</h2>
          <div className="abc-subtitle">Diciembre 2024 (Ejemplo)</div>
          <div className="abc-content">
            <div className="abc-item categoria-a">
              <div className="abc-header">
                <span className="abc-label">Categoría A</span>
                <span className="abc-badge">Alta rotación</span>
              </div>
              <div className="abc-stats">
                <span className="abc-count">12 productos</span>
                <span className="abc-percentage">75% de ventas</span>
              </div>
            </div>
            
            <div className="abc-item categoria-b">
              <div className="abc-header">
                <span className="abc-label">Categoría B</span>
                <span className="abc-badge">Media rotación</span>
              </div>
              <div className="abc-stats">
                <span className="abc-count">28 productos</span>
                <span className="abc-percentage">20% de ventas</span>
              </div>
            </div>
            
            <div className="abc-item categoria-c">
              <div className="abc-header">
                <span className="abc-label">Categoría C</span>
                <span className="abc-badge">Baja rotación</span>
              </div>
              <div className="abc-stats">
                <span className="abc-count">45 productos</span>
                <span className="abc-percentage">5% de ventas</span>
              </div>
            </div>
            
            <button className="abc-link">Ver análisis completo →</button>
          </div>
        </section>

        {/* Gráfico de Ventas - PRIORIDAD 4 */}
        <section className="dashboard-card grafico-card full-width">
          <h2 className="card-title">📈 Ventas Últimos 7 Días</h2>
          <div className="grafico-container">
            <div className="grafico-bars">
              {data.ventas_7_dias.map((dia, index) => {
                const maxVenta = Math.max(...data.ventas_7_dias.map(d => d.total));
                const altura = maxVenta > 0 ? (dia.total / maxVenta) * 100 : 0;
                
                return (
                  <div key={index} className="grafico-bar-container">
                    <div 
                      className="grafico-bar" 
                      style={{height: `${altura}%`}}
                      title={`$${dia.total.toLocaleString('es-BO')}`}
                    >
                      <span className="grafico-value">${dia.total.toLocaleString('es-BO', {maximumFractionDigits: 0})}</span>
                    </div>
                    <div className="grafico-label">
                      <div className="grafico-dia">{dia.dia}</div>
                      <div className="grafico-fecha">{dia.fecha.slice(5)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Actividad Reciente - PRIORIDAD 5 */}
        <section className="dashboard-card actividad-card">
          <h2 className="card-title">🕐 Actividad Reciente</h2>
          <div className="actividad-content">
            {data.actividad_reciente.length > 0 ? (
              data.actividad_reciente.map((venta, index) => (
                <div key={index} className="actividad-item">
                  <div className="actividad-icon">🛍️</div>
                  <div className="actividad-info">
                    <div className="actividad-producto">{venta.producto}</div>
                    <div className="actividad-tiempo">{venta.tiempo}</div>
                  </div>
                  <div className="actividad-monto">${venta.total.toLocaleString('es-BO', {minimumFractionDigits: 2})}</div>
                </div>
              ))
            ) : (
              <div className="actividad-empty">No hay actividad reciente</div>
            )}
          </div>
        </section>

        {/* Estado del Inventario - PRIORIDAD 6 */}
        <section className="dashboard-card inventario-card">
          <h2 className="card-title">📦 Estado del Inventario</h2>
          <div className="inventario-content">
            <div className="inventario-total">
              <span className="inventario-total-label">Total de Productos</span>
              <span className="inventario-total-value">{data.estado_inventario.total_productos}</span>
            </div>
            
            <div className="inventario-estados">
              <div className="inventario-estado normal">
                <span className="estado-indicator">🟢</span>
                <span className="estado-label">Normal</span>
                <span className="estado-count">{data.estado_inventario.normal}</span>
              </div>
              
              <div className="inventario-estado bajo">
                <span className="estado-indicator">🟡</span>
                <span className="estado-label">Bajo</span>
                <span className="estado-count">{data.estado_inventario.bajo}</span>
              </div>
              
              <div className="inventario-estado critico">
                <span className="estado-indicator">🔴</span>
                <span className="estado-label">Crítico</span>
                <span className="estado-count">{data.estado_inventario.critico}</span>
              </div>
              
              {data.estado_inventario.sobrestock > 0 && (
                <div className="inventario-estado sobrestock">
                  <span className="estado-indicator">🔵</span>
                  <span className="estado-label">Sobrestock</span>
                  <span className="estado-count">{data.estado_inventario.sobrestock}</span>
                </div>
              )}
            </div>
            
            <div className="inventario-valor">
              <span className="inventario-valor-label">Valor Total del Inventario</span>
              <span className="inventario-valor-monto">${data.estado_inventario.valor_total.toLocaleString('es-BO', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default Dashboard;