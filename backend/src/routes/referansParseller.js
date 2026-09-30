import { Router } from 'express';
import multer from 'multer';
import { DOMParser } from '@xmldom/xmldom';
import { kml } from '@tmcw/togeojson';
import { pool } from '../db.js';
import { kmlOzelligiBul, alanM2yiDekaraCevir, zBoyutunuKaldir } from '../kmlKarsilastir.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Kendi arazilerimiz haricinde, haritada beyaz/şeffaf referans olarak
// gösterilecek komşu/çevre parseller. Toplu KML aktarımını destekler:
// hem birden fazla dosya birden seçilebilir hem de tek bir KML dosyasının
// içinde birden fazla parsel varsa hepsi ayrı ayrı işlenir.

router.get('/geojson', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT id, ad, ada, parsel, il, ilce, koy, alan_dekar, notlar, durum, ST_AsGeoJSON(geom) AS geojson
    FROM referans_parseller
  `);
  res.json({
    type: 'FeatureCollection',
    features: rows.map((r) => ({
      type: 'Feature',
      geometry: JSON.parse(r.geojson),
      properties: {
        id: r.id,
        ad: r.ad,
        ada: r.ada,
        parsel: r.parsel,
        il: r.il,
        ilce: r.ilce,
        koy: r.koy,
        alan_dekar: r.alan_dekar,
        notlar: r.notlar,
        durum: r.durum,
      },
    })),
  });
});

router.post('/', upload.array('kml', 50), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'En az bir KML dosyası seçmelisin' });
  }

  const eklenenler = [];
  const hatalar = [];

  for (const dosya of req.files) {
    try {
      const xml = new DOMParser().parseFromString(dosya.buffer.toString('utf-8'), 'text/xml');
      const geojson = kml(xml);
      const parseller = geojson.features.filter((f) => f.geometry);

      if (parseller.length === 0) {
        hatalar.push({ dosya: dosya.originalname, hata: 'Dosyada okunabilir bir parsel bulunamadı' });
        continue;
      }

      for (const parsel of parseller) {
        const ozellikler = parsel.properties || {};
        const ada = kmlOzelligiBul(ozellikler, 'Ada');
        const parselNo = kmlOzelligiBul(ozellikler, 'ParselNo', 'Parsel', 'Parsel No');
        const il = kmlOzelligiBul(ozellikler, 'İl', 'Il');
        const ilce = kmlOzelligiBul(ozellikler, 'İlçe', 'Ilce');
        const koy = kmlOzelligiBul(ozellikler, 'Mevkii', 'Mevki');
        const alanDekar = alanM2yiDekaraCevir(kmlOzelligiBul(ozellikler, 'Alan'));
        const ad = ozellikler.name || [ada, parselNo].filter(Boolean).join('/') || dosya.originalname;

        const { rows } = await pool.query(
          `INSERT INTO referans_parseller (ad, ada, parsel, il, ilce, koy, alan_dekar, geom, kml_dosya_adi)
           VALUES ($1,$2,$3,$4,$5,$6,$7, ST_SetSRID(ST_GeomFromGeoJSON($8), 4326), $9)
           RETURNING id`,
          [ad, ada, parselNo, il, ilce, koy, alanDekar, JSON.stringify(zBoyutunuKaldir(parsel.geometry)), dosya.originalname]
        );
        eklenenler.push(rows[0].id);
      }
    } catch (err) {
      hatalar.push({ dosya: dosya.originalname, hata: err.message });
    }
  }

  res.status(201).json({ eklenenSayisi: eklenenler.length, hatalar });
});

router.put('/:id', async (req, res) => {
  const { notlar, durum } = req.body;
  if (durum && !['İnceleniyor', 'Olumlu', 'Vazgeçildi'].includes(durum)) {
    return res.status(400).json({ error: 'Geçersiz durum' });
  }
  const { rows } = await pool.query(
    `UPDATE referans_parseller SET notlar=$1, durum=COALESCE($2, durum) WHERE id=$3 RETURNING id, notlar, durum`,
    [notlar ?? null, durum || null, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Parsel bulunamadı' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM referans_parseller WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

export default router;
