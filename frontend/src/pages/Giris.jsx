import { useEffect, useState } from 'react';
import { api } from '../api';
import GoncaLogo from '../components/GoncaLogo';

export default function Giris({ onGirisYapildi }) {
  const [kullaniciVar, setKullaniciVar] = useState(null);
  const [form, setForm] = useState({ kullanici_adi: '', sifre: '', sifreTekrar: '', ad_soyad: '' });
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    api.get('/auth/durum').then((res) => setKullaniciVar(res.data.kullanici_var));
  }, []);

  const ilkKurulumMu = kullaniciVar === false;

  const gonder = async (e) => {
    e.preventDefault();
    setHata('');

    if (ilkKurulumMu) {
      if (form.sifre.length < 6) {
        setHata('Şifre en az 6 karakter olmalı.');
        return;
      }
      if (form.sifre !== form.sifreTekrar) {
        setHata('Şifreler eşleşmiyor.');
        return;
      }
    }

    setYukleniyor(true);
    try {
      if (ilkKurulumMu) {
        await api.post('/auth/kayit', {
          kullanici_adi: form.kullanici_adi,
          sifre: form.sifre,
          ad_soyad: form.ad_soyad,
        });
      }
      const { data } = await api.post('/auth/giris', {
        kullanici_adi: form.kullanici_adi,
        sifre: form.sifre,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('kullanici', JSON.stringify(data.kullanici));
      onGirisYapildi(data.kullanici);
    } catch (err) {
      setHata(err.response?.data?.detay || 'İşlem başarısız.');
    } finally {
      setYukleniyor(false);
    }
  };

  if (kullaniciVar === null) {
    return <div className="uygulama"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="uygulama" style={{ maxWidth: 420, marginTop: 60 }}>
      <h1 className="uygulama-baslik" style={{ justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
        <GoncaLogo boyut={56} />
        <span>Turan Tarım</span>
        <span style={{ fontSize: 13, color: 'var(--renk-metin-soluk)', letterSpacing: 1, textTransform: 'uppercase' }}>
          Eskişehir Promosyon · v1
        </span>
      </h1>

      <form className="form-kart" onSubmit={gonder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, border: 'none', padding: 0 }}>
          {ilkKurulumMu ? '👤 İlk Kullanıcıyı Oluştur' : '🔑 Giriş Yap'}
        </h2>

        {ilkKurulumMu && (
          <p style={{ fontSize: 14, color: 'var(--renk-metin-soluk)', margin: 0 }}>
            Sistemde henüz kullanıcı yok. İlk yönetici hesabını oluşturarak başla.
          </p>
        )}

        {ilkKurulumMu && (
          <input
            placeholder="Ad Soyad"
            value={form.ad_soyad}
            onChange={(e) => setForm({ ...form, ad_soyad: e.target.value })}
          />
        )}

        <input
          placeholder="Kullanıcı Adı"
          value={form.kullanici_adi}
          onChange={(e) => setForm({ ...form, kullanici_adi: e.target.value })}
          autoFocus
        />
        <input
          type="password"
          placeholder="Şifre"
          value={form.sifre}
          onChange={(e) => setForm({ ...form, sifre: e.target.value })}
        />
        {ilkKurulumMu && (
          <input
            type="password"
            placeholder="Şifre (Tekrar)"
            value={form.sifreTekrar}
            onChange={(e) => setForm({ ...form, sifreTekrar: e.target.value })}
          />
        )}

        {hata && <p className="hata-mesaji">{hata}</p>}

        <button type="submit" disabled={yukleniyor}>
          {ilkKurulumMu ? '🌱 Oluştur ve Giriş Yap' : '🔑 Giriş Yap'}
        </button>
      </form>
    </div>
  );
}
