import { useEffect, useState } from 'react';
import { api } from '../api';
import IlIlceSecici from '../components/IlIlceSecici';
import HissedarPaneli from '../components/HissedarPaneli';
import KmlUyusmazlikPaneli from '../components/KmlUyusmazlikPaneli';

const bosForm = { ad: '', firma_id: '', sozlesme_cari_id: '', il: '', ilce: '', koy: '', ada: '', parsel: '', alan_dekar: '' };

export default function Araziler() {
  const [liste, setListe] = useState([]);
  const [cariler, setCariler] = useState([]);
  const [firmalar, setFirmalar] = useState([]);
  const [form, setForm] = useState(bosForm);
  const [kmlDosya, setKmlDosya] = useState(null);
  const [seciliArazi, setSeciliArazi] = useState(null);
  const [uyusmazlikDurumu, setUyusmazlikDurumu] = useState(null);

  const yukle = () => api.get('/araziler').then((res) => setListe(res.data));

  useEffect(() => {
    yukle();
    api.get('/cariler').then((res) => setCariler(res.data));
    api.get('/firmalar').then((res) => setFirmalar(res.data));
  }, []);

  const ekle = async (e) => {
    e.preventDefault();
    if (!form.ad.trim()) return;
    const veri = new FormData();
    Object.entries(form).forEach(([key, value]) => veri.append(key, value));
    if (kmlDosya) veri.append('kml', kmlDosya);
    const { data } = await api.post('/araziler', veri, { headers: { 'Content-Type': 'multipart/form-data' } });
    setForm(bosForm);
    setKmlDosya(null);
    yukle();
    if (data.kml_uyusmazliklari?.length > 0) {
      setUyusmazlikDurumu({ arazi: data, uyusmazliklar: data.kml_uyusmazliklari });
    }
  };

  const sil = async (id) => {
    await api.delete(`/araziler/${id}`);
    if (seciliArazi?.id === id) setSeciliArazi(null);
    yukle();
  };

  return (
    <div>
      <h2>🌾 Araziler</h2>

      <form className="form-kart" onSubmit={ekle} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>
        <input placeholder="Arazi Adı" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} />

        <select value={form.firma_id} onChange={(e) => setForm({ ...form, firma_id: e.target.value })}>
          <option value="">Firma Seç</option>
          {firmalar.map((f) => (
            <option key={f.id} value={f.id}>{f.unvan}</option>
          ))}
        </select>

        <select value={form.sozlesme_cari_id} onChange={(e) => setForm({ ...form, sozlesme_cari_id: e.target.value })}>
          <option value="">Sözleşme Yaptığımız Kişi/Firma (Cari) Seç</option>
          {cariler.map((c) => (
            <option key={c.id} value={c.id}>{c.isim_unvan}</option>
          ))}
        </select>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <IlIlceSecici
            il={form.il}
            ilce={form.ilce}
            onIlDegisti={(deger) => setForm((f) => ({ ...f, il: deger }))}
            onIlceDegisti={(deger) => setForm((f) => ({ ...f, ilce: deger }))}
          />
          <input placeholder="Mevki" value={form.koy} onChange={(e) => setForm({ ...form, koy: e.target.value })} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input placeholder="Ada" value={form.ada} onChange={(e) => setForm({ ...form, ada: e.target.value })} style={{ width: 100 }} />
          <input placeholder="Parsel" value={form.parsel} onChange={(e) => setForm({ ...form, parsel: e.target.value })} style={{ width: 100 }} />
          <input placeholder="Alan (dekar)" value={form.alan_dekar} onChange={(e) => setForm({ ...form, alan_dekar: e.target.value })} />
        </div>

        <div className="kml-kutu">
          <label>
            <strong>📎 KML Dosyası Ekle:</strong>{' '}
            <input type="file" accept=".kml" onChange={(e) => setKmlDosya(e.target.files[0])} />
          </label>
        </div>

        <button type="submit" style={{ alignSelf: 'flex-start' }}>🌱 Ekle</button>
      </form>

      {uyusmazlikDurumu && (
        <KmlUyusmazlikPaneli
          arazi={uyusmazlikDurumu.arazi}
          uyusmazliklar={uyusmazlikDurumu.uyusmazliklar}
          onKapat={() => setUyusmazlikDurumu(null)}
          onDuzeltildi={(alan) => {
            yukle();
            setUyusmazlikDurumu((durum) => {
              const kalanlar = durum.uyusmazliklar.filter((u) => u.alan !== alan);
              return kalanlar.length > 0 ? { ...durum, uyusmazliklar: kalanlar } : null;
            });
          }}
        />
      )}

      {seciliArazi && (
        <HissedarPaneli
          arazi={seciliArazi}
          onKapat={() => setSeciliArazi(null)}
          onDegisti={yukle}
        />
      )}

      <table>
        <thead>
          <tr>
            <th>Ad</th>
            <th>Firma</th>
            <th>Sözleşme Cari</th>
            <th>İl/İlçe/Mevki</th>
            <th>Ada</th>
            <th>Parsel</th>
            <th>Alan (dekar)</th>
            <th>Hissedarlar</th>
            <th>Ekilen Ürün</th>
            <th>KML</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.map((a) => (
            <tr key={a.id}>
              <td>{a.ad}</td>
              <td>{a.firma_adi || '-'}</td>
              <td>{a.sozlesme_cari_adi || '-'}</td>
              <td>{[a.il, a.ilce, a.koy].filter(Boolean).join(' / ')}</td>
              <td>{a.ada}</td>
              <td>{a.parsel}</td>
              <td>{a.alan_dekar}</td>
              <td>
                {a.hissedar_ozet || '-'}{' '}
                <button className="btn-ikincil" onClick={() => setSeciliArazi(a)}>Hissedarları Yönet</button>
              </td>
              <td>{a.ekim_ozet || '-'}</td>
              <td>{a.kml_dosya_adi || '-'}</td>
              <td>
                <button className="btn-sil" onClick={() => sil(a.id)}>Sil</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
