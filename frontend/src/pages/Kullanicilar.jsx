import { useEffect, useState } from 'react';
import { api } from '../api';

const bosForm = { kullanici_adi: '', sifre: '', ad_soyad: '' };

export default function Kullanicilar({ benKullanici }) {
  const [liste, setListe] = useState([]);
  const [form, setForm] = useState(bosForm);
  const [hata, setHata] = useState('');

  const yukle = () => api.get('/auth/kullanicilar').then((res) => setListe(res.data));

  useEffect(() => {
    yukle();
  }, []);

  const ekle = async (e) => {
    e.preventDefault();
    setHata('');
    if (!form.kullanici_adi.trim() || form.sifre.length < 6) {
      setHata('Kullanıcı adı gerekli, şifre en az 6 karakter olmalı.');
      return;
    }
    try {
      await api.post('/auth/kayit', form);
      setForm(bosForm);
      yukle();
    } catch (err) {
      setHata(err.response?.data?.detay || 'Kullanıcı eklenemedi.');
    }
  };

  const sil = async (id) => {
    try {
      await api.delete(`/auth/kullanicilar/${id}`);
      yukle();
    } catch (err) {
      setHata(err.response?.data?.detay || 'Silinemedi.');
    }
  };

  return (
    <div>
      <h2>👥 Kullanıcı Tanımlama</h2>

      <form className="form-kart" onSubmit={ekle} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Ad Soyad"
          value={form.ad_soyad}
          onChange={(e) => setForm({ ...form, ad_soyad: e.target.value })}
        />
        <input
          placeholder="Kullanıcı Adı"
          value={form.kullanici_adi}
          onChange={(e) => setForm({ ...form, kullanici_adi: e.target.value })}
        />
        <input
          type="password"
          placeholder="Şifre (en az 6 karakter)"
          value={form.sifre}
          onChange={(e) => setForm({ ...form, sifre: e.target.value })}
        />
        <button type="submit">🌱 Ekle</button>
      </form>

      {hata && <p className="hata-mesaji">{hata}</p>}

      <table>
        <thead>
          <tr>
            <th>Ad Soyad</th>
            <th>Kullanıcı Adı</th>
            <th>Oluşturulma</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((k) => (
            <tr key={k.id}>
              <td>{k.ad_soyad}</td>
              <td>{k.kullanici_adi}</td>
              <td>{k.created_at?.slice(0, 10)}</td>
              <td>
                {k.id !== benKullanici?.id && (
                  <button className="btn-sil" onClick={() => sil(k.id)}>Sil</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
