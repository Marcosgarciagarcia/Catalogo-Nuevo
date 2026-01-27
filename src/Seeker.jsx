import './App.css'

const Seeker = () => {
  return (
    <div>
      <select  id="searchField">
        <option value="title">Título</option>
        <option value="content">Autor</option>
        <option value="ean">EAN</option>
      </select>
      <input type="text" id="searchInput" placeholder="Buscar..." />
      <button id="searchButton">Buscar</button>
      <button id="resetButton">Restablecer</button>

    </div>
  );
};

export default Seeker;
/*   function performSearch() {
    const searchField = document.getElementById("searchField");
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const resetButton = document.getElementById("resetButton");
    const cardContainer = document.getElementById("cardContainer");
  }
}; */

