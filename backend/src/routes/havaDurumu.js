import { Router } from 'express';

const router = Router();

// Eskişehir merkez koordinatları
const ENLEM = 39.7667;
const BOYLAM = 30.5256;

const HAVA_KODU_ACIKLAMA = {
  0: { emoji: '☀️', aciklama: 'Açık' },
  1: { emoji: '🌤️', aciklama: 'Az bulutlu' },
  2: { emoji: '⛅', aciklama: 'Parçalı bulutlu' },
  3: { emoji: '☁️', aciklama: 'Kapalı' },
  45: { emoji: '🌫️', aciklama: 'Sisli' },
  48: { emoji: '🌫️', aciklama: 'Kırağı sisi' },
  51: { emoji: '🌦️', aciklama: 'Hafif çisenti' },
  53: { emoji: '🌦️', aciklama: 'Çisenti' },
  55: { emoji: '🌧️', aciklama: 'Yoğun çisenti' },
  61: { emoji: '🌦️', aciklama: 'Hafif yağmur' },
  63: { emoji: '🌧️', aciklama: 'Yağmur' },
  65: { emoji: '🌧️', aciklama: 'Kuvvetli yağmur' },
  71: { emoji: '🌨️', aciklama: 'Hafif kar' },
  73: { emoji: '🌨️', aciklama: 'Kar' },
  75: { emoji: '❄️', aciklama: 'Kuvvetli kar' },
  80: { emoji: '🌦️', aciklama: 'Sağanak' },
  81: { emoji: '🌧️', aciklama: 'Kuvvetli sağanak' },
  82: { emoji: '⛈️', aciklama: 'Şiddetli sağanak' },
  95: { emoji: '⛈️', aciklama: 'Gök gürültülü fırtına' },
  96: { emoji: '⛈️', aciklama: 'Dolulu fırtına' },
  99: { emoji: '⛈️', aciklama: 'Şiddetli dolulu fırtına' },
};

router.get('/', async (req, res) => {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${ENLEM}&longitude=${BOYLAM}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max` +
      `&forecast_days=5&timezone=Europe%2FIstanbul`;
    const yanit = await fetch(url);
    if (!yanit.ok) {
      throw new Error(`Open-Meteo ${yanit.status} döndürdü`);
    }
    const veri = await yanit.json();
    const g = veri.daily;

    const gunler = g.time.map((tarih, i) => {
      const kod = g.weathercode[i];
      const bilgi = HAVA_KODU_ACIKLAMA[kod] || { emoji: '❓', aciklama: 'Bilinmiyor' };
      return {
        tarih,
        emoji: bilgi.emoji,
        aciklama: bilgi.aciklama,
        tempMax: g.temperature_2m_max[i],
        tempMin: g.temperature_2m_min[i],
        yagisMm: g.precipitation_sum[i],
        yagisOlasilikYuzde: g.precipitation_probability_max[i],
        ruzgarMaxKmh: g.windspeed_10m_max[i],
        donRiski: g.temperature_2m_min[i] <= 0,
      };
    });

    res.json({ sehir: 'Eskişehir', gunler });
  } catch (hata) {
    console.error('Hava durumu verisi çekilemedi:', hata.message);
    res.status(502).json({ hata: 'Hava durumu verisi şu anda alınamadı.' });
  }
});

export default router;
