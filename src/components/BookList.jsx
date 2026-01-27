import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

function BookImage({ src, alt }) {
  const [imageSrc, setImageSrc] = useState('/placeholder.jpg');

  useEffect(() => {
    // Manejar ambas estructuras de portada
    const cloudinaryBaseUrl = 'https://res.cloudinary.com/casateca/image/upload/v1/libros/';

    // Determinar la URL de la imagen
    const normalizedSrc = typeof src === 'object'
      ? src.url  // Si es objeto con estructura nueva
      : src.startsWith('http')
        ? src    // Si ya es URL completa
        : src.startsWith('/')
          ? src  // Si ya es ruta absoluta
          : `${cloudinaryBaseUrl}${src}`;  // Si es nombre de archivo

    // Log EXHAUSTIVO de rutas
    console.log('Ruta original:', src);
    console.log('Ruta de imagen:', normalizedSrc);

    const img = new Image();
    img.src = normalizedSrc;

    img.onload = () => {
      console.log('Imagen cargada con éxito:', normalizedSrc);
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
  useEffect(() => {
    console.log('Libros recibidos:', libros);

    const imageRoutes = libros.map(libro => ({
      EAN: libro.EAN,
      portada: libro.portada,
      cloudinaryUrl: typeof libro.portada === 'object'
        ? libro.portada.url
        : `https://res.cloudinary.com/casateca/image/upload/v1/libros/${libro.portada}`
    }));

    console.log('Rutas de imágenes en Cloudinary:', imageRoutes);
  }, [libros]);

  return (
    <div className="card-container">
      {libros.map((libro) => (
        <div key={libro.EAN} className='card'>
          <div className='text-container'>
            <div className='author-container'>
              <p className='author'>{libro.nombreAutor}</p>
            </div>
            <div className='title-container'>
              <p className='title'>{libro.titulo}</p>
            </div>
          </div>
          <div className='image-container'>
            <BookImage
              src={libro.portada}
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