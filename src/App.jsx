import { useState, useMemo } from 'react';
import titulos from './assets/data/Titulo_Autor.json';
import BookList from './components/BookList';
import Pagination from './components/Pagination';
import './App.css'

function App() {
  const [filtroLetra, setFiltroLetra] = useState(null);
  const [filtrarPor, setFiltrarPor] = useState('titulo');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  /*   const librosPorPagina = 12; */
  const librosPorPagina = 10;

  const alfabeto = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

  const librosFiltrados = useMemo(() => {
    let resultado = titulos;

    if (busqueda) {
      const busquedaMinusc = busqueda.toLowerCase();
      resultado = resultado.filter(libro =>
        libro[filtrarPor === 'titulo' ? 'titulo' : 'nombreAutor']
          .toLowerCase()
          .includes(busquedaMinusc)
      );
    }

    if (filtroLetra) {
      resultado = resultado.filter(libro =>
        libro[filtrarPor === 'titulo' ? 'titulo' : 'nombreAutor']
          .toUpperCase()
          .startsWith(filtroLetra)
      );
    }

    return resultado;
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
      <h2>Catálogo de libros de casa</h2>
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

      <div className="resultados-info">
        <p>
          {librosFiltrados.length} libro(s) encontrado(s)
          {filtroLetra ? ` que comienzan con ${filtroLetra}` : ''}
          {busqueda ? ` que contienen "${busqueda}"` : ''}
        </p>
      </div>

      <BookList
        libros={librosFiltrados.slice(
          (paginaActual - 1) * librosPorPagina,
          paginaActual * librosPorPagina
        )}
      />

      <Pagination
        totalLibros={librosFiltrados.length}
        librosPorPagina={librosPorPagina}
        paginaActual={paginaActual}
        setPaginaActual={setPaginaActual}
      />
    </div>
  )
}

export default App;