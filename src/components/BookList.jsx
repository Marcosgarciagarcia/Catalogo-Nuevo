import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

function BookImage({ src, alt }) {
  const [imageSrc, setImageSrc] = useState('/placeholder.jpg');

  useEffect(() => {
    // Si no hay src o es null, usar placeholder
    if (!src) {
      setImageSrc('/placeholder.jpg');
      return;
    }

    // El campo portada_cloudinary ya viene con la URL completa de Cloudinary
    const normalizedSrc = src;

    const img = new Image();
    img.src = normalizedSrc;

    img.onload = () => {
      setImageSrc(normalizedSrc);
    };

    img.onerror = () => {
      console.error('Error al cargar la imagen:', normalizedSrc);
      setImageSrc('/placeholder.jpg');
    };
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      loading="lazy"
      style={{
        opacity: imageSrc === '/placeholder.jpg' ? 0.5 : 1,
        transition: 'opacity 0.3s ease-in-out',
        width: '100%',
        height: '100%',
        objectFit: 'contain'
      }}
      onError={(e) => {
        console.error('Imagen no cargada en el renderizado:', src);
        e.target.src = '/placeholder.jpg';
      }}
    />
  );
}

BookImage.propTypes = {
  src: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      url: PropTypes.string.isRequired
    })
  ]).isRequired,
  alt: PropTypes.string.isRequired
};

function BookList({ libros = [], onBookClick, discotecaMode = false, onAuthorClick }) {
  const authorLabel = discotecaMode ? 'Artista' : 'Autor';
  const unknownAuthor = discotecaMode ? 'Artista desconocido' : 'Autor desconocido';

  return (
    <div className="card-container">
      {libros.map((libro) => {
        const nombre = (libro.nombreAutor || '').trim();
        const canFilterAuthor = Boolean(onAuthorClick && nombre && nombre !== unknownAuthor);

        const authorBlock = (
          <div className="author-container">
            {canFilterAuthor ? (
              <button
                type="button"
                className="author author--clickable"
                onClick={(e) => {
                  e.stopPropagation();
                  onAuthorClick(nombre);
                }}
                title={`Buscar por ${authorLabel.toLowerCase()}: ${nombre}`}
              >
                {nombre}
              </button>
            ) : (
              <p className="author">{nombre || unknownAuthor}</p>
            )}
          </div>
        );

        const titleBlock = (
          <div className="title-container">
            <p className="title">{libro.titulo}</p>
          </div>
        );

        return (
        <div key={libro.EAN || libro.id} className='card'>
          <div className='text-container'>
            {discotecaMode ? (
              <>
                {titleBlock}
                {authorBlock}
              </>
            ) : (
              <>
                {authorBlock}
                {titleBlock}
              </>
            )}
          </div>
          <div 
            className='image-container'
            onClick={() => onBookClick && onBookClick(libro)}
            style={{ cursor: 'pointer' }}
            title="Click para ver detalles"
          >
            <BookImage
              src={libro.portada_cloudinary}
              alt={libro.titulo}
            />
          </div>
          <div className='isbn'>{libro.EAN}</div>
        </div>
        );
      })}
    </div>
  );
}

BookList.propTypes = {
  libros: PropTypes.arrayOf(
    PropTypes.shape({
      EAN: PropTypes.string.isRequired,
      nombreAutor: PropTypes.string.isRequired,
      titulo: PropTypes.string.isRequired,
      portada_cloudinary: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          url: PropTypes.string.isRequired
        })
      ])
    })
  ),
  onBookClick: PropTypes.func,
  onAuthorClick: PropTypes.func,
  discotecaMode: PropTypes.bool,
};

BookList.defaultProps = {
  libros: []
};

export default BookList;