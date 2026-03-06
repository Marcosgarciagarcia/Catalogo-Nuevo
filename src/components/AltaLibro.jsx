import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  getAuthors,
  getPublishers,
  createBook,
  fetchOpenLibraryByIsbn,
} from '../services/tursoService';
import { uploadToCloudinary, isCloudinaryConfigured } from '../services/cloudinaryService';
import './AltaLibro.css';

function AltaLibro({ onClose, onSuccess, getToken }) {
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loadingCombos, setLoadingCombos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isbnSearching, setIsbnSearching] = useState(false);
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

  const handleBuscarIsbn = async () => {
    const isbn = String(eanDisplay).replace(/\D/g, '').trim();
    if (!isbn) {
      setError('Introduce el EAN/ISBN para buscar.');
      return;
    }
    setError('');
    setIsbnSearching(true);
    try {
      const data = await fetchOpenLibraryByIsbn(isbn);
      if (!data) {
        setError('No se encontraron datos para este ISBN en Open Library.');
        return;
      }
      if (data.titulo) setTitulo(data.titulo);
      if (data.tituloOriginal) setTituloOriginal(data.tituloOriginal);
      if (data.autor) {
        setAuthorName(data.autor);
        setAddNewAuthor(true);
        setCodiAutor_id('');
      }
      if (data.editorial) {
        setPublisherName(data.editorial);
        setAddNewPublisher(true);
        setCodiEditorial_id('');
      }
      if (data.anyoEdicion != null) setAnyoEdicion(String(data.anyoEdicion));
      if (data.sinopsis) setSinopsis(data.sinopsis);
      setObservaciones(data.observaciones != null ? String(data.observaciones) : '');
      if (data.portadaUrl) setPortadaPreviewUrl(data.portadaUrl);
    } catch (err) {
      setError(err?.message ?? 'Error al buscar por ISBN');
    } finally {
      setIsbnSearching(false);
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen (JPG, PNG, etc.).');
      return;
    }
    if (!isCloudinaryConfigured()) {
      setError('Cloudinary no está configurado. Añade VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET.');
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

  const handleUploadFromOpenLibrary = async () => {
    if (!portadaPreviewUrl) return;
    if (!isCloudinaryConfigured()) {
      setError('Cloudinary no está configurado. Añade VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET.');
      return;
    }
    setError('');
    setUploadingCover(true);
    try {
      const url = await uploadToCloudinary(portadaPreviewUrl);
      setPortada_cloudinary(url);
    } catch (err) {
      setError(err?.message ?? 'Error al subir la portada desde Open Library');
    } finally {
      setUploadingCover(false);
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
      const result = await createBook(body, token);
      setSuccessMsg(`Libro creado correctamente (id: ${result.id}).`);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setEanDisplay('');
        setTitulo('');
        setTituloOriginal('');
        setCodiAutor_id('');
        setAuthorName('');
        setAddNewAuthor(false);
        setCodiEditorial_id('');
        setPublisherName('');
        setAddNewPublisher(false);
        setAnyoEdicion('');
        setNumeroPaginas('');
        setSinopsis('');
        setObservaciones('');
        setPortada_cloudinary('');
        setPortadaPreviewUrl('');
        setSuccessMsg('');
      }, 2500);
    } catch (err) {
      setError(err?.message ?? 'Error al guardar el libro');
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="alta-libro-backdrop" onClick={handleBackdropClick}>
      <div className="alta-libro-modal">
        <button type="button" className="alta-libro-close" onClick={onClose}>
          ✕
        </button>
        <h2>Alta de libro</h2>

        <div className="alta-libro-isbn-row">
          <label htmlFor="alta-ean">ISBN/EAN</label>
          <input
            id="alta-ean"
            type="text"
            value={eanDisplay}
            onChange={(e) => setEanDisplay(e.target.value)}
            placeholder="9788484831234"
            inputMode="numeric"
            autoComplete="off"
          />
          <button
            type="button"
            className="alta-libro-btn-buscar"
            onClick={handleBuscarIsbn}
            disabled={isbnSearching}
          >
            {isbnSearching ? 'Buscando…' : 'Buscar por ISBN'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="alta-libro-form">
          <div className="alta-libro-field">
            <label htmlFor="alta-titulo">Título</label>
            <input
              id="alta-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div className="alta-libro-field">
            <label htmlFor="alta-titulo-original">Título original</label>
            <input
              id="alta-titulo-original"
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
              <label htmlFor="alta-anyo">Año edición</label>
              <input
                id="alta-anyo"
                type="number"
                min="1900"
                max="2100"
                value={anyoEdicion}
                onChange={(e) => setAnyoEdicion(e.target.value)}
              />
            </div>
            <div className="alta-libro-field">
              <label htmlFor="alta-paginas">Nº páginas</label>
              <input
                id="alta-paginas"
                type="number"
                min="0"
                value={numeroPaginas}
                onChange={(e) => setNumeroPaginas(e.target.value)}
              />
            </div>
          </div>

          <div className="alta-libro-field">
            <label htmlFor="alta-sinopsis">Sinopsis</label>
            <textarea
              id="alta-sinopsis"
              value={sinopsis}
              onChange={(e) => setSinopsis(e.target.value)}
              rows={3}
            />
          </div>
          <div className="alta-libro-field">
            <label htmlFor="alta-observaciones">Observaciones</label>
            <textarea
              id="alta-observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
            />
          </div>

          <div className="alta-libro-field">
            <label htmlFor="alta-portada">Portada (Cloudinary)</label>
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
              {portadaPreviewUrl && (
                <button
                  type="button"
                  className="alta-libro-btn-subir-ol"
                  onClick={handleUploadFromOpenLibrary}
                  disabled={uploadingCover}
                >
                  {uploadingCover ? 'Subiendo…' : 'Subir portada desde Open Library'}
                </button>
              )}
            </div>
            <input
              id="alta-portada"
              type="url"
              value={portada_cloudinary}
              onChange={(e) => setPortada_cloudinary(e.target.value)}
              placeholder="URL tras subir, o pega una URL de Cloudinary"
              className="alta-libro-portada-url"
            />
            {(portadaPreviewUrl || portada_cloudinary) && (
              <div className="alta-libro-portada-preview">
                <img
                  src={portada_cloudinary || portadaPreviewUrl}
                  alt="Vista previa portada"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
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
              {saving ? 'Guardando…' : 'Guardar libro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

AltaLibro.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  getToken: PropTypes.func,
};

export default AltaLibro;
