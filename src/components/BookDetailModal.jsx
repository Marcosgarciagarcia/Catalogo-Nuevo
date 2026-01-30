import PropTypes from 'prop-types';
import './BookDetailModal.css';

function BookDetailModal({ libro, onClose }) {
  if (!libro) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        
        <div className="modal-body">
          <div className="modal-image-section">
            <img 
              src={libro.portada_cloudinary || '/placeholder.jpg'} 
              alt={libro.titulo}
              className="modal-image"
            />
          </div>
          
          <div className="modal-info-section">
            <h2 className="modal-title">{libro.titulo}</h2>
            
            <div className="modal-details">
              {libro.tituloOriginal && (
                <div className="detail-row">
                  <span className="detail-label">Título Original:</span>
                  <span className="detail-value">{libro.tituloOriginal}</span>
                </div>
              )}
              
              <div className="detail-row">
                <span className="detail-label">Autor:</span>
                <span className="detail-value">{libro.nombreAutor || 'Desconocido'}</span>
              </div>
              
              {libro.descriEditorial && (
                <div className="detail-row">
                  <span className="detail-label">Editorial:</span>
                  <span className="detail-value">{libro.descriEditorial}</span>
                </div>
              )}
              
              {libro.anyoEdicion && (
                <div className="detail-row">
                  <span className="detail-label">Año de Edición:</span>
                  <span className="detail-value">{libro.anyoEdicion}</span>
                </div>
              )}
              
              {libro.EAN && (
                <div className="detail-row">
                  <span className="detail-label">ISBN:</span>
                  <span className="detail-value">{libro.EAN}</span>
                </div>
              )}
            </div>
            
            {libro.sinopsis && (
              <div className="modal-synopsis">
                <h3>Sinopsis</h3>
                <div className="synopsis-content">
                  {libro.sinopsis}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

BookDetailModal.propTypes = {
  libro: PropTypes.shape({
    EAN: PropTypes.string,
    titulo: PropTypes.string.isRequired,
    tituloOriginal: PropTypes.string,
    nombreAutor: PropTypes.string,
    descriEditorial: PropTypes.string,
    anyoEdicion: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    sinopsis: PropTypes.string,
    portada_cloudinary: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired
};

export default BookDetailModal;
