import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { getCollectionTypes, getAllBooks, searchBooks, filterBooksByLetter, getBooksByHastag, getBookById, syncFromLocal, deleteBook } from '../services/tursoService';
import BookList from './BookList';
import Pagination from './Pagination';
import BookDetailModal from './BookDetailModal';
import AltaLibro from './AltaLibro';
import AltaDisco from './AltaDisco';
import AltaVideo from './AltaVideo';
import EditarLibro from './EditarLibro';
import { useAuth } from '../contexts/AuthContext';

const alfabeto = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
const librosPorPagina = 15;

export default function LibrosCatalog() {
  const [tiposColeccion, setTiposColeccion] = useState([]);
  const [tipoSlug, setTipoSlug] = useState(null); // null = todos
  const [filtroLetra, setFiltroLetra] = useState(null);
  const [filtrarPor, setFiltrarPor] = useState('titulo');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [libros, setLibros] = useState([]);
  const [totalLibros, setTotalLibros] = useState(0);
  const [filterApplied, setFilterApplied] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [detailBook, setDetailBook] = useState(null);
  const [detailBookLoading, setDetailBookLoading] = useState(false);
  const [showAltaLibro, setShowAltaLibro] = useState(false);
  const [showAltaDisco, setShowAltaDisco] = useState(false);
  const [showAltaVideo, setShowAltaVideo] = useState(false);
  const [bookToEdit, setBookToEdit] = useState(null);
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
    // Sync en segundo plano: no bloquear el listado (antes dejaba la UI en "Cargando..." si se colgaba).
    syncFromLocal().catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get('openAlta') === '1') {
      const slug = (slugFromPath || '').toLowerCase();
      const esDiscoteca = pathname !== '/' && ['discoteca', 'musica', 'música', 'audio'].some(
        (k) => slug === k || slug.includes(k),
      );
      const esVideoteca = pathname !== '/' && ['video', 'videoteca', 'cine'].some(
        (k) => slug === k || slug.includes(k),
      );
      if (esDiscoteca) {
        setShowAltaDisco(true);
      } else if (esVideoteca) {
        setShowAltaVideo(true);
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
      setDetailBookLoading(false);
      return;
    }
    let cancelled = false;
    setDetailBook(null);
    setDetailBookLoading(true);
    getBookById(selectedBook.id)
      .then((full) => {
        if (!cancelled) setDetailBook(full);
      })
      .catch(() => {
        if (!cancelled) setDetailBook(selectedBook);
      })
      .finally(() => {
        if (!cancelled) setDetailBookLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedBook?.id]);

  // Filtro activo: slug de la URL (pathname)
  const tipoSlugActive = pathname === '/' ? null : slugFromPath;

  useEffect(() => {
    setPaginaActual(1);
  }, [tipoSlugActive, busqueda, filtroLetra, hastagFromUrl, filtrarPor]);

  useEffect(() => {
    let cancelled = false;
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);
        let resultado;
        const pageOpts = {
          limit: librosPorPagina,
          offset: (paginaActual - 1) * librosPorPagina,
        };
        if (hastagFromUrl) {
          resultado = await getBooksByHastag(hastagFromUrl, tipoSlugActive);
        } else if (busqueda) {
          resultado = await searchBooks(busqueda, filtrarPor, tipoSlugActive);
        } else if (filtroLetra) {
          resultado = await filterBooksByLetter(filtroLetra, filtrarPor, tipoSlugActive);
        } else {
          // Listado general: paginación en servidor (evita JSON de ~MB que corta el proxy).
          resultado = await getAllBooks(tipoSlugActive, pageOpts);
        }
        if (cancelled) return;
        const data = resultado?.data ?? resultado;
        const list = Array.isArray(data) ? data : [];
        const serverPaged = !hastagFromUrl && !busqueda && !filtroLetra;
        setLibros(list);
        setTotalLibros(
          serverPaged
            ? Number(resultado?.total ?? list.length)
            : list.length,
        );
        setFilterApplied(resultado?.filterApplied ?? null);
      } catch (err) {
        if (cancelled) return;
        console.error('Error cargando libros:', err);
        const msg = err?.message ?? err?.error;
        const text = typeof msg === 'string' ? msg : String(err || '');
        setError(text || 'Error al cargar los libros. Por favor, intenta de nuevo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBooks();
    return () => { cancelled = true; };
  }, [hastagFromUrl, filtroLetra, filtrarPor, busqueda, tipoSlugActive, paginaActual]);

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

  const esVideoteca = (() => {
    const tipo = tiposColeccion.find((tc) => tc.slug === tipoSlugActive);
    const slugLower = (tipoSlugActive || '').toLowerCase();
    const nombreLower = (tipo?.nombre || '').toLowerCase();
    return ['video', 'cine', 'videoteca'].some(
      (k) => slugLower.includes(k) || nombreLower.includes(k),
    );
  })();

  const placeholderBusqueda =
    filtrarPor === 'titulo'
      ? 'EAN, título, hastag, catálogo, MBID…'
      : esDiscoteca
        ? 'Buscar por artista…'
        : esVideoteca
          ? 'Buscar por director…'
          : 'Buscar por autor…';

  const etiquetaCriterioBusqueda =
    filtrarPor === 'titulo' ? 'Buscar por: Obra' : 'Buscar por: Autor';

  const tituloPagina = (() => {
    const tipo = tiposColeccion.find((tc) => tc.slug === tipoSlugActive);
    const nombreLower = (tipo?.nombre || '').toLowerCase();
    if (esDiscoteca) return 'Catálogo de discoteca de casa';
    if (esVideoteca) return 'Catálogo de videoteca de casa';
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
            onClick={() => {
              setFilterApplied(null);
              setPaginaActual(1);
              navigate('/');
            }}
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
            const isActive = (() => {
              if (!tipoSlugActive) return false;
              const a = String(tipoSlugActive).normalize('NFC').trim().toLowerCase();
              const b = String(tc.slug || '').normalize('NFC').trim().toLowerCase();
              if (a === b) return true;
              const strip = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
              return strip(a) === strip(b);
            })();
            return (
              <button
                key={tc.id}
                type="button"
                onClick={() => {
                  setFilterApplied(null);
                  setPaginaActual(1);
                  navigate(`/${tc.slug}`);
                }}
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
                ? 'Búsqueda por obra (EAN, título, hastag, etc.). Clic para buscar por autor.'
                : 'Buscando por autor. Clic para buscar por obra.'
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
            aria-label={
              filtrarPor === 'titulo'
                ? 'Texto a buscar: EAN, título, hastag u otros datos de la obra'
                : 'Texto a buscar por autor'
            }
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
              {totalLibros} título(s) encontrado(s)
              {tipoSlugActive
                ? ` en ${tiposColeccion.find((tc) => {
                  const a = String(tipoSlugActive).normalize('NFC').trim().toLowerCase();
                  const b = String(tc.slug || '').normalize('NFC').trim().toLowerCase();
                  return a === b;
                })?.nombre ?? tipoSlugActive}`
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
          </div>
          <BookList
            libros={
              hastagFromUrl || busqueda || filtroLetra
                ? libros.slice(
                  (paginaActual - 1) * librosPorPagina,
                  paginaActual * librosPorPagina,
                )
                : libros
            }
            onBookClick={(libro) => setSelectedBook(libro)}
            discotecaMode={esDiscoteca}
            videotecaMode={esVideoteca}
            onAuthorClick={filtrarPorAutor}
          />
          <Pagination
            totalLibros={totalLibros}
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
      {showAltaVideo && (
        <AltaVideo
          onClose={() => setShowAltaVideo(false)}
          onSuccess={refreshBooks}
          getToken={getToken}
        />
      )}
      {selectedBook && (
        <BookDetailModal
          libro={detailBook || selectedBook}
          detailLoading={detailBookLoading}
          onClose={() => { setSelectedBook(null); setDetailBook(null); }}
          canEdit={isStaff || isAdmin}
          onEdit={(libro) => {
            setSelectedBook(null);
            setBookToEdit(libro);
          }}
          onDelete={handleDeleteBook}
          isDiscoteca={esDiscoteca}
          isVideoteca={esVideoteca}
        />
      )}
      {bookToEdit && (
        <EditarLibro
          libro={bookToEdit}
          isVideoteca={esVideoteca}
          onClose={() => setBookToEdit(null)}
          onSuccess={refreshBooks}
          getToken={getToken}
        />
      )}
    </div>
  );
}
