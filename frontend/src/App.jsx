import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Ozet from './pages/Ozet';
import Harita from './pages/Harita';
import Cariler from './pages/Cariler';
import Araziler from './pages/Araziler';
import Sozlesmeler from './pages/Sozlesmeler';
import Ekimler from './pages/Ekimler';
import Receteler from './pages/Receteler';
import Firmalar from './pages/Firmalar';
import HububatBorsasi from './pages/HububatBorsasi';
import Giris from './pages/Giris';
import Kullanicilar from './pages/Kullanicilar';
import Kilavuz from './pages/Kilavuz';
import HataSiniri from './components/HataSiniri';
import AcilisEkrani from './components/AcilisEkrani';
import KurulumOnerisi from './components/KurulumOnerisi';
import { api } from './api';
import { useTabloEtiketleri } from './tabloEtiketleri';
import './App.css';

const linkSinifi = ({ isActive }) => (isActive ? 'aktif' : undefined);

const SAYFALAR = [
  { yol: '/', ikon: '📊', ad: 'Özet', altMenu: true },
  { yol: '/harita', ikon: '🗺️', ad: 'Harita', altMenu: true },
  { yol: '/cariler', ikon: '👤', ad: 'Çiftçi / Cari', kisaAd: 'Çiftçi', altMenu: true },
  { yol: '/araziler', ikon: '🌾', ad: 'Araziler' },
  { yol: '/sozlesmeler', ikon: '📋', ad: 'Sözleşmeler' },
  { yol: '/ekimler', ikon: '🌱', ad: 'Ekimler', altMenu: true },
  { yol: '/receteler', ikon: '🧪', ad: 'Reçeteler' },
  { yol: '/firmalar', ikon: '🏢', ad: 'Firmalarımız' },
  { yol: '/hububat-borsasi', ikon: '📈', ad: 'Hububat Borsası' },
  { yol: '/kullanicilar', ikon: '👥', ad: 'Kullanıcılar' },
  { yol: '/kilavuz', ikon: '📘', ad: 'Kılavuz' },
];

export default function App() {
  const [kullanici, setKullanici] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [acilisGosterildi, setAcilisGosterildi] = useState(false);
  const [digerAcik, setDigerAcik] = useState(false);
  const konum = useLocation();
  useTabloEtiketleri();

  // Sayfa değişince telefondaki "Diğer" menüsü kapansın
  useEffect(() => setDigerAcik(false), [konum.pathname]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setYukleniyor(false);
      return;
    }
    api
      .get('/auth/ben')
      .then((res) => setKullanici(res.data))
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('kullanici');
      })
      .finally(() => setYukleniyor(false));
  }, []);

  const cikisYap = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('kullanici');
    setKullanici(null);
  };

  if (!acilisGosterildi) {
    return <AcilisEkrani onBitti={() => setAcilisGosterildi(true)} />;
  }

  if (yukleniyor) {
    return (
      <div className="uygulama">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!kullanici) {
    return (
      <>
        <div className="uygulama" style={{ maxWidth: 420, paddingBottom: 0 }}>
          <KurulumOnerisi />
        </div>
        <Giris onGirisYapildi={setKullanici} />
      </>
    );
  }

  return (
    <div className="uygulama">
      <KurulumOnerisi />
      <h1 className="uygulama-baslik">🌾 Turan Tarım — Sözleşmeli Ekim Takip Sistemi</h1>
      <nav className="gezinme">
        {SAYFALAR.map((s) => (
          <NavLink key={s.yol} to={s.yol} end={s.yol === '/'} className={linkSinifi}>
            {s.ikon} {s.ad}
          </NavLink>
        ))}
        <button className="btn-ikincil" onClick={cikisYap} style={{ marginLeft: 'auto' }}>
          🚪 Çıkış ({kullanici.kullanici_adi})
        </button>
      </nav>

      {/* Telefonda ekranın altında sabit menü */}
      {digerAcik && (
        <div className="diger-arkaplan" onClick={() => setDigerAcik(false)}>
          <div className="diger-menu" onClick={(e) => e.stopPropagation()}>
            {SAYFALAR.filter((s) => !s.altMenu).map((s) => (
              <NavLink key={s.yol} to={s.yol} className={linkSinifi}>
                <span className="diger-ikon">{s.ikon}</span> {s.ad}
              </NavLink>
            ))}
            <button className="btn-ikincil" onClick={cikisYap}>
              🚪 Çıkış ({kullanici.kullanici_adi})
            </button>
          </div>
        </div>
      )}
      <nav className="alt-gezinme">
        {SAYFALAR.filter((s) => s.altMenu).map((s) => (
          <NavLink key={s.yol} to={s.yol} end={s.yol === '/'} className={linkSinifi}>
            <span className="alt-ikon">{s.ikon}</span>
            {s.kisaAd || s.ad}
          </NavLink>
        ))}
        <button
          className={SAYFALAR.some((s) => !s.altMenu && s.yol === konum.pathname) || digerAcik ? 'aktif' : undefined}
          onClick={() => setDigerAcik((a) => !a)}
        >
          <span className="alt-ikon">☰</span>
          Diğer
        </button>
      </nav>

      <HataSiniri key={konum.pathname}>
        <Routes>
          <Route path="/" element={<Ozet />} />
          <Route path="/harita" element={<Harita />} />
          <Route path="/cariler" element={<Cariler />} />
          <Route path="/araziler" element={<Araziler />} />
          <Route path="/sozlesmeler" element={<Sozlesmeler />} />
          <Route path="/ekimler" element={<Ekimler />} />
          <Route path="/receteler" element={<Receteler />} />
          <Route path="/firmalar" element={<Firmalar />} />
          <Route path="/hububat-borsasi" element={<HububatBorsasi />} />
          <Route path="/kullanicilar" element={<Kullanicilar benKullanici={kullanici} />} />
          <Route path="/kilavuz" element={<Kilavuz />} />
        </Routes>
      </HataSiniri>
    </div>
  );
}
