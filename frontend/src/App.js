import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:8000/api';

function App() {
  const [productos, setProductos] = useState([]);
  const [inventarios, setInventarios] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // Cargar productos
      const respProductos = await axios.get(`${API_URL}/productos/`);
      setProductos(respProductos.data.slice(0, 5)); // Solo 5 para prueba

      // Cargar inventarios
      const respInventarios = await axios.get(`${API_URL}/inventarios/resumen/`);
      setInventarios(respInventarios.data);

      // Cargar estadísticas de ventas
      const respEstadisticas = await axios.get(`${API_URL}/ventas/estadisticas/`);
      setEstadisticas(respEstadisticas.data);

      setLoading(false);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="App"><h2>Cargando datos...</h2></div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎵 Mana Music - Sistema de Inventario</h1>
      </header>

      <div className="dashboard">
        {/* Estadísticas */}
        {estadisticas && (
          <div className="card">
            <h2>📊 Estadísticas de Ventas</h2>
            <p>Total de ventas: <strong>${estadisticas.total_ventas}</strong></p>
            <p>Promedio por venta: <strong>${estadisticas.promedio_venta}</strong></p>
            <p>Total de transacciones: <strong>{estadisticas.total_transacciones}</strong></p>
          </div>
        )}

        {/* Resumen de Inventario */}
        {inventarios && (
          <div className="card">
            <h2>📦 Resumen de Inventario</h2>
            <p>Total de productos: <strong>{inventarios.total_productos}</strong></p>
            <p>Stock normal: <strong>{inventarios.normal}</strong></p>
            <p>Stock bajo: <strong className="warning">{inventarios.bajo}</strong></p>
            <p>Stock crítico: <strong className="danger">{inventarios.critico}</strong></p>
          </div>
        )}

        {/* Lista de Productos */}
        <div className="card wide">
          <h2>🎸 Productos</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(producto => (
                <tr key={producto.id_producto}>
                  <td>{producto.id_producto}</td>
                  <td>{producto.nombre}</td>
                  <td>{producto.categoria}</td>
                  <td>${producto.precio_unitario}</td>
                  <td>
                    <span className={producto.activo ? 'badge-active' : 'badge-inactive'}>
                      {producto.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;