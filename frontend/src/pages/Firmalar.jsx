import { useEffect, useState } from 'react';
import { api } from '../api';
import IlIlceSecici from '../components/IlIlceSecici';

const bosForm = { unvan: '', adres: '', il: '', ilce: '', vergi_dairesi: '', vergi_no: '' };
const bosBankaForm = { banka_adi: '', hesap_adi: '', iban: '' };

function BankaHesaplariPaneli({ firma, onKapat }) {
  const [hesaplar, setHesaplar] = useState([]);
  const [form, setForm] = useState(bosBankaForm);

  const yukle = () => api.get(`/firmalar/${firma.id}/banka-hesaplari`).then((res) => setHesaplar(res.data));

  useEffect(() => {
    yukle();
  }, [firma.id]);

  const ekle = async (e) => {
    e.preventDefault();
    if (!form.banka_adi.trim()) return;
    await api.post(`/firmalar/${firma.id}/banka-hesaplari`, form);
    setForm(bosBankaForm);
    yukle();
  };

  const sil = async (id) => {
    await api.delete(`/firmalar/${firma.id}/banka-hesaplari/${id}`);
    yukle();
  };

  return (
    <div className="panel-kart">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>🏦 "{firma.unvan}" Banka Hesapları</h3>
        <button className="btn-ikincil" onClick={onKapat}>Kapat</button>
      </div>

      <table style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Banka</th>
            <th>Hesap Adı</th>
            <th>IBAN</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {hesaplar.map((h) => (
            <tr key={h.id}>
              <td>{h.banka_adi}</td>
              <td>{h.hesap_adi}</td>
              <td>{h.iban}</td>
              <td>
                <button className="btn-sil" onClick={() => sil(h.id)}>Sil</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={ekle} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <input
          placeholder="Banka Adı"
          value={form.banka_adi}
          onChange={(e) => setForm({ ...form, banka_adi: e.target.value })}
        />
        <input
          placeholder="Hesap Adı (örn. Kurumsal Hesap)"
          value={form.hesap_adi}
          onChange={(e) => setForm({ ...form, hesap_adi: e.target.value })}
        />
        <input
          placeholder="IBAN"
          value={form.iban}
          onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })}
          style={{ minWidth: 220 }}
        />
        <button type="submit">🌱 Ekle</button>
      </form>
    </div>
  );
}

export default function Firmalar() {
  const [liste, setListe] = useState([]);
  const [form, setForm] = useState(bosForm);
  const [hata, setHata] = useState('');
  const [seciliFirma, setSeciliFirma] = useState(null);

  const yukle = () => api.get('/firmalar').then((res) => setListe(res.data));

  useEffect(() => {
    yukle();
  }, []);

  const ekle = async (e) => {
    e.preventDefault();
    setHata('');
    if (!form.unvan.trim()) return;
    if (form.vergi_no && !/^\d{10}$/.test(form.vergi_no)) {
      setHata('Vergi No 10 haneli rakamdan oluşmalı.');
      return;
    }
    try {
      await api.post('/firmalar', form);
      setForm(bosForm);
      yukle();
    } catch (err) {
      setHata(err.response?.data?.detay || 'Firma eklenemedi.');
    }
  };

  const sil = async (id) => {
    await api.delete(`/firmalar/${id}`);
    if (seciliFirma?.id === id) setSeciliFirma(null);
    yukle();
  };

  return (
    <div>
      <h2>🏢 Firmalarımız</h2>

      <form className="form-kart" onSubmit={ekle} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Firma Ünvanı"
          value={form.unvan}
          onChange={(e) => setForm({ ...form, unvan: e.target.value })}
          style={{ minWidth: 220 }}
        />
        <input
          placeholder="Adres"
          value={form.adres}
          onChange={(e) => setForm({ ...form, adres: e.target.value })}
        />
        <IlIlceSecici
          il={form.il}
          ilce={form.ilce}
          onIlDegisti={(deger) => setForm((f) => ({ ...f, il: deger }))}
          onIlceDegisti={(deger) => setForm((f) => ({ ...f, ilce: deger }))}
        />
        <input
          placeholder="Vergi Dairesi"
          value={form.vergi_dairesi}
          onChange={(e) => setForm({ ...form, vergi_dairesi: e.target.value })}
        />
        <input
          placeholder="Vergi No (10 hane)"
          maxLength={10}
          value={form.vergi_no}
          onChange={(e) => setForm({ ...form, vergi_no: e.target.value.replace(/\D/g, '') })}
        />
        <button type="submit">🌱 Ekle</button>
      </form>

      {hata && <p className="hata-mesaji">{hata}</p>}

      {seciliFirma && <BankaHesaplariPaneli firma={seciliFirma} onKapat={() => setSeciliFirma(null)} />}

      <table>
        <thead>
          <tr>
            <th>Ünvan</th>
            <th>Adres</th>
            <th>İl / İlçe</th>
            <th>Vergi Dairesi</th>
            <th>Vergi No</th>
            <th>Banka</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((f) => (
            <tr key={f.id}>
              <td>{f.unvan}</td>
              <td>{f.adres}</td>
              <td>{[f.il, f.ilce].filter(Boolean).join(' / ')}</td>
              <td>{f.vergi_dairesi}</td>
              <td>{f.vergi_no}</td>
              <td>
                <button className="btn-ikincil" onClick={() => setSeciliFirma(f)}>Banka Hesapları</button>
              </td>
              <td>
                <button className="btn-sil" onClick={() => sil(f.id)}>Sil</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
