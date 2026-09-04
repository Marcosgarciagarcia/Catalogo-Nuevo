import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  getAuthors,
  getPublishers,
  getSoportes,
  getUbicaciones,
  getEstantes,
  createBook,
  searchVideoMetadata,
  fetchMovieMetadata,
  fetchTvShowMetadata,
  fetchTvSeasonMetadata,
  fetchTvSeasonMetadataTvmaze,
} from '../services/tursoService';
import { uploadToCloudinary, isCloudinaryConfigured } from '../services/cloudinaryService';
import { lookupWikipediaUrl } from '../utils/wikipedia';
import './AltaLibro.css';

const TIPOS_CONTENIDO = [
  { id: 'pelicula', label: 'Película', mediaType: 'movie' },
  { id: 'serie', label: 'Serie', mediaType: 'tv' },
  { id: 'documental', label: 'Documental', mediaType: 'movie' },
];

function AltaVideo({ onClose, onSuccess, getToken }) {
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [soportes, setSoportes] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [estantes, setEstantes] = useState([]);
  const [loadingCombos, setLoadingCombos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [tipoContenido, setTipoContenido] = useState('pelicula');
  const [documentalEsSerie, setDocumentalEsSerie] = useState(false);
  const [titleQuery, setTitleQuery] = useState('');
  const [yearQuery, setYearQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchSource, setSearchSource] = useState('tmdb');

  const [selectedTmdbId, setSelectedTmdbId] = useState(null);
  const [selectedTvmazeId, setSelectedTvmazeId] = useState(null);
  const [temporadas, setTemporadas] = useState([]);
  const [seasonNumber, setSeasonNumber] = useState('1');
  const [episodiosReferencia, setEpisodiosReferencia] = useState([]);

  const [eanDisplay, setEanDisplay] = useState('');
  const [titulo, setTitulo] = useState('');
  const [serie, setSerie] = useState('');
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
  const [codiSoporte_id, setCodiSoporte_id] = useState('');
  const [codiUbicacion_id, setCodiUbicacion_id] = useState('');
  const [codiEstante_id, setCodiEstante_id] = useState('');
  const [sinopsis, setSinopsis] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [hastag, setHastag] = useState('');
  const [portada_cloudinary, setPortada_cloudinary] = useState('');
  const [portadaPreviewUrl, setPortadaPreviewUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [temas, setTemas] = useState([]);
  const [tmdbId, setTmdbId] = useState(null);
  const [tmdbType, setTmdbType] = useState(null);
  const [tvmazeId, setTvmazeId] = useState(null);
  const [loadedSeasonNumber, setLoadedSeasonNumber] = useState(null);

  const mediaTypeForSearch = (() => {
    if (tipoContenido === 'serie') return 'tv';
    if (tipoContenido === 'documental' && documentalEsSerie) return 'tv';
    return 'movie';
  })();

  const isSeasonMode = mediaTypeForSearch === 'tv';

  const estantesFiltrados = codiUbicacion_id
    ? estantes.filter((s) => String(s.codiUbicacion_id) === String(codiUbicacion_id))
    : estantes;

  const loadCombos = useCallback(async () => {
    try {
      setLoadingCombos(true);
      const results = await Promise.allSettled([
        getAuthors(),
        getPublishers(),
        getSoportes(),
        getUbicaciones(),
        getEstantes(),
      ]);
      const [a, p, sop, u, e] = results.map((r) =>
        r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : [],
      );
      setAuthors(a);
      setPublishers(p);
      setSoportes(sop);
      setUbicaciones(u);
      setEstantes(e);
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length === results.length) {
        setError(failed[0].reason?.message ?? 'Error al cargar combos (soporte/ubicación)');
      } else if (failed.length > 0) {
        console.warn('Algunos combos no cargaron:', failed.map((f) => f.reason?.message));
      }
    } catch (err) {
      setError(err?.message ?? 'Error al cargar combos');
    } finally {
      setLoadingCombos(false);
    }
  }, []);

  useEffect(() => {
    loadCombos();
  }, [loadCombos]);

  const applyVideoMetadata = (data) => {
    if (!data) return;
    setTitulo(data.titulo ?? '');
    setSerie(data.serie ?? '');
    setTituloOriginal(data.tituloOriginal ?? '');
    setAuthorName(data.autor ?? '');
    setAddNewAuthor(Boolean(data.autor));
    setCodiAutor_id('');
    setPublisherName(data.editorial ?? '');
    setAddNewPublisher(Boolean(data.editorial));
    setCodiEditorial_id('');
    setAnyoEdicion(data.anyoEdicion != null ? String(data.anyoEdicion) : '');
    setSinopsis(data.sinopsis ?? '');
    setColeccion(data.coleccion ?? '');
    setPortadaPreviewUrl(data.portadaUrl ?? '');
    setHastag(typeof data.hastag === 'string' ? data.hastag : '');
    setNumeroPaginas(data.numeroPaginas != null ? String(data.numeroPaginas) : '');
    setEpisodiosReferencia(Array.isArray(data.episodiosReferencia) ? data.episodiosReferencia : []);
    setTemas(
      Array.isArray(data.temas) && data.temas.length > 0
        ? data.temas.map((t) => ({
            numero: t.numero ?? 1,
            titulo: t.titulo ?? t.nombreTema ?? '',
            duracion: t.duracion ?? '',
            enlace: t.enlace ?? '',
            numeroVolumen: t.numeroVolumen != null ? Number(t.numeroVolumen) || 1 : 1,
          }))
        : [],
    );
    setTmdbId(data.tmdbId ?? null);
    setTmdbType(data.tmdbType ?? null);
    setTvmazeId(data.tvmazeId ?? null);
    setLoadedSeasonNumber(data.seasonNumber ?? null);
    if (data.tmdbId || data.tvmazeId) {
      const parts = [];
      if (data.tmdbId) parts.push(`tmdb:${data.tmdbType || 'movie'}:${data.tmdbId}`);
      if (data.tvmazeId) parts.push(`tvmaze:${data.tvmazeId}`);
      if (data.seasonNumber != null) parts.push(`temporada:${data.seasonNumber}`);
      setObservaciones(parts.join(' '));
    }
  };

  const handleBuscar = async () => {
    const q = titleQuery.trim();
    if (!q) {
      setError('Introduce un título para buscar.');
      return;
    }
    setError('');
    setSearching(true);
    setSearchResults([]);
    setTemporadas([]);
    setSelectedTmdbId(null);
    setSelectedTvmazeId(null);
    try {
      const { results, source } = await searchVideoMetadata(q, mediaTypeForSearch, yearQuery);
      setSearchResults(results);
      setSearchSource(source);
      if (!results.length) {
        setError('No se encontraron resultados en TMDb/TVmaze.');
      }
    } catch (err) {
      setError(err?.message ?? 'Error al buscar');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = async (item) => {
    setError('');
    setSearching(true);
    setSelectedTmdbId(item.mediaType !== 'tvmaze' ? item.id : null);
    setSelectedTvmazeId(item.mediaType === 'tvmaze' ? item.id : null);
    try {
      if (item.mediaType === 'tvmaze') {
        setTemporadas([]);
        setSeasonNumber('1');
        setTitulo(item.titulo ?? '');
        setSerie(item.titulo ?? '');
        setSinopsis(item.sinopsis ?? '');
        setPortadaPreviewUrl(item.portadaUrl ?? '');
        setAnyoEdicion(item.anyoEdicion != null ? String(item.anyoEdicion) : '');
        setTvmazeId(item.id);
        setTmdbType('tv');
        return;
      }
      if (mediaTypeForSearch === 'movie') {
        const data = await fetchMovieMetadata(item.id);
        if (!data) {
          setError('No se pudo cargar el detalle de la película.');
          return;
        }
        applyVideoMetadata(data);
      } else {
        const data = await fetchTvShowMetadata(item.id);
        if (!data) {
          setError('No se pudo cargar la serie.');
          return;
        }
        setSerie(data.serie ?? item.titulo ?? '');
        setTituloOriginal(data.tituloOriginal ?? '');
        setAuthorName(data.autor ?? '');
        setAddNewAuthor(Boolean(data.autor));
        setPublisherName(data.editorial ?? '');
        setAddNewPublisher(Boolean(data.editorial));
        setSinopsis(data.sinopsis ?? '');
        setPortadaPreviewUrl(data.portadaUrl ?? '');
        setHastag(data.hastag ?? '');
        setTmdbId(data.tmdbId);
        setTmdbType('tv');
        setTemporadas(data.temporadas ?? []);
        if (data.temporadas?.length) {
          setSeasonNumber(String(data.temporadas[0].seasonNumber));
        }
      }
    } catch (err) {
      setError(err?.message ?? 'Error al cargar metadatos');
    } finally {
      setSearching(false);
    }
  };

  const handleCargarTemporada = async () => {
    const season = parseInt(seasonNumber, 10);
    if (!Number.isInteger(season) || season < 0) {
      setError('Número de temporada no válido.');
      return;
    }
    setError('');
    setSearching(true);
    try {
      let data = null;
      if (selectedTvmazeId) {
        data = await fetchTvSeasonMetadataTvmaze(selectedTvmazeId, season);
      } else if (selectedTmdbId) {
        data = await fetchTvSeasonMetadata(selectedTmdbId, season, selectedTvmazeId);
      }
      if (!data) {
        setError('No se pudo cargar la temporada.');
        return;
      }
      applyVideoMetadata(data);
    } catch (err) {
      setError(err?.message ?? 'Error al cargar temporada');
    } finally {
      setSearching(false);
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen.');
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

  const handleUploadFromPreview = async () => {
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
      setError(err?.message ?? 'Error al subir la portada');
    } finally {
      setUploadingCover(false);
    }
  };

  const updateTema = (index, field, value) => {
    setTemas((prev) => {
      const next = [...prev];
      if (!next[index]) return next;
      const numericFields = field === 'numero' || field === 'numeroVolumen';
      next[index] = {
        ...next[index],
        [field]: numericFields ? (value === '' ? '' : Number(value)) : value,
      };
      return next;
    });
  };

  const removeTema = (index) => {
    setTemas((prev) => prev.filter((_, i) => i !== index));
  };

  const addTema = () => {
    setTemas((prev) => [
      ...prev,
      { numero: prev.length + 1, titulo: '', duracion: '', enlace: '', numeroVolumen: 1 },
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!titulo.trim()) {
      setError('El título es obligatorio.');
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
      const ean = String(eanDisplay).replace(/-/g, '').trim();
      const body = {
        videoMode: true,
        EAN: ean || undefined,
        titulo: titulo.trim(),
        tituloOriginal: tituloOriginal.trim() || null,
        anyoEdicion: yearVal != null && !Number.isNaN(yearVal) ? yearVal : null,
        numeroEdicion: loadedSeasonNumber != null ? loadedSeasonNumber : 1,
        numeroPaginas:
          numeroPaginas === '' ? 0 : Math.max(0, parseInt(numeroPaginas, 10) || 0),
        numeroEjemplares: numeroEjemplares === '' ? 1 : Math.max(1, parseInt(numeroEjemplares, 10) || 1),
        sinopsis: sinopsis.trim() || null,
        observaciones: observaciones.trim() || null,
        coleccion: coleccion.trim() || null,
        serie: serie.trim() || null,
        hastag: hastag.trim() || null,
        portada_cloudinary: (portada_cloudinary || '').trim() || null,
        tmdbId: tmdbId ?? selectedTmdbId ?? null,
        tmdbType: tmdbType ?? (isSeasonMode ? 'tv' : 'movie'),
        tvmazeId: tvmazeId ?? selectedTvmazeId ?? null,
        seasonNumber: loadedSeasonNumber,
        temas: temas
          .filter((t) => t && (t.titulo || '').trim())
          .map((t) => ({
            numero: Math.max(1, parseInt(t.numero, 10) || 1),
            titulo: (t.titulo || '').trim(),
            duracion: (t.duracion || '').trim() || null,
            enlace: (t.enlace || '').trim() || null,
            numeroVolumen: Math.max(1, parseInt(t.numeroVolumen, 10) || 1),
          })),
      };
      if (codiSoporte_id !== '' && codiSoporte_id != null) {
        body.codiSoporte_id = Number(codiSoporte_id);
      } else {
        body.codiSoporte_id = null;
      }
      if (codiUbicacion_id !== '') body.codiUbicacion_id = Number(codiUbicacion_id);
      else body.codiUbicacion_id = null;
      if (codiEstante_id !== '') body.codiEstante_id = codiEstante_id;
      else body.codiEstante_id = null;
      if (addNewAuthor && authorName.trim()) {
        body.authorName = authorName.trim();
        body.addNewAuthor = true;
        const wiki = await lookupWikipediaUrl(authorName.trim());
        if (wiki) body.enlaceWiki = wiki;
      } else if (codiAutor_id) {
        body.codiAutor_id = Number(codiAutor_id);
      } else if (authorName.trim()) {
        body.authorName = authorName.trim();
        body.addNewAuthor = true;
        const wiki = await lookupWikipediaUrl(authorName.trim());
        if (wiki) body.enlaceWiki = wiki;
      } else {
        body.authorName = '— Sin director —';
        body.addNewAuthor = true;
      }
      if (addNewPublisher && publisherName.trim()) {
        body.publisherName = publisherName.trim();
        body.addNewPublisher = true;
      } else if (codiEditorial_id) {
        body.codiEditorial_id = Number(codiEditorial_id);
      } else if (publisherName.trim()) {
        body.publisherName = publisherName.trim();
        body.addNewPublisher = true;
      }
      const result = await createBook(body, token);
      setSuccessMsg(`Título creado correctamente (id: ${result.id}).`);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="alta-libro-backdrop" onClick={handleBackdropClick}>
      <div className="alta-libro-modal" style={{ maxWidth: '900px' }}>
        <button type="button" className="alta-libro-close" onClick={onClose}>
          ✕
        </button>
        <h2>Alta de vídeo</h2>

        <section className="alta-disco-panel alta-disco-panel--import" aria-labelledby="alta-video-import-title">
          <h3 id="alta-video-import-title" className="alta-disco-panel-title">
            Buscar e importar (TMDb / TVmaze)
          </h3>
          <p className="alta-disco-panel-hint">
            Busca por título. Para series, elige la temporada y reparte los DVDs manualmente si la caja trae varios discos.
          </p>

          <div className="alta-libro-field">
            <label>Tipo de contenido</label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {TIPOS_CONTENIDO.map((t) => (
                <label key={t.id} className="alta-libro-check">
                  <input
                    type="radio"
                    name="tipoContenido"
                    checked={tipoContenido === t.id}
                    onChange={() => setTipoContenido(t.id)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
            {tipoContenido === 'documental' && (
              <label className="alta-libro-check" style={{ marginTop: 8, display: 'block' }}>
                <input
                  type="checkbox"
                  checked={documentalEsSerie}
                  onChange={(e) => setDocumentalEsSerie(e.target.checked)}
                />
                Documental serializado (buscar como serie)
              </label>
            )}
          </div>

          <div className="alta-libro-isbn-row">
            <label htmlFor="alta-video-query">Título</label>
            <input
              id="alta-video-query"
              type="text"
              value={titleQuery}
              onChange={(e) => setTitleQuery(e.target.value)}
              placeholder="Título de la película o serie"
              style={{ flex: 2, minWidth: 160 }}
            />
            <input
              type="number"
              min="1900"
              max="2100"
              value={yearQuery}
              onChange={(e) => setYearQuery(e.target.value)}
              placeholder="Año"
              style={{ width: 80 }}
            />
            <button
              type="button"
              className="alta-libro-btn-buscar"
              onClick={handleBuscar}
              disabled={searching}
            >
              {searching ? 'Buscando…' : 'Buscar'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="alta-libro-field">
              <label>Resultados ({searchSource})</label>
              <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #555', borderRadius: 6, padding: 6 }}>
                {searchResults.map((item) => (
                  <button
                    key={`${item.mediaType}-${item.id}`}
                    type="button"
                    onClick={() => handleSelectResult(item)}
                    disabled={searching}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 8px',
                      marginBottom: 4,
                      background: selectedTmdbId === item.id || selectedTvmazeId === item.id ? '#333' : '#1a1a1a',
                      border: '1px solid #444',
                      borderRadius: 4,
                      color: '#eee',
                      cursor: 'pointer',
                    }}
                  >
                    {item.titulo}
                    {item.anyoEdicion ? ` (${item.anyoEdicion})` : ''}
                    {item.mediaType === 'tvmaze' ? ' [TVmaze]' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isSeasonMode && (selectedTmdbId || selectedTvmazeId) && (
            <div className="alta-libro-field">
              <label>Temporada (caja física)</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {temporadas.length > 0 ? (
                  <select
                    value={seasonNumber}
                    onChange={(e) => setSeasonNumber(e.target.value)}
                    style={{ minWidth: 200 }}
                  >
                    {temporadas.map((s) => (
                      <option key={s.seasonNumber} value={s.seasonNumber}>
                        {s.nombre} ({s.episodioCount ?? '?'} ep.)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={seasonNumber}
                    onChange={(e) => setSeasonNumber(e.target.value)}
                    placeholder="Nº temporada"
                    style={{ width: 100 }}
                  />
                )}
                <button
                  type="button"
                  className="alta-libro-btn-buscar"
                  onClick={handleCargarTemporada}
                  disabled={searching}
                >
                  {searching ? '…' : 'Cargar temporada'}
                </button>
              </div>
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="alta-libro-form">
          <section className="alta-disco-panel alta-disco-panel--ficha" aria-labelledby="alta-video-ficha-title">
            <h3 id="alta-video-ficha-title" className="alta-disco-panel-title">
              Ficha (se guarda en el catálogo)
            </h3>

            <div className="alta-libro-field">
              <label htmlFor="alta-video-ean">EAN / código (opcional)</label>
              <input
                id="alta-video-ean"
                type="text"
                value={eanDisplay}
                onChange={(e) => setEanDisplay(e.target.value)}
                placeholder="Código de barras del DVD/Blu-ray, si lo tienes"
              />
            </div>

            <div className="alta-libro-field">
              <label htmlFor="alta-video-titulo">Título</label>
              <input
                id="alta-video-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div className="alta-libro-field">
              <label htmlFor="alta-video-titulo-original">Título original</label>
              <input
                id="alta-video-titulo-original"
                value={tituloOriginal}
                onChange={(e) => setTituloOriginal(e.target.value)}
                style={{ width: '100%' }}
                placeholder="Título en idioma original (si difiere)"
              />
            </div>

            {isSeasonMode && (
              <div className="alta-libro-field">
                <label htmlFor="alta-video-serie">Serie (agrupador)</label>
                <input
                  id="alta-video-serie"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  placeholder="Nombre de la serie"
                />
              </div>
            )}

            <div className="alta-libro-field">
              <label>Director / creador</label>
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
                    placeholder="Director o creador"
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
              <label>Estudio / cadena</label>
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
                    placeholder="Productora o cadena"
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

            <div className="alta-libro-row-3">
              <div className="alta-libro-field">
                <label htmlFor="alta-video-anyo">Año</label>
                <input
                  id="alta-video-anyo"
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
                  <option value="">
                    {loadingCombos
                      ? 'Cargando…'
                      : soportes.length === 0
                        ? '— Sin soportes en BD —'
                        : '— Seleccionar —'}
                  </option>
                  {soportes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.descriSoporte || s.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="alta-libro-field">
                <label htmlFor="alta-video-ejemplares">Nº ejemplares</label>
                <input
                  id="alta-video-ejemplares"
                  type="number"
                  min="1"
                  value={numeroEjemplares}
                  onChange={(e) => setNumeroEjemplares(e.target.value)}
                />
              </div>
            </div>

            {!isSeasonMode && (
              <div className="alta-libro-field">
                <label htmlFor="alta-video-runtime">Duración (minutos)</label>
                <input
                  id="alta-video-runtime"
                  type="number"
                  min="0"
                  value={numeroPaginas}
                  onChange={(e) => setNumeroPaginas(e.target.value)}
                />
              </div>
            )}

            <div className="alta-libro-field">
              <label htmlFor="alta-video-sinopsis">Sinopsis</label>
              <textarea
                id="alta-video-sinopsis"
                value={sinopsis}
                onChange={(e) => setSinopsis(e.target.value)}
                rows={3}
              />
            </div>

            <div className="alta-libro-field">
              <label htmlFor="alta-video-observaciones">Observaciones</label>
              <textarea
                id="alta-video-observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
              />
            </div>

            <div className="alta-libro-row-2">
              <div className="alta-libro-field">
                <label htmlFor="alta-video-ubicacion">Ubicación</label>
                <select
                  id="alta-video-ubicacion"
                  value={codiUbicacion_id}
                  onChange={(e) => {
                    setCodiUbicacion_id(e.target.value);
                    setCodiEstante_id('');
                  }}
                  disabled={loadingCombos}
                >
                  <option value="">
                    {loadingCombos
                      ? 'Cargando…'
                      : ubicaciones.length === 0
                        ? '— Sin ubicaciones en BD —'
                        : '— Sin ubicación —'}
                  </option>
                  {ubicaciones.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.descriUbicacion || u.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="alta-libro-field">
                <label htmlFor="alta-video-estante">Estante</label>
                <select
                  id="alta-video-estante"
                  value={codiEstante_id}
                  onChange={(e) => setCodiEstante_id(e.target.value)}
                  disabled={loadingCombos}
                >
                  <option value="">
                    {loadingCombos
                      ? 'Cargando…'
                      : estantesFiltrados.length === 0
                        ? (codiUbicacion_id ? '— Sin estantes en esta ubicación —' : '— Sin estantes en BD —')
                        : '— Sin estante —'}
                  </option>
                  {estantesFiltrados.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.descriEstante || s.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="alta-libro-field">
              <label htmlFor="alta-video-coleccion">Colección / saga</label>
              <input
                id="alta-video-coleccion"
                type="text"
                value={coleccion}
                onChange={(e) => setColeccion(e.target.value)}
              />
            </div>

            <div className="alta-libro-field alta-libro-hastag">
              <label htmlFor="alta-video-hastag">Hastags</label>
              <input
                id="alta-video-hastag"
                type="text"
                value={hastag}
                onChange={(e) => setHastag(e.target.value)}
                placeholder="palabra1 palabra2 (se añadirá # si no empieza por #)"
              />
            </div>

            <div className="alta-libro-field">
              <label>Portada</label>
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
                    onClick={handleUploadFromPreview}
                    disabled={uploadingCover}
                  >
                    {uploadingCover ? 'Subiendo…' : 'Subir portada desde TMDb'}
                  </button>
                )}
              </div>
              <input
                type="url"
                value={portada_cloudinary}
                onChange={(e) => setPortada_cloudinary(e.target.value)}
                className="alta-libro-portada-url"
                placeholder="URL Cloudinary"
              />
              {(portadaPreviewUrl || portada_cloudinary) && (
                <div className="alta-libro-portada-preview">
                  <img src={portada_cloudinary || portadaPreviewUrl} alt="Vista previa" />
                </div>
              )}
            </div>

            {episodiosReferencia.length > 0 && (
              <div className="alta-libro-field">
                <label>Episodios de referencia (TMDb/TVmaze)</label>
                <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: '0.85rem', color: '#aaa', border: '1px solid #444', borderRadius: 6, padding: 8 }}>
                  {episodiosReferencia.map((ep, i) => (
                    <div key={i}>
                      {ep.numero}. {ep.titulo}
                      {ep.duracion ? ` (${ep.duracion})` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="alta-libro-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ marginBottom: 0 }}>
                  {isSeasonMode ? 'Capítulos (asignar volumen/DVD)' : 'Contenido / capítulos (opcional)'}
                </label>
                <button type="button" className="alta-libro-btn-buscar" style={{ padding: '4px 10px', fontSize: '0.85rem' }} onClick={addTema}>
                  + Añadir
                </button>
              </div>
              {temas.length === 0 ? (
                <p style={{ color: '#999', fontSize: '0.9rem', margin: 0 }}>
                  {isSeasonMode
                    ? 'Carga una temporada para importar los capítulos. Luego asigna cada uno al DVD (volumen).'
                    : 'Opcional. Las películas monodisco no necesitan filas aquí; la duración va en el campo de arriba.'}
                </p>
              ) : (
                <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #555', borderRadius: 6, padding: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '44px 52px 1fr 70px 28px', gap: 6, marginBottom: 6, fontSize: '0.75rem', color: '#999' }}>
                    <span>N.º</span>
                    <span>Vol.</span>
                    <span>Título</span>
                    <span>Duración</span>
                    <span />
                  </div>
                  {temas.map((t, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 52px 1fr 70px 28px', gap: 6, marginBottom: 6 }}>
                      <input
                        type="number"
                        min={1}
                        value={t.numero || ''}
                        onChange={(e) => updateTema(i, 'numero', e.target.value)}
                        title="Número de capítulo"
                      />
                      <input
                        type="number"
                        min={1}
                        value={t.numeroVolumen ?? 1}
                        onChange={(e) => updateTema(i, 'numeroVolumen', e.target.value)}
                        title="Número de volumen / DVD"
                      />
                      <input
                        type="text"
                        value={t.titulo || ''}
                        onChange={(e) => updateTema(i, 'titulo', e.target.value)}
                        placeholder="Título del capítulo"
                      />
                      <input
                        type="text"
                        value={t.duracion || ''}
                        onChange={(e) => updateTema(i, 'duracion', e.target.value)}
                        placeholder="Opcional"
                      />
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
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}

AltaVideo.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  getToken: PropTypes.func,
};

export default AltaVideo;
