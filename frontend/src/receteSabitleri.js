export const UYGULAMA_TURLERI = ['Gübreleme', 'İlaçlama', 'Sulama', 'Diğer'];

export const TUR_EMOJI = { Gübreleme: '🧪', İlaçlama: '💦', Sulama: '🚿', Diğer: '🔧' };

export function urunleriGrupla(urunler) {
  const gruplar = new Map();
  for (const u of urunler) {
    const grupAdi = u.grup || 'Diğer';
    if (!gruplar.has(grupAdi)) gruplar.set(grupAdi, []);
    gruplar.get(grupAdi).push(u);
  }
  return [...gruplar.entries()];
}

// API DATE alanlarını "YYYY-AA-GG" metni olarak verir; "GG.AA.YYYY" gösterir.
export const tarihGoster = (tarih) => {
  if (!tarih) return '';
  const [yil, ay, gun] = tarih.slice(0, 10).split('-');
  return `${gun}.${ay}.${yil}`;
};

// Yerel saate göre bugünün YYYY-AA-GG hali (toISOString UTC verdiği için gece yarısından sonra bir gün geri kalır)
export const bugunISO = () => new Date().toLocaleDateString('sv-SE');
