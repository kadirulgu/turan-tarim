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

function dogumTarihiBul(metin, satirlar) {
  const tarih = metin.match(/\b(\d{2})[./](\d{2})[./](\d{4})\b/);
  if (tarih) return `${tarih[3]}-${tarih[2]}-${tarih[1]}`;
  // MRZ 2. satır: YYMMDD + kontrol hanesi ile başlar
  const mrz = satirlar.map((s) => s.replace(/\s/g, '')).find((s) => /^\d{7}[MF<]\d{7}/.test(s));
  if (!mrz) return null;
  const [yy, aa, gg] = [mrz.slice(0, 2), mrz.slice(2, 4), mrz.slice(4, 6)];
  const yil = Number(yy) > new Date().getFullYear() % 100 ? `19${yy}` : `20${yy}`;
  return `${yil}-${aa}-${gg}`;
}

export function kimlikMetniniAyristir(metin) {
  const satirlar = metin.split('\n').map((s) => s.trim()).filter(Boolean);
  const mrz = mrzAdSoyad(satirlar);
  return {
    tc: tcBul(metin),
    soyad: basliginAltindaki(satirlar, /soyad|surname/i) || mrz?.soyad || null,
    ad: basliginAltindaki(satirlar, /^ad[ıi]?\b|given/i) || mrz?.ad || null,
    dogumTarihi: dogumTarihiBul(metin, satirlar),
  };
}

// Fotoğrafı OCR için hazırlar: makul boyuta getirir, gri tonlama ve kontrast artırma
async function fotografiHazirla(dosya) {
  const resim = await createImageBitmap(dosya);
  const oran = Math.min(1, 2000 / Math.max(resim.width, resim.height));
  const tuval = document.createElement('canvas');
  tuval.width = Math.round(resim.width * oran);
  tuval.height = Math.round(resim.height * oran);
  const ctx = tuval.getContext('2d');
  ctx.filter = 'grayscale(1) contrast(1.4)';
  ctx.drawImage(resim, 0, 0, tuval.width, tuval.height);
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
