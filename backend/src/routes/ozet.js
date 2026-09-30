import { Router } from 'express';
import { pool } from '../db.js';
import { BEKLEME_UYARI_KOSULU } from './ekimler.js';

const router = Router();

router.get('/', async (req, res) => {
  const { rows: genelRows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM araziler) AS toplam_arazi,
      (SELECT COALESCE(SUM(alan_dekar), 0) FROM araziler) AS toplam_dekar,
      (SELECT COUNT(*) FROM cariler) AS toplam_cari,
      (SELECT COUNT(*) FROM firmalar) AS toplam_firma,
      (SELECT COUNT(*) FROM sozlesmeler WHERE bitis_tarihi IS NULL OR bitis_tarihi >= CURRENT_DATE) AS aktif_sozlesme,
      (SELECT MAX(sezon_yili) FROM ekimler) AS bu_sezon_yili
  `);
  const genel = genelRows[0];

  let urunCesidi = 0;
  if (genel.bu_sezon_yili) {
    const { rows } = await pool.query('SELECT COUNT(DISTINCT urun_id) AS sayi FROM ekimler WHERE sezon_yili = $1', [
      genel.bu_sezon_yili,
    ]);
    urunCesidi = Number(rows[0].sayi);
  }

  const { rows: yaklasanlar } = await pool.query(`
    SELECT s.id, c.isim_unvan AS cari_adi, a.ad AS arazi_adi, s.bitis_tarihi
    FROM sozlesmeler s
    JOIN cariler c ON c.id = s.cari_id
    JOIN araziler a ON a.id = s.arazi_id
    WHERE s.bitis_tarihi IS NOT NULL AND s.bitis_tarihi BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    ORDER BY s.bitis_tarihi ASC
  `);

  // Önümüzdeki 7 gün içinde yapılması planlanan (ya da tarihi geçmiş ama
  // hâlâ yapılmamış) reçete adımları
  const { rows: yaklasanIsler } = await pool.query(`
    SELECT up.id, up.tur, up.ad, up.doz, up.planlanan_tarih,
           e.id AS ekim_id, a.ad AS arazi_adi, a.ada AS arazi_ada, a.parsel AS arazi_parsel, u.ad AS urun_adi
    FROM ekim_uygulamalari up
    JOIN ekimler e ON e.id = up.ekim_id
    JOIN araziler a ON a.id = e.arazi_id
    JOIN urunler u ON u.id = e.urun_id
    WHERE up.yapilan_tarih IS NULL
      AND up.planlanan_tarih IS NOT NULL
      AND up.planlanan_tarih <= CURRENT_DATE + INTERVAL '7 days'
      AND (e.hasat_tarihi IS NULL OR e.hasat_tarihi >= CURRENT_DATE)
    ORDER BY up.planlanan_tarih ASC, up.id
  `);

  // Hasat öncesi bekleme süresi, planlanan hasat tarihinden sonraya düşen ilaçlamalar
  const { rows: beklemeUyarilari } = await pool.query(`
    SELECT up.id, up.tur, up.ad, up.bekleme_gun,
           COALESCE(up.yapilan_tarih, up.planlanan_tarih) AS uygulama_tarihi,
           (COALESCE(up.yapilan_tarih, up.planlanan_tarih) + up.bekleme_gun) AS en_erken_hasat,
           e.id AS ekim_id, e.hasat_tarihi, a.ad AS arazi_adi, a.ada AS arazi_ada, a.parsel AS arazi_parsel, u.ad AS urun_adi
    FROM ekim_uygulamalari up
    JOIN ekimler e ON e.id = up.ekim_id
    JOIN araziler a ON a.id = e.arazi_id
    JOIN urunler u ON u.id = e.urun_id
    WHERE ${BEKLEME_UYARI_KOSULU}
      AND e.hasat_tarihi >= CURRENT_DATE
    ORDER BY e.hasat_tarihi ASC, up.id
  `);

  res.json({
    yaklasanIsler,
    beklemeUyarilari,
    toplamArazi: Number(genel.toplam_arazi),
    toplamDekar: Number(genel.toplam_dekar),
    toplamCari: Number(genel.toplam_cari),
    toplamFirma: Number(genel.toplam_firma),
    aktifSozlesme: Number(genel.aktif_sozlesme),
    buSezonYili: genel.bu_sezon_yili,
    urunCesidi,
    yaklasanSozlesmeler: yaklasanlar,
  });
});

export default router;
