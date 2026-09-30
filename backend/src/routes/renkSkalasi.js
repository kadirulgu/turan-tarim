import { Router } from 'express';
import { pool } from '../db.js';
import { asyncSarmal } from '../asyncSarmal.js';

const router = Router();

const HEX_RENK = /^#[0-9a-fA-F]{6}$/;

// Bir ürünün renk skalası (eklenme sırasına göre; açıktan olgunluğa doğru diziyorsun)
router.get(
  '/',
  asyncSarmal(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM renk_skalasi WHERE ($1::int IS NULL OR urun_id = $1) ORDER BY urun_id, sira, id`,
      [req.query.urun_id || null]
    );
    res.json(rows);
  })
);

router.post(
  '/',
  asyncSarmal(async (req, res) => {
    const { urun_id, ad, renk_kodu } = req.body;
    if (!urun_id || !ad?.trim()) return res.status(400).json({ error: 'Ürün ve renk adı zorunlu' });
    if (!HEX_RENK.test(renk_kodu || '')) return res.status(400).json({ error: 'Geçersiz renk' });

    const { rows } = await pool.query(
      `INSERT INTO renk_skalasi (urun_id, ad, renk_kodu, sira)
       VALUES ($1, $2, $3, COALESCE((SELECT MAX(sira) + 1 FROM renk_skalasi WHERE urun_id = $1), 0))
       RETURNING *`,
      [urun_id, ad.trim(), renk_kodu.toLowerCase()]
    );
    res.status(201).json(rows[0]);
  })
);

router.delete(
  '/:id',
  asyncSarmal(async (req, res) => {
    await pool.query('DELETE FROM renk_skalasi WHERE id=$1', [req.params.id]);
    res.status(204).end();
  })
);

export default router;
