import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { TUR_EMOJI, tarihGoster } from '../receteSabitleri';

const araziEtiketi = (x) => `${x.arazi_ada || '?'}/${x.arazi_parsel || '?'} — ${x.arazi_adi}`;

function IstatistikKarti({ emoji, deger, etiket }) {
  return (
    <div className="ozet-kart">
      <div className="ozet-kart-ikon">{emoji}</div>
      <div>
        <div className="ozet-kart-deger">{deger}</div>
        <div className="ozet-kart-etiket">{etiket}</div>
      </div>
    </div>
  );
}

function gunFarki(tarih) {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const hedef = new Date(`${tarih.slice(0, 10)}T00:00:00`);
  return Math.round((hedef - bugun) / (1000 * 60 * 60 * 24));
}

function kalanGunSinifi(gun) {
  if (gun <= 7) return 'kalan-gun acil';
  if (gun <= 15) return 'kalan-gun yakin';
  return 'kalan-gun';
}

export default function Ozet() {
  const [veri, setVeri] = useState(null);

  useEffect(() => {
    api.get('/ozet').then((res) => setVeri(res.data));
  }, []);

  if (!veri) {
    return <p>Yükleniyor...</p>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>📊 Özet</h2>

      <div className="ozet-izgara">
        <IstatistikKarti emoji="🌾" deger={veri.toplamArazi} etiket="Toplam Arazi" />
        <IstatistikKarti emoji="📐" deger={`${veri.toplamDekar.toLocaleString('tr-TR')} dekar`} etiket="Toplam Alan" />
        <IstatistikKarti
          emoji="🌱"
          deger={veri.urunCesidi}
          etiket={veri.buSezonYili ? `${veri.buSezonYili} Sezonu Ürün Çeşidi` : 'Ekili Ürün Çeşidi'}
        />
        <IstatistikKarti emoji="👤" deger={veri.toplamCari} etiket="Çiftçi / Cari" />
        <IstatistikKarti emoji="📋" deger={veri.aktifSozlesme} etiket="Aktif Sözleşme" />
        <IstatistikKarti emoji="🏢" deger={veri.toplamFirma} etiket="Firmamız" />
      </div>

      {veri.beklemeUyarilari.length > 0 && (
        <>
          <h2>⚠️ Hasat Öncesi Bekleme Süresi Uyarıları</h2>
          <div className="uyari-kutu">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {veri.beklemeUyarilari.map((u) => (
                <li key={u.id}>
                  <b>{araziEtiketi(u)}</b> ({u.urun_adi}): {u.ad}, {tarihGoster(u.uygulama_tarihi)} tarihinde; {u.bekleme_gun}{' '}
                  gün beklenmeli, en erken hasat {tarihGoster(u.en_erken_hasat)}. Planlı hasat {tarihGoster(u.hasat_tarihi)}.
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <h2>🛠️ Yaklaşan İşler (7 gün içinde ve geciken)</h2>
      {veri.yaklasanIsler.length === 0 ? (
        <div className="ozet-bos">✅ Önümüzdeki 7 gün için bekleyen gübreleme, ilaçlama ya da sulama işi yok.</div>
      ) : (
        <div className="tablo-kaydir">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Arazi</th>
                <th>Ürün</th>
                <th>İşlem</th>
                <th>Doz</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {veri.yaklasanIsler.map((is) => {
                const kalan = gunFarki(is.planlanan_tarih);
                return (
                  <tr key={is.id}>
                    <td>{tarihGoster(is.planlanan_tarih)}</td>
                    <td>{araziEtiketi(is)}</td>
                    <td>{is.urun_adi}</td>
                    <td>{TUR_EMOJI[is.tur]} {is.ad}</td>
                    <td>{is.doz}</td>
                    <td>
                      {kalan < 0 ? (
                        <span className="kalan-gun acil">{-kalan} gün gecikti</span>
                      ) : (
                        <span className={kalanGunSinifi(kalan)}>{kalan === 0 ? 'Bugün' : `${kalan} gün sonra`}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="soluk-metin">
        İşi “yapıldı” olarak işaretlemek için <Link to="/ekimler">Ekimler</Link> sayfasında ilgili ekimin “Takip” bölümünü aç.
      </p>

      <h2>⏰ Yaklaşan Sözleşme Bitişleri (30 gün içinde)</h2>
      {veri.yaklasanSozlesmeler.length === 0 ? (
        <div className="ozet-bos">✅ Önümüzdeki 30 gün içinde bitecek sözleşme yok.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Cari</th>
              <th>Arazi</th>
              <th>Bitiş Tarihi</th>
              <th>Kalan Gün</th>
            </tr>
          </thead>
          <tbody>
            {veri.yaklasanSozlesmeler.map((s) => {
              const kalan = gunFarki(s.bitis_tarihi);
              return (
                <tr key={s.id}>
                  <td>{s.cari_adi}</td>
                  <td>{s.arazi_adi}</td>
                  <td>{tarihGoster(s.bitis_tarihi)}</td>
                  <td>
                    <span className={kalanGunSinifi(kalan)}>{kalan === 0 ? 'Bugün' : `${kalan} gün`}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
