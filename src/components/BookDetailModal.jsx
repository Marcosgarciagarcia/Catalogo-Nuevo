import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import './BookDetailModal.css';

function DetailRow({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{String(value)}</span>
    </div>
  );
}

function Block({ title, children, twoCols }) {
  return (
    <div className={`modal-block ${twoCols ? 'modal-block--two-cols' : ''}`}>
      {title && <h3 className="modal-section-title">{title}</h3>}
      <div className="modal-details">{children}</div>
    </div>
  );
}

function BookDetailModal({ libro, onClose, canEdit, onEdit }) {
  if (!libro) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
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

            <Block title="Identificación" twoCols>
              <DetailRow label="Título original" value={libro.tituloOriginal} />
              <DetailRow label="ISBN / EAN" value={libro.EAN} />
              {libro.hastag && (
                <div className="detail-row">
                  <span className="detail-label">Hastags</span>
                  <span className="detail-value detail-value--hastags">
                    {(libro.hastag || '').trim().split(/\s+/).filter(Boolean).map((token) => (
                      <Link
                        key={token}
                        to={`/libros?hastag=${encodeURIComponent(token.replace(/^#+/, ''))}`}
                        className="detail-hastag-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {token}
                      </Link>
                    ))}
                  </span>
                </div>
              )}
            </Block>

            <Block title="Autoría y edición" twoCols>
              <DetailRow label="Autor" value={libro.nombreAutor || '—'} />
              <DetailRow label="Editorial" value={libro.editorial} />
              <DetailRow label="Año de edición" value={libro.anyoEdicion} />
              <DetailRow label="N.º edición" value={libro.numeroEdicion} />
              <DetailRow label="N.º páginas" value={libro.numeroPaginas} />
              <DetailRow label="N.º ejemplares" value={libro.numeroEjemplares} />
            </Block>

            <Block title="Colección" twoCols>
              <DetailRow label="Colección" value={libro.coleccion} />
              <DetailRow label="Serie" value={libro.serie} />
            </Block>

            {libro.sinopsis && (
              <Block title="Sinopsis">
                <div className="synopsis-content">{libro.sinopsis}</div>
              </Block>
            )}

            {libro.observaciones && (
              <Block title="Observaciones">
                <div className="synopsis-content">{libro.observaciones}</div>
              </Block>
            )}

            <Block title="Ubicación" twoCols>
              <DetailRow label="Ubicación" value={libro.ubicacionDesc} />
              <DetailRow label="Estante" value={libro.estanteDesc} />
            </Block>

            <Block title="Otros datos" twoCols>
              <DetailRow label="Contraportada" value={libro.contraportada} />
              {libro.autorWiki && (
                <div className="detail-row">
                  <span className="detail-label">Enlaces autor</span>
                  <span className="detail-value">
                    {[libro.autorWiki, libro.autorWiki2].filter(Boolean).join(' · ')}
                  </span>
                </div>
              )}
            </Block>

            <div className="modal-actions">
              {canEdit && onEdit ? (
                <button type="button" className="modal-btn-edit" onClick={() => onEdit(libro)}>
                  Editar libro
                </button>
              ) : (
                <p className="modal-actions-hint">Inicia sesión como staff para poder editar este libro.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

BookDetailModal.propTypes = {
  libro: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    EAN: PropTypes.string,
    titulo: PropTypes.string.isRequired,
    tituloOriginal: PropTypes.string,
    nombreAutor: PropTypes.string,
    editorial: PropTypes.string,
    anyoEdicion: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    numeroEdicion: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    numeroPaginas: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    numeroEjemplares: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    sinopsis: PropTypes.string,
    observaciones: PropTypes.string,
    coleccion: PropTypes.string,
    serie: PropTypes.string,
    hastag: PropTypes.string,
    contraportada: PropTypes.string,
    codiEstante_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    codiUbicacion_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    ubicacionDesc: PropTypes.string,
    estanteDesc: PropTypes.string,
    autorWiki: PropTypes.string,
    autorWiki2: PropTypes.string,
    portada_cloudinary: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
  onEdit: PropTypes.func,
};

export default BookDetailModal;
