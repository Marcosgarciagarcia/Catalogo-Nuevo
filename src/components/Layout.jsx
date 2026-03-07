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
            <Link to="/" className="layout-nav__item" onClick={closeMenu}>
              Inicio
            </Link>
            {catalogTypes.map((t) => (
              <Link
                key={t.id}
                to={`/${t.slug}`}
                className={`layout-nav__item ${location.pathname === `/${t.slug}` ? 'layout-nav__item--active' : ''}`}
                onClick={closeMenu}
              >
                {t.nombre}
              </Link>
            ))}
            {user && (isStaff || isAdmin) && (
              <Link
                to="/libros?openAlta=1"
                className="layout-nav__item"
                onClick={closeMenu}
              >
                Alta de libro
              </Link>
            )}
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
