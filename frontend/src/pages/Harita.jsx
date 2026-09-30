import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Polygon, Popup, LayersControl, useMap } from 'react-leaflet';
import { LatLngBounds, control, DomUtil, divIcon, layerGroup, marker, polygon as leafletPoligon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api';

const merkez = [38.7312, 35.4787]; // Kayseri civarı, varsayılan merkez

function ArazilereOdaklan({ featureCollection }) {
  const map = useMap();

  useEffect(() => {
    const noktalar = featureCollection.features
      .filter((f) => f.geometry.type === 'Polygon')
      .flatMap((f) => f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]));
    if (noktalar.length > 0) {
      map.fitBounds(new LatLngBounds(noktalar), { padding: [30, 30] });
    }
  }, [featureCollection, map]);

  return null;
}

function AramaSonucunaOdaklan({ eslesenler }) {
  const map = useMap();

  useEffect(() => {
    if (eslesenler.length === 0) return;
    const noktalar = eslesenler
      .filter((f) => f.geometry.type === 'Polygon')
      .flatMap((f) => f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]));
    if (noktalar.length > 0) {
      map.fitBounds(new LatLngBounds(noktalar), { padding: [50, 50] });
    }
  }, [eslesenler, map]);

  return null;
}

function UrunSecimineOdaklan({ parseller }) {
  const map = useMap();

  useEffect(() => {
    if (parseller.length === 0) return;
    const noktalar = parseller
      .filter((f) => f.geometry.type === 'Polygon')
      .flatMap((f) => f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]));
    if (noktalar.length > 0) {
      map.fitBounds(new LatLngBounds(noktalar), { padding: [50, 50] });
    }
  }, [parseller, map]);

  return null;
}

function HaritaTakip({ mapRef }) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  return null;
}

function tarihiKisaGoster(isoTarih) {
  return new Date(isoTarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });
}

function HavaDurumuPaneli() {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    api
      .get('/hava-durumu')
      .then((res) => setVeri(res.data))
      .catch(() => setHata(true));
  }, []);

  if (hata || !veri) return null;

  return (
    <div className="hava-durumu-paneli">
      <strong>🌤️ {veri.sehir} — Ekim/Dikim İçin 5 Günlük Hava</strong>
      <div className="hava-durumu-gunler">
        {veri.gunler.map((g) => (
          <div key={g.tarih} className={`hava-gun-karti${g.donRiski ? ' don-riski' : ''}`}>
            <div>{tarihiKisaGoster(g.tarih)}</div>
            <div style={{ fontSize: 20 }}>{g.emoji}</div>
            <div>
              {Math.round(g.tempMax)}° / {Math.round(g.tempMin)}°
            </div>
            <div>💧 %{g.yagisOlasilikYuzde}</div>
            {g.donRiski && <div className="don-uyari">❄️ Don riski</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Ada/parsel etiketlerini react-leaflet'in <Tooltip permanent> bileşeni yerine
// doğrudan Leaflet katmanı olarak (pusula kontrolündeki gibi) ekliyoruz. Kalıcı
// Tooltip, React'in DOM yönetimiyle Leaflet'in kendi katman yönetimi arasında
// "removeChild" hatasına ve bembeyaz sayfaya yol açan ciddi bir çakışmaya giriyordu.
function ParselEtiketleri({ featureCollection }) {
  const map = useMap();

  useEffect(() => {
    const grup = layerGroup().addTo(map);
    featureCollection.features.forEach((f) => {
      if (f.geometry.type !== 'Polygon') return;
      const yol = f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
      const merkez = leafletPoligon(yol).getBounds().getCenter();
      const etiket = marker(merkez, {
        icon: divIcon({
          className: 'parsel-etiket',
          html: `${f.properties.ada || '-'}/${f.properties.parsel || '-'}`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        interactive: false,
        keyboard: false,
      });
      grup.addLayer(etiket);
    });
    return () => {
      try {
        map.removeLayer(grup);
      } catch {
        // harita zaten kaldırılmışsa yok sayılır
      }
    };
  }, [featureCollection, map]);

  return null;
}

const DURUM_RENGI = { İnceleniyor: '#757575', Olumlu: '#2e7d32', Vazgeçildi: '#b71c1c' };

function ReferansPopupIcerik({ f, referansGuncelle, referansSil }) {
  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [notlar, setNotlar] = useState(f.properties.notlar || '');
  const [durum, setDurum] = useState(f.properties.durum || 'İnceleniyor');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    setNotlar(f.properties.notlar || '');
    setDurum(f.properties.durum || 'İnceleniyor');
  }, [f.properties.notlar, f.properties.durum]);

  const kaydet = async () => {
    setKaydediliyor(true);
    try {
      await referansGuncelle(f.properties.id, { notlar, durum });
      setDuzenleniyor(false);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <>
      <strong>📄 {f.properties.ad || 'Referans Parsel'}</strong>
      <br />
      Ada/Parsel: {f.properties.ada || '-'}/{f.properties.parsel || '-'}
      <br />
      İl/İlçe/Mevkii: {[f.properties.il, f.properties.ilce, f.properties.koy].filter(Boolean).join(' / ') || '-'}
      <br />
      Alan: {f.properties.alan_dekar ? `${f.properties.alan_dekar} dekar` : '-'}
      <br />
      Durum:{' '}
      <span style={{ color: DURUM_RENGI[f.properties.durum] || '#757575', fontWeight: 700 }}>
        {f.properties.durum || 'İnceleniyor'}
      </span>
      <div style={{ display: duzenleniyor ? 'none' : 'block' }}>
        <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
          {f.properties.notlar ? `📝 ${f.properties.notlar}` : ' '}
        </div>
        <div style={{ marginTop: 6 }}>
          <button type="button" className="btn-ikincil" onClick={() => setDuzenleniyor(true)}>
            {f.properties.notlar ? 'Notu Düzenle' : 'Not Ekle'}
          </button>
        </div>
      </div>
      <div style={{ display: duzenleniyor ? 'flex' : 'none', marginTop: 6, flexDirection: 'column', gap: 6, minWidth: 220 }}>
        <select value={durum} onChange={(e) => setDurum(e.target.value)}>
          <option value="İnceleniyor">İnceleniyor</option>
          <option value="Olumlu">Olumlu</option>
          <option value="Vazgeçildi">Vazgeçildi</option>
        </select>
        <textarea
          rows={3}
          value={notlar}
          onChange={(e) => setNotlar(e.target.value)}
          placeholder="Örn: Sahibiyle görüşüldü, kira teklifi..."
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={kaydet} disabled={kaydediliyor}>
            {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button type="button" className="btn-ikincil" onClick={() => setDuzenleniyor(false)}>
            Vazgeç
          </button>
        </div>
      </div>
      <div style={{ marginTop: 6 }}>
        <button type="button" className="btn-sil" onClick={() => referansSil(f.properties.id)}>
          Sil
        </button>
      </div>
    </>
  );
}

// Sahaya götürülecek A4 çıktı: 1. sayfa harita, 2. sayfa parsel tablosu.
// Leaflet, gizli (display:none) bir kapsayıcı içinde doğru boyut alamadığı
// için ekran dışına (left: -10000px) konumlandırıyoruz; böylece harita gerçek
// piksel boyutuyla oluşuyor ve karolar yüklenebiliyor, yazdırırken CSS ile
// sayfaya geri getiriyoruz.
function YazdirmaGorunumu({ sinirlar, parseller, onKapat }) {
  useEffect(() => {
    const zamanlayici = setTimeout(() => window.print(), 1000);
    const kapanincaTemizle = () => onKapat();
    window.addEventListener('afterprint', kapanincaTemizle);
    return () => {
      clearTimeout(zamanlayici);
      window.removeEventListener('afterprint', kapanincaTemizle);
    };
  }, [onKapat]);

  return (
    <div className="yazdirma-govde">
      <div className="yazdirma-sayfa">
        <h2>Saha Parsel Haritası</h2>
        <MapContainer
          bounds={sinirlar}
          style={{ width: '100%', height: '900px' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          <ParselEtiketleri featureCollection={{ features: parseller }} />
          {parseller.map((f) => {
            const yol = f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
            return (
              <Polygon
                key={f.properties.id}
                positions={yol}
                pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#ffffff', fillOpacity: 0.1 }}
              />
            );
          })}
        </MapContainer>
      </div>
      <div className="yazdirma-sayfa">
        <h2>Parsel Bilgileri</h2>
        <table>
          <thead>
            <tr>
              <th>Ada No</th>
              <th>Parsel No</th>
              <th>Mevkii</th>
              <th>Dekar</th>
            </tr>
          </thead>
          <tbody>
            {parseller.map((f) => (
              <tr key={f.properties.id}>
                <td>{f.properties.ada || '-'}</td>
                <td>{f.properties.parsel || '-'}</td>
                <td>{f.properties.koy || '-'}</td>
                <td>{f.properties.alan_dekar || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PusulaKontrolu() {
  const map = useMap();

  useEffect(() => {
    const pusula = control({ position: 'bottomright' });
    pusula.onAdd = () => {
      const kapsayici = DomUtil.create('div', 'pusula');
      kapsayici.style.margin = '10px';
      kapsayici.innerHTML = `
        <div class="pusula-govde">
          <span class="pusula-k">K</span>
          <div class="pusula-ibre-kuzey"></div>
          <div class="pusula-ibre-guney"></div>
        </div>
      `;
      return kapsayici;
    };
    pusula.addTo(map);
    return () => {
      try {
        pusula.remove();
      } catch {
        // harita zaten kaldırılmışsa yok sayılır
      }
    };
  }, [map]);

  return null;
}

// Başka bir sayfaya geçerken açık kalan popup/tooltip, react-leaflet'in harita
// DOM'unu temizlerken React'in aynı düğümü kaldırmaya çalışmasına ve "removeChild"
// hatasına yol açabiliyor. Sayfadan ayrılmadan hemen önce tüm katmanların
// popup/tooltip'lerini kapatarak bunu önlüyoruz.
function PopupTemizleyici() {
  const map = useMap();

  useEffect(() => {
    return () => {
      try {
        map.eachLayer((katman) => {
          katman.closeTooltip?.();
          katman.closePopup?.();
        });
        map.closePopup();
      } catch {
        // harita zaten kaldırılmışsa yok sayılır
      }
    };
  }, [map]);

  return null;
}

export default function Harita() {
  const [featureCollection, setFeatureCollection] = useState({ features: [] });
  const [referansParseller, setReferansParseller] = useState({ features: [] });
  const [adaFiltre, setAdaFiltre] = useState('');
  const [parselFiltre, setParselFiltre] = useState('');
  const [mevkiiFiltre, setMevkiiFiltre] = useState('');
  const [aramaAktif, setAramaAktif] = useState(false);
  const [digerYukleniyor, setDigerYukleniyor] = useState(false);
  const [digerSonuc, setDigerSonuc] = useState(null);
  const [urunOzet, setUrunOzet] = useState([]);
  const [ekimListesi, setEkimListesi] = useState([]);
  const [seciliUrun, setSeciliUrun] = useState(null);
  const [yazdirmaVerisi, setYazdirmaVerisi] = useState(null);
  const digerDosyaRef = useRef(null);
  const canliHaritaRef = useRef(null);

  const referansYukle = () => api.get('/referans-parseller/geojson').then((res) => setReferansParseller(res.data));

  useEffect(() => {
    api.get('/araziler/geojson').then((res) => setFeatureCollection(res.data));
    api.get('/ekimler/urun-ozet').then((res) => setUrunOzet(res.data));
    api.get('/ekimler').then((res) => setEkimListesi(res.data));
    referansYukle();
  }, []);

  const urunAraziMap = useMemo(() => {
    const harita = new Map();
    ekimListesi.forEach((e) => {
      if (!harita.has(e.urun_adi)) harita.set(e.urun_adi, new Set());
      harita.get(e.urun_adi).add(e.arazi_id);
    });
    return harita;
  }, [ekimListesi]);

  const seciliUrunAraziIdler = useMemo(
    () => (seciliUrun ? urunAraziMap.get(seciliUrun) || new Set() : new Set()),
    [seciliUrun, urunAraziMap],
  );

  const seciliUrunParselleri = useMemo(
    () => featureCollection.features.filter((f) => seciliUrunAraziIdler.has(f.properties.id)),
    [featureCollection, seciliUrunAraziIdler],
  );

  const urunSec = (urunAdi) => {
    setSeciliUrun((onceki) => (onceki === urunAdi ? null : urunAdi));
  };

  const digerParselleriYukle = async (e) => {
    const dosyalar = Array.from(e.target.files || []);
    if (dosyalar.length === 0) return;
    setDigerYukleniyor(true);
    setDigerSonuc(null);
    try {
      const veri = new FormData();
      dosyalar.forEach((dosya) => veri.append('kml', dosya));
      const { data } = await api.post('/referans-parseller', veri);
      setDigerSonuc(data);
      await referansYukle();
    } catch (err) {
      setDigerSonuc({ eklenenSayisi: 0, hatalar: [{ dosya: '', hata: err.response?.data?.error || 'Yükleme başarısız oldu.' }] });
    } finally {
      setDigerYukleniyor(false);
      e.target.value = '';
    }
  };

  const referansSil = async (id) => {
    await api.delete(`/referans-parseller/${id}`);
    referansYukle();
  };

  const referansGuncelle = async (id, veri) => {
    await api.put(`/referans-parseller/${id}`, veri);
    await referansYukle();
  };

  const sahayaGotur = () => {
    const map = canliHaritaRef.current;
    if (!map) return;
    const sinirlar = map.getBounds();
    const gorunenParseller = referansParseller.features.filter((f) => {
      if (f.geometry.type !== 'Polygon') return false;
      const yol = f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
      return sinirlar.intersects(leafletPoligon(yol).getBounds());
    });
    if (gorunenParseller.length === 0) {
      alert('Haritada görünen alanda "Diğer Parsel" bulunamadı. Haritayı yazdırmak istediğin parsellerin göründüğü konuma getirip tekrar dene.');
      return;
    }
    setYazdirmaVerisi({ sinirlar, parseller: gorunenParseller });
  };

  const adaSecenekleri = useMemo(
    () => [...new Set(featureCollection.features.map((f) => f.properties.ada).filter(Boolean))].sort(),
    [featureCollection],
  );
  const parselSecenekleri = useMemo(
    () => [...new Set(featureCollection.features.map((f) => f.properties.parsel).filter(Boolean))].sort(),
    [featureCollection],
  );
  const mevkiiSecenekleri = useMemo(
    () => [...new Set(featureCollection.features.map((f) => f.properties.koy).filter(Boolean))].sort(),
    [featureCollection],
  );

  const eslesenler = useMemo(() => {
    if (!aramaAktif) return [];
    return featureCollection.features.filter((f) => {
      if (adaFiltre && String(f.properties.ada || '') !== adaFiltre) return false;
      if (parselFiltre && String(f.properties.parsel || '') !== parselFiltre) return false;
      if (mevkiiFiltre && String(f.properties.koy || '') !== mevkiiFiltre) return false;
      return true;
    });
  }, [featureCollection, aramaAktif, adaFiltre, parselFiltre, mevkiiFiltre]);
  const eslesenIdler = useMemo(() => new Set(eslesenler.map((f) => f.properties.id)), [eslesenler]);

  const ara = () => {
    if (!adaFiltre && !parselFiltre && !mevkiiFiltre) return;
    setAramaAktif(true);
  };

  const temizle = () => {
    setAdaFiltre('');
    setParselFiltre('');
    setMevkiiFiltre('');
    setAramaAktif(false);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          marginBottom: 10,
          padding: 10,
          background: 'var(--renk-beyaz)',
          border: '1px solid var(--renk-sinir)',
          borderRadius: 8,
        }}
      >
        <select value={adaFiltre} onChange={(e) => setAdaFiltre(e.target.value)}>
          <option value="">Ada No (tümü)</option>
          {adaSecenekleri.map((ada) => (
            <option key={ada} value={ada}>
              {ada}
            </option>
          ))}
        </select>
        <select value={parselFiltre} onChange={(e) => setParselFiltre(e.target.value)}>
          <option value="">Parsel No (tümü)</option>
          {parselSecenekleri.map((parsel) => (
            <option key={parsel} value={parsel}>
              {parsel}
            </option>
          ))}
        </select>
        <select value={mevkiiFiltre} onChange={(e) => setMevkiiFiltre(e.target.value)}>
          <option value="">Mevkii (tümü)</option>
          {mevkiiSecenekleri.map((mevkii) => (
            <option key={mevkii} value={mevkii}>
              {mevkii}
            </option>
          ))}
        </select>
        <button type="button" onClick={ara}>
          Ara
        </button>
        {aramaAktif && (
          <button type="button" onClick={temizle}>
            Temizle
          </button>
        )}
        {aramaAktif && (
          <span>
            {eslesenler.length > 0 ? `${eslesenler.length} parsel bulundu` : 'Eşleşen parsel bulunamadı'}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          marginBottom: 10,
          padding: 10,
          background: 'var(--renk-beyaz)',
          border: '1px solid var(--renk-sinir)',
          borderRadius: 8,
        }}
      >
        <button
          type="button"
          className="btn-ikincil"
          onClick={() => digerDosyaRef.current?.click()}
          disabled={digerYukleniyor}
        >
          📥 Diğer Parselleri İçe Aktar (KML)
        </button>
        <input
          ref={digerDosyaRef}
          type="file"
          accept=".kml"
          multiple
          onChange={digerParselleriYukle}
          style={{ display: 'none' }}
        />
        <button type="button" className="btn-ikincil" onClick={sahayaGotur}>
          🖨️ Sahaya Git (A4 Yazdır)
        </button>
        {digerYukleniyor && <span>Yükleniyor...</span>}
        {digerSonuc && (
          <div>
            <span>{digerSonuc.eklenenSayisi} parsel eklendi</span>
            {digerSonuc.hatalar?.length > 0 && (
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, color: 'var(--renk-kirmizi)' }}>
                {digerSonuc.hatalar.map((h, i) => (
                  <li key={i}>
                    {h.dosya ? `${h.dosya}: ` : ''}
                    {h.hata}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
      <HavaDurumuPaneli />
      <MapContainer
        center={merkez}
        zoom={9}
        style={{
          width: '100%',
          height: '80vh',
          borderRadius: 12,
          border: '1px solid var(--renk-sinir)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <HaritaTakip mapRef={canliHaritaRef} />
        <ArazilereOdaklan featureCollection={featureCollection} />
        <AramaSonucunaOdaklan eslesenler={eslesenler} />
        <UrunSecimineOdaklan parseller={seciliUrunParselleri} />
        <ParselEtiketleri featureCollection={featureCollection} />
        <ParselEtiketleri featureCollection={referansParseller} />
        <PusulaKontrolu />
        <PopupTemizleyici />
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Uydu">
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Yol Haritası">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Arazi (Topografik)">
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {referansParseller.features.map((f) => {
          if (f.geometry.type !== 'Polygon') return null;
          const yol = f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
          return (
            <Polygon
              key={`referans-${f.properties.id}`}
              positions={yol}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#ffffff', fillOpacity: 0.12, opacity: 0.85 }}
            >
              <Popup>
                <ReferansPopupIcerik f={f} referansGuncelle={referansGuncelle} referansSil={referansSil} />
              </Popup>
            </Polygon>
          );
        })}

        {featureCollection.features.map((f) => {
          if (f.geometry.type !== 'Polygon') return null;
          const yol = f.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
          const urunVurgulu = seciliUrun && seciliUrunAraziIdler.has(f.properties.id);
          const aramaVurgulu = aramaAktif && eslesenIdler.has(f.properties.id);
          let renk = { color: '#1b5e20', fillColor: '#2e7d32', fillOpacity: 0.35 };
          if (urunVurgulu) {
            renk = { color: '#e65100', fillColor: '#ff9800', fillOpacity: 0.6 };
          } else if (aramaVurgulu) {
            renk = { color: '#b71c1c', fillColor: '#e53935', fillOpacity: 0.55 };
          }
          return (
            <Polygon key={f.properties.id} positions={yol} pathOptions={renk}>
              <Popup>
                <strong>🌾 {f.properties.ad}</strong>
                <br />
                Ada/Parsel: {f.properties.ada || '-'}/{f.properties.parsel || '-'}
                <br />
                Mevkii: {f.properties.koy || '-'}
                <br />
                Alan: {f.properties.alan_dekar ? `${f.properties.alan_dekar} dekar` : '-'}
                <br />
                👤 Hissedarlar: {f.properties.hissedar_ozet || '-'}
                <br />
                🌱 Ekilen Ürün: {f.properties.ekim_ozet || '-'}
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>
      </div>

      {urunOzet.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 10,
            padding: 10,
            background: 'var(--renk-beyaz)',
            border: '1px solid var(--renk-sinir)',
            borderRadius: 8,
          }}
        >
          <strong>🌾 Ekili Ürünler (haritada göstermek için tıkla):</strong>
          {urunOzet.map((u) => (
            <button
              key={u.urun_adi}
              type="button"
              onClick={() => urunSec(u.urun_adi)}
              className={seciliUrun === u.urun_adi ? undefined : 'btn-ikincil'}
              style={seciliUrun === u.urun_adi ? { background: '#ff9800', color: 'white' } : undefined}
            >
              {u.urun_adi} — {u.parsel_sayisi} parsel, {Number(u.toplam_dekar).toLocaleString('tr-TR')} dekar
            </button>
          ))}
        </div>
      )}

      {yazdirmaVerisi &&
        createPortal(
          <YazdirmaGorunumu
            sinirlar={yazdirmaVerisi.sinirlar}
            parseller={yazdirmaVerisi.parseller}
            onKapat={() => setYazdirmaVerisi(null)}
          />,
          document.body,
        )}
    </div>
  );
}
