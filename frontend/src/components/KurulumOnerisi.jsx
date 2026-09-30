import { useEffect, useState } from 'react';

// Siteyi telefona uygulama gibi kurmayı öneren kart. Android'de (Chrome)
// tarayıcının kurulum penceresini açan bir buton; iPhone'da Safari böyle bir
// pencere sunmadığı için "Paylaş → Ana Ekrana Ekle" adımları gösterilir.
// Kapatılınca bir daha gösterilmez; uygulama zaten kurulu açıldıysa hiç görünmez.

const KAPATILDI_ANAHTARI = 'kurulumOnerisiKapatildi';

const kuruluAcildi = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

// iPadOS 13+ kendini Mac olarak tanıtır; dokunmatik olmasından ayırt edilir
const iosMu = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function kapatildiMi() {
  try {
    return localStorage.getItem(KAPATILDI_ANAHTARI) === '1';
  } catch {
    return false;
  }
}

function PaylasIkonu() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-label="Paylaş" style={{ verticalAlign: '-3px' }}>
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11H6v10h12V11h-2" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function KurulumOnerisi() {
  const [androidIstemi, setAndroidIstemi] = useState(null);
  const [gizli, setGizli] = useState(() => kuruluAcildi() || kapatildiMi());
  const ios = iosMu();

  useEffect(() => {
    const yakala = (e) => {
      e.preventDefault();
      setAndroidIstemi(e);
    };
    const kuruldu = () => setGizli(true);
    window.addEventListener('beforeinstallprompt', yakala);
    window.addEventListener('appinstalled', kuruldu);
    return () => {
      window.removeEventListener('beforeinstallprompt', yakala);
      window.removeEventListener('appinstalled', kuruldu);
    };
  }, []);

  const kapat = () => {
    try {
      localStorage.setItem(KAPATILDI_ANAHTARI, '1');
    } catch {
      // gizli sekmede kayıt tutulamayabilir; sadece bu açılışta gizlenir
    }
    setGizli(true);
  };

  const androidKur = async () => {
    androidIstemi.prompt();
    const { outcome } = await androidIstemi.userChoice;
    setAndroidIstemi(null);
    if (outcome === 'accepted') setGizli(true);
  };

  if (gizli || (!ios && !androidIstemi)) return null;

  return (
    <div className="kurulum-onerisi">
      <img src="/apple-touch-icon.png" alt="" width="44" height="44" />
      <div className="kurulum-metin">
        <strong>Telefonuna uygulama olarak kur</strong>
        {ios ? (
          <span>
            Safari'de <PaylasIkonu /> <b>Paylaş</b>'a dokun (görünmüyorsa önce <b>•••</b> menüsünü aç), ardından{' '}
            <b>Ana Ekrana Ekle</b>'yi seç.
          </span>
        ) : (
          <span>Ana ekrandan tek dokunuşla, tam ekran açılır.</span>
        )}
      </div>
      {!ios && (
        <button type="button" onClick={androidKur}>
          Yükle
        </button>
      )}
      <button type="button" className="kurulum-kapat" onClick={kapat} aria-label="Kapat">
        ×
      </button>
    </div>
  );
}
