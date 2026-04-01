import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { getCollectionTypes, getAllBooks, searchBooks, filterBooksByLetter, getBooksByHastag, getBookById, syncFromLocal, deleteBook } from '../services/tursoService';
import BookList from './BookList';
import Pagination from './Pagination';
import BookDetailModal from './BookDetailModal';
import AltaLibro from './AltaLibro';
import AltaDisco from './AltaDisco';
import EditarLibro from './EditarLibro';
import { useAuth } from '../contexts/AuthContext';

const alfabeto = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
const librosPorPagina = 10;

export default function LibrosCatalog() {
  const [tiposColeccion, setTiposColeccion] = useState([]);
  const [tipoSlug, setTipoSlug] = useState(null); // null = todos
  const [filtroLetra, setFiltroLetra] = useState(null);
  const [filtrarPor, setFiltrarPor] = useState('titulo');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [libros, setLibros] = useState([]);
  const [filterApplied, setFilterApplied] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [detailBook, setDetailBook] = useState(null);
  const [showAltaLibro, setShowAltaLibro] = useState(false);
  const [showAltaDisco, setShowAltaDisco] = useState(false);
  const [bookToEdit, setBookToEdit] = useState(null);
  const [syncDone, setSyncDone] = useState(false);
  const { getToken, isStaff, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const rawSlug = pathname.replace(/^\//, '').trim() || null;
  const slugFromPath = rawSlug
    ? (() => {
      try {
        return decodeURIComponent(rawSlug);
      } catch {
        return rawSlug;
      }
    })()
    : null;

  useEffect(() => {
    getCollectionTypes().then((data) => setTiposColeccion(Array.isArray(data) ? data : []));
  }, []);

  // Sincronizar estado del botón de tipo con la ruta (/ = todos, /libros, /música, etc.)
  useEffect(() => {
    setTipoSlug(pathname === '/' ? null : slugFromPath);
  }, [pathname, slugFromPath]);

  useEffect(() => {
    syncFromLocal().then(() => setSyncDone(true));
  }, []);

  useEffect(() => {
    if (searchParams.get('openAlta') === '1') {
      const esDiscoteca = pathname !== '/' && (slugFromPath === 'discoteca' || pathname.replace(/^\//, '').startsWith('discoteca'));
      if (esDiscoteca) {
        setShowAltaDisco(true);
      } else {
        setShowAltaLibro(true);
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, pathname, slugFromPath]);

  const hastagFromUrl = searchParams.get('hastag');

  useEffect(() => {
    if (!selectedBook?.id) {
      setDetailBook(null);
      return;
    }
    let cancelled = false;
    getBookById(selectedBook.id)
      .then((full) => {
        if (!cancelled) setDetailBook(full);
      })
      .catch(() => {
        if (!cancelled) setDetailBook(selectedBook);
      });
    return () => { cancelled = true; };
  }, [selectedBook?.id]);

  // Filtro activo: slug de la URL (pathname) para que /discoteca etc. filtren desde la primera carga
  const tipoSlugActive = pathname === '/' ? null : slugFromPath;

  useEffect(() => {
    if (!syncDone) return;
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);
        let resultado;
        if (hastagFromUrl) {
          resultado = await getBooksByHastag(hastagFromUrl, tipoSlugActive);
        } else if (busqueda) {
          resultado = await searchBooks(busqueda, filtrarPor, tipoSlugActive);
        } else if (filtroLetra) {
          resultado = await filterBooksByLetter(filtroLetra, filtrarPor, tipoSlugActive);
        } else {
          resultado = await getAllBooks(tipoSlugActive);
        }
        const data = resultado?.data ?? resultado;
        const list = Array.isArray(data) ? data : [];
        setLibros(list);
        setFilterApplied(resultado?.filterApplied ?? null);
      } catch (err) {
        console.error('Error cargando libros:', err);
        const msg = err?.message ?? err?.error;
        const text = typeof msg === 'string' ? msg : String(err || '');
        setError(text || 'Error al cargar los libros. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [syncDone, hastagFromUrl, filtroLetra, filtrarPor, busqueda, tipoSlugActive]);

  const refreshBooks = useCallback(async () => {
    try {
      let resultado;
      if (hastagFromUrl) resultado = await getBooksByHastag(hastagFromUrl, tipoSlugActive);
      else if (busqueda) resultado = await searchBooks(busqueda, filtrarPor, tipoSlugActive);
      else if (filtroLetra) resultado = await filterBooksByLetter(filtroLetra, filtrarPor, tipoSlugActive);
      else resultado = await getAllBooks(tipoSlugActive);
      const data = resultado?.data ?? resultado;
      setLibros(Array.isArray(data) ? data : []);
      setFilterApplied(resultado?.filterApplied ?? null);
    } catch {
      // ignorar
    }
  }, [hastagFromUrl, busqueda, filtrarPor, filtroLetra, tipoSlugActive]);

  /** Un solo control: alterna entre búsqueda por obra (título en BD) y por autor, sin borrar el texto. */
  const alternarCriterioBusqueda = () => {
    setFiltrarPor((prev) => (prev === 'titulo' ? 'autor' : 'titulo'));
    setFiltroLetra(null);
    setPaginaActual(1);
  };

  const handleDeleteBook = async (libro) => {
    if (!libro?.id) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm(`¿Seguro que quieres eliminar el libro "${libro.titulo}"?`);
    if (!ok) return;
    try {
      const token = getToken?.();
      await deleteBook(libro.id, token);
      setSelectedBook(null);
      setDetailBook(null);
      await refreshBooks();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err?.message || 'Error al eliminar el libro');
    }
  };

  const limpiarFiltros = () => {
    setFiltroLetra(null);
    setBusqueda('');
    setPaginaActual(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('hastag');
      return next;
    }, { replace: true });
  };

  const esDiscoteca = (() => {
    const tipo = tiposColeccion.find((tc) => tc.slug === tipoSlugActive);
    const slugLower = (tipoSlugActive || '').toLowerCase();
    const nombreLower = (tipo?.nombre || '').toLowerCase();
    return ['discoteca', 'música', 'musica'].some(
      (k) => slugLower.includes(k) || nombreLower.includes(k),
    );
  })();

  const placeholderBusqueda =
    filtrarPor === 'titulo'
      ? 'Buscar por título…'
      : esDiscoteca
        ? 'Buscar por artista…'
        : 'Buscar por autor…';

  const etiquetaCriterioBusqueda =
    filtrarPor === 'titulo' ? 'Buscar por: Título' : 'Buscar por: Autor';

  const tituloPagina = (() => {
    const tipo = tiposColeccion.find((tc) => tc.slug === tipoSlugActive);
    const nombreLower = (tipo?.nombre || '').toLowerCase();
    if (esDiscoteca) return 'Catálogo de discoteca de casa';
    if (tipo) return `Catálogo de ${nombreLower || tipo.slug} de casa`;
    return 'Catálogo de libros de casa';
  })();

  const filtrarPorAutor = (nombreAutor) => {
    const q = (nombreAutor || '').trim();
    if (!q) return;
    setFiltrarPor('autor');
    setBusqueda(q);
    setFiltroLetra(null);
    setPaginaActual(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('hastag');
      return next;
    }, { replace: true });
  };

  return (
    <div className="app-container">
      <h2 className="page-title">{tituloPagina}</h2>

      {tiposColeccion.length > 0 && (
        <div className="filtro-tipo-coleccion">
          <span className="filtro-tipo-label">Tipo:</span>
          <button
            type="button"
            onClick={() => navigate('/')}
            className={tipoSlugActive === null ? 'activo' : ''}
          >
            <span role="img" aria-label="Todos">🏠</span>
            <span className="tipo-label-text"> Todos</span>
          </button>
          {tiposColeccion.map((tc) => {
            const slugLower = (tc.slug || '').toLowerCase();
            const nombreLower = (tc.nombre || '').toLowerCase();
            const isDisco = ['discoteca', 'música', 'musica'].some(
              (k) => slugLower.includes(k) || nombreLower.includes(k),
            );
            const isVideo = ['video', 'cine'].some(
              (k) => slugLower.includes(k) || nombreLower.includes(k),
            );
            const icon = isDisco ? '🎵' : isVideo ? '🎬' : '📚';
            const isActive =
              tipoSlugActive === tc.slug ||
              (filterApplied?.tipoId != null && Number(filterApplied.tipoId) === Number(tc.id));
            return (
              <button
                key={tc.id}
                type="button"
                onClick={() => navigate(`/${tc.slug}`)}
                className={isActive ? 'activo' : ''}
              >
                <span role="img" aria-label={tc.nombre}>{icon}</span>
                <span className="tipo-label-text"> {tc.nombre}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="filtro-container">
        <div className="opciones-busqueda">
          <button
            type="button"
            className="busqueda-criterio-toggle"
            onClick={alternarCriterioBusqueda}
            title={
              filtrarPor === 'titulo'
                ? 'Buscando por título de la obra. Clic para buscar por autor.'
                : 'Buscando por autor. Clic para buscar por título.'
            }
            aria-label={
              filtrarPor === 'titulo'
                ? 'Criterio: título. Activar búsqueda por autor'
                : 'Criterio: autor. Activar búsqueda por título'
            }
          >
            {etiquetaCriterioBusqueda}
          </button>
          <input
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            className="busqueda-input"
            placeholder={placeholderBusqueda}
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
            aria-label={filtrarPor === 'titulo' ? 'Texto a buscar por título' : 'Texto a buscar por autor'}
          />
          {(busqueda || filtroLetra || hastagFromUrl || tipoSlugActive) && (
            <button
              type="button"
              className="busqueda-clear-btn"
              onClick={() => {
                limpiarFiltros();
                setTipoSlug(null);
                navigate('/');
              }}
              aria-label="Limpiar filtros"
            >
              ✖
            </button>
          )}
        </div>
        <div className="alfabeto">
          {alfabeto.map((letra) => (
            <button
              key={letra}
              type="button"
              onClick={() => {
                setFiltroLetra(letra);
                setPaginaActual(1);
              }}
              className={filtroLetra === letra ? 'activo' : ''}
            >
              {letra}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="loading">
          <p>Cargando libros desde Turso...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {hastagFromUrl && (
            <div className="filtro-hastag-chip">
              <span>Filtro: #{hastagFromUrl.replace(/^#+/, '')}</span>
              <button
                type="button"
                onClick={() =>
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete('hastag');
                    return next;
                  }, { replace: true })
                }
                aria-label="Quitar filtro por hastag"
              >
                Quitar
              </button>
            </div>
          )}
          <div className="resultados-info">
            <p>
              {libros.length} título(s) encontrado(s)
              {tipoSlugActive || filterApplied?.tipoId != null
                ? ` en ${tiposColeccion.find((tc) => tc.slug === tipoSlugActive || Number(tc.id) === Number(filterApplied?.tipoId))?.nombre ?? tipoSlugActive ?? ''}`
                : ''}
              {hastagFromUrl ? ` con hastag #${hastagFromUrl.replace(/^#+/, '')}` : ''}
              {filtroLetra
                ? (filtrarPor === 'titulo'
                  ? ` con obra (título) que empieza por ${filtroLetra}`
                  : ` con autor que empieza por ${filtroLetra}`)
                : ''}
              {busqueda
                ? (filtrarPor === 'titulo'
                  ? ` en obra/título que contiene "${busqueda}"`
                  : ` en autor que contiene "${busqueda}"`)
                : ''}
            </p>
            {/* Detalle técnico del filtro (solo para depuración, oculto en producción) */}
          </div>
          <BookList
            libros={libros.slice(
              (paginaActual - 1) * librosPorPagina,
              paginaActual * librosPorPagina
            )}
            onBookClick={(libro) => setSelectedBook(libro)}
            discotecaMode={esDiscoteca}
            onAuthorClick={filtrarPorAutor}
          />
          <Pagination
            totalLibros={libros.length}
            librosPorPagina={librosPorPagina}
            paginaActual={paginaActual}
            setPaginaActual={setPaginaActual}
          />
        </>
      )}

      {showAltaLibro && (
        <AltaLibro
          onClose={() => setShowAltaLibro(false)}
          onSuccess={refreshBooks}
          getToken={getToken}
        />
      )}
      {showAltaDisco && (
        <AltaDisco
          onClose={() => setShowAltaDisco(false)}
          onSuccess={refreshBooks}
          getToken={getToken}
        />
      )}
      {selectedBook && (
        <BookDetailModal
          libro={detailBook || selectedBook}
          onClose={() => { setSelectedBook(null); setDetailBook(null); }}
          canEdit={isStaff || isAdmin}
          onEdit={(libro) => {
            setSelectedBook(null);
            setBookToEdit(libro);
          }}
          onDelete={handleDeleteBook}
          isDiscoteca={esDiscoteca}
        />
      )}
      {bookToEdit && (
        <EditarLibro
          libro={bookToEdit}
          onClose={() => setBookToEdit(null)}
          onSuccess={refreshBooks}
          getToken={getToken}
        />
      )}
    </div>
  );
}
