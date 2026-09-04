import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCollectionTypes } from '../services/tursoService';
import Login from './Login';
import './Layout.css';

function slugLooksLike(slug, nombre, keys) {
  const s = (slug || '').toLowerCase();
  const n = (nombre || '').toLowerCase();
  return keys.some((k) => s.includes(k) || n.includes(k));
}

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

  const pathActive = (path) => {
    const current = decodeURIComponent(location.pathname || '/');
    return current === path || current === decodeURIComponent(path);
  };

  const tipoLibros = catalogTypes.find((t) => slugLooksLike(t.slug, t.nombre, ['libro', 'biblio'])) 
    || { slug: 'libros', nombre: 'Libros' };
  const tipoDisco = catalogTypes.find((t) => slugLooksLike(t.slug, t.nombre, ['disco', 'música', 'musica', 'audio']))
    || { slug: 'discoteca', nombre: 'Discoteca' };
  const tipoVideo = catalogTypes.find((t) => slugLooksLike(t.slug, t.nombre, ['video', 'cine', 'videoteca']))
    || { slug: 'cine', nombre: 'Videoteca' };

  const navTipos = catalogTypes.filter((t) => t.slug !== tipoLibros.slug);

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
              <Link
                to="/"
                className={`layout-nav__item ${pathActive('/') ? 'layout-nav__item--active' : ''}`}
                onClick={closeMenu}
              >
                Inicio
              </Link>
              <Link
                to={`/${tipoLibros.slug}`}
                className={`layout-nav__item ${pathActive(`/${tipoLibros.slug}`) ? 'layout-nav__item--active' : ''}`}
                onClick={closeMenu}
              >
                {tipoLibros.nombre || 'Libros'}
              </Link>
              {navTipos.map((t) => (
                <Link
                  key={t.id}
                  to={`/${t.slug}`}
                  className={`layout-nav__item ${pathActive(`/${t.slug}`) ? 'layout-nav__item--active' : ''}`}
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
                  to={`/${tipoLibros.slug}?openAlta=1`}
                  className="layout-nav__item"
                  onClick={closeMenu}
                >
                  Alta de libro
                </Link>
                <Link
                  to={`/${tipoDisco.slug}?openAlta=1`}
                  className="layout-nav__item"
                  onClick={closeMenu}
                >
                  Alta de disco
                </Link>
                <Link
                  to={`/${tipoVideo.slug}?openAlta=1`}
                  className="layout-nav__item"
                  onClick={closeMenu}
                >
                  Alta de vídeo
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
