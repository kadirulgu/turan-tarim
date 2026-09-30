import { Router } from 'express';
import multer from 'multer';
import { DOMParser } from '@xmldom/xmldom';
import { kml } from '@tmcw/togeojson';
import { pool } from '../db.js';
import { kmlIleKarsilastir, zBoyutunuKaldir, kmlOzelligiBul, alanM2yiDekaraCevir } from '../kmlKarsilastir.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

const HISSEDAR_OZET_SQL = `
  SELECT string_agg(h.ad_soyad || ' (' || h.pay || '/' || h.payda || ')', ', ' ORDER BY h.ad_soyad)
  FROM arazi_hissedarlar h
  WHERE h.arazi_id = a.id
`;

const EKIM_OZET_SQL = `
  SELECT string_agg(u.ad || ' (' || e.sezon_yili || ', ' || e.ekim_donemi || ')', ', ' ORDER BY e.sezon_yili DESC, u.ad)
  FROM ekimler e
  JOIN urunler u ON u.id = e.urun_id
  WHERE e.arazi_id = a.id
`;

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT a.id, a.ad, a.ada, a.parsel, a.il, a.ilce, a.koy, a.alan_dekar, a.kml_dosya_adi, a.created_at,
           a.firma_id, f.unvan AS firma_adi,
           a.sozlesme_cari_id, c.isim_unvan AS sozlesme_cari_adi,
           (${HISSEDAR_OZET_SQL}) AS hissedar_ozet,
           (${EKIM_OZET_SQL}) AS ekim_ozet
    FROM araziler a
    LEFT JOIN cariler c ON c.id = a.sozlesme_cari_id
    LEFT JOIN firmalar f ON f.id = a.firma_id
    ORDER BY a.ad
  `);
  res.json(rows);
});

router.get('/geojson', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT a.id, a.ad, a.ada, a.parsel, a.koy, a.alan_dekar, ST_AsGeoJSON(a.geom) AS geojson,
           f.unvan AS firma_adi,
           c.isim_unvan AS sozlesme_cari_adi,
           (${HISSEDAR_OZET_SQL}) AS hissedar_ozet,
           (${EKIM_OZET_SQL}) AS ekim_ozet
    FROM araziler a
    LEFT JOIN cariler c ON c.id = a.sozlesme_cari_id
    LEFT JOIN firmalar f ON f.id = a.firma_id
    WHERE a.geom IS NOT NULL
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
        koy: r.koy,
        alan_dekar: r.alan_dekar,
        firma_adi: r.firma_adi,
        sozlesme_cari_adi: r.sozlesme_cari_adi,
        hissedar_ozet: r.hissedar_ozet,
        ekim_ozet: r.ekim_ozet,
      },
    })),
  });
});

router.post('/', upload.single('kml'), async (req, res) => {
  try {
    const { ad, firma_id, sozlesme_cari_id, ada, parsel, il, ilce, koy, alan_dekar } = req.body;
    let geojsonGeom = null;
    let kmlDosyaAdi = null;
    let uyusmazliklar = [];
    let kmlAlanDekar = null;

    if (req.file) {
      const xml = new DOMParser().parseFromString(req.file.buffer.toString('utf-8'), 'text/xml');
      const geojson = kml(xml);
      const feature = geojson.features.find((f) => f.geometry);
      if (feature) {
        geojsonGeom = zBoyutunuKaldir(feature.geometry);
        kmlDosyaAdi = req.file.originalname;
        uyusmazliklar = kmlIleKarsilastir(feature.properties || {}, { ad, ada, parsel, il, ilce, koy, alan_dekar });
        kmlAlanDekar = alanM2yiDekaraCevir(kmlOzelligiBul(feature.properties || {}, 'Alan'));
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO araziler (ad, firma_id, sozlesme_cari_id, ada, parsel, il, ilce, koy, alan_dekar, geom, kml_dosya_adi)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,
         CASE WHEN $10::text IS NULL THEN NULL ELSE ST_SetSRID(ST_GeomFromGeoJSON($10), 4326) END,
         $11)
       RETURNING *`,
      [
        ad,
        firma_id || null,
        sozlesme_cari_id || null,
        ada || null,
        parsel || null,
        il || null,
        ilce || null,
        koy || null,
        alan_dekar || kmlAlanDekar || null,
        geojsonGeom ? JSON.stringify(geojsonGeom) : null,
        kmlDosyaAdi,
      ]
    );
    res.status(201).json({ ...rows[0], kml_uyusmazliklari: uyusmazliklar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Arazi eklenemedi', detay: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { ad, firma_id, sozlesme_cari_id, ada, parsel, il, ilce, koy, alan_dekar } = req.body;
    const { rows } = await pool.query(
      `UPDATE araziler SET ad=$1, firma_id=$2, sozlesme_cari_id=$3, ada=$4, parsel=$5, il=$6, ilce=$7, koy=$8, alan_dekar=$9
       WHERE id=$10 RETURNING *`,
      [ad, firma_id || null, sozlesme_cari_id || null, ada || null, parsel || null, il || null, ilce || null, koy || null, alan_dekar || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Arazi güncellenemedi', detay: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM araziler WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

router.get('/:id/hissedarlar', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, arazi_id, ad_soyad, tc_no, telefon, pay, payda
     FROM arazi_hissedarlar
     WHERE arazi_id = $1
     ORDER BY ad_soyad`,
    [req.params.id]
  );
  res.json(rows);
});

router.post('/:id/hissedarlar', async (req, res) => {
  try {
    const { ad_soyad, tc_no, telefon, pay, payda } = req.body;
    if (!ad_soyad || !ad_soyad.trim()) {
      return res.status(400).json({ error: 'Hissedar eklenemedi', detay: 'Ad Soyad zorunlu.' });
    }
    if (tc_no && !/^\d{11}$/.test(tc_no)) {
      return res.status(400).json({ error: 'Hissedar eklenemedi', detay: 'TC Kimlik No 11 haneli rakamdan oluşmalı.' });
    }
    const { rows } = await pool.query(
      `INSERT INTO arazi_hissedarlar (arazi_id, ad_soyad, tc_no, telefon, pay, payda)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [req.params.id, ad_soyad.trim(), tc_no || null, telefon || null, Number(pay) || 1, Number(payda) || 1]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Hissedar eklenemedi', detay: err.message });
  }
});

router.delete('/:id/hissedarlar/:hissedarId', async (req, res) => {
  await pool.query('DELETE FROM arazi_hissedarlar WHERE id=$1 AND arazi_id=$2', [
    req.params.hissedarId,
    req.params.id,
  ]);
  res.status(204).end();
});

export default router;
