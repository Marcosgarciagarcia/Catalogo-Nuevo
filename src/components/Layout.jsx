import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCollectionTypes } from '../services/tursoService';
import Login from './Login';
import './Layout.css';

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [catalogTypes, setCatalogTypes] = useState([]);
  const location = useLocation();
  const { user, logout, isAdmin, isStaff } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    getCollectionTypes().then(setCatalogTypes).catch(() => setCatalogTypes([]));
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/" className="layout-header__home" onClick={closeMenu}>
          Catálogo
        </Link>
        <button
          type="button"
          className="layout-header__hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
        >
          <span className="layout-header__hamburger-bar" />
          <span className="layout-header__hamburger-bar" />
          <span className="layout-header__hamburger-bar" />
        </button>
      </header>

      {menuOpen && (
        <>
          <div
            className="layout-backdrop"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <nav className="layout-nav" aria-label="Menú principal">
            <div className="layout-nav__section">
              <span className="layout-nav__section-title">Navegación</span>
              <Link to="/" className={`layout-nav__item ${location.pathname === '/' ? 'layout-nav__item--active' : ''}`} onClick={closeMenu}>
                Inicio
              </Link>
              <Link
                to="/libros"
                className={`layout-nav__item ${location.pathname === '/libros' ? 'layout-nav__item--active' : ''}`}
                onClick={closeMenu}
              >
                Libros
              </Link>
              {catalogTypes.filter((t) => t.slug !== 'libros').map((t) => (
                <Link
                  key={t.id}
                  to={`/${t.slug}`}
                  className={`layout-nav__item ${location.pathname === `/${t.slug}` ? 'layout-nav__item--active' : ''}`}
                  onClick={closeMenu}
                >
                  {t.nombre}
                </Link>
              ))}
            </div>
            {user && (isStaff || isAdmin) && (
              <div className="layout-nav__section">
                <span className="layout-nav__section-title">Acciones</span>
                <Link
                  to="/libros?openAlta=1"
                  className="layout-nav__item"
                  onClick={closeMenu}
                >
                  Alta de libro
                </Link>
                <Link
                  to="/discoteca?openAlta=1"
                  className="layout-nav__item"
                  onClick={closeMenu}
                >
                  Alta de disco
                </Link>
              </div>
            )}
            <div className="layout-nav__section layout-nav__section--last">
              <span className="layout-nav__section-title">Sesión</span>
              {user ? (
                <button
                  type="button"
                  className="layout-nav__item layout-nav__item--button"
                  onClick={() => { closeMenu(); logout(); }}
                >
                  Cerrar sesión
                  {user.username && (
                    <span className="layout-nav__user"> ({user.username})</span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className="layout-nav__item layout-nav__item--button"
                  onClick={() => { closeMenu(); setShowLogin(true); }}
                >
                  Iniciar sesión
                </button>
              )}
            </div>
          </nav>
        </>
      )}

      <main className="layout-main">
        {children}
      </main>

      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}
