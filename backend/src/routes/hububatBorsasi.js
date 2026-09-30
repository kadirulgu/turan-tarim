import { Router } from 'express';
import * as cheerio from 'cheerio';

const router = Router();

// Eskişehir Ticaret Borsası kendi sitesi ve TOBB'un merkezi borsa sistemi
// çekilemediği (500 hatası / geçersiz SSL sertifikası) için, Eskişehir'in de
// dahil olduğu Polatlı Ticaret Borsası'nın günlük hububat bültenini kullanıyoruz.
const KAYNAK_URL = 'https://www.polatliborsa.org.tr/tr-hububat-bulteni/';

router.get('/', async (req, res) => {
  try {
    const yanit = await fetch(KAYNAK_URL);
    if (!yanit.ok) {
      throw new Error(`Kaynak sunucu ${yanit.status} döndürdü`);
    }
    const html = await yanit.text();
    const $ = cheerio.load(html);

    const baslikMetni = $('p:contains("Tarih")').first().text();
    const eslesme = baslikMetni.match(/Tarih\s*:\s*(.+?)\s*[-–—:]*\s*Saat\s*:\s*([0-9:]+)/i);
    const tarih = eslesme ? eslesme[1].trim() : null;
    const saat = eslesme ? eslesme[2].trim() : null;

    // Tablo sırası: Ürün Cinsi | Polatlı(4 sütun) | Eskişehir(4 sütun) | Konya(4 sütun) | Edirne(4 sütun)
    const urunler = [];
    $('table.style2 tbody tr').each((_, satir) => {
      const hucreler = $(satir).find('td');
      if (hucreler.length !== 17) return;
      const enAz = $(hucreler[5]).text().trim();
      const enCok = $(hucreler[6]).text().trim();
      const ortalama = $(hucreler[7]).text().trim();
      const miktarTon = $(hucreler[8]).text().trim();
      if (!enAz && !enCok && !ortalama && !miktarTon) return;
      urunler.push({ ad: $(hucreler[0]).text().trim(), enAz, enCok, ortalama, miktarTon });
    });

    res.json({
      borsaAdi: 'Eskişehir Ticaret Borsası',
      birim: 'Kr.',
      kaynakUrl: KAYNAK_URL,
      tarih,
      saat,
      urunler,
    });
  } catch (hata) {
    console.error('Hububat borsası verisi çekilemedi:', hata.message);
    res.status(502).json({ hata: 'Borsa verisi şu anda alınamadı. Kaynak site erişilemiyor olabilir, birazdan tekrar deneyin.' });
  }
});

export default router;
