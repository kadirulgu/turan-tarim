import { useEffect, useState } from 'react';
import { api, dosyaAc } from '../api';
import IlIlceSecici from '../components/IlIlceSecici';
import KimlikKamerasi from '../components/KimlikKamerasi';
import { buyukHarfBasla, kimlikFotografiniOku, tcGecerliMi } from '../kimlikOku';

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
  dogum_tarihi: '',
  cinsiyet: '',
  kimlik_seri_no: '',
  kimlik_gecerlilik: '',
  anne_adi: '',
  baba_adi: '',
};

// Listede kimlik kartı bilgilerinin özeti; bilgi yoksa hücre boş kalır (telefonda satır gizlenir)
function kimlikBilgileri(c) {
  const satirlar = [
    c.dogum_tarihi && `Doğum: ${c.dogum_tarihi.slice(0, 10).split('-').reverse().join('.')}`,
    c.cinsiyet && (c.cinsiyet === 'E' ? 'Erkek' : 'Kadın'),
    (c.anne_adi || c.baba_adi) && `Anne/Baba: ${c.anne_adi || '-'} / ${c.baba_adi || '-'}`,
    c.kimlik_seri_no && `Seri: ${c.kimlik_seri_no}`,
  ].filter(Boolean);
  if (satirlar.length === 0) return null;
  // Tek kapsayıcı: telefondaki kart görünümünde satırlar alt alta kalsın
  return (
    <div>
      {satirlar.map((satir) => (
        <div key={satir}>{satir}</div>
      ))}
    </div>
  );
}

export default function Cariler() {
  const [liste, setListe] = useState([]);
  const [form, setForm] = useState(bosForm);
  const [pdfDosya, setPdfDosya] = useState(null);
  const [hata, setHata] = useState('');
  // Kimlik kartı okuma durumu: null | { ilerleme } | { sonuc } | { hata }
  const [kimlikOkuma, setKimlikOkuma] = useState(null);
  // 'kapali' | 'acik' | 'yok' (tarayıcı kamerayı açamadı: telefonun kendi kamera uygulamasına düşülür)
  const [kamera, setKamera] = useState('kapali');

  const dosyadanDoldur = (e) => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (dosya) kimliktenDoldur(dosya);
  };

  const kimliktenDoldur = async (dosya) => {
    setKamera((k) => (k === 'acik' ? 'kapali' : k));
    setKimlikOkuma({ ilerleme: 0 });
    try {
      const sonuc = await kimlikFotografiniOku(dosya, (ilerleme) => setKimlikOkuma({ ilerleme }));
      if (!Object.values(sonuc).some(Boolean)) {
        setKimlikOkuma({ hata: 'Kimlik okunamadı. Kartı düz bir zemine koyup, ışığı iyi bir yerde, yansıma olmadan ve kart ekranı dolduracak şekilde tekrar çekin.' });
        return;
      }
      // Yalnızca okunabilen alanlar doldurulur; ön ve arka yüz ayrı ayrı okutulunca birbirini tamamlar
      setForm((f) => ({
        ...f,
        kimlik_turu: 'tc',
        isim_unvan: sonuc.ad && sonuc.soyad ? buyukHarfBasla(`${sonuc.ad} ${sonuc.soyad}`) : f.isim_unvan,
        tc_no: sonuc.tc || f.tc_no,
        dogum_tarihi: sonuc.dogumTarihi || f.dogum_tarihi,
        cinsiyet: sonuc.cinsiyet || f.cinsiyet,
        kimlik_seri_no: sonuc.seriNo || f.kimlik_seri_no,
        kimlik_gecerlilik: sonuc.gecerlilik || f.kimlik_gecerlilik,
        anne_adi: sonuc.anneAdi ? buyukHarfBasla(sonuc.anneAdi) : f.anne_adi,
        baba_adi: sonuc.babaAdi ? buyukHarfBasla(sonuc.babaAdi) : f.baba_adi,
      }));
      setKimlikOkuma({ sonuc });
    } catch {
      setKimlikOkuma({ hata: 'Kimlik okunurken hata oluştu. İnternet bağlantısını kontrol edip tekrar deneyin.' });
    }
  };

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
    if (form.kimlik_turu === 'tc' && form.tc_no && !tcGecerliMi(form.tc_no)) {
      setHata('Geçersiz TC Kimlik No — rakamları kontrol edin.');
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
      setKimlikOkuma(null);
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
        <div className="kimlik-okuma">
          {kamera === 'yok' ? (
            // Tarayıcı kamerası açılamadı: telefonun kendi kamerası (çerçevesiz)
            <label className={`kimlik-buton${kimlikOkuma?.ilerleme !== undefined ? ' pasif' : ''}`}>
              📷 Kimlik Kartından Doldur
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={dosyadanDoldur}
                disabled={kimlikOkuma?.ilerleme !== undefined}
                hidden
              />
            </label>
          ) : (
            <button
              type="button"
              className={`kimlik-buton${kimlikOkuma?.ilerleme !== undefined ? ' pasif' : ''}`}
              onClick={() => setKamera('acik')}
              disabled={kimlikOkuma?.ilerleme !== undefined}
            >
              📷 Kimlik Kartından Doldur
            </button>
          )}
          <label className="soluk-metin galeriden">
            veya galeriden seç
            <input type="file" accept="image/*" onChange={dosyadanDoldur} hidden />
          </label>
          {kamera === 'acik' && (
            <KimlikKamerasi
              onCekildi={kimliktenDoldur}
              onKapat={() => setKamera('kapali')}
              onHata={() => {
                setKamera('yok');
                setKimlikOkuma({ hata: 'Kamera açılamadı (izin verilmemiş olabilir). Butona tekrar basınca telefonun kendi kamerası açılır.' });
              }}
            />
          )}
          {kimlikOkuma?.ilerleme !== undefined && (
            <span className="soluk-metin">Kimlik okunuyor… %{kimlikOkuma.ilerleme}</span>
          )}
          {kimlikOkuma?.hata && <span className="hata-mesaji">{kimlikOkuma.hata}</span>}
          {kimlikOkuma?.sonuc && (
            <span>
              {kimlikOkuma.sonuc.tc && <b style={{ color: 'var(--renk-yesil)' }}>✓ TC Kimlik No geçerli · </b>}
              {!kimlikOkuma.sonuc.tc && !form.tc_no && <b className="uyari-metni">⚠ TC Kimlik No okunamadı · </b>}
              <span className="soluk-metin">
                {Object.values(kimlikOkuma.sonuc).filter(Boolean).length} bilgi dolduruldu.
                {!form.anne_adi && ' Anne/baba adı için kartın arka yüzünü de okutun.'}
                {!form.tc_no && ' TC ve ad soyad için ön yüzü okutun.'} Kaydetmeden önce kontrol edin.
              </span>
            </span>
          )}
        </div>

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

        {form.kimlik_turu === 'tc' && (
          <div className="kimlik-alanlari">
            <label>
              Doğum Tarihi
              <input type="date" value={form.dogum_tarihi} onChange={(e) => setForm({ ...form, dogum_tarihi: e.target.value })} />
            </label>
            <label>
              Cinsiyet
              <select value={form.cinsiyet} onChange={(e) => setForm({ ...form, cinsiyet: e.target.value })}>
                <option value="">Seç</option>
                <option value="E">Erkek</option>
                <option value="K">Kadın</option>
              </select>
            </label>
            <label>
              Kimlik Seri No
              <input
                value={form.kimlik_seri_no}
                onChange={(e) => setForm({ ...form, kimlik_seri_no: e.target.value.toUpperCase() })}
                maxLength={20}
              />
            </label>
            <label>
              Son Geçerlilik
              <input
                type="date"
                value={form.kimlik_gecerlilik}
                onChange={(e) => setForm({ ...form, kimlik_gecerlilik: e.target.value })}
              />
            </label>
            <label>
              Anne Adı
              <input value={form.anne_adi} onChange={(e) => setForm({ ...form, anne_adi: e.target.value })} />
            </label>
            <label>
              Baba Adı
              <input value={form.baba_adi} onChange={(e) => setForm({ ...form, baba_adi: e.target.value })} />
            </label>
          </div>
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
            <th>Kimlik Bilgileri</th>
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
              <td>{kimlikBilgileri(c)}</td>
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
