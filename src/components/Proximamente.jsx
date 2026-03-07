import { useParams } from 'react-router-dom';
import './Proximamente.css';

export default function Proximamente() {
  const { slug } = useParams();
  const slugLabel = slug ? String(slug).replace(/-/g, ' ') : 'esta colección';

  return (
    <div className="proximamente">
      <p className="proximamente__badge">En desarrollo</p>
      <h2 className="proximamente__title">Esta opción está en desarrollo</h2>
      <p className="proximamente__text">
        El catálogo de <strong>{slugLabel}</strong> se está implementando y estará disponible próximamente.
      </p>
    </div>
  );
}
