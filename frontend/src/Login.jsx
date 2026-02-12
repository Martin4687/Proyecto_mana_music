import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

const API_URL = 'http://localhost:8000/api';

function Login({ onLoginSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Limpiar error cuando el usuario empieza a escribir
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/auth/login/`, {
        email: formData.email,
        password: formData.password
      });

      if (response.data.success) {
        // Guardar tokens en localStorage
        localStorage.setItem('accessToken', response.data.data.access);
        localStorage.setItem('refreshToken', response.data.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));

        // Configurar el header de autorización para futuras peticiones
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.access}`;

        // Notificar al componente padre
        onLoginSuccess(response.data.data.user);
      }
    } catch (error) {
      console.error('Error en login:', error);
      
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.response?.status === 401) {
        setError('Email o contraseña incorrectos');
      } else if (error.response?.status === 403) {
        setError('Usuario inactivo. Contacte al administrador.');
      } else {
        setError('Error al conectar con el servidor. Intente nuevamente.');
      }
      
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        {/* Logo o título */}
        <div className="login-header">
          <div className="login-icon">🎵</div>
          <h1>Mana Music</h1>
          <p>Sistema de Gestión de Inventario</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="login-form">
          
          {/* Mensaje de error */}
          {error && (
            <div className="login-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Campo Email */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@manamusic.com"
              required
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>

          {/* Campo Contraseña */}
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {/* Botón de submit */}
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <p>¿Olvidaste tu contraseña? Contacta al administrador</p>
        </div>
      </div>

      {/* Información de prueba (solo para desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="dev-info">
          <p><strong>Datos de prueba:</strong></p>
          <p>Email: admin@manamusic.com</p>
          <p>Contraseña: Admin123!</p>
        </div>
      )}
    </div>
  );
}

export default Login;