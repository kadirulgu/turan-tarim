import { useEffect } from 'react';
import GoncaLogo from './GoncaLogo';

const GOSTERIM_SURESI_MS = 1800;

export default function AcilisEkrani({ onBitti }) {
  useEffect(() => {
    const zamanlayici = setTimeout(onBitti, GOSTERIM_SURESI_MS);
    return () => clearTimeout(zamanlayici);
  }, [onBitti]);

  return (
    <div className="acilis-ekrani">
      <GoncaLogo boyut={96} className="acilis-logo" />
      <h1 className="acilis-baslik">Turan Tarım</h1>
      <p className="acilis-etiket">Eskişehir Promosyon · v1</p>
    </div>
  );
}
