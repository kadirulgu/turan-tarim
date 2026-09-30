import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT s.*, c.isim_unvan AS cari_adi, a.ad AS arazi_adi
    FROM sozlesmeler s
    JOIN cariler c ON c.id = s.cari_id
    JOIN araziler a ON a.id = s.arazi_id
    ORDER BY s.baslangic_tarihi DESC
  `);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { arazi_id, cari_id, sozlesme_tipi, baslangic_tarihi, bitis_tarihi, kira_bedeli, aciklama } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO sozlesmeler (arazi_id, cari_id, sozlesme_tipi, baslangic_tarihi, bitis_tarihi, kira_bedeli, aciklama)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [arazi_id, cari_id, sozlesme_tipi || null, baslangic_tarihi || null, bitis_tarihi || null, kira_bedeli || null, aciklama || null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { arazi_id, cari_id, sozlesme_tipi, baslangic_tarihi, bitis_tarihi, kira_bedeli, aciklama } = req.body;
  const { rows } = await pool.query(
    `UPDATE sozlesmeler SET arazi_id=$1, cari_id=$2, sozlesme_tipi=$3, baslangic_tarihi=$4, bitis_tarihi=$5, kira_bedeli=$6, aciklama=$7
     WHERE id=$8 RETURNING *`,
    [arazi_id, cari_id, sozlesme_tipi || null, baslangic_tarihi || null, bitis_tarihi || null, kira_bedeli || null, aciklama || null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM sozlesmeler WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

export default router;
