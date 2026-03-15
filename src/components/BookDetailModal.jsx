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

function BookDetailModal({ libro, onClose, canEdit, onEdit, onDelete }) {
  if (!libro) return null;

  const openDeezerTema = (tituloTema) => {
    if (!tituloTema?.trim()) return;
    const artist = (libro.nombreAutor || '').trim();
    const q = [artist, tituloTema].filter(Boolean).join(' ').trim().slice(0, 100);
    if (!q) return;
    window.open(`https://www.deezer.com/search/${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
  };

  const openDeezerAlbum = () => {
    const artist = (libro.nombreAutor || '').trim();
    const album = (libro.titulo || '').trim();
    const q = [artist, album].filter(Boolean).join(' ').trim().slice(0, 120);
    if (!q) return;
    window.open(`https://www.deezer.com/search/${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="modal-scroll">
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

            <Block title="Colección y soporte" twoCols>
              <DetailRow label="Colección" value={libro.coleccion} />
              <DetailRow label="Serie" value={libro.serie} />
              <DetailRow label="Soporte" value={libro.soporteDesc} />
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

            {Array.isArray(libro.temas) && libro.temas.length > 0 && (
              <Block title="Temas (pistas)">
                <div className="modal-temas-actions">
                  <button
                    type="button"
                    className="modal-tema-play-album"
                    onClick={openDeezerAlbum}
                    title="Abrir disco en Deezer (escuchar completo)"
                  >
                    ▶ Escuchar disco completo (Deezer)
                  </button>
                </div>
                <ul className="modal-temas-list">
                  {libro.temas.map((t, i) => (
                    <li key={i} className="modal-tema-row">
                      <span className="modal-tema-num">{t.numero}</span>
                      <span className="modal-tema-titulo">{t.titulo || '—'}</span>
                      {t.duracion && <span className="modal-tema-duracion">{t.duracion}</span>}
                      <button
                        type="button"
                        className="modal-tema-play"
                        onClick={() => openDeezerTema((t.titulo || '').trim())}
                        disabled={!t.titulo?.trim()}
                        title="Abrir tema en Deezer"
                      >
                        ▶
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="modal-temas-hint">Los botones abren Deezer en una nueva pestaña para escuchar el tema o el disco completo.</p>
              </Block>
            )}

            <Block title="Otros datos" twoCols>
              <DetailRow label="Contraportada" value={libro.contraportada} />
              {(libro.autorWiki || libro.autorWiki2) && (
                <div className="detail-row">
                  <span className="detail-label">Enlaces autor</span>
                  <span className="detail-value">
                    {[libro.autorWiki, libro.autorWiki2]
                      .filter(Boolean)
                      .map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ marginRight: '0.5rem' }}
                        >
                          {url}
                        </a>
                      ))}
                  </span>
                </div>
              )}
            </Block>

            <div className="modal-actions">
              {canEdit && (onEdit || onDelete) ? (
                <>
                  {onEdit && (
                    <button
                      type="button"
                      className="modal-btn-edit"
                      onClick={() => onEdit(libro)}
                    >
                      Editar libro
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="modal-btn-delete"
                      onClick={() => onDelete(libro)}
                    >
                      Eliminar libro
                    </button>
                  )}
                </>
              ) : (
                <p className="modal-actions-hint">Inicia sesión como staff para poder editar este libro.</p>
              )}
            </div>
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
    soporteDesc: PropTypes.string,
    autorWiki: PropTypes.string,
    autorWiki2: PropTypes.string,
    portada_cloudinary: PropTypes.string,
    temas: PropTypes.arrayOf(PropTypes.shape({
      numero: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      titulo: PropTypes.string,
      duracion: PropTypes.string,
    })),
  }),
  onClose: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};

export default BookDetailModal;
