// TKGM KML dosyaları koordinatlara yükseklik (Z) bilgisi de ekler (ör. "30.5,39.7,0"),
// ama harita sütunumuz 2 boyutlu (X/Y) olduğu için PostGIS bunu reddeder
// ("Geometry has Z dimension but column does not"). Z değerini atarak düzeltiyoruz.
export function zBoyutunuKaldir(geometri) {
  function temizle(koordinatlar) {
    if (typeof koordinatlar[0] === 'number') {
      return koordinatlar.slice(0, 2);
    }
    return koordinatlar.map(temizle);
  }
  return { ...geometri, coordinates: temizle(geometri.coordinates) };
}

function normallestir(deger) {
  return (deger ?? '')
    .toString()
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/\s+/g, ' ');
}

export function kmlOzelligiBul(kmlOzellikleri, ...adaylar) {
  for (const aday of adaylar) {
    const anahtar = Object.keys(kmlOzellikleri).find(
      (k) => k.toLocaleLowerCase('tr') === aday.toLocaleLowerCase('tr')
    );
    if (anahtar && kmlOzellikleri[anahtar]) return kmlOzellikleri[anahtar];
  }
  return null;
}

// TKGM KML dosyalarında "Alan" alanı m² olarak Türkçe biçimde gelir, örn. "14.860,28"
export function alanM2yiDekaraCevir(deger) {
  if (!deger) return null;
  const temiz = deger.toString().replace(/\./g, '').replace(',', '.');
  const m2 = parseFloat(temiz);
  return Number.isNaN(m2) ? null : m2 / 1000;
}

export function kmlIleKarsilastir(kmlOzellikleri, form) {
  const uyusmazliklar = [];

  const metinKarsilastir = (alan, etiket, girilenDeger, kmlDeger) => {
    if (!girilenDeger || !kmlDeger) return;
    if (normallestir(girilenDeger) !== normallestir(kmlDeger)) {
      uyusmazliklar.push({ alan, etiket, girilen: girilenDeger, kml: kmlDeger });
    }
  };

  metinKarsilastir('il', 'İl', form.il, kmlOzelligiBul(kmlOzellikleri, 'İl', 'Il'));
  metinKarsilastir('ilce', 'İlçe', form.ilce, kmlOzelligiBul(kmlOzellikleri, 'İlçe', 'Ilce'));
  metinKarsilastir('koy', 'Mevki', form.koy, kmlOzelligiBul(kmlOzellikleri, 'Mevkii', 'Mevki'));
  metinKarsilastir('ada', 'Ada', form.ada, kmlOzelligiBul(kmlOzellikleri, 'Ada'));
  metinKarsilastir('parsel', 'Parsel', form.parsel, kmlOzelligiBul(kmlOzellikleri, 'ParselNo', 'Parsel', 'Parsel No'));

  const kmlAlanDekar = alanM2yiDekaraCevir(kmlOzelligiBul(kmlOzellikleri, 'Alan'));
  const girilenAlan = form.alan_dekar ? parseFloat(form.alan_dekar) : null;
  if (kmlAlanDekar !== null && girilenAlan !== null && !Number.isNaN(girilenAlan)) {
    const fark = Math.abs(kmlAlanDekar - girilenAlan);
    const tolerans = Math.max(0.05 * kmlAlanDekar, 0.05);
    if (fark > tolerans) {
      uyusmazliklar.push({
        alan: 'alan_dekar',
        etiket: 'Alan (dekar)',
        girilen: girilenAlan,
        kml: Math.round(kmlAlanDekar * 100) / 100,
      });
    }
  }

  return uyusmazliklar;
}
