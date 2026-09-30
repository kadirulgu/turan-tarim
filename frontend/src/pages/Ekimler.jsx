import { Fragment, useEffect, useState } from 'react';
import { api } from '../api';
import AramaliSecici from '../components/AramaliSecici';
import EkimTakipPaneli from '../components/EkimTakipPaneli';
import { tarihGoster, urunleriGrupla } from '../receteSabitleri';

const araziFormatla = (a) => `${a.ada || '?'}/${a.parsel || '?'} — ${a.ad}`;

const bosForm = {
  arazi_id: '',
  urun_id: '',
  ekim_donemi: 'Ana Ürün',
  sezon_yili: new Date().getFullYear(),
  ekim_tarihi: '',
  hasat_tarihi: '',
  aciklama: '',
};

export default function Ekimler() {
  const [liste, setListe] = useState([]);
  const [araziler, setAraziler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [form, setForm] = useState(bosForm);
  const [receteUygula, setReceteUygula] = useState(true);
  const [bilgi, setBilgi] = useState('');
  const [acikEkimId, setAcikEkimId] = useState(null);

  const yukle = () => api.get('/ekimler').then((res) => setListe(res.data));

  useEffect(() => {
    yukle();
    api.get('/araziler').then((res) => setAraziler(res.data));
    api.get('/urunler').then((res) => setUrunler(res.data));
  }, []);

  const ekle = async (e) => {
    e.preventDefault();
    if (!form.arazi_id || !form.urun_id) return;
    const { data } = await api.post('/ekimler', { ...form, recete_uygula: receteUygula });
    setForm({ ...bosForm, sezon_yili: form.sezon_yili });
    setBilgi(
      data.kopyalanan_adim_sayisi > 0
        ? `Ekim eklendi; ürün reçetesinden ${data.kopyalanan_adim_sayisi} adım eklendi. "Takip" ile görebilirsin.`
        : ''
    );
    yukle();
  };

  const sil = async (id) => {
    await api.delete(`/ekimler/${id}`);
    if (acikEkimId === id) setAcikEkimId(null);
    yukle();
  };

  const urunGruplari = urunleriGrupla(urunler);

  return (
    <div>
      <h2>🌱 Ekimler (ÇKS Ürün Beyanı)</h2>

      <form className="form-kart" onSubmit={ekle} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <AramaliSecici
          secenekler={araziler}
          deger={form.arazi_id}
          onDegisti={(deger) => setForm((f) => ({ ...f, arazi_id: deger }))}
          placeholder="Arazi Seç (Ada/Parsel yazarak ara)"
          formatla={araziFormatla}
        />

        <select value={form.urun_id} onChange={(e) => setForm({ ...form, urun_id: e.target.value })} style={{ minWidth: 220 }}>
          <option value="">Ürün Seç (Ürün Grubu → Ürün)</option>
          {urunGruplari.map(([grupAdi, urunlerListesi]) => (
            <optgroup key={grupAdi} label={grupAdi}>
              {urunlerListesi.map((u) => (
                <option key={u.id} value={u.id}>{u.ad}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <select value={form.ekim_donemi} onChange={(e) => setForm({ ...form, ekim_donemi: e.target.value })}>
          <option value="Ana Ürün">Ana Ürün</option>
          <option value="İkinci Ürün">İkinci Ürün</option>
        </select>

        <input
          type="number"
          placeholder="Sezon Yılı"
          value={form.sezon_yili}
          onChange={(e) => setForm({ ...form, sezon_yili: e.target.value })}
          style={{ width: 90 }}
        />
        <input type="date" value={form.ekim_tarihi} onChange={(e) => setForm({ ...form, ekim_tarihi: e.target.value })} />
        <input type="date" value={form.hasat_tarihi} onChange={(e) => setForm({ ...form, hasat_tarihi: e.target.value })} />
        <input placeholder="Açıklama" value={form.aciklama} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} />
        <label className="onay-kutusu">
          <input type="checkbox" checked={receteUygula} onChange={(e) => setReceteUygula(e.target.checked)} />
          Ürün reçetesini uygula
        </label>
        <button type="submit">🌱 Ekle</button>
      </form>

      {bilgi && <div className="bilgi-kutu">{bilgi}</div>}

      <div className="tablo-kaydir">
        <table>
          <thead>
            <tr>
              <th>Arazi</th>
              <th>Ürün Grubu</th>
              <th>Ürün</th>
              <th>Ekim Dönemi</th>
              <th>Sezon</th>
              <th>Ekim</th>
              <th>Hasat</th>
              <th>Reçete / Takip</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {liste.map((e) => {
              const acik = acikEkimId === e.id;
              const bekleyen = Number(e.bekleyen_sayisi);
              const uyari = Number(e.bekleme_uyari_sayisi);
              return (
                <Fragment key={e.id}>
                  <tr>
                    <td>{e.arazi_ada || '?'}/{e.arazi_parsel || '?'} — {e.arazi_adi}</td>
                    <td>{e.urun_grubu}</td>
                    <td>{e.urun_adi}</td>
                    <td>{e.ekim_donemi}</td>
                    <td>{e.sezon_yili}</td>
                    <td>{tarihGoster(e.ekim_tarihi)}</td>
                    <td>{tarihGoster(e.hasat_tarihi)}</td>
                    <td className="satir-islemler">
                      <button className={acik ? 'btn-ikincil' : undefined} onClick={() => setAcikEkimId(acik ? null : e.id)}>
                        {acik ? 'Kapat' : '📋 Takip'}
                      </button>
                      {bekleyen > 0 && <span className="kalan-gun yakin">{bekleyen} bekliyor</span>}
                      {uyari > 0 && <span className="kalan-gun acil">⚠️ {uyari} uyarı</span>}
                    </td>
                    <td>
                      <button className="btn-sil" onClick={() => sil(e.id)}>Sil</button>
                    </td>
                  </tr>
                  {acik && (
                    <tr className="detay-satiri">
                      <td colSpan={9}>
                        <EkimTakipPaneli
                          ekimId={e.id}
                          urunId={e.urun_id}
                          ekimTarihi={e.ekim_tarihi}
                          hasatTarihi={e.hasat_tarihi}
                          onDegisti={yukle}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
