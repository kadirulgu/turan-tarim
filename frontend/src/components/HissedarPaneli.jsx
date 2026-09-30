import { useEffect, useState } from 'react';
import { api } from '../api';

const bosHissedarForm = { ad_soyad: '', tc_no: '', telefon: '', pay: 1, payda: 1 };

export default function HissedarPaneli({ arazi, onKapat, onDegisti }) {
  const [hissedarlar, setHissedarlar] = useState([]);
  const [form, setForm] = useState(bosHissedarForm);
  const [hata, setHata] = useState('');

  const yukle = () => api.get(`/araziler/${arazi.id}/hissedarlar`).then((res) => setHissedarlar(res.data));

  useEffect(() => {
    yukle();
  }, [arazi.id]);

  const ekle = async (e) => {
    e.preventDefault();
    setHata('');
    if (!form.ad_soyad.trim()) return;
    if (form.tc_no && !/^\d{11}$/.test(form.tc_no)) {
      setHata('TC Kimlik No 11 haneli rakamdan oluşmalı.');
      return;
    }
    try {
      await api.post(`/araziler/${arazi.id}/hissedarlar`, form);
      setForm(bosHissedarForm);
      yukle();
      onDegisti();
    } catch (err) {
      setHata(err.response?.data?.detay || 'Hissedar eklenemedi.');
    }
  };

  const sil = async (hissedarId) => {
    await api.delete(`/araziler/${arazi.id}/hissedarlar/${hissedarId}`);
    yukle();
    onDegisti();
  };

  const toplamOran = hissedarlar.reduce((toplam, h) => toplam + h.pay / h.payda, 0);

  return (
    <div className="panel-kart">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>🧾 "{arazi.ad}" Hissedarları</h3>
        <button className="btn-ikincil" onClick={onKapat}>Kapat</button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--renk-metin-soluk)' }}>
        Hissedarlar tapudaki kayıtlardır, ayrıca Çiftçi/Cari kaydı yapmana gerek yok — ad soyad,
        TC no ve telefonu doğrudan buradan gir.
      </p>

      <table style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Ad Soyad</th>
            <th>TC Kimlik No</th>
            <th>Telefon</th>
            <th>Hisse (Pay/Payda)</th>
            <th>Oran</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {hissedarlar.map((h) => (
            <tr key={h.id}>
              <td>{h.ad_soyad}</td>
              <td>{h.tc_no}</td>
              <td>{h.telefon}</td>
              <td>{h.pay}/{h.payda}</td>
              <td>%{((h.pay / h.payda) * 100).toFixed(1)}</td>
              <td>
                <button className="btn-sil" onClick={() => sil(h.id)}>Sil</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ fontSize: 14 }}>
        Toplam pay oranı: %{(toplamOran * 100).toFixed(1)}
        {Math.abs(toplamOran - 1) > 0.001 && hissedarlar.length > 0 && (
          <span className="uyari-metni"> — tapudaki toplam hisse %100 olmalı, kontrol et.</span>
        )}
      </p>

      {hata && <p className="hata-mesaji">{hata}</p>}

      <form onSubmit={ekle} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Ad Soyad"
          value={form.ad_soyad}
          onChange={(e) => setForm({ ...form, ad_soyad: e.target.value })}
        />
        <input
          placeholder="TC Kimlik No (11 hane)"
          maxLength={11}
          value={form.tc_no}
          onChange={(e) => setForm({ ...form, tc_no: e.target.value.replace(/\D/g, '') })}
        />
        <input
          placeholder="Telefon"
          value={form.telefon}
          onChange={(e) => setForm({ ...form, telefon: e.target.value })}
        />
        <input
          type="number"
          min="1"
          placeholder="Pay"
          value={form.pay}
          onChange={(e) => setForm({ ...form, pay: e.target.value })}
          style={{ width: 70 }}
        />
        <span>/</span>
        <input
          type="number"
          min="1"
          placeholder="Payda"
          value={form.payda}
          onChange={(e) => setForm({ ...form, payda: e.target.value })}
          style={{ width: 70 }}
        />
        <button type="submit">🌱 Hissedar Ekle</button>
      </form>
    </div>
  );
}
