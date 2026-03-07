import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCollectionTypes } from '../services/tursoService';
import './CatalogTypeSelector.css';

export default function CatalogTypeSelector() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getCollectionTypes()
      .then((data) => {
        if (!cancelled) setTypes(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Error al cargar opciones');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="catalog-type-selector">
        <h1 className="catalog-type-selector__title">Elige una colección</h1>
        <p className="catalog-type-selector__loading">Cargando opciones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="catalog-type-selector">
        <h1 className="catalog-type-selector__title">Elige una colección</h1>
        <div className="catalog-type-selector__error">{error}</div>
      </div>
    );
  }

  return (
    <div className="catalog-type-selector">
      <h1 className="catalog-type-selector__title">Elige una colección</h1>
      <p className="catalog-type-selector__intro">
        Selecciona el tipo de catálogo que quieres ver. Después podrás iniciar sesión si necesitas dar de alta nuevos ejemplares.
      </p>
      <div className="catalog-type-selector__grid">
        {types.map((t) => (
          <Link
            key={t.id}
            to={`/${t.slug}`}
            className="catalog-type-card"
          >
            <span className="catalog-type-card__name">{t.nombre}</span>
            {t.descripcion && (
              <span className="catalog-type-card__desc">{t.descripcion}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
