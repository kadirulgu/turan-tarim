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
import { api } from './api';
import './App.css';

const linkSinifi = ({ isActive }) => (isActive ? 'aktif' : undefined);

export default function App() {
  const [kullanici, setKullanici] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [acilisGosterildi, setAcilisGosterildi] = useState(false);
  const konum = useLocation();

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
    return <Giris onGirisYapildi={setKullanici} />;
  }

  return (
    <div className="uygulama">
      <h1 className="uygulama-baslik">🌾 Turan Tarım — Sözleşmeli Ekim Takip Sistemi</h1>
      <nav className="gezinme">
        <NavLink to="/" end className={linkSinifi}>📊 Özet</NavLink>
        <NavLink to="/harita" className={linkSinifi}>🗺️ Harita</NavLink>
        <NavLink to="/cariler" className={linkSinifi}>👤 Çiftçi / Cari</NavLink>
        <NavLink to="/araziler" className={linkSinifi}>🌾 Araziler</NavLink>
        <NavLink to="/sozlesmeler" className={linkSinifi}>📋 Sözleşmeler</NavLink>
        <NavLink to="/ekimler" className={linkSinifi}>🌱 Ekimler</NavLink>
        <NavLink to="/receteler" className={linkSinifi}>🧪 Reçeteler</NavLink>
        <NavLink to="/firmalar" className={linkSinifi}>🏢 Firmalarımız</NavLink>
        <NavLink to="/hububat-borsasi" className={linkSinifi}>📈 Hububat Borsası</NavLink>
        <NavLink to="/kullanicilar" className={linkSinifi}>👥 Kullanıcılar</NavLink>
        <NavLink to="/kilavuz" className={linkSinifi}>📘 Kılavuz</NavLink>
        <button className="btn-ikincil" onClick={cikisYap} style={{ marginLeft: 'auto' }}>
          🚪 Çıkış ({kullanici.kullanici_adi})
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
