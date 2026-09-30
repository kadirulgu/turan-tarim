import { useEffect, useState } from 'react';
import { api, dosyaAc } from '../api';
import IlIlceSecici from '../components/IlIlceSecici';

const bosForm = {
  isim_unvan: '',
  ciftci_mi: true,
  alici_mi: false,
  kimlik_turu: 'tc',
  tc_no: '',
  vergi_no: '',
  vergi_dairesi: '',
  telefon: '',
  adres: '',
  il: '',
  ilce: '',
  mahalle: '',
  iban: '',
  sozlesme_tarihi: '',
  sozlesme_no: '',
};

export default function Cariler() {
  const [liste, setListe] = useState([]);
  const [form, setForm] = useState(bosForm);
  const [pdfDosya, setPdfDosya] = useState(null);
  const [hata, setHata] = useState('');

  const yukle = () => api.get('/cariler').then((res) => setListe(res.data));

  useEffect(() => {
    yukle();
  }, []);

  const ekle = async (e) => {
    e.preventDefault();
    setHata('');
    if (!form.isim_unvan.trim()) return;
    if (form.kimlik_turu === 'tc' && form.tc_no && !/^\d{11}$/.test(form.tc_no)) {
      setHata('TC Kimlik No 11 haneli rakamdan oluşmalı.');
      return;
    }
    if (form.kimlik_turu === 'vergi' && form.vergi_no && !/^\d{10}$/.test(form.vergi_no)) {
      setHata('Vergi No 10 haneli rakamdan oluşmalı.');
      return;
    }
    try {
      const veri = new FormData();
      Object.entries(form).forEach(([key, value]) => veri.append(key, value));
      if (pdfDosya) veri.append('sozlesme_pdf', pdfDosya);
      await api.post('/cariler', veri, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(bosForm);
      setPdfDosya(null);
      yukle();
    } catch (err) {
      setHata(err.response?.data?.detay || 'Kayıt eklenemedi.');
    }
  };

  const sil = async (id) => {
    await api.delete(`/cariler/${id}`);
    yukle();
  };

  return (
    <div>
      <h2>👤 Çiftçi / Cari Kayıtları</h2>

      <form className="form-kart" onSubmit={ekle} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Firma Ünvanı / Alıcı İsmi / Ad Soyad"
          value={form.isim_unvan}
          onChange={(e) => setForm({ ...form, isim_unvan: e.target.value })}
          style={{ minWidth: 240 }}
        />

        <label>
          <input
            type="checkbox"
            checked={form.ciftci_mi}
            onChange={(e) => setForm({ ...form, ciftci_mi: e.target.checked })}
          />{' '}
          Çiftçi Kaydı
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.alici_mi}
            onChange={(e) => setForm({ ...form, alici_mi: e.target.checked })}
          />{' '}
          Alıcı
        </label>

        <select value={form.kimlik_turu} onChange={(e) => setForm({ ...form, kimlik_turu: e.target.value })}>
          <option value="tc">TC Kimlik No</option>
          <option value="vergi">Vergi No</option>
        </select>

        {form.kimlik_turu === 'tc' ? (
          <input
            placeholder="TC Kimlik No (11 hane)"
            maxLength={11}
            value={form.tc_no}
            onChange={(e) => setForm({ ...form, tc_no: e.target.value.replace(/\D/g, '') })}
          />
        ) : (
          <>
            <input
              placeholder="Vergi No (10 hane)"
              maxLength={10}
              value={form.vergi_no}
              onChange={(e) => setForm({ ...form, vergi_no: e.target.value.replace(/\D/g, '') })}
            />
            <input
              placeholder="Vergi Dairesi"
              value={form.vergi_dairesi}
              onChange={(e) => setForm({ ...form, vergi_dairesi: e.target.value })}
            />
          </>
        )}

        <input placeholder="Telefon" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} />
        <input placeholder="Adres" value={form.adres} onChange={(e) => setForm({ ...form, adres: e.target.value })} />
        <input
          placeholder="IBAN (TR.. .. .. .. .. ..)"
          value={form.iban}
          onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })}
          style={{ minWidth: 220 }}
        />
        <IlIlceSecici
          il={form.il}
          ilce={form.ilce}
          mahalle={form.mahalle}
          onIlDegisti={(deger) => setForm((f) => ({ ...f, il: deger }))}
          onIlceDegisti={(deger) => setForm((f) => ({ ...f, ilce: deger }))}
          onMahalleDegisti={(deger) => setForm((f) => ({ ...f, mahalle: deger }))}
        />

        <div className="kml-kutu" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <label>
            <strong>📎 Sözleşme Taraması (PDF):</strong>{' '}
            <input type="file" accept="application/pdf" onChange={(e) => setPdfDosya(e.target.files[0])} />
          </label>
          <input
            type="date"
            title="Sözleşme Tarihi"
            value={form.sozlesme_tarihi}
            onChange={(e) => setForm({ ...form, sozlesme_tarihi: e.target.value })}
          />
          <input
            placeholder="Sözleşme No"
            value={form.sozlesme_no}
            onChange={(e) => setForm({ ...form, sozlesme_no: e.target.value })}
            style={{ width: 140 }}
          />
        </div>

        <button type="submit">🌱 Ekle</button>
      </form>

      {hata && <p className="hata-mesaji">{hata}</p>}

      <table>
        <thead>
          <tr>
            <th>Ünvan / İsim</th>
            <th>Tür</th>
            <th>Kimlik</th>
            <th>Vergi Dairesi</th>
            <th>Telefon</th>
            <th>İl / İlçe / Mahalle</th>
            <th>IBAN</th>
            <th>Sözleşme</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((c) => (
            <tr key={c.id}>
              <td>{c.isim_unvan}</td>
              <td>
                {[c.ciftci_mi && 'Çiftçi', c.alici_mi && 'Alıcı'].filter(Boolean).join(' / ') || '-'}
              </td>
              <td>{c.kimlik_turu === 'tc' ? c.tc_no : c.vergi_no}</td>
              <td>{c.vergi_dairesi}</td>
              <td>{c.telefon}</td>
              <td>{[c.il, c.ilce, c.mahalle].filter(Boolean).join(' / ')}</td>
              <td>{c.iban || '-'}</td>
              <td>
                {(c.sozlesme_no || c.sozlesme_tarihi) && (
                  <div>
                    {c.sozlesme_no}
                    {c.sozlesme_no && c.sozlesme_tarihi && ' — '}
                    {c.sozlesme_tarihi?.slice(0, 10)}
                  </div>
                )}
                {c.sozlesme_dosyasi ? (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      dosyaAc(`sozlesmeler/${c.sozlesme_dosyasi}`);
                    }}
                  >
                    📄 {c.sozlesme_dosya_adi || 'Görüntüle'}
                  </a>
                ) : (
                  !c.sozlesme_no && !c.sozlesme_tarihi && '-'
                )}
              </td>
              <td>
                <button className="btn-sil" onClick={() => sil(c.id)}>Sil</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
