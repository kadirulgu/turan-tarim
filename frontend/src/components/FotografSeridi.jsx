import { useEffect, useRef, useState } from 'react';
import { dosyaAc, dosyaBlobUrl } from '../api';

// Telefon fotoğrafları 3-6 MB olabilir; yüklemeden önce en uzun kenarı 1600 px'e
// küçültüp JPEG'e çevirmek yüklemeyi hızlandırır ve diski şişirmez.
async function kucult(dosya, enUzunKenar = 1600) {
  try {
    const resim = await createImageBitmap(dosya, { imageOrientation: 'from-image' });
    const oran = Math.min(1, enUzunKenar / Math.max(resim.width, resim.height));
    const tuval = document.createElement('canvas');
    tuval.width = Math.round(resim.width * oran);
    tuval.height = Math.round(resim.height * oran);
    tuval.getContext('2d').drawImage(resim, 0, 0, tuval.width, tuval.height);
    resim.close?.();
    const blob = await new Promise((coz) => tuval.toBlob(coz, 'image/jpeg', 0.85));
    return blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : dosya;
  } catch {
    return dosya;
  }
}

function Kucukresim({ dosyaAdi }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let iptal = false;
    let olusanUrl = null;
    dosyaBlobUrl(`fotograflar/${dosyaAdi}`)
      .then((u) => {
        if (iptal) URL.revokeObjectURL(u);
        else {
          olusanUrl = u;
          setUrl(u);
        }
      })
      .catch(() => {});
    return () => {
      iptal = true;
      if (olusanUrl) URL.revokeObjectURL(olusanUrl);
    };
  }, [dosyaAdi]);

  return url ? <img src={url} alt="Tarla fotoğrafı" /> : <span className="foto-yukleniyor">…</span>;
}

// fotograflar: [{ id, dosya_adi }], onYukle(File[]), onSil(id)
export default function FotografSeridi({ fotograflar = [], onYukle, onSil }) {
  const girdi = useRef(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const secildi = async (e) => {
    const dosyalar = [...e.target.files];
    e.target.value = '';
    if (dosyalar.length === 0) return;
    setYukleniyor(true);
    try {
      await onYukle(await Promise.all(dosyalar.map((d) => kucult(d))));
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="foto-seridi">
      {fotograflar.map((f) => (
        <div className="foto-kutu" key={f.id}>
          <button type="button" className="foto-ac" title="Büyüt" onClick={() => dosyaAc(`fotograflar/${f.dosya_adi}`)}>
            <Kucukresim dosyaAdi={f.dosya_adi} />
          </button>
          <button type="button" className="foto-sil" title="Fotoğrafı sil" onClick={() => onSil(f.id)}>×</button>
        </div>
      ))}
      <input ref={girdi} type="file" accept="image/*" multiple hidden onChange={secildi} />
      <button type="button" className="btn-ikincil foto-ekle" disabled={yukleniyor} onClick={() => girdi.current.click()}>
        {yukleniyor ? '⏳' : '📷'}
      </button>
    </div>
  );
}
