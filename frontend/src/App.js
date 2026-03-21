import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './Login';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import './App.css';
import Productos from './Productos';
import Inventario from './Inventario';
import HistorialInventario from './HistorialInventario';
import Ventas from './Ventas';
const API_URL = 'http://localhost:8000/api';

// Componentes placeholder para cada módulo
const Compras = () => <div className="page-content"><h1>🛒 Compras</h1><p>Módulo en construcción...</p></div>;
const OrdenesReabastecimiento = () => <div className="page-content"><h1>🔄 Órdenes de Reabastecimiento</h1><p>Módulo en construcción...</p></div>;
const Proveedores = () => <div className="page-content"><h1>🏢 Proveedores</h1><p>Módulo en construcción...</p></div>;
const Reportes = () => <div className="page-content"><h1>📊 Reportes</h1><p>Módulo en construcción...</p></div>;
const ClasificacionABC = () => <div className="page-content"><h1>📈 Clasificación ABC</h1><p>Próximamente...</p></div>;
const Usuarios = () => <div className="page-content"><h1>👥 Usuarios</h1><p>Módulo en construcción...</p></div>;
const Configuracion = () => <div className="page-content"><h1>⚙️ Configuración</h1><p>Módulo en construcción...</p></div>;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get(`${API_URL}/auth/verify/`);

        if (response.data.success) {
          setUser(JSON.parse(savedUser));
          setIsAuthenticated(true);
        } else {
          handleLogout();
        }
      } catch (error) {
        console.error('Token inválido:', error);
        handleLogout();
      }
    }

    setLoading(false);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout/`);
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <div className="app-layout">
        <Sidebar user={user} onLogout={handleLogout} />
        
        <main className="main-content">
          <Routes>
            {/* Ruta por defecto */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Dashboard */}
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            
            {/* Productos */}
            <Route path="/productos" element={<Productos />} />
            
            {/* Inventario */}
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/inventario/historial" element={<HistorialInventario />} />
            
            {/* Ventas */}
            <Route path="/ventas" element={<Ventas />} />
            
            {/* Compras */}
            <Route path="/compras" element={<Compras />} />
            <Route path="/compras/reabastecimiento" element={<OrdenesReabastecimiento />} />
            
            {/* Proveedores */}
            <Route path="/proveedores" element={<Proveedores />} />
            
            {/* Reportes */}
            <Route path="/reportes" element={<Reportes />} />
            
            {/* Clasificación ABC */}
            <Route path="/clasificacion-abc" element={<ClasificacionABC />} />
            
            {/* Usuarios */}
            <Route path="/usuarios" element={<Usuarios />} />
            
            {/* Configuración */}
            <Route path="/configuracion" element={<Configuracion />} />
            
            {/* Ruta 404 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;