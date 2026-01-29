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

function BookList({ libros = [] }) {
  return (
    <div className="card-container">
      {libros.map((libro) => (
        <div key={libro.EAN || libro.id} className='card'>
          <div className='text-container'>
            <div className='author-container'>
              <p className='author'>{libro.nombreAutor || 'Autor desconocido'}</p>
            </div>
            <div className='title-container'>
              <p className='title'>{libro.titulo}</p>
            </div>
          </div>
          <div className='image-container'>
            <BookImage
              src={libro.portada_cloudinary}
              alt={libro.titulo}
            />
          </div>
          <div className='isbn'>{libro.EAN}</div>
        </div>
      ))}
    </div>
  );
}

BookList.propTypes = {
  libros: PropTypes.arrayOf(
    PropTypes.shape({
      EAN: PropTypes.string.isRequired,
      nombreAutor: PropTypes.string.isRequired,
      titulo: PropTypes.string.isRequired,
      portada: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          url: PropTypes.string.isRequired
        })
      ]).isRequired
    })
  )
};

BookList.defaultProps = {
  libros: []
};

export default BookList;