import { useEffect, useState } from 'react';
import { api } from '../api';
import { TUR_EMOJI, UYGULAMA_TURLERI, bugunISO, tarihGoster } from '../receteSabitleri';
import FotografSeridi from './FotografSeridi';
import RenkTakibi from './RenkTakibi';

const bosUygulama = { tur: 'Gübreleme', ad: '', planlanan_tarih: '', doz: '', bekleme_gun: '' };
const bosGozlem = { tarih: '', boy_cm: '', renk: '', renk_kodu: '', evre: '', notlar: '' };

export default function EkimTakipPaneli({ ekimId, urunId, ekimTarihi, hasatTarihi, onDegisti }) {
  const [uygulamalar, setUygulamalar] = useState([]);
  const [gozlemler, setGozlemler] = useState([]);
  const [renkSkalasi, setRenkSkalasi] = useState([]);
  const [uygulamaForm, setUygulamaForm] = useState(bosUygulama);
  const [gozlemForm, setGozlemForm] = useState(bosGozlem);
  const [hata, setHata] = useState('');

  const yukle = () => {
    api.get(`/ekimler/${ekimId}/uygulamalar`).then((res) => setUygulamalar(res.data));
    api.get(`/ekimler/${ekimId}/gozlemler`).then((res) => setGozlemler(res.data));
  };

  useEffect(() => {
    yukle();
  }, [ekimId]);

  useEffect(() => {
    api.get('/renk-skalasi', { params: { urun_id: urunId } }).then((res) => setRenkSkalasi(res.data));
  }, [urunId]);

  const fotografYukle = (yol) => (dosyalar) =>
    istekYap(() => {
      const veri = new FormData();
      dosyalar.forEach((d) => veri.append('fotograflar', d));
      return api.post(yol, veri);
    });

  const fotografSil = (id) => istekYap(() => api.delete(`/ekimler/fotograflar/${id}`));

  const degisti = () => {
    yukle();
    onDegisti?.();
  };

  const istekYap = async (istek) => {
    setHata('');
    try {
      await istek();
      degisti();
    } catch (err) {
      setHata(err.response?.data?.error || 'İşlem yapılamadı');
    }
  };

  const uygulamaEkle = (e) => {
    e.preventDefault();
    if (!uygulamaForm.ad.trim()) return;
    istekYap(async () => {
      await api.post(`/ekimler/${ekimId}/uygulamalar`, uygulamaForm);
      setUygulamaForm({ ...bosUygulama, tur: uygulamaForm.tur });
    });
  };

  const yapildiIsaretle = (u) =>
    istekYap(() => api.patch(`/ekimler/uygulamalar/${u.id}`, { yapilan_tarih: u.yapilan_tarih ? null : bugunISO() }));

  const uygulamaSil = (id) => istekYap(() => api.delete(`/ekimler/uygulamalar/${id}`));

  const gozlemEkle = (e) => {
    e.preventDefault();
    istekYap(async () => {
      await api.post(`/ekimler/${ekimId}/gozlemler`, gozlemForm);
      setGozlemForm(bosGozlem);
    });
  };

  const gozlemSil = (id) => istekYap(() => api.delete(`/ekimler/gozlemler/${id}`));

  const bugun = bugunISO();
  const beklemeUyarilari = uygulamalar.filter((u) => u.bekleme_uyarisi);

  return (
    <div className="ekim-takip">
      {hata && <div className="hata-mesaji">{hata}</div>}

      {beklemeUyarilari.length > 0 && (
        <div className="uyari-kutu">
          <strong>⚠️ Hasat öncesi bekleme süresi uyarısı</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
            {beklemeUyarilari.map((u) => (
              <li key={u.id}>
                <b>{u.ad}</b> ({tarihGoster(u.yapilan_tarih || u.planlanan_tarih)}) sonrası {u.bekleme_gun} gün beklenmeli;
                hasat {tarihGoster(hasatTarihi)} olarak planlı. Hasadı ileri al ya da bu işlemi gözden geçir.
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3>Uygulamalar (gübreleme / ilaçlama / sulama)</h3>
      {uygulamalar.length === 0 ? (
        <p className="soluk-metin">
          Bu ekim için henüz işlem yok. Ürünün reçetesine adım eklediysen yeni ekimlerde otomatik gelir; aşağıdan elle de
          ekleyebilirsin.
        </p>
      ) : (
        <div className="tablo-kaydir">
          <table>
            <thead>
              <tr>
                <th>Planlanan</th>
                <th>Yapılan</th>
                <th>İşlem</th>
                <th>Adım</th>
                <th>Doz</th>
                <th>Bekleme</th>
                <th>Fotoğraf</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {uygulamalar.map((u) => {
                const gecikti = !u.yapilan_tarih && u.planlanan_tarih && u.planlanan_tarih.slice(0, 10) < bugun;
                return (
                  <tr key={u.id} className={gecikti ? 'satir-gecikti' : undefined}>
                    <td>{tarihGoster(u.planlanan_tarih)}{gecikti && ' ⏰'}</td>
                    <td>{u.yapilan_tarih ? `✅ ${tarihGoster(u.yapilan_tarih)}` : '—'}</td>
                    <td>{TUR_EMOJI[u.tur]} {u.tur}</td>
                    <td>{u.ad}{u.bekleme_uyarisi && ' ⚠️'}</td>
                    <td>{u.doz}</td>
                    <td>{u.bekleme_gun != null ? `${u.bekleme_gun} gün` : ''}</td>
                    <td>
                      <FotografSeridi
                        fotograflar={u.fotograflar}
                        onYukle={fotografYukle(`/ekimler/uygulamalar/${u.id}/fotograflar`)}
                        onSil={fotografSil}
                      />
                    </td>
                    <td className="satir-islemler">
                      <button className={u.yapilan_tarih ? 'btn-ikincil' : undefined} onClick={() => yapildiIsaretle(u)}>
                        {u.yapilan_tarih ? '↩ Geri al' : '✅ Yapıldı'}
                      </button>
                      <button className="btn-sil" onClick={() => uygulamaSil(u.id)}>Sil</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form className="form-satir" onSubmit={uygulamaEkle}>
        <select value={uygulamaForm.tur} onChange={(e) => setUygulamaForm({ ...uygulamaForm, tur: e.target.value })}>
          {UYGULAMA_TURLERI.map((t) => (
            <option key={t} value={t}>{TUR_EMOJI[t]} {t}</option>
          ))}
        </select>
        <input
          placeholder="İşlem adı"
          value={uygulamaForm.ad}
          onChange={(e) => setUygulamaForm({ ...uygulamaForm, ad: e.target.value })}
          style={{ flex: '1 1 180px' }}
        />
        <input
          type="date"
          title="Planlanan tarih"
          value={uygulamaForm.planlanan_tarih}
          onChange={(e) => setUygulamaForm({ ...uygulamaForm, planlanan_tarih: e.target.value })}
        />
        <input
          placeholder="Doz"
          value={uygulamaForm.doz}
          onChange={(e) => setUygulamaForm({ ...uygulamaForm, doz: e.target.value })}
          style={{ width: 110 }}
        />
        <input
          type="number"
          min="0"
          placeholder="Bekleme (gün)"
          value={uygulamaForm.bekleme_gun}
          onChange={(e) => setUygulamaForm({ ...uygulamaForm, bekleme_gun: e.target.value })}
          style={{ width: 130 }}
        />
        <button type="submit">➕ İşlem Ekle</button>
      </form>

      <h3>🎨 Renk Takibi (ekimden hasada)</h3>
      <RenkTakibi gozlemler={gozlemler} ekimTarihi={ekimTarihi} hasatTarihi={hasatTarihi} />

      <h3>Gelişim Gözlemleri (boy, renk, evre)</h3>
      <form className="form-satir" onSubmit={gozlemEkle}>
        <input
          type="date"
          title="Gözlem tarihi (boşsa bugün)"
          value={gozlemForm.tarih}
          onChange={(e) => setGozlemForm({ ...gozlemForm, tarih: e.target.value })}
        />
        <input
          type="number"
          step="0.1"
          min="0"
          placeholder="Boy (cm)"
          value={gozlemForm.boy_cm}
          onChange={(e) => setGozlemForm({ ...gozlemForm, boy_cm: e.target.value })}
          style={{ width: 110 }}
        />
        <div className="renk-secici" style={{ flexBasis: '100%' }}>
          <span className="soluk-metin">Renk:</span>
          {renkSkalasi.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`renk-nokta${gozlemForm.renk_kodu === s.renk_kodu ? ' secili' : ''}`}
              style={{ background: s.renk_kodu }}
              title={s.ad}
              aria-label={s.ad}
              aria-pressed={gozlemForm.renk_kodu === s.renk_kodu}
              onClick={() =>
                setGozlemForm(
                  gozlemForm.renk_kodu === s.renk_kodu
                    ? { ...gozlemForm, renk: '', renk_kodu: '' }
                    : { ...gozlemForm, renk: s.ad, renk_kodu: s.renk_kodu }
                )
              }
            />
          ))}
          <input
            type="color"
            title="Skalada olmayan bir renk seç"
            value={gozlemForm.renk_kodu || '#4caf50'}
            onChange={(e) => setGozlemForm({ ...gozlemForm, renk_kodu: e.target.value, renk: '' })}
          />
          <input
            placeholder="Renk adı"
            value={gozlemForm.renk}
            onChange={(e) => setGozlemForm({ ...gozlemForm, renk: e.target.value })}
            style={{ width: 140 }}
          />
          {renkSkalasi.length === 0 && (
            <span className="soluk-metin">Bu ürün için Reçeteler sayfasında renk skalası tanımlayabilirsin.</span>
          )}
        </div>
        <input
          placeholder="Gelişim evresi (örn. kardeşlenme)"
          value={gozlemForm.evre}
          onChange={(e) => setGozlemForm({ ...gozlemForm, evre: e.target.value })}
          style={{ flex: '1 1 180px' }}
        />
        <input
          placeholder="Not"
          value={gozlemForm.notlar}
          onChange={(e) => setGozlemForm({ ...gozlemForm, notlar: e.target.value })}
          style={{ flex: '1 1 160px' }}
        />
        <button type="submit">➕ Gözlem Ekle</button>
      </form>

      {gozlemler.length > 0 && (
        <div className="tablo-kaydir">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Boy</th>
                <th>Renk</th>
                <th>Evre</th>
                <th>Not</th>
                <th>Fotoğraf</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gozlemler.map((g) => (
                <tr key={g.id}>
                  <td>{tarihGoster(g.tarih)}</td>
                  <td>{g.boy_cm != null ? `${Number(g.boy_cm)} cm` : ''}</td>
                  <td>
                    {g.renk_kodu && <i className="renk-etiket-nokta" style={{ background: g.renk_kodu }} />}
                    {g.renk}
                  </td>
                  <td>{g.evre}</td>
                  <td>{g.notlar}</td>
                  <td>
                    <FotografSeridi
                      fotograflar={g.fotograflar}
                      onYukle={fotografYukle(`/ekimler/gozlemler/${g.id}/fotograflar`)}
                      onSil={fotografSil}
                    />
                  </td>
                  <td>
                    <button className="btn-sil" onClick={() => gozlemSil(g.id)}>Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
