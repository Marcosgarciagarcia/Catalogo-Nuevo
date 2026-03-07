import { useParams } from 'react-router-dom';
import './Proximamente.css';

export default function Proximamente() {
  const { slug } = useParams();
  const slugLabel = slug ? String(slug).replace(/-/g, ' ') : 'esta colección';

  return (
    <div className="proximamente">
      <h2 className="proximamente__title">Próximamente</h2>
      <p className="proximamente__text">
        El catálogo de <strong>{slugLabel}</strong> estará disponible en futuras versiones.
      </p>
    </div>
  );
}
