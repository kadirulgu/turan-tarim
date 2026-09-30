import { Router } from 'express';
import { pool } from '../db.js';
import { asyncSarmal } from '../asyncSarmal.js';

const router = Router();

export const UYGULAMA_TURLERI = ['Gübreleme', 'İlaçlama', 'Sulama', 'Diğer'];

const tamSayiVeyaNull = (deger) => {
  if (deger === '' || deger === null || deger === undefined) return null;
  const sayi = Number(deger);
  return Number.isInteger(sayi) ? sayi : NaN;
};

// Bir ürünün reçete adımları (ekimden kaç gün sonra yapılacağına göre sıralı)
router.get(
  '/',
  asyncSarmal(async (req, res) => {
    const { urun_id } = req.query;
    const { rows } = await pool.query(
      `SELECT r.*, u.ad AS urun_adi
       FROM recete_adimlari r
       JOIN urunler u ON u.id = r.urun_id
       WHERE ($1::int IS NULL OR r.urun_id = $1)
       ORDER BY r.ekimden_gun, r.id`,
      [urun_id || null]
    );
    res.json(rows);
  })
);

router.post(
  '/',
  asyncSarmal(async (req, res) => {
    const { urun_id, tur, ad, ekimden_gun, doz, bekleme_gun, aciklama } = req.body;
    if (!urun_id || !ad?.trim()) return res.status(400).json({ error: 'Ürün ve adım adı zorunlu' });
    if (!UYGULAMA_TURLERI.includes(tur)) return res.status(400).json({ error: 'Geçersiz işlem türü' });

    const gun = tamSayiVeyaNull(ekimden_gun) ?? 0;
    const bekleme = tamSayiVeyaNull(bekleme_gun);
    if (Number.isNaN(gun) || Number.isNaN(bekleme)) {
      return res.status(400).json({ error: 'Gün alanları tam sayı olmalı' });
    }

    const { rows } = await pool.query(
      `INSERT INTO recete_adimlari (urun_id, tur, ad, ekimden_gun, doz, bekleme_gun, aciklama)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [urun_id, tur, ad.trim(), gun, doz || null, bekleme, aciklama || null]
    );
    res.status(201).json(rows[0]);
  })
);

router.delete(
  '/:id',
  asyncSarmal(async (req, res) => {
    await pool.query('DELETE FROM recete_adimlari WHERE id=$1', [req.params.id]);
    res.status(204).end();
  })
);

export default router;
