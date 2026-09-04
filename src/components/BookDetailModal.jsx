import { Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { resolveDeezerTrackLink } from '../services/tursoService';
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

function formatDuracionMinutos(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n} min`;
}

function Block({ title, children, twoCols }) {
  return (
    <div className={`modal-block ${twoCols ? 'modal-block--two-cols' : ''}`}>
      {title && <h3 className="modal-section-title">{title}</h3>}
      <div className="modal-details">{children}</div>
    </div>
  );
}

function BookDetailModal({ libro, onClose, canEdit, onEdit, onDelete, isDiscoteca = false, isVideoteca = false, detailLoading = false }) {
  const location = useLocation();
  if (!libro) return null;

  const hastagBasePath = location.pathname && location.pathname !== '/' ? location.pathname : '/';
  const autorRowLabel = isDiscoteca ? 'Artista' : isVideoteca ? 'Director' : 'Autor';
  const editorialLabel = isVideoteca ? 'Estudio / cadena' : 'Editorial';
  const numPaginasLabel = isDiscoteca
    ? 'N.º de discos (álbum)'
    : isVideoteca
      ? 'Duración (min)'
      : 'N.º páginas';
  const temasBlockTitle = isVideoteca ? 'Capítulos' : 'Temas (pistas)';
  const duracionTitulo = formatDuracionMinutos(libro.numeroPaginas);
  const temas = Array.isArray(libro.temas) ? libro.temas : null;
  const showVolumen = Boolean(
    temas && temas.some((t) => Number(t.numeroVolumen) > 1),
  );

  const openDeezerTema = (tituloTema) => {
    if (!tituloTema?.trim()) return;
    const artist = (libro.nombreAutor || '').trim();
    const album = (libro.titulo || '').trim();
    const q = [artist, album, tituloTema].filter(Boolean).join(' ').trim().slice(0, 120);
    if (!q) return;
    window.open(`https://www.deezer.com/search/${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
  };

  const handlePlayTema = async (t) => {
    const enlace = (t.enlace || '').trim();
    if (enlace && (enlace.startsWith('http://') || enlace.startsWith('https://'))) {
      window.open(enlace, '_blank', 'noopener,noreferrer');
      return;
    }
    const tituloTema = (t.titulo || '').trim();
    if (!tituloTema) return;
    const artist = (libro.nombreAutor || '').trim();
    const album = (libro.titulo || '').trim();
    const link = await resolveDeezerTrackLink(artist, album, tituloTema);
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      openDeezerTema(tituloTema);
    }
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
              {(libro.nombreAutor || '').trim() ? (
                <p className="modal-artist-subtitle" title={autorRowLabel}>
                  {libro.autorWiki || libro.autorWiki2 ? (
                    <a
                      href={libro.autorWiki || libro.autorWiki2}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {libro.nombreAutor}
                    </a>
                  ) : (
                    libro.nombreAutor
                  )}
                </p>
              ) : null}

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
                          to={`${hastagBasePath}?hastag=${encodeURIComponent(token.replace(/^#+/, ''))}`}
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
                <DetailRow label={autorRowLabel} value={libro.nombreAutor || '—'} />
                {(libro.autorWiki || libro.autorWiki2) && (
                  <div className="detail-row">
                    <span className="detail-label">
                      {isDiscoteca ? 'Enlaces artista' : isVideoteca ? 'Enlaces director' : 'Enlaces autor'}
                    </span>
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
                <DetailRow label={editorialLabel} value={libro.editorial} />
                <DetailRow label="Año de edición" value={libro.anyoEdicion} />
                <DetailRow label="N.º edición" value={libro.numeroEdicion} />
                <DetailRow
                  label={numPaginasLabel}
                  value={isVideoteca ? duracionTitulo : libro.numeroPaginas}
                />
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

              {(isVideoteca || (temas && temas.length > 0)) && (
                <Block title={temasBlockTitle}>
                  {isDiscoteca && temas && temas.length > 0 && (
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
                  )}
                  {detailLoading || temas === null ? (
                    <p className="modal-temas-hint">
                      {isVideoteca ? 'Cargando capítulos…' : 'Cargando pistas…'}
                    </p>
                  ) : temas.length === 0 ? (
                    <p className="modal-temas-hint">
                      {isVideoteca
                        ? 'No hay capítulos registrados. Puedes añadirlos al editar la ficha.'
                        : 'Sin pistas registradas.'}
                    </p>
                  ) : (
                  <ul className="modal-temas-list">
                    {temas.map((t, i) => (
                      <li key={i} className="modal-tema-row">
                        <span className="modal-tema-num">{t.numero}</span>
                        {(isVideoteca || showVolumen) && (
                          <span className="modal-tema-duracion" title="Volumen">
                            Vol. {t.numeroVolumen != null ? t.numeroVolumen : 1}
                          </span>
                        )}
                        <span className="modal-tema-titulo">
                          {t.enlace?.trim() ? (
                            <a href={t.enlace.trim()} target="_blank" rel="noopener noreferrer" title="Abrir enlace">{t.titulo || '—'}</a>
                          ) : (
                            (t.titulo || '—')
                          )}
                        </span>
                        {t.duracion && <span className="modal-tema-duracion">{t.duracion}</span>}
                        {isDiscoteca && (
                        <button
                          type="button"
                          className="modal-tema-play"
                          onClick={() => handlePlayTema(t)}
                          disabled={!t.titulo?.trim() && !t.enlace?.trim()}
                          title={t.enlace?.trim() ? 'Abrir enlace' : 'Abrir tema en Deezer'}
                        >
                          ▶
                        </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  )}
                  {isDiscoteca && temas && temas.length > 0 && (
                  <>
                  <p className="modal-temas-deezer-aviso">
                    Sin estar registrado en Deezer solo se puede escuchar una preview del tema. Para el tema completo, inicia sesión en Deezer en este navegador o guarda un enlace a YouTube/Spotify en el campo URL al editar.
                  </p>
                  <p className="modal-temas-hint">
                    Si has añadido un enlace por pista, el título es clicable y ▶ abre ese enlace. Si no, ▶ busca en Deezer.
                  </p>
                  </>
                  )}
                  {isVideoteca && temas && temas.length > 0 && (
                    <p className="modal-temas-hint">
                      Cada fila es un capítulo. «Vol.» indica el DVD/volumen físico de la caja.
                    </p>
                  )}
                </Block>
              )}

              <div className="modal-actions">
                {canEdit && (onEdit || onDelete) ? (
                  <>
                    {onEdit && (
                      <button
                        type="button"
                        className="modal-btn-edit"
                        onClick={() => onEdit(libro)}
                      >
                        Editar ficha
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
      enlace: PropTypes.string,
      numeroVolumen: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })),
  }),
  onClose: PropTypes.func.isRequired,
  canEdit: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  isDiscoteca: PropTypes.bool,
  isVideoteca: PropTypes.bool,
  detailLoading: PropTypes.bool,
};

export default BookDetailModal;
