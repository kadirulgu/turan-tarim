import { useEffect, useRef, useState } from 'react';

// Kimlik kartı (ID-1) en/boy oranı: 85,6 × 54 mm
const KART_ORANI = 85.6 / 54;
const CERCEVE_GENISLIK = 0.88; // görüntü genişliğinin oranı
const PAY = 0.04; // kırparken kart kenarları kesilmesin diye bırakılan pay

// Canlı kamera görüntüsünde yeşil kart çerçevesi gösterir; çekilen kareyi çerçeveye göre kırpıp
// Blob olarak verir. Kamera açılamazsa onHata ile bildirir (çağıran dosya seçmeye geri döner).
export default function KimlikKamerasi({ onCekildi, onKapat, onHata }) {
  const video = useRef(null);
  const [hazir, setHazir] = useState(false);
  const [cerceve, setCerceve] = useState(null);

  useEffect(() => {
    // Kamera yalnızca HTTPS'te ve destekleyen tarayıcılarda açılır
    if (!navigator.mediaDevices?.getUserMedia) {
      onHata();
      return undefined;
    }
    let akis;
    let iptal = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((a) => {
        if (iptal) return a.getTracks().forEach((t) => t.stop());
        akis = a;
        video.current.srcObject = a;
      })
      .catch(() => onHata());
    return () => {
      iptal = true;
      akis?.getTracks().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- kamera yalnızca açılışta bir kez başlatılır

  // Çerçeve boyutu ekran boyutuna göre hesaplanır (döndürme/yeniden boyutlandırmada güncellenir)
  useEffect(() => {
    const hesapla = () => {
      const el = video.current;
      if (!el) return;
      const genislik = Math.min(el.clientWidth * CERCEVE_GENISLIK, el.clientHeight * 0.8 * KART_ORANI);
      setCerceve({ genislik, yukseklik: genislik / KART_ORANI });
    };
    hesapla();
    window.addEventListener('resize', hesapla);
    return () => window.removeEventListener('resize', hesapla);
  }, []);

  const cek = () => {
    const el = video.current;
    const vw = el.videoWidth;
    const vh = el.videoHeight;
    // Video "object-fit: cover" ile doldurur: görüntünün ekrana ölçeği ve taşan kısmı
    const olcek = Math.max(el.clientWidth / vw, el.clientHeight / vh);
    const tasmaX = (vw * olcek - el.clientWidth) / 2;
    const tasmaY = (vh * olcek - el.clientHeight) / 2;
    const g = cerceve.genislik * (1 + 2 * PAY);
    const y = cerceve.yukseklik * (1 + 2 * PAY);
    const sol = Math.max(0, ((el.clientWidth - g) / 2 + tasmaX) / olcek);
    const ust = Math.max(0, ((el.clientHeight - y) / 2 + tasmaY) / olcek);
    const kirpG = Math.min(vw - sol, g / olcek);
    const kirpY = Math.min(vh - ust, y / olcek);

    const tuval = document.createElement('canvas');
    tuval.width = Math.round(kirpG);
    tuval.height = Math.round(kirpY);
    tuval.getContext('2d').drawImage(el, sol, ust, kirpG, kirpY, 0, 0, tuval.width, tuval.height);
    tuval.toBlob((blob) => blob && onCekildi(blob), 'image/jpeg', 0.95);
  };

  return (
    <div className="kamera-ekrani">
      <video ref={video} autoPlay playsInline muted onLoadedMetadata={() => setHazir(true)} />
      {cerceve && (
        <div className="kamera-cerceve" style={{ width: cerceve.genislik, height: cerceve.yukseklik }}>
          <i className="kose sol-ust" />
          <i className="kose sag-ust" />
          <i className="kose sol-alt" />
          <i className="kose sag-alt" />
          <i className="foto-izi" />
          <div className="kamera-ipucu">
            <strong>Kartı yeşil çerçeveye yerleştirin</strong>
            <span>Ön yüzde vesikalık fotoğraf sol tarafta olur. Parlama olmasın, kart düz dursun.</span>
          </div>
        </div>
      )}
      <div className="kamera-alt">
        <button type="button" className="kamera-yan" onClick={onKapat}>
          Vazgeç
        </button>
        <button type="button" className="kamera-deklansor" onClick={cek} disabled={!hazir || !cerceve} aria-label="Fotoğraf çek" />
        <span className="kamera-yan" />
      </div>
    </div>
  );
}
