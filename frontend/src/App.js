import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './Login';
import Dashboard from './Dashboard';
import './App.css';

const API_URL = 'http://localhost:8000/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un token guardado al cargar la aplicación
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        // Configurar el header de autorización
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Verificar que el token siga siendo válido
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
      // Llamar al endpoint de logout (opcional)
      await axios.post(`${API_URL}/auth/logout/`);
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Limpiar localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      // Limpiar header de autorización
      delete axios.defaults.headers.common['Authorization'];

      // Actualizar estado
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Mostrar pantalla de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {isAuthenticated ? (
        <div className="app-authenticated">
          {/* Header con información del usuario */}
          <header className="app-header">
            <div className="app-header-content">
              <div className="user-welcome">
                <span className="user-greeting">Bienvenido,</span>
                <span className="user-name">{user?.nombre_completo}</span>
                <span className="user-role">({user?.rol})</span>
              </div>
              <button onClick={handleLogout} className="logout-button">
                Cerrar Sesión
              </button>
            </div>
          </header>

          {/* Contenido principal - Dashboard */}
          <main className="app-main">
            <Dashboard user={user} />
          </main>
        </div>
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;