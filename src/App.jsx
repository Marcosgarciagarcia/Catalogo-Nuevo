import { Routes, Route } from 'react-router-dom';
import CatalogTypeSelector from './components/CatalogTypeSelector';
import Layout from './components/Layout';
import LibrosCatalog from './components/LibrosCatalog';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<CatalogTypeSelector />} />
      <Route
        path="/libros"
        element={
          <Layout>
            <LibrosCatalog />
          </Layout>
        }
      />
      <Route
        path="/:slug"
        element={
          <Layout>
            <LibrosCatalog />
          </Layout>
        }
      />
    </Routes>
  );
}

export default App;
