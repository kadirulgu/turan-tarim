import { useEffect, useState } from 'react';
import { api } from '../api';
import { TUR_EMOJI, UYGULAMA_TURLERI, urunleriGrupla } from '../receteSabitleri';

const bosForm = { tur: 'Gübreleme', ad: '', ekimden_gun: '', doz: '', bekleme_gun: '', aciklama: '' };

export default function Receteler() {
  const [urunler, setUrunler] = useState([]);
  const [urunId, setUrunId] = useState('');
  const [adimlar, setAdimlar] = useState([]);
  const [form, setForm] = useState(bosForm);
  const [hata, setHata] = useState('');
  const [renkler, setRenkler] = useState([]);
  const [renkForm, setRenkForm] = useState({ ad: '', renk_kodu: '#4caf50' });

  useEffect(() => {
    api.get('/urunler').then((res) => setUrunler(res.data));
  }, []);

  const yukle = (id) => {
    if (!id) {
      setAdimlar([]);
      return;
    }
    api.get('/receteler', { params: { urun_id: id } }).then((res) => setAdimlar(res.data));
  };

  useEffect(() => {
    yukle(urunId);
  }, [urunId]);

  const ekle = async (e) => {
    e.preventDefault();
    if (!urunId || !form.ad.trim()) return;
    setHata('');
    try {
      await api.post('/receteler', { ...form, urun_id: urunId });
      setForm({ ...bosForm, tur: form.tur });
      yukle(urunId);
    } catch (err) {
      setHata(err.response?.data?.error || 'Adım eklenemedi');
    }
  };

  const sil = async (id) => {
    await api.delete(`/receteler/${id}`);
    yukle(urunId);
  };

  const renkleriYukle = (id) => {
    if (!id) {
      setRenkler([]);
      return;
    }
    api.get('/renk-skalasi', { params: { urun_id: id } }).then((res) => setRenkler(res.data));
  };

  useEffect(() => {
    renkleriYukle(urunId);
  }, [urunId]);

  const renkEkle = async (e) => {
    e.preventDefault();
    if (!renkForm.ad.trim()) return;
    setHata('');
    try {
      await api.post('/renk-skalasi', { ...renkForm, urun_id: urunId });
      setRenkForm({ ...renkForm, ad: '' });
      renkleriYukle(urunId);
    } catch (err) {
      setHata(err.response?.data?.error || 'Renk eklenemedi');
    }
  };

  const renkSil = async (id) => {
    await api.delete(`/renk-skalasi/${id}`);
    renkleriYukle(urunId);
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>🧪 Ürün Reçeteleri</h2>
      <p className="soluk-metin">
        Her ürün için ekimden hasada kadar yapılacak gübreleme, ilaçlama ve sulama adımlarını bir kez tanımla. Ekimler
        sayfasında bu üründen yeni bir ekim eklediğinde adımlar, ekim tarihine göre tarihlenerek o ekime otomatik gelir.
      </p>

      <div className="form-kart">
        <select value={urunId} onChange={(e) => setUrunId(e.target.value)} style={{ minWidth: 260 }}>
          <option value="">Ürün Seç</option>
          {urunleriGrupla(urunler).map(([grupAdi, liste]) => (
            <optgroup key={grupAdi} label={grupAdi}>
              {liste.map((u) => (
                <option key={u.id} value={u.id}>{u.ad}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {urunId && (
        <>
          <form className="form-kart form-satir" onSubmit={ekle}>
            <select value={form.tur} onChange={(e) => setForm({ ...form, tur: e.target.value })}>
              {UYGULAMA_TURLERI.map((t) => (
                <option key={t} value={t}>{TUR_EMOJI[t]} {t}</option>
              ))}
            </select>
            <input
              placeholder="Adım (örn. Taban gübresi DAP)"
              value={form.ad}
              onChange={(e) => setForm({ ...form, ad: e.target.value })}
              style={{ flex: '1 1 220px' }}
            />
            <input
              type="number"
              min="0"
              placeholder="Ekimden kaç gün sonra"
              title="Ekim tarihinden kaç gün sonra yapılacak"
              value={form.ekimden_gun}
              onChange={(e) => setForm({ ...form, ekimden_gun: e.target.value })}
              style={{ width: 170 }}
            />
            <input
              placeholder="Doz (örn. 20 kg/da)"
              value={form.doz}
              onChange={(e) => setForm({ ...form, doz: e.target.value })}
              style={{ width: 160 }}
            />
            <input
              type="number"
              min="0"
              placeholder="Hasat öncesi bekleme (gün)"
              title="Bu işlemden sonra hasada kadar beklenmesi gereken gün (özellikle ilaçlama için)"
              value={form.bekleme_gun}
              onChange={(e) => setForm({ ...form, bekleme_gun: e.target.value })}
              style={{ width: 210 }}
            />
            <input
              placeholder="Not"
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              style={{ flex: '1 1 160px' }}
            />
            <button type="submit">➕ Adım Ekle</button>
            {hata && <div className="hata-mesaji" style={{ flexBasis: '100%' }}>{hata}</div>}
          </form>

          {adimlar.length === 0 ? (
            <div className="ozet-bos">Bu ürün için henüz reçete adımı yok. Yukarıdan ilk adımı ekleyebilirsin.</div>
          ) : (
            <div className="tablo-kaydir">
              <table>
                <thead>
                  <tr>
                    <th>Ekimden Sonra</th>
                    <th>İşlem</th>
                    <th>Adım</th>
                    <th>Doz</th>
                    <th>Hasat Öncesi Bekleme</th>
                    <th>Not</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {adimlar.map((a) => (
                    <tr key={a.id}>
                      <td>{a.ekimden_gun}. gün</td>
                      <td>{TUR_EMOJI[a.tur]} {a.tur}</td>
                      <td>{a.ad}</td>
                      <td>{a.doz}</td>
                      <td>{a.bekleme_gun != null ? `${a.bekleme_gun} gün` : ''}</td>
                      <td>{a.aciklama}</td>
                      <td>
                        <button className="btn-sil" onClick={() => sil(a.id)}>Sil</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2>🎨 Renk Skalası</h2>
          <p className="soluk-metin">
            Bu ürünün ekimden hasada kadar alacağı renkleri kendin seç (örn. koyu yeşil → açık yeşil → sarı → altın sarısı).
            Ekim takibinde gözlem girerken bu renklerden birine dokunman yeterli; renkler zaman çizgisinde takip edilir.
            Renkleri açıktan olgunluğa doğru sırayla ekle.
          </p>
          <div className="form-kart">
            <div className="renk-secici" style={{ marginBottom: 12 }}>
              {renkler.length === 0 && <span className="soluk-metin">Henüz renk eklenmedi.</span>}
              {renkler.map((r) => (
                <span key={r.id} className="renk-etiket">
                  <i style={{ background: r.renk_kodu }} />
                  {r.ad}
                  <button type="button" className="foto-sil-satir" title="Rengi sil" onClick={() => renkSil(r.id)}>×</button>
                </span>
              ))}
            </div>
            <form className="form-satir" onSubmit={renkEkle}>
              <input
                type="color"
                title="Rengi seç"
                value={renkForm.renk_kodu}
                onChange={(e) => setRenkForm({ ...renkForm, renk_kodu: e.target.value })}
              />
              <input
                placeholder="Renk adı (örn. Sarımsı yeşil)"
                value={renkForm.ad}
                onChange={(e) => setRenkForm({ ...renkForm, ad: e.target.value })}
                style={{ flex: '1 1 220px' }}
              />
              <button type="submit">➕ Renk Ekle</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
