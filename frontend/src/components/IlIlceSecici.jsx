import { useEffect, useState } from 'react';

let veriPromise = null;
function veriyiYukle() {
  if (!veriPromise) {
    veriPromise = fetch('/data/il-ilce-mahalle.json').then((res) => res.json());
  }
  return veriPromise;
}

export default function IlIlceSecici({ il, ilce, mahalle, onIlDegisti, onIlceDegisti, onMahalleDegisti }) {
  const [veri, setVeri] = useState(null);

  useEffect(() => {
    veriyiYukle().then(setVeri);
  }, []);

  const iller = veri ? Object.keys(veri).sort((a, b) => a.localeCompare(b, 'tr')) : [];
  const ilceler = veri && il ? Object.keys(veri[il] || {}).sort((a, b) => a.localeCompare(b, 'tr')) : [];
  const mahalleler = veri && il && ilce ? veri[il]?.[ilce] || [] : [];

  return (
    <>
      <select
        value={il}
        onChange={(e) => {
          onIlDegisti(e.target.value);
          onIlceDegisti('');
          if (onMahalleDegisti) onMahalleDegisti('');
        }}
      >
        <option value="">{veri ? 'İl Seç' : 'Yükleniyor...'}</option>
        {iller.map((ilAdi) => (
          <option key={ilAdi} value={ilAdi}>{ilAdi}</option>
        ))}
      </select>

      <select
        value={ilce}
        onChange={(e) => {
          onIlceDegisti(e.target.value);
          if (onMahalleDegisti) onMahalleDegisti('');
        }}
        disabled={!il}
      >
        <option value="">İlçe Seç</option>
        {ilceler.map((ilceAdi) => (
          <option key={ilceAdi} value={ilceAdi}>{ilceAdi}</option>
        ))}
      </select>

      {onMahalleDegisti && (
        <select value={mahalle} onChange={(e) => onMahalleDegisti(e.target.value)} disabled={!ilce}>
          <option value="">Mahalle/Köy Seç</option>
          {mahalleler.map((mahalleAdi) => (
            <option key={mahalleAdi} value={mahalleAdi}>{mahalleAdi}</option>
          ))}
        </select>
      )}
    </>
  );
}
