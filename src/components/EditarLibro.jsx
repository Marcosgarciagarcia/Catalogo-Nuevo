import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  getAuthors,
  getPublishers,
  getUbicaciones,
  getEstantes,
  getSoportes,
  getCollectionTypes,
  getBookById,
  updateBook,
  resolveDeezerTrackLink,
  parseMusicBrainzReleaseMbidFromInput,
} from '../services/tursoService';
import { uploadToCloudinary, isCloudinaryConfigured } from '../services/cloudinaryService';
import './AltaLibro.css';

function EditarLibro({ libro, onClose, onSuccess, getToken }) {
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [estantes, setEstantes] = useState([]);
  const [soportes, setSoportes] = useState([]);
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
  const [numeroEjemplares, setNumeroEjemplares] = useState('1');
  const [coleccion, setColeccion] = useState('');
  const [sinopsis, setSinopsis] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [hastag, setHastag] = useState('');
  const [codiUbicacion_id, setCodiUbicacion_id] = useState('');
  const [codiEstante_id, setCodiEstante_id] = useState('');
  const [codiSoporte_id, setCodiSoporte_id] = useState('');
  const [portada_cloudinary, setPortada_cloudinary] = useState('');
  const [portadaPreviewUrl, setPortadaPreviewUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [temas, setTemas] = useState([]);
  const [tiposColeccion, setTiposColeccion] = useState([]);
  const [bookCodiTipoSoporte_id, setBookCodiTipoSoporte_id] = useState(null);
  const [musicbrainzReleaseMbid, setMusicbrainzReleaseMbid] = useState('');
  const [numeroCatalogoSello, setNumeroCatalogoSello] = useState('');

  const loadCombos = useCallback(async () => {
    try {
      setLoadingCombos(true);
      const [a, p, u, e, sop, tipos] = await Promise.all([
        getAuthors(),
        getPublishers(),
        getUbicaciones(),
        getEstantes(),
        getSoportes(),
        getCollectionTypes(),
      ]);
      setAuthors(a);
      setPublishers(p);
      setUbicaciones(u);
      setEstantes(e);
      setSoportes(sop);
      setTiposColeccion(Array.isArray(tipos) ? tipos : []);
    } catch (err) {
      setError(err?.message ?? 'Error al cargar autores, editoriales, ubicaciones y soportes');
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
        setNumeroEjemplares(full.numeroEjemplares != null ? String(full.numeroEjemplares) : '1');
        setColeccion(full.coleccion || '');
        setSinopsis(full.sinopsis || '');
        setObservaciones(full.observaciones || '');
        setHastag(full.hastag || '');
        setCodiUbicacion_id(full.codiUbicacion_id != null ? String(full.codiUbicacion_id) : '');
        setCodiEstante_id(full.codiEstante_id != null ? String(full.codiEstante_id) : '');
        setCodiSoporte_id(full.codiSoporte_id != null ? String(full.codiSoporte_id) : '');
        setPortada_cloudinary(full.portada_cloudinary || '');
        setTemas(Array.isArray(full.temas) ? full.temas : []);
        setBookCodiTipoSoporte_id(full.codiTipoSoporte_id != null ? full.codiTipoSoporte_id : null);
        setMusicbrainzReleaseMbid(full.musicbrainz_release_mbid || full.musicbrainzReleaseMbid || '');
        setNumeroCatalogoSello(full.numero_catalogo_sello || full.numeroCatalogoSello || '');
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
    const ean = String(eanDisplay).replace(/-/g, '').trim();
    if (!ean) {
      setError('ISBN/EAN es obligatorio.');
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
        numeroEjemplares: Number(numeroEjemplares) > 0 ? Number(numeroEjemplares) : 1,
        coleccion: coleccion.trim() || null,
        sinopsis: sinopsis.trim() || null,
        observaciones: observaciones.trim() || null,
        hastag: hastag.trim() || null,
        portada_cloudinary: portada_cloudinary.trim() || null,
        musicbrainz_release_mbid: parseMusicBrainzReleaseMbidFromInput(musicbrainzReleaseMbid) || null,
        numero_catalogo_sello: numeroCatalogoSello.trim() || null,
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
      if (codiUbicacion_id !== '') body.codiUbicacion_id = Number(codiUbicacion_id);
      else body.codiUbicacion_id = null;
      // codiEstante_id puede ser texto en BD (ej. "0106"). Enviar tal cual para no romper FK.
      if (codiEstante_id !== '') body.codiEstante_id = codiEstante_id;
      else body.codiEstante_id = null;
      if (codiSoporte_id !== '') body.codiSoporte_id = Number(codiSoporte_id);
      else body.codiSoporte_id = null;
      const isDisco = bookCodiTipoSoporte_id != null && tiposColeccion.some(
        (t) => Number(t.id) === Number(bookCodiTipoSoporte_id) && (t.slug === 'discoteca' || (t.nombre || '').toLowerCase().includes('discoteca'))
      );
      if (isDisco) {
        body.temas = temas
          .filter((t) => t && (t.titulo || '').trim())
          .map((t) => ({
            numero: Math.max(1, parseInt(t.numero, 10) || 1),
            titulo: (t.titulo || '').trim(),
            duracion: (t.duracion || '').trim() || null,
            enlace: (t.enlace || '').trim() || null,
          }));
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

  const openDeezerTema = (tituloTema) => {
    if (!tituloTema?.trim()) return;
    const artist = addNewAuthor ? authorName : (authors.find((a) => String(a.id) === String(codiAutor_id))?.nombreAutor || '');
    const album = (titulo || '').trim();
    const q = [artist, album, tituloTema].filter(Boolean).join(' ').trim().slice(0, 120);
    if (!q) return;
    window.open(`https://www.deezer.com/search/${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
  };

  const openDeezerAlbum = () => {
    const artist = addNewAuthor ? authorName : (authors.find((a) => String(a.id) === String(codiAutor_id))?.nombreAutor || '');
    const album = (titulo || '').trim();
    const q = [artist, album].filter(Boolean).join(' ').trim().slice(0, 120);
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
    const artist = addNewAuthor ? authorName : (authors.find((a) => String(a.id) === String(codiAutor_id))?.nombreAutor || '');
    const album = (titulo || '').trim();
    const link = await resolveDeezerTrackLink(artist, album, tituloTema);
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      openDeezerTema(tituloTema);
    }
  };

  const isDisco = bookCodiTipoSoporte_id != null && tiposColeccion.some(
    (t) => Number(t.id) === Number(bookCodiTipoSoporte_id) && (t.slug === 'discoteca' || (t.nombre || '').toLowerCase().includes('discoteca'))
  );

  const addTema = () => {
    setTemas((prev) => [...prev, { numero: prev.length + 1, titulo: '', duracion: '', enlace: '' }]);
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

  if (!libro) return null;

  const loading = loadingCombos || loadingBook;

  return (
    <div className="alta-libro-backdrop" onClick={handleBackdropClick}>
      <div className="alta-libro-modal">
        <button type="button" className="alta-libro-close" onClick={onClose}>
          ✕
        </button>
        <h2>Editar ficha</h2>

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
                placeholder="9788484831234 o código con letras"
                autoComplete="off"
              />
            </div>

            <div className="alta-libro-row-2">
              <div className="alta-libro-field">
                <label htmlFor="editar-mbid">MBID release (MusicBrainz)</label>
                <input
                  id="editar-mbid"
                  type="text"
                  value={musicbrainzReleaseMbid}
                  onChange={(e) => setMusicbrainzReleaseMbid(e.target.value)}
                  placeholder="UUID del release"
                  autoComplete="off"
                />
              </div>
              <div className="alta-libro-field">
                <label htmlFor="editar-catalogo">Nº catálogo sello</label>
                <input
                  id="editar-catalogo"
                  type="text"
                  value={numeroCatalogoSello}
                  onChange={(e) => setNumeroCatalogoSello(e.target.value)}
                  placeholder="Catálogo del sello"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="alta-libro-field">
              <label htmlFor="editar-titulo">Título</label>
              <input
                id="editar-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div className="alta-libro-field">
              <label htmlFor="editar-titulo-original">Título original</label>
              <input
                id="editar-titulo-original"
                value={tituloOriginal}
                onChange={(e) => setTituloOriginal(e.target.value)}
                style={{ width: '100%' }}
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

            {!isDisco && (
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
            )}

            <div className="alta-libro-row-3">
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
                <label htmlFor="editar-soporte">Soporte</label>
                <select
                  id="editar-soporte"
                  value={codiSoporte_id}
                  onChange={(e) => setCodiSoporte_id(e.target.value)}
                  disabled={loadingCombos}
                >
                  <option value="">— Seleccionar soporte —</option>
                  {soportes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.descriSoporte || s.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="alta-libro-field">
                <label htmlFor="editar-ejemplares">Nº ejemplares</label>
                <input
                  id="editar-ejemplares"
                  type="number"
                  min="1"
                  value={numeroEjemplares}
                  onChange={(e) => setNumeroEjemplares(e.target.value)}
                />
              </div>
            </div>

            <div className="alta-libro-field">
              <label htmlFor="editar-coleccion">Colección</label>
              <input
                id="editar-coleccion"
                type="text"
                value={coleccion}
                onChange={(e) => setColeccion(e.target.value)}
                placeholder="Colección (opcional)"
              />
            </div>

            {!isDisco && (
            <div className="alta-libro-field">
              <label htmlFor="editar-sinopsis">Sinopsis</label>
              <textarea
                id="editar-sinopsis"
                value={sinopsis}
                onChange={(e) => setSinopsis(e.target.value)}
                rows={3}
              />
            </div>
            )}
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

            {isDisco ? (
              <div className="alta-libro-field">
                <label htmlFor="editar-ubicacion">Ubicación</label>
                <select
                  id="editar-ubicacion"
                  value={codiUbicacion_id}
                  onChange={(e) => setCodiUbicacion_id(e.target.value)}
                >
                  <option value="">— Sin ubicación —</option>
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.descriUbicacion || u.id}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="alta-libro-row-2">
                <div className="alta-libro-field">
                  <label htmlFor="editar-ubicacion">Ubicación</label>
                  <select
                    id="editar-ubicacion"
                    value={codiUbicacion_id}
                    onChange={(e) => setCodiUbicacion_id(e.target.value)}
                  >
                    <option value="">— Sin ubicación —</option>
                    {ubicaciones.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.descriUbicacion || u.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="alta-libro-field">
                  <label htmlFor="editar-estante">Estante</label>
                  <select
                    id="editar-estante"
                    value={codiEstante_id}
                    onChange={(e) => setCodiEstante_id(e.target.value)}
                  >
                    <option value="">— Sin estante —</option>
                    {estantes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.descriEstante || s.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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

            {isDisco && (
              <div className="alta-libro-field">
                <h3 className="modal-section-title">Temas (pistas)</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                  <span />
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
                  <p style={{ color: '#999', fontSize: '0.9rem', margin: 0 }}>Aún no hay pistas. Usa «+ Añadir pista» para añadirlas.</p>
                ) : (
                  <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #555', borderRadius: 6, padding: 8, background: '#1a1a1a' }}>
                    {temas.map((t, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px minmax(120px, 1fr) 36px 28px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                        <input
                          type="number"
                          min={1}
                          value={t.numero ?? ''}
                          onChange={(e) => updateTema(i, 'numero', e.target.value)}
                          style={{ width: 40, padding: 4 }}
                        />
                        <input
                          type="text"
                          value={t.titulo ?? ''}
                          onChange={(e) => updateTema(i, 'titulo', e.target.value)}
                          placeholder="Título del tema"
                          style={{ padding: 4 }}
                        />
                        <input
                          type="text"
                          value={t.duracion ?? ''}
                          onChange={(e) => updateTema(i, 'duracion', e.target.value)}
                          placeholder="3:45"
                          style={{ padding: 4 }}
                        />
                        <input
                          type="url"
                          value={t.enlace ?? ''}
                          onChange={(e) => updateTema(i, 'enlace', e.target.value)}
                          placeholder="URL (Deezer, Spotify…)"
                          style={{ padding: 4, fontSize: '0.85rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => handlePlayTema(t)}
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
            )}

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
