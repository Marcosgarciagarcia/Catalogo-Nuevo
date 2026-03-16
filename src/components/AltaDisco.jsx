import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  getAuthors,
  getPublishers,
  getSoportes,
  createBook,
  fetchAlbumMetadataByEan,
  fetchAlbumMetadataByQuery,
} from '../services/tursoService';
import { uploadToCloudinary, isCloudinaryConfigured } from '../services/cloudinaryService';
import './AltaLibro.css';

function AltaDisco({ onClose, onSuccess, getToken }) {
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [soportes, setSoportes] = useState([]);
  const [loadingCombos, setLoadingCombos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [eanDisplay, setEanDisplay] = useState('');
  const [artistQuery, setArtistQuery] = useState('');
  const [releaseQuery, setReleaseQuery] = useState('');
  const [titulo, setTitulo] = useState('');
  const [codiAutor_id, setCodiAutor_id] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [addNewAuthor, setAddNewAuthor] = useState(false);
  const [codiEditorial_id, setCodiEditorial_id] = useState('');
  const [publisherName, setPublisherName] = useState('');
  const [addNewPublisher, setAddNewPublisher] = useState(false);
  const [anyoEdicion, setAnyoEdicion] = useState('');
  const [codiSoporte_id, setCodiSoporte_id] = useState('');
  const [portada_cloudinary, setPortada_cloudinary] = useState('');
  const [portadaPreviewUrl, setPortadaPreviewUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [temas, setTemas] = useState([]);

  const loadCombos = useCallback(async () => {
    try {
      setLoadingCombos(true);
      const [a, p, sop] = await Promise.all([getAuthors(), getPublishers(), getSoportes()]);
      setAuthors(a);
      setPublishers(p);
      setSoportes(sop);
    } catch (err) {
      setError(err?.message ?? 'Error al cargar autores, editoriales y soportes');
    } finally {
      setLoadingCombos(false);
    }
  }, []);

  useEffect(() => {
    loadCombos();
  }, [loadCombos]);

  const handleBuscarPorEan = async () => {
    const ean = String(eanDisplay).replace(/\D/g, '').trim();
    if (!ean) {
      setError('Introduce el EAN para buscar.');
      return;
    }
    setError('');
    setSearching(true);
    try {
      const data = await fetchAlbumMetadataByEan(ean);
      if (!data) {
        setError('No se encontraron datos para este EAN (MusicBrainz).');
        return;
      }
      setTitulo(data.titulo ?? '');
      setArtistQuery(data.autor ?? '');
      setReleaseQuery(data.titulo ?? '');
      setAuthorName(data.autor ?? '');
      setAddNewAuthor(true);
      setCodiAutor_id('');
      setPublisherName(data.editorial ?? '');
      setAddNewPublisher(true);
      setCodiEditorial_id('');
      setAnyoEdicion(data.anyoEdicion != null ? String(data.anyoEdicion) : '');
      setPortadaPreviewUrl(data.portadaUrl ?? '');
      setTemas(Array.isArray(data.temas) ? data.temas : []);
    } catch (err) {
      setError(err?.message ?? 'Error al buscar por EAN');
    } finally {
      setSearching(false);
    }
  };

  const handleBuscarPorArtistaTitulo = async () => {
    const artist = artistQuery.trim();
    const release = releaseQuery.trim();
    if (!artist && !release) {
      setError('Introduce artista y/o título del álbum.');
      return;
    }
    setError('');
    setSearching(true);
    try {
      const data = await fetchAlbumMetadataByQuery(artist, release);
      if (!data) {
        setError('No se encontraron datos (MusicBrainz).');
        return;
      }
      setTitulo(data.titulo ?? '');
      setArtistQuery(data.autor ?? '');
      setReleaseQuery(data.titulo ?? '');
      setAuthorName(data.autor ?? '');
      setAddNewAuthor(true);
      setCodiAutor_id('');
      setPublisherName(data.editorial ?? '');
      setAddNewPublisher(true);
      setCodiEditorial_id('');
      setAnyoEdicion(data.anyoEdicion != null ? String(data.anyoEdicion) : '');
      setPortadaPreviewUrl(data.portadaUrl ?? '');
      setTemas(Array.isArray(data.temas) ? data.temas : []);
    } catch (err) {
      setError(err?.message ?? 'Error al buscar');
    } finally {
      setSearching(false);
    }
  };

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

  const handleUploadFromCoverArt = async () => {
    if (!portadaPreviewUrl) return;
    if (!isCloudinaryConfigured()) {
      setError('Cloudinary no está configurado.');
      return;
    }
    setError('');
    setUploadingCover(true);
    try {
      const url = await uploadToCloudinary(portadaPreviewUrl);
      setPortada_cloudinary(url);
    } catch (err) {
      setError(err?.message ?? 'Error al subir la portada desde Cover Art Archive');
    } finally {
      setUploadingCover(false);
    }
  };

  const updateTema = (index, field, value) => {
    setTemas((prev) => {
      const next = [...prev];
      if (!next[index]) return next;
      next[index] = { ...next[index], [field]: field === 'numero' ? (value === '' ? '' : Number(value)) : value };
      return next;
    });
  };

  const removeTema = (index) => {
    setTemas((prev) => prev.filter((_, i) => i !== index));
  };

  const addTema = () => {
    setTemas((prev) => [...prev, { numero: prev.length + 1, titulo: '', duracion: '', enlace: '' }]);
  };

  const openDeezerTema = (tituloTema) => {
    if (!tituloTema?.trim()) return;
    const artist = addNewAuthor ? authorName : (authors.find((a) => String(a.id) === String(codiAutor_id))?.nombreAutor || authorName || '');
    const q = [artist, tituloTema].filter(Boolean).join(' ').trim().slice(0, 100);
    if (!q) return;
    window.open(`https://www.deezer.com/search/${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
  };

  const openDeezerAlbum = () => {
    const artist = addNewAuthor ? authorName : (authors.find((a) => String(a.id) === String(codiAutor_id))?.nombreAutor || authorName || '');
    const album = (titulo || '').trim();
    const q = [artist, album].filter(Boolean).join(' ').trim().slice(0, 120);
    if (!q) return;
    window.open(`https://www.deezer.com/search/${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
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
    if (!titulo.trim()) {
      setError('El título del disco es obligatorio.');
      return;
    }
    const token = getToken?.();
    if (!token) {
      setError('Sesión expirada. Vuelve a iniciar sesión.');
      return;
    }
    setSaving(true);
    try {
      const yearVal = anyoEdicion === '' ? null : Number(anyoEdicion);
      const body = {
        EAN: ean,
        titulo: titulo.trim(),
        tituloOriginal: null,
        anyoEdicion: yearVal != null && !Number.isNaN(yearVal) ? yearVal : null,
        numeroEdicion: 1,
        numeroPaginas: 0,
        numeroEjemplares: 1,
        sinopsis: null,
        observaciones: null,
        coleccion: null,
        serie: null,
        hastag: null,
        portada_cloudinary: (portada_cloudinary || '').trim() || null,
        temas: temas
          .filter((t) => t && (t.titulo || '').trim())
          .map((t) => ({
            numero: Math.max(1, parseInt(t.numero, 10) || 1),
            titulo: (t.titulo || '').trim(),
            duracion: (t.duracion || '').trim() || null,
            enlace: (t.enlace || '').trim() || null,
          })),
      };
      if (codiSoporte_id !== '' && codiSoporte_id != null) {
        body.codiSoporte_id = Number(codiSoporte_id);
      } else {
        body.codiSoporte_id = null;
      }
      if (addNewAuthor && authorName.trim()) {
        body.authorName = authorName.trim();
        body.addNewAuthor = true;
      } else if (codiAutor_id) {
        body.codiAutor_id = Number(codiAutor_id);
      } else {
        body.authorName = authorName.trim() || '— Sin autor —';
        body.addNewAuthor = true;
      }
      if (addNewPublisher && publisherName.trim()) {
        body.publisherName = publisherName.trim();
        body.addNewPublisher = true;
      } else if (codiEditorial_id) {
        body.codiEditorial_id = Number(codiEditorial_id);
      } else {
        body.publisherName = '— Sin editorial —';
        body.addNewPublisher = true;
      }
      const result = await createBook(body, token);
      setSuccessMsg(`Disco creado correctamente (id: ${result.id}).`);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setEanDisplay('');
        setArtistQuery('');
        setReleaseQuery('');
        setTitulo('');
        setCodiAutor_id('');
        setAuthorName('');
        setAddNewAuthor(false);
        setCodiEditorial_id('');
        setPublisherName('');
        setAddNewPublisher(false);
        setAnyoEdicion('');
        setCodiSoporte_id('');
        setPortada_cloudinary('');
        setPortadaPreviewUrl('');
        setTemas([]);
        setSuccessMsg('');
      }, 2500);
    } catch (err) {
      setError(err?.message ?? 'Error al guardar el disco');
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="alta-libro-backdrop" onClick={handleBackdropClick}>
      <div className="alta-libro-modal" style={{ maxWidth: '560px' }}>
        <button type="button" className="alta-libro-close" onClick={onClose}>
          ✕
        </button>
        <h2>Alta de disco</h2>

        <div className="alta-libro-isbn-row">
          <label htmlFor="alta-ean">EAN</label>
          <input
            id="alta-ean"
            type="text"
            value={eanDisplay}
            onChange={(e) => setEanDisplay(e.target.value)}
            placeholder="Código de barras"
            inputMode="numeric"
            autoComplete="off"
          />
          <button
            type="button"
            className="alta-libro-btn-buscar"
            onClick={handleBuscarPorEan}
            disabled={searching}
          >
            {searching ? 'Buscando…' : 'Buscar por EAN'}
          </button>
        </div>

        <div className="alta-libro-isbn-row" style={{ marginTop: 8 }}>
          <label>Artista / Álbum</label>
          <input
            type="text"
            value={artistQuery}
            onChange={(e) => setArtistQuery(e.target.value)}
            placeholder="Artista"
            style={{ flex: '1', minWidth: 100 }}
          />
          <input
            type="text"
            value={releaseQuery}
            onChange={(e) => setReleaseQuery(e.target.value)}
            placeholder="Título del álbum"
            style={{ flex: '1', minWidth: 120 }}
          />
          <button
            type="button"
            className="alta-libro-btn-buscar"
            onClick={handleBuscarPorArtistaTitulo}
            disabled={searching}
          >
            Buscar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="alta-libro-form">
          <div className="alta-libro-field">
            <label htmlFor="alta-titulo">Título del disco</label>
            <input
              id="alta-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div className="alta-libro-field">
            <label>Autor / Artista</label>
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
                  placeholder="Nombre del artista"
                />
              ) : (
                <select
                  value={codiAutor_id}
                  onChange={(e) => setCodiAutor_id(e.target.value)}
                  disabled={loadingCombos}
                >
                  <option value="">— Seleccionar —</option>
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
            <label>Sello / Editorial</label>
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
                Añadir como nuevo
              </label>
              {addNewPublisher ? (
                <input
                  type="text"
                  value={publisherName}
                  onChange={(e) => setPublisherName(e.target.value)}
                  placeholder="Nombre del sello"
                />
              ) : (
                <select
                  value={codiEditorial_id}
                  onChange={(e) => setCodiEditorial_id(e.target.value)}
                  disabled={loadingCombos}
                >
                  <option value="">— Seleccionar —</option>
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
              <label htmlFor="alta-anyo">Año</label>
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
              <label>Soporte</label>
              <select
                value={codiSoporte_id}
                onChange={(e) => setCodiSoporte_id(e.target.value)}
                disabled={loadingCombos}
              >
                <option value="">— Seleccionar —</option>
                {soportes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.descriSoporte || s.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="alta-libro-field">
            <label>Portada (Cloudinary)</label>
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
                  onClick={handleUploadFromCoverArt}
                  disabled={uploadingCover}
                >
                  {uploadingCover ? 'Subiendo…' : 'Subir portada desde Cover Art Archive'}
                </button>
              )}
            </div>
            <input
              type="url"
              value={portada_cloudinary}
              onChange={(e) => setPortada_cloudinary(e.target.value)}
              placeholder="URL tras subir, o pega una URL"
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

          <div className="alta-libro-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
              <label style={{ marginBottom: 0 }}>Temas (pistas)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="alta-libro-btn-buscar" style={{ padding: '4px 10px', fontSize: '0.85rem' }} onClick={addTema}>
                  + Añadir pista
                </button>
                <button type="button" onClick={openDeezerAlbum} title="Abrir disco en Deezer" style={{ padding: '4px 10px', fontSize: '0.85rem', background: '#2a5a2a', color: '#abffab', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                  ▶ Escuchar disco completo (Deezer)
                </button>
              </div>
            </div>
            {temas.length === 0 ? (
              <p style={{ color: '#999', fontSize: '0.9rem', margin: 0 }}>Usa «Buscar por EAN» o «Buscar» para cargar la lista, o añade pistas manualmente.</p>
            ) : (
              <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #555', borderRadius: 6, padding: 8, background: '#1a1a1a' }}>
                {temas.map((t, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px minmax(120px, 1fr) 36px 28px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                    <input
                      type="number"
                      min={1}
                      value={t.numero || ''}
                      onChange={(e) => updateTema(i, 'numero', e.target.value)}
                      style={{ width: 40, padding: 4 }}
                    />
                    <input
                      type="text"
                      value={t.titulo || ''}
                      onChange={(e) => updateTema(i, 'titulo', e.target.value)}
                      placeholder="Título del tema"
                      style={{ padding: 4 }}
                    />
                    <input
                      type="text"
                      value={t.duracion || ''}
                      onChange={(e) => updateTema(i, 'duracion', e.target.value)}
                      placeholder="3:45"
                      style={{ padding: 4 }}
                    />
                    <input
                      type="url"
                      value={t.enlace || ''}
                      onChange={(e) => updateTema(i, 'enlace', e.target.value)}
                      placeholder="URL (Deezer, Spotify…)"
                      style={{ padding: 4, fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => (t.enlace?.trim() ? window.open(t.enlace.trim(), '_blank') : openDeezerTema((t.titulo || '').trim()))}
                      disabled={!t.titulo?.trim() && !t.enlace?.trim()}
                      title={t.enlace?.trim() ? 'Abrir enlace' : 'Abrir tema en Deezer'}
                      style={{ padding: 4, background: '#2a5a2a', color: '#abffab', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      ▶
                    </button>
                    <button type="button" onClick={() => removeTema(i)} style={{ padding: 4, background: '#5a2a2a', color: '#ffabab', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>
                ))}
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
              {saving ? 'Guardando…' : 'Guardar disco'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

AltaDisco.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  getToken: PropTypes.func,
};

export default AltaDisco;
