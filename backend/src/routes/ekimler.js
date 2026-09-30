import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import { asyncSarmal } from '../asyncSarmal.js';
import { UYGULAMA_TURLERI } from './receteler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fotoKlasoru = path.join(__dirname, '..', '..', 'uploads', 'fotograflar');
fs.mkdirSync(fotoKlasoru, { recursive: true });

const UZANTILAR = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

// Dosya adı kullanıcının verdiği addan değil, rastgele üretilir (yol/karakter sorunu olmasın)
const fotoYukleyici = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, fotoKlasoru),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${UZANTILAR[file.mimetype]}`),
  }),
  fileFilter: (req, file, cb) => {
    if (!UZANTILAR[file.mimetype]) return cb(new Error('Sadece JPG, PNG veya WEBP fotoğraf yüklenebilir.'));
    cb(null, true);
  },
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
});

function fotografAl(req, res, next) {
  fotoYukleyici.array('fotograflar', 10)(req, res, (err) => {
    if (err) return res.status(400).json({ error: 'Fotoğraf yüklenemedi', detay: err.message });
    next();
  });
}

const dosyalariSil = (dosyaAdlari) => {
  for (const ad of dosyaAdlari) fs.unlink(path.join(fotoKlasoru, ad), () => {});
};

// Bir kayıt (ekim / gözlem / uygulama) silinmeden önce ona bağlı fotoğraf dosyalarını diskten kaldırır;
// veritabanı satırları ON DELETE CASCADE ile zaten silinir.
async function fotografDosyalariniSil(kosul, deger) {
  const { rows } = await pool.query(`SELECT dosya_adi FROM ekim_fotograflari WHERE ${kosul} = $1`, [deger]);
  dosyalariSil(rows.map((r) => r.dosya_adi));
}

// Bir gözlem ya da uygulamanın fotoğraflarını JSON dizisi olarak veren alt sorgu
const fotograflarSql = (kolon, ustAlias) => `
  COALESCE(
    (SELECT json_agg(json_build_object('id', f.id, 'dosya_adi', f.dosya_adi) ORDER BY f.id)
     FROM ekim_fotograflari f WHERE f.${kolon} = ${ustAlias}.id),
    '[]'::json
  ) AS fotograflar`;

const router = Router();

// İlaçlama/uygulamadan sonra beklenmesi gereken gün, hasat tarihinden sonraya
// düşüyorsa (hasat çok erken planlanmışsa) uyarı verilir. "up" = ekim_uygulamalari,
// "e" = ekimler takma adlarıyla kullanılır.
export const BEKLEME_UYARI_KOSULU = `
  up.bekleme_gun IS NOT NULL
  AND e.hasat_tarihi IS NOT NULL
  AND COALESCE(up.yapilan_tarih, up.planlanan_tarih) IS NOT NULL
  AND COALESCE(up.yapilan_tarih, up.planlanan_tarih) + up.bekleme_gun > e.hasat_tarihi
`;

const tamSayiVeyaNull = (deger) => {
  if (deger === '' || deger === null || deger === undefined) return null;
  const sayi = Number(deger);
  return Number.isInteger(sayi) ? sayi : NaN;
};

const sayiVeyaNull = (deger) => {
  if (deger === '' || deger === null || deger === undefined) return null;
  const sayi = Number(deger);
  return Number.isFinite(sayi) ? sayi : NaN;
};

router.get(
  '/',
  asyncSarmal(async (req, res) => {
    const { rows } = await pool.query(`
      SELECT e.*, u.ad AS urun_adi, u.grup AS urun_grubu, a.ad AS arazi_adi, a.ada AS arazi_ada, a.parsel AS arazi_parsel,
        (SELECT COUNT(*) FROM ekim_uygulamalari up WHERE up.ekim_id = e.id) AS uygulama_sayisi,
        (SELECT COUNT(*) FROM ekim_uygulamalari up WHERE up.ekim_id = e.id AND up.yapilan_tarih IS NULL) AS bekleyen_sayisi,
        (SELECT COUNT(*) FROM ekim_uygulamalari up WHERE up.ekim_id = e.id AND ${BEKLEME_UYARI_KOSULU}) AS bekleme_uyari_sayisi
      FROM ekimler e
      JOIN urunler u ON u.id = e.urun_id
      JOIN araziler a ON a.id = e.arazi_id
      ORDER BY e.sezon_yili DESC, e.id DESC
    `);
    res.json(rows);
  })
);

// Haritadaki lejant için: her ürünün kaç farklı parselde ekili olduğu ve
// bu parsellerin toplam alanı (bir parsel aynı ürünle birden fazla sezonda
// ekilmiş olsa bile yalnızca bir kez sayılır).
router.get('/urun-ozet', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.ad AS urun_adi, COUNT(*) AS parsel_sayisi, COALESCE(SUM(a.alan_dekar), 0) AS toplam_dekar
    FROM (SELECT DISTINCT urun_id, arazi_id FROM ekimler) de
    JOIN urunler u ON u.id = de.urun_id
    JOIN araziler a ON a.id = de.arazi_id
    GROUP BY u.ad
    ORDER BY toplam_dekar DESC
  `);
  res.json(rows);
});

// Yeni ekim kaydı açılırken, ürünün reçetesindeki adımlar (varsa) ekim
// tarihine göre planlanan tarihlerle bu ekime kopyalanır.
router.post(
  '/',
  asyncSarmal(async (req, res) => {
    const { arazi_id, urun_id, ekim_donemi, sezon_yili, ekim_tarihi, hasat_tarihi, aciklama, recete_uygula } = req.body;
    const istemci = await pool.connect();
    try {
      await istemci.query('BEGIN');
      const { rows } = await istemci.query(
        `INSERT INTO ekimler (arazi_id, urun_id, ekim_donemi, sezon_yili, ekim_tarihi, hasat_tarihi, aciklama)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [arazi_id, urun_id, ekim_donemi || 'Ana Ürün', sezon_yili, ekim_tarihi || null, hasat_tarihi || null, aciklama || null]
      );
      const ekim = rows[0];

      let kopyalanan = 0;
      if (recete_uygula !== false) {
        const sonuc = await istemci.query(
          `INSERT INTO ekim_uygulamalari (ekim_id, tur, ad, planlanan_tarih, doz, bekleme_gun, aciklama)
           SELECT $1, r.tur, r.ad,
                  CASE WHEN $3::date IS NULL THEN NULL ELSE $3::date + r.ekimden_gun END,
                  r.doz, r.bekleme_gun, r.aciklama
           FROM recete_adimlari r
           WHERE r.urun_id = $2
           ORDER BY r.ekimden_gun, r.id`,
          [ekim.id, urun_id, ekim_tarihi || null]
        );
        kopyalanan = sonuc.rowCount;
      }

      await istemci.query('COMMIT');
      res.status(201).json({ ...ekim, kopyalanan_adim_sayisi: kopyalanan });
    } catch (err) {
      await istemci.query('ROLLBACK');
      throw err;
    } finally {
      istemci.release();
    }
  })
);

router.delete(
  '/:id',
  asyncSarmal(async (req, res) => {
    await fotografDosyalariniSil('ekim_id', req.params.id);
    await pool.query('DELETE FROM ekimler WHERE id=$1', [req.params.id]);
    res.status(204).end();
  })
);

// ---- Uygulamalar (gübreleme / ilaçlama / sulama) ----

router.get(
  '/:id/uygulamalar',
  asyncSarmal(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT up.*, (${BEKLEME_UYARI_KOSULU}) AS bekleme_uyarisi, ${fotograflarSql('uygulama_id', 'up')}
       FROM ekim_uygulamalari up
       JOIN ekimler e ON e.id = up.ekim_id
       WHERE up.ekim_id = $1
       ORDER BY COALESCE(up.planlanan_tarih, up.yapilan_tarih), up.id`,
      [req.params.id]
    );
    res.json(rows);
  })
);

router.post(
  '/:id/uygulamalar',
  asyncSarmal(async (req, res) => {
    const { tur, ad, planlanan_tarih, yapilan_tarih, doz, bekleme_gun, aciklama } = req.body;
    if (!ad?.trim()) return res.status(400).json({ error: 'İşlem adı zorunlu' });
    if (!UYGULAMA_TURLERI.includes(tur)) return res.status(400).json({ error: 'Geçersiz işlem türü' });
    const bekleme = tamSayiVeyaNull(bekleme_gun);
    if (Number.isNaN(bekleme)) return res.status(400).json({ error: 'Bekleme süresi tam sayı olmalı' });

    const { rows } = await pool.query(
      `INSERT INTO ekim_uygulamalari (ekim_id, tur, ad, planlanan_tarih, yapilan_tarih, doz, bekleme_gun, aciklama)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.params.id,
        tur,
        ad.trim(),
        planlanan_tarih || null,
        yapilan_tarih || null,
        doz || null,
        bekleme,
        aciklama || null,
      ]
    );
    res.status(201).json(rows[0]);
  })
);

// Yapıldı olarak işaretle (yapilan_tarih verilir) ya da geri al (null).
router.patch(
  '/uygulamalar/:uid',
  asyncSarmal(async (req, res) => {
    const { rows } = await pool.query('UPDATE ekim_uygulamalari SET yapilan_tarih = $1 WHERE id = $2 RETURNING *', [
      req.body.yapilan_tarih || null,
      req.params.uid,
    ]);
    if (rows.length === 0) return res.status(404).json({ error: 'Kayıt bulunamadı' });
    res.json(rows[0]);
  })
);

router.delete(
  '/uygulamalar/:uid',
  asyncSarmal(async (req, res) => {
    await fotografDosyalariniSil('uygulama_id', req.params.uid);
    await pool.query('DELETE FROM ekim_uygulamalari WHERE id=$1', [req.params.uid]);
    res.status(204).end();
  })
);

// ---- Gözlemler (boy, renk, gelişim evresi) ----

router.get(
  '/:id/gozlemler',
  asyncSarmal(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT g.*, ${fotograflarSql('gozlem_id', 'g')}
       FROM ekim_gozlemleri g
       WHERE g.ekim_id = $1
       ORDER BY g.tarih DESC, g.id DESC`,
      [req.params.id]
    );
    res.json(rows);
  })
);

router.post(
  '/:id/gozlemler',
  asyncSarmal(async (req, res) => {
    const { tarih, boy_cm, renk, renk_kodu, evre, notlar } = req.body;
    const boy = sayiVeyaNull(boy_cm);
    if (Number.isNaN(boy)) return res.status(400).json({ error: 'Boy sayı olmalı' });
    if (renk_kodu && !/^#[0-9a-fA-F]{6}$/.test(renk_kodu)) return res.status(400).json({ error: 'Geçersiz renk' });
    if (boy === null && !renk?.trim() && !renk_kodu && !evre?.trim() && !notlar?.trim()) {
      return res.status(400).json({ error: 'En az bir gözlem bilgisi girin' });
    }

    const { rows } = await pool.query(
      `INSERT INTO ekim_gozlemleri (ekim_id, tarih, boy_cm, renk, renk_kodu, evre, notlar)
       VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.params.id,
        tarih || null,
        boy,
        renk?.trim() || null,
        renk_kodu ? renk_kodu.toLowerCase() : null,
        evre?.trim() || null,
        notlar?.trim() || null,
      ]
    );
    res.status(201).json({ ...rows[0], fotograflar: [] });
  })
);

router.delete(
  '/gozlemler/:gid',
  asyncSarmal(async (req, res) => {
    await fotografDosyalariniSil('gozlem_id', req.params.gid);
    await pool.query('DELETE FROM ekim_gozlemleri WHERE id=$1', [req.params.gid]);
    res.status(204).end();
  })
);

// ---- Fotoğraflar (gözleme ya da uygulamaya bağlı) ----

// Ortak yükleme işleyicisi: üst kaydın ekim_id'sini bulur, fotoğrafları kaydeder.
const fotografYukle = (ustTablo, ustKolon) =>
  asyncSarmal(async (req, res) => {
    const yuklenenler = req.files || [];
    const { rows: ust } = await pool.query(`SELECT ekim_id FROM ${ustTablo} WHERE id = $1`, [req.params.ustId]);
    if (ust.length === 0 || yuklenenler.length === 0) {
      dosyalariSil(yuklenenler.map((d) => d.filename));
      return res.status(ust.length === 0 ? 404 : 400).json({ error: ust.length === 0 ? 'Kayıt bulunamadı' : 'Fotoğraf seçilmedi' });
    }

    const kayitlar = [];
    for (const dosya of yuklenenler) {
      const { rows } = await pool.query(
        `INSERT INTO ekim_fotograflari (ekim_id, ${ustKolon}, dosya_adi) VALUES ($1, $2, $3) RETURNING id, dosya_adi`,
        [ust[0].ekim_id, req.params.ustId, dosya.filename]
      );
      kayitlar.push(rows[0]);
    }
    res.status(201).json(kayitlar);
  });

router.post('/gozlemler/:ustId/fotograflar', fotografAl, fotografYukle('ekim_gozlemleri', 'gozlem_id'));
router.post('/uygulamalar/:ustId/fotograflar', fotografAl, fotografYukle('ekim_uygulamalari', 'uygulama_id'));

router.delete(
  '/fotograflar/:fid',
  asyncSarmal(async (req, res) => {
    const { rows } = await pool.query('DELETE FROM ekim_fotograflari WHERE id = $1 RETURNING dosya_adi', [req.params.fid]);
    dosyalariSil(rows.map((r) => r.dosya_adi));
    res.status(204).end();
  })
);

export default router;
