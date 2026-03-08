import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  getAuthors,
  getPublishers,
  getBookById,
  updateBook,
} from '../services/tursoService';
import { uploadToCloudinary, isCloudinaryConfigured } from '../services/cloudinaryService';
import './AltaLibro.css';

function EditarLibro({ libro, onClose, onSuccess, getToken }) {
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loadingCombos, setLoadingCombos] = useState(true);
  const [loadingBook, setLoadingBook] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [eanDisplay, setEanDisplay] = useState('');
  const [titulo, setTitulo] = useState('');
  const [tituloOriginal, setTituloOriginal] = useState('');
  const [codiAutor_id, setCodiAutor_id] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [addNewAuthor, setAddNewAuthor] = useState(false);
  const [codiEditorial_id, setCodiEditorial_id] = useState('');
  const [publisherName, setPublisherName] = useState('');
  const [addNewPublisher, setAddNewPublisher] = useState(false);
  const [anyoEdicion, setAnyoEdicion] = useState('');
  const [numeroPaginas, setNumeroPaginas] = useState('');
  const [sinopsis, setSinopsis] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [hastag, setHastag] = useState('');
  const [portada_cloudinary, setPortada_cloudinary] = useState('');
  const [portadaPreviewUrl, setPortadaPreviewUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);

  const loadCombos = useCallback(async () => {
    try {
      setLoadingCombos(true);
      const [a, p] = await Promise.all([getAuthors(), getPublishers()]);
      setAuthors(a);
      setPublishers(p);
    } catch (err) {
      setError(err?.message ?? 'Error al cargar autores y editoriales');
    } finally {
      setLoadingCombos(false);
    }
  }, []);

  useEffect(() => {
    loadCombos();
  }, [loadCombos]);

  useEffect(() => {
    if (!libro?.id) return;
    let cancelled = false;
    setLoadingBook(true);
    setError('');
    getBookById(libro.id)
      .then((full) => {
        if (cancelled) return;
        setEanDisplay(full.EAN || '');
        setTitulo(full.titulo || '');
        setTituloOriginal(full.tituloOriginal || '');
        setAnyoEdicion(full.anyoEdicion != null ? String(full.anyoEdicion) : '');
        setNumeroPaginas(full.numeroPaginas != null ? String(full.numeroPaginas) : '');
        setSinopsis(full.sinopsis || '');
        setObservaciones(full.observaciones || '');
        setHastag(full.hastag || '');
        setPortada_cloudinary(full.portada_cloudinary || '');
        if (full.codiAutor_id != null) {
          setCodiAutor_id(String(full.codiAutor_id));
          setAuthorName('');
          setAddNewAuthor(false);
        } else {
          setCodiAutor_id('');
          setAuthorName(full.nombreAutor || '');
          setAddNewAuthor(true);
        }
        if (full.codiEditorial_id != null) {
          setCodiEditorial_id(String(full.codiEditorial_id));
          setPublisherName('');
          setAddNewPublisher(false);
        } else {
          setCodiEditorial_id('');
          setPublisherName(full.editorial || '');
          setAddNewPublisher(true);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Error al cargar el libro');
      })
      .finally(() => {
        if (!cancelled) setLoadingBook(false);
      });
    return () => { cancelled = true; };
  }, [libro?.id]);

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen (JPG, PNG, etc.).');
      return;
    }
    if (!isCloudinaryConfigured()) {
      setError('Cloudinary no está configurado.');
      return;
    }
    setError('');
    setUploadingCover(true);
    try {
      const url = await uploadToCloudinary(file);
      setPortada_cloudinary(url);
    } catch (err) {
      setError(err?.message ?? 'Error al subir la imagen');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    const ean = String(eanDisplay).replace(/\D/g, '').trim();
    if (!ean) {
      setError('EAN es obligatorio.');
      return;
    }
    const token = getToken?.();
    if (!token) {
      setError('Sesión expirada. Vuelve a iniciar sesión.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        EAN: ean,
        titulo: titulo.trim() || null,
        tituloOriginal: tituloOriginal.trim() || null,
        anyoEdicion: anyoEdicion === '' ? null : Number(anyoEdicion),
        numeroPaginas: numeroPaginas === '' ? null : Number(numeroPaginas),
        sinopsis: sinopsis.trim() || null,
        observaciones: observaciones.trim() || null,
        hastag: hastag.trim() || null,
        portada_cloudinary: portada_cloudinary.trim() || null,
      };
      if (addNewAuthor && authorName.trim()) {
        body.authorName = authorName.trim();
        body.addNewAuthor = true;
      } else if (codiAutor_id) {
        body.codiAutor_id = Number(codiAutor_id);
      }
      if (addNewPublisher && publisherName.trim()) {
        body.publisherName = publisherName.trim();
        body.addNewPublisher = true;
      } else if (codiEditorial_id) {
        body.codiEditorial_id = Number(codiEditorial_id);
      }
      await updateBook(libro.id, body, token);
      setSuccessMsg('Libro actualizado correctamente.');
      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err?.message ?? 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!libro) return null;

  const loading = loadingCombos || loadingBook;

  return (
    <div className="alta-libro-backdrop" onClick={handleBackdropClick}>
      <div className="alta-libro-modal">
        <button type="button" className="alta-libro-close" onClick={onClose}>
          ✕
        </button>
        <h2>Editar libro</h2>

        {loading ? (
          <p className="alta-libro-loading">Cargando…</p>
        ) : (
          <form onSubmit={handleSubmit} className="alta-libro-form">
            <div className="alta-libro-field">
              <label htmlFor="editar-ean">ISBN/EAN</label>
              <input
                id="editar-ean"
                type="text"
                value={eanDisplay}
                onChange={(e) => setEanDisplay(e.target.value)}
                placeholder="9788484831234"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            <div className="alta-libro-field">
              <label htmlFor="editar-titulo">Título</label>
              <input
                id="editar-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>
            <div className="alta-libro-field">
              <label htmlFor="editar-titulo-original">Título original</label>
              <input
                id="editar-titulo-original"
                value={tituloOriginal}
                onChange={(e) => setTituloOriginal(e.target.value)}
              />
            </div>

            <div className="alta-libro-field">
              <label>Autor</label>
              <div className="alta-libro-combo-row">
                <label className="alta-libro-check">
                  <input
                    type="checkbox"
                    checked={addNewAuthor}
                    onChange={(e) => {
                      setAddNewAuthor(e.target.checked);
                      if (e.target.checked) setCodiAutor_id('');
                    }}
                  />
                  Añadir como nuevo
                </label>
                {addNewAuthor ? (
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Nombre del autor"
                  />
                ) : (
                  <select
                    value={codiAutor_id}
                    onChange={(e) => setCodiAutor_id(e.target.value)}
                    disabled={loadingCombos}
                  >
                    <option value="">— Seleccionar autor —</option>
                    {authors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombreAutor}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="alta-libro-field">
              <label>Editorial</label>
              <div className="alta-libro-combo-row">
                <label className="alta-libro-check">
                  <input
                    type="checkbox"
                    checked={addNewPublisher}
                    onChange={(e) => {
                      setAddNewPublisher(e.target.checked);
                      if (e.target.checked) setCodiEditorial_id('');
                    }}
                  />
                  Añadir como nueva
                </label>
                {addNewPublisher ? (
                  <input
                    type="text"
                    value={publisherName}
                    onChange={(e) => setPublisherName(e.target.value)}
                    placeholder="Nombre de la editorial"
                  />
                ) : (
                  <select
                    value={codiEditorial_id}
                    onChange={(e) => setCodiEditorial_id(e.target.value)}
                    disabled={loadingCombos}
                  >
                    <option value="">— Seleccionar editorial —</option>
                    {publishers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.descriEditorial}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="alta-libro-row-2">
              <div className="alta-libro-field">
                <label htmlFor="editar-anyo">Año edición</label>
                <input
                  id="editar-anyo"
                  type="number"
                  min="1900"
                  max="2100"
                  value={anyoEdicion}
                  onChange={(e) => setAnyoEdicion(e.target.value)}
                />
              </div>
              <div className="alta-libro-field">
                <label htmlFor="editar-paginas">Nº páginas</label>
                <input
                  id="editar-paginas"
                  type="number"
                  min="0"
                  value={numeroPaginas}
                  onChange={(e) => setNumeroPaginas(e.target.value)}
                />
              </div>
            </div>

            <div className="alta-libro-field">
              <label htmlFor="editar-sinopsis">Sinopsis</label>
              <textarea
                id="editar-sinopsis"
                value={sinopsis}
                onChange={(e) => setSinopsis(e.target.value)}
                rows={3}
              />
            </div>
            <div className="alta-libro-field">
              <label htmlFor="editar-observaciones">Observaciones</label>
              <textarea
                id="editar-observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
              />
            </div>
            <div className="alta-libro-field">
              <label htmlFor="editar-hastag">Hastags</label>
              <input
                id="editar-hastag"
                type="text"
                value={hastag}
                onChange={(e) => setHastag(e.target.value)}
                placeholder="palabra1 palabra2 (se añadirá # si no empieza por #)"
              />
            </div>

            <div className="alta-libro-field">
              <label htmlFor="editar-portada">Portada (Cloudinary)</label>
              <div className="alta-libro-portada-upload">
                <label className="alta-libro-file-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFile}
                    disabled={uploadingCover}
                    className="alta-libro-file-input"
                  />
                  {uploadingCover ? 'Subiendo…' : 'Elegir imagen'}
                </label>
              </div>
              <input
                id="editar-portada"
                type="url"
                value={portada_cloudinary}
                onChange={(e) => setPortada_cloudinary(e.target.value)}
                placeholder="URL de la portada"
                className="alta-libro-portada-url"
              />
              {portada_cloudinary && (
                <div className="alta-libro-portada-preview">
                  <img
                    src={portada_cloudinary}
                    alt="Vista previa portada"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>

            {error && <div className="alta-libro-error">{error}</div>}
            {successMsg && <div className="alta-libro-success">{successMsg}</div>}

            <div className="alta-libro-actions">
              <button type="button" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

EditarLibro.propTypes = {
  libro: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    EAN: PropTypes.string,
    titulo: PropTypes.string,
    nombreAutor: PropTypes.string,
    editorial: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  getToken: PropTypes.func,
};

export default EditarLibro;
