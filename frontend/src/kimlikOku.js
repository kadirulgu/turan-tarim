// Kimlik kartı fotoğrafından TC Kimlik No, ad, soyad ve doğum tarihini okur.
// Okuma (OCR) tamamen telefonda/tarayıcıda yapılır; fotoğraf sunucuya gönderilmez.
// Kartın ön yüzü de, arka yüzündeki makine okunur alan (MRZ, "<<" içeren satırlar) da okunabilir.

// TC Kimlik No'nun resmi kontrol algoritması: 11 hane, ilk hane 0 değil,
// 10. ve 11. haneler önceki hanelerden hesaplanır. Yanlış okunan numaraları yakalar.
export function tcGecerliMi(tc) {
  if (!/^[1-9]\d{10}$/.test(tc)) return false;
  const d = [...tc].map(Number);
  const tekler = d[0] + d[2] + d[4] + d[6] + d[8];
  const ciftler = d[1] + d[3] + d[5] + d[7];
  if ((((tekler * 7 - ciftler) % 10) + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

// OCR'ın rakamlarla karıştırdığı harfler
const RAKAM_DUZELT = { O: '0', o: '0', D: '0', Q: '0', I: '1', l: '1', i: '1', '|': '1', Z: '2', S: '5', s: '5', G: '6', B: '8', g: '9' };

function tcBul(metin) {
  // Boşlukla bölünmüş ya da harfe benzemiş rakamları da yakalamak için geniş aday ara
  const adaylar = metin.match(/[0-9OoDQIli|ZSsGBg][0-9OoDQIli|ZSsGBg ]{9,16}[0-9OoDQIli|ZSsGBg]/g) || [];
  for (const aday of adaylar) {
    const rakamlar = [...aday.replace(/ /g, '')].map((c) => RAKAM_DUZELT[c] ?? c).join('');
    // Uzun bir dizinin içindeki 11 haneli pencereleri de dene (MRZ satırında TC başka verilere bitişik)
    for (let i = 0; i + 11 <= rakamlar.length; i++) {
      const tc = rakamlar.slice(i, i + 11);
      if (tcGecerliMi(tc)) return tc;
    }
  }
  return null;
}

const temizAd = (s) =>
  s
    .replace(/[^A-Za-zÇĞİÖŞÜçğıöşü ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Başlık satırının altındaki ilk anlamlı satırı döndürür (ör. "Soyadı / Surname" -> "YILMAZ")
function basliginAltindaki(satirlar, desen) {
  const i = satirlar.findIndex((s) => desen.test(s));
  if (i === -1) return null;
  for (const satir of satirlar.slice(i + 1, i + 3)) {
    const ad = temizAd(satir);
    if (ad.length >= 2 && !/surname|given|name|soyad|adı|adi|doğum|dogum|birth/i.test(ad)) return ad;
  }
  return null;
}

function mrzAdSoyad(satirlar) {
  // Arka yüz 3. satır: SOYAD<<AD<IKINCIAD<<<<<
  const satir = satirlar.map((s) => s.replace(/\s/g, '')).find((s) => /^[A-Z]+(<[A-Z]+)*<<[A-Z]+(<[A-Z]+)*<*$/.test(s));
  if (!satir) return null;
  const [soyad, ad] = satir.split('<<');
  return { soyad: soyad.replace(/</g, ' '), ad: ad.replace(/</g, ' ').trim() };
}

// Arka yüz MRZ 1. satırı: I<TUR + seri no (9) + kontrol hanesi + TC ...
// 2. satırı: doğum YYMMDD + kontrol + cinsiyet (M/F) + son geçerlilik YYMMDD + kontrol ...
function mrzBilgileri(satirlar) {
  const bitisik = satirlar.map((s) => s.replace(/\s/g, ''));
  const sonuc = {};
  const s1 = bitisik.find((s) => /^I[<A-Z]TUR[A-Z0-9]{9}/.test(s));
  if (s1) sonuc.seriNo = s1.slice(5, 14);
  const s2 = bitisik.find((s) => /^\d{7}[MF<]\d{7}/.test(s));
  if (s2) {
    const tarih = (yymmdd, gecmis) => {
      const yy = Number(yymmdd.slice(0, 2));
      // Doğum tarihi geçmişte; son geçerlilik genelde gelecekte (2000'ler)
      const yuzyil = gecmis && yy > new Date().getFullYear() % 100 ? 1900 : 2000;
      return `${yuzyil + yy}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`;
    };
    sonuc.dogumTarihi = tarih(s2.slice(0, 6), true);
    if (s2[7] !== '<') sonuc.cinsiyet = s2[7] === 'M' ? 'E' : 'K';
    sonuc.gecerlilik = tarih(s2.slice(8, 14), false);
  }
  return sonuc;
}

export function kimlikMetniniAyristir(metin) {
  const satirlar = metin.split('\n').map((s) => s.trim()).filter(Boolean);
  const mrzAd = mrzAdSoyad(satirlar);
  const mrz = mrzBilgileri(satirlar);

  // Ön yüzde iki tarih var: doğum tarihi (en eski) ve son geçerlilik (en yeni)
  const tarihler = [...metin.matchAll(/\b(\d{2})[./](\d{2})[./](\d{4})\b/g)]
    .map((t) => `${t[3]}-${t[2]}-${t[1]}`)
    .sort();
  const cinsiyet = metin.match(/\b([EK])\s*\/\s*([MF])\b/);
  const seriNo = metin.replace(/\s/g, '').match(/[A-Z]\d{2}[A-Z]\d{5}/);

  return {
    tc: tcBul(metin),
    soyad: basliginAltindaki(satirlar, /soyad|surname/i) || mrzAd?.soyad || null,
    ad: basliginAltindaki(satirlar, /^ad[ıi]?\b|given/i) || mrzAd?.ad || null,
    dogumTarihi: tarihler[0] || mrz.dogumTarihi || null,
    gecerlilik: (tarihler.length > 1 ? tarihler.at(-1) : null) || mrz.gecerlilik || null,
    cinsiyet: cinsiyet?.[1] || mrz.cinsiyet || null,
    seriNo: seriNo?.[0] || mrz.seriNo || null,
    anneAdi: basliginAltindaki(satirlar, /anne|mother/i),
    babaAdi: basliginAltindaki(satirlar, /baba|father/i),
  };
}

// Fotoğrafı OCR için hazırlar: makul boyuta getirir, gri tonlama ve kontrast artırma
async function fotografiHazirla(dosya) {
  const resim = await createImageBitmap(dosya);
  const oran = Math.min(1, 2000 / Math.max(resim.width, resim.height));
  const tuval = document.createElement('canvas');
  tuval.width = Math.round(resim.width * oran);
  tuval.height = Math.round(resim.height * oran);
  const ctx = tuval.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(resim, 0, 0, tuval.width, tuval.height);
  // ctx.filter Safari'de her sürümde yok; gri tonlama ve kontrast piksel piksel yapılır
  const pikseller = ctx.getImageData(0, 0, tuval.width, tuval.height);
  const p = pikseller.data;
  for (let i = 0; i < p.length; i += 4) {
    const gri = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    p[i] = p[i + 1] = p[i + 2] = Math.max(0, Math.min(255, (gri - 128) * 1.4 + 128));
  }
  ctx.putImageData(pikseller, 0, 0);
  return tuval;
}

export async function kimlikFotografiniOku(dosya, onIlerleme) {
  // OCR kütüphanesi büyük; yalnızca bu özellik kullanılınca indirilir
  const { createWorker } = await import('tesseract.js');
  const isci = await createWorker('tur', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onIlerleme?.(Math.round(m.progress * 100));
    },
  });
  try {
    const { data } = await isci.recognize(await fotografiHazirla(dosya));
    return kimlikMetniniAyristir(data.text);
  } finally {
    await isci.terminate();
  }
}

// "AHMET MEHMET" -> "Ahmet Mehmet" (Türkçe İ/ı kurallarıyla)
export const buyukHarfBasla = (s) =>
  s
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .map((k) => k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1))
    .join(' ');
