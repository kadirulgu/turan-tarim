import { useEffect, useState } from 'react';
import { api } from '../api';
import AramaliSecici from '../components/AramaliSecici';

const araziFormatla = (a) => `${a.ada || '?'}/${a.parsel || '?'} — ${a.ad}`;

const bosForm = {
  arazi_id: '',
  cari_id: '',
  sozlesme_tipi: 'Kira',
  baslangic_tarihi: '',
  bitis_tarihi: '',
  kira_bedeli: '',
  aciklama: '',
};

export default function Sozlesmeler() {
  const [liste, setListe] = useState([]);
  const [araziler, setAraziler] = useState([]);
  const [cariler, setCariler] = useState([]);
  const [hissedarlar, setHissedarlar] = useState([]);
  const [form, setForm] = useState(bosForm);

  const yukle = () => api.get('/sozlesmeler').then((res) => setListe(res.data));

  useEffect(() => {
    yukle();
    api.get('/araziler').then((res) => setAraziler(res.data));
    api.get('/cariler').then((res) => setCariler(res.data));
  }, []);

  useEffect(() => {
    if (!form.arazi_id) {
      setHissedarlar([]);
      return;
    }
    api.get(`/araziler/${form.arazi_id}/hissedarlar`).then((res) => setHissedarlar(res.data));
  }, [form.arazi_id]);

  const ekle = async (e) => {
    e.preventDefault();
    if (!form.arazi_id || !form.cari_id) return;
    await api.post('/sozlesmeler', form);
    setForm(bosForm);
    yukle();
  };

  const sil = async (id) => {
    await api.delete(`/sozlesmeler/${id}`);
    yukle();
  };

  return (
    <div>
      <h2>📋 Sözleşmeler</h2>

      <form className="form-kart" onSubmit={ekle} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <AramaliSecici
          secenekler={araziler}
          deger={form.arazi_id}
          onDegisti={(deger) => setForm((f) => ({ ...f, arazi_id: deger }))}
          placeholder="Arazi Seç (Ada/Parsel yazarak ara)"
          formatla={araziFormatla}
        />
        <select value={form.cari_id} onChange={(e) => setForm({ ...form, cari_id: e.target.value })}>
          <option value="">Çiftçi/Cari Seç</option>
          {cariler.map((c) => (
            <option key={c.id} value={c.id}>{c.isim_unvan}</option>
          ))}
        </select>
        <select value={form.sozlesme_tipi} onChange={(e) => setForm({ ...form, sozlesme_tipi: e.target.value })}>
          <option value="Kira">Kira</option>
          <option value="Ortaklık">Ortaklık</option>
          <option value="Diğer">Diğer</option>
        </select>
        <input type="date" value={form.baslangic_tarihi} onChange={(e) => setForm({ ...form, baslangic_tarihi: e.target.value })} />
        <input type="date" value={form.bitis_tarihi} onChange={(e) => setForm({ ...form, bitis_tarihi: e.target.value })} />
        <input placeholder="Kira Bedeli" value={form.kira_bedeli} onChange={(e) => setForm({ ...form, kira_bedeli: e.target.value })} />
        <input placeholder="Açıklama" value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} />
        <button type="submit">🌱 Ekle</button>
      </form>

      {hissedarlar.length > 0 && (
        <div className="bilgi-kutu" style={{ maxWidth: 520 }}>
          <strong>Bu arazinin tapudaki hissedarları:</strong>
          {hissedarlar.length > 1 && (
            <p className="uyari-metni">
              Birden fazla hissedar var. Araziyi tam kiralamak için genelde her hissedarla ayrı bir
              sözleşme kaydı oluşturman gerekir (hisse oranına göre kira bedelini paylaştırabilirsin).
              Sözleşme yapacağın kişi Çiftçi/Cari listesinde yoksa önce oradan ekle, sonra yukarıdan seç.
            </p>
          )}
          <ul style={{ margin: '4px 0' }}>
            {hissedarlar.map((h) => (
              <li key={h.id}>
                {h.ad_soyad} {h.tc_no && `— TC: ${h.tc_no}`} {h.telefon && `— Tel: ${h.telefon}`} —{' '}
                {h.pay}/{h.payda} (%{((h.pay / h.payda) * 100).toFixed(1)})
              </li>
            ))}
          </ul>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Arazi</th>
            <th>Çiftçi/Cari</th>
            <th>Tip</th>
            <th>Başlangıç</th>
            <th>Bitiş</th>
            <th>Bedel</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((s) => (
            <tr key={s.id}>
              <td>{s.arazi_adi}</td>
              <td>{s.cari_adi}</td>
              <td>{s.sozlesme_tipi}</td>
              <td>{s.baslangic_tarihi?.slice(0, 10)}</td>
              <td>{s.bitis_tarihi?.slice(0, 10)}</td>
              <td>{s.kira_bedeli}</td>
              <td>
                <button className="btn-sil" onClick={() => sil(s.id)}>Sil</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
