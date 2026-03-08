import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllBooks, searchBooks, filterBooksByLetter, syncFromLocal } from '../services/tursoService';
import BookList from './BookList';
import Pagination from './Pagination';
import BookDetailModal from './BookDetailModal';
import AltaLibro from './AltaLibro';
import EditarLibro from './EditarLibro';
import { useAuth } from '../contexts/AuthContext';

const alfabeto = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
const librosPorPagina = 10;

export default function LibrosCatalog() {
  const [filtroLetra, setFiltroLetra] = useState(null);
  const [filtrarPor, setFiltrarPor] = useState('titulo');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [libros, setLibros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showAltaLibro, setShowAltaLibro] = useState(false);
  const [bookToEdit, setBookToEdit] = useState(null);
  const [syncDone, setSyncDone] = useState(false);
  const { getToken, isStaff, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    syncFromLocal().then(() => setSyncDone(true));
  }, []);

  useEffect(() => {
    if (searchParams.get('openAlta') === '1') {
      setShowAltaLibro(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!syncDone) return;
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);
        let resultado;
        if (busqueda) {
          resultado = await searchBooks(busqueda, filtrarPor);
        } else if (filtroLetra) {
          resultado = await filterBooksByLetter(filtroLetra, filtrarPor);
        } else {
          resultado = await getAllBooks();
        }
        setLibros(resultado);
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
  }, [syncDone, filtroLetra, filtrarPor, busqueda]);

  const refreshBooks = useCallback(async () => {
    try {
      let resultado;
      if (busqueda) resultado = await searchBooks(busqueda, filtrarPor);
      else if (filtroLetra) resultado = await filterBooksByLetter(filtroLetra, filtrarPor);
      else resultado = await getAllBooks();
      setLibros(resultado);
    } catch {
      // ignorar
    }
  }, [busqueda, filtrarPor, filtroLetra]);

  const cambiarTipoDeFiltro = () => {
    setFiltrarPor(filtrarPor === 'titulo' ? 'autor' : 'titulo');
    setFiltroLetra(null);
    setBusqueda('');
    setPaginaActual(1);
  };

  const limpiarFiltros = () => {
    setFiltroLetra(null);
    setBusqueda('');
    setPaginaActual(1);
  };

  return (
    <div className="app-container">
      <h2 className="page-title">Catálogo de libros de casa</h2>

      <div className="filtro-container">
        <div className="opciones-busqueda">
          <button onClick={cambiarTipoDeFiltro} type="button">
            Buscar por: {filtrarPor === 'titulo' ? 'Título' : 'Autor'}
          </button>
          <input
            type="text"
            placeholder={`Buscar por ${filtrarPor === 'titulo' ? 'título' : 'autor'}...`}
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
          />
          {(busqueda || filtroLetra) && (
            <button onClick={limpiarFiltros} type="button">
              Limpiar Filtros
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
          <div className="resultados-info">
            <p>
              {libros.length} libro(s) encontrado(s)
              {filtroLetra ? ` que comienzan con ${filtroLetra}` : ''}
              {busqueda ? ` que contienen "${busqueda}"` : ''}
            </p>
          </div>
          <BookList
            libros={libros.slice(
              (paginaActual - 1) * librosPorPagina,
              paginaActual * librosPorPagina
            )}
            onBookClick={(libro) => setSelectedBook(libro)}
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
      {selectedBook && (
        <BookDetailModal
          libro={selectedBook}
          onClose={() => setSelectedBook(null)}
          canEdit={isStaff || isAdmin}
          onEdit={(libro) => {
            setSelectedBook(null);
            setBookToEdit(libro);
          }}
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
