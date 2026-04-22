import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

function Sidebar({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState({});
  const location = useLocation();

  // Definición de menús según prioridad
  const menuItems = [
    {
      id: 1,
      name: 'Dashboard',
      icon: '🏠',
      path: '/dashboard',
      priority: 1
    },
    {
      id: 2,
      name: 'Productos',
      icon: '🎸',
      path: '/productos',
      priority: 2
    },
    {
      id: 3,
      name: 'Inventario',
      icon: '📦',
      path: '/inventario',
      priority: 3,
      submenus: [
        { name: 'Vista General', path: '/inventario', icon: '📊' },
        { name: 'Historial', path: '/inventario/historial', icon: '📋' }
      ]
    },
    {
      id: 4,
      name: 'Ventas',
      icon: '💰',
      path: '/ventas',
      priority: 4
    },
    {
      id: 5,
      name: 'Compras',
      icon: '🛒',
      path: '/compras',
      priority: 5,
      submenus: [
        { name: 'Vista General', path: '/compras', icon: '📊' },
        { name: 'Órdenes de Reabastecimiento', path: '/compras/reabastecimiento', icon: '🔄' }
      ]
    },
    {
      id: 6,
      name: 'Proveedores',
      icon: '🏢',
      path: '/proveedores',
      priority: 6
    },
    {
      id: 7,
      name: 'Reportes',
      icon: '📊',
      path: '/reportes',
      priority: 7
    },
    {
      id: 8,
      name: 'Clasificación ABC',
      icon: '📈',
      path: '/clasificacion-abc',
      priority: 9,
      badge: 'Próximamente'
    },
    {
      id: 9,
      name: 'Usuarios',
      icon: '👥',
      path: '/usuarios',
      priority: 8
    },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleSubmenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === path || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const isSubmenuActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Toggle button para móvil */}
      <button 
        className={`sidebar-toggle ${isOpen ? 'open' : ''}`}
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Overlay para cerrar sidebar en móvil */}
      {isOpen && (
        <div 
          className="sidebar-overlay"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        {/* Header del sidebar */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🎵</span>
            {isOpen && <span className="logo-text">Mana Music</span>}
          </div>
        </div>

        {/* Usuario info */}
        {isOpen && (
          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.nombres?.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.nombres}</div>
              <div className="user-role">{user?.rol}</div>
            </div>
          </div>
        )}

        {/* Navegación */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {menuItems.map((item) => (
              <li key={item.id} className="nav-item">
                {item.submenus ? (
                  // Item con submenú
                  <>
                    <div
                      className={`nav-link has-submenu ${isActive(item.path) ? 'active' : ''}`}
                      onClick={() => toggleSubmenu(item.id)}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {isOpen && (
                        <>
                          <span className="nav-text">{item.name}</span>
                          <span className={`submenu-arrow ${expandedMenus[item.id] ? 'expanded' : ''}`}>
                            ▼
                          </span>
                        </>
                      )}
                    </div>
                    
                    {isOpen && expandedMenus[item.id] && (
                      <ul className="submenu">
                        {item.submenus.map((submenu, index) => (
                          <li key={index}>
                            <Link
                              to={submenu.path}
                              className={`submenu-link ${isSubmenuActive(submenu.path) ? 'active' : ''}`}
                            >
                              <span className="submenu-icon">{submenu.icon}</span>
                              <span className="submenu-text">{submenu.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  // Item normal
                  <Link
                    to={item.path}
                    className={`nav-link ${isActive(item.path) ? 'active' : ''} ${item.badge ? 'disabled' : ''}`}
                    onClick={item.badge ? (e) => e.preventDefault() : undefined}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {isOpen && (
                      <>
                        <span className="nav-text">{item.name}</span>
                        {item.badge && (
                          <span className="nav-badge">{item.badge}</span>
                        )}
                      </>
                    )}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer del sidebar */}
        {isOpen && (
          <div className="sidebar-footer">
            <button onClick={onLogout} className="logout-btn">
              <span className="logout-icon">🚪</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;