import { useState, useEffect } from 'react';
import { getAllBooks, searchBooks, filterBooksByLetter } from './services/apiService';
import BookList from './components/BookList';
import Pagination from './components/Pagination';
import BookDetailModal from './components/BookDetailModal';
import Login from './components/Login';
import { useAuth } from './contexts/AuthContext';
import './App.css'

function App() {
  const [filtroLetra, setFiltroLetra] = useState(null);
  const [filtrarPor, setFiltrarPor] = useState('titulo');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [libros, setLibros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const { user, logout, isAuthenticated } = useAuth();
  const librosPorPagina = 10;

  const alfabeto = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

  // Detectar cambios de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cargar libros desde Turso
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let response;
        
        if (busqueda) {
          // Buscar por término
          response = await searchBooks(busqueda, filtrarPor);
        } else if (filtroLetra) {
          // Filtrar por letra
          response = await filterBooksByLetter(filtroLetra, filtrarPor);
        } else {
          // Cargar todos los libros
          response = await getAllBooks();
        }
        
        // La API devuelve { data: [...], total: N }
        setLibros(response.data || response);
      } catch (err) {
        console.error('Error cargando libros:', err);
        setError('Error al cargar los libros. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [filtroLetra, filtrarPor, busqueda]);

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
    <div>
      <div className="header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderBottom: '2px solid #ddd',
        marginBottom: '20px'
      }}>
        <h2 style={{margin: 0, textAlign: 'left'}}>Catálogo de libros de casa</h2>
        {isDesktop && (
          <div className="auth-section" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            {isAuthenticated ? (
              <>
                <span className="user-info" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  color: '#333'
                }}>
                  👤 {user?.username}
                  {user?.isAdmin && <span className="admin-badge" style={{
                    backgroundColor: '#ff9800',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75em',
                    fontWeight: 700,
                    marginLeft: '5px'
                  }}>Admin</span>}
                </span>
                <button onClick={logout} className="auth-button logout-button" style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: '#f44336',
                  color: 'white'
                }}>
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)} className="auth-button login-button" style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: '#4CAF50',
                color: 'white'
              }}>
                Iniciar Sesión
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="filtro-container">
        <div className="opciones-busqueda">
          <button onClick={cambiarTipoDeFiltro}>
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
            <button onClick={limpiarFiltros}>
              Limpiar Filtros
            </button>
          )}
        </div>

        <div className="alfabeto">
          {alfabeto.map(letra => (
            <button
              key={letra}
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
            onBookClick={setSelectedBook}
          />

          <Pagination
            totalLibros={libros.length}
            librosPorPagina={librosPorPagina}
            paginaActual={paginaActual}
            setPaginaActual={setPaginaActual}
          />
        </>
      )}

      {selectedBook && (
        <BookDetailModal
          libro={selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}

      {showLogin && (
        <Login onClose={() => setShowLogin(false)} />
      )}
    </div>
  )
}

export default App;