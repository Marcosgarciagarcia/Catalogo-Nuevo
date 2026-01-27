function Pagination({
  totalLibros,
  librosPorPagina,
  paginaActual,
  setPaginaActual
}) {
  // Calcular número total de páginas
  const totalPaginas = Math.ceil(totalLibros / librosPorPagina);

  // Generar array de páginas para mostrar
  const generarPaginacion = () => {
    const paginas = [];

    // Página anterior
    paginas.push(
      <button
        key="prev"
        onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
        disabled={paginaActual === 1}
      >
        ←
      </button>
    );

    // Lógica para mostrar páginas
    if (totalPaginas <= 7) {
      // Si hay 7 o menos páginas, mostrar todas
      for (let i = 1; i <= totalPaginas; i++) {
        paginas.push(
          <button
            key={i}
            onClick={() => setPaginaActual(i)}
            className={paginaActual === i ? 'activo' : ''}
          >
            {i}
          </button>
        );
      }
    } else {
      // Lógica para más de 7 páginas
      if (paginaActual <= 3) {
        // Mostrar primeras 5 páginas
        for (let i = 1; i <= 5; i++) {
          paginas.push(
            <button
              key={i}
              onClick={() => setPaginaActual(i)}
              className={paginaActual === i ? 'activo' : ''}
            >
              {i}
            </button>
          );
        }
        paginas.push(<span key="dots1">...</span>);
        paginas.push(
          <button
            key={totalPaginas}
            onClick={() => setPaginaActual(totalPaginas)}
          >
            {totalPaginas}
          </button>
        );
      } else if (paginaActual > totalPaginas - 3) {
        // Mostrar últimas 5 páginas
        paginas.push(
          <button
            key={1}
            onClick={() => setPaginaActual(1)}
          >
            1
          </button>
        );
        paginas.push(<span key="dots2">...</span>);
        for (let i = totalPaginas - 4; i <= totalPaginas; i++) {
          paginas.push(
            <button
              key={i}
              onClick={() => setPaginaActual(i)}
              className={paginaActual === i ? 'activo' : ''}
            >
              {i}
            </button>
          );
        }
      } else {
        // Páginas del medio
        paginas.push(
          <button
            key={1}
            onClick={() => setPaginaActual(1)}
          >
            1
          </button>
        );
        paginas.push(<span key="dots3">...</span>);

        // Páginas alrededor de la página actual
        for (let i = paginaActual - 2; i <= paginaActual + 2; i++) {
          paginas.push(
            <button
              key={i}
              onClick={() => setPaginaActual(i)}
              className={paginaActual === i ? 'activo' : ''}
            >
              {i}
            </button>
          );
        }

        paginas.push(<span key="dots4">...</span>);
        paginas.push(
          <button
            key={totalPaginas}
            onClick={() => setPaginaActual(totalPaginas)}
          >
            {totalPaginas}
          </button>
        );
      }
    }

    // Página siguiente
    paginas.push(
      <button
        key="next"
        onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
        disabled={paginaActual === totalPaginas}
      >
        →
      </button>
    );

    return paginas;
  };

  // No mostrar paginación si solo hay una página
  if (totalPaginas <= 1) return null;

  return (
    <div className="pagination">
      {generarPaginacion()}
    </div>
  );
}

export default Pagination;