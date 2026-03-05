import { useState, useEffect, useCallback } from 'react';
import { getAllBooks, searchBooks, filterBooksByLetter } from './services/tursoService';
import BookList from './components/BookList';
import Pagination from './components/Pagination';
import BookDetailModal from './components/BookDetailModal';
import Login from './components/Login';
import AltaLibro from './components/AltaLibro';
import { useAuth } from './contexts/AuthContext';
import './App.css';



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
  const [showAltaLibro, setShowAltaLibro] = useState(false);
  const { user, logout, isAdmin, isStaff, getToken } = useAuth();

  const librosPorPagina = 10;



  const alfabeto = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');



  // Cargar libros desde Turso

  useEffect(() => {

    const fetchBooks = async () => {

      try {

        setLoading(true);

        setError(null);

        

        let resultado;

        

        if (busqueda) {

          // Buscar por término

          resultado = await searchBooks(busqueda, filtrarPor);

        } else if (filtroLetra) {

          // Filtrar por letra

          resultado = await filterBooksByLetter(filtroLetra, filtrarPor);

        } else {

          // Cargar todos los libros

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
  }, [filtroLetra, filtrarPor, busqueda]);

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

      <header className="auth-header">

        <div className="auth-section">
          {user ? (
            <>
              <span className="user-info">
                {user.username}
                {isAdmin && <span className="admin-badge">Admin</span>}
              </span>
              {(isStaff || isAdmin) && (
                <button
                  type="button"
                  className="auth-button alta-button"
                  onClick={() => setShowAltaLibro(true)}
                >
                  Alta de libro
                </button>
              )}
              <button type="button" className="auth-button logout-button" onClick={logout}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <button type="button" className="auth-button login-button" onClick={() => setShowLogin(true)}>
              Iniciar sesión
            </button>
          )}
        </div>

      </header>

      <h2>Catálogo de libros de casa</h2>

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

      {showLogin && <Login onClose={() => setShowLogin(false)} />}
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

        />

      )}

    </div>

  )

}



export default App;