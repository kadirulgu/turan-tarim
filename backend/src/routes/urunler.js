import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM urunler ORDER BY COALESCE(grup, 'Diğer'), ad");
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { ad, grup } = req.body;
  const { rows } = await pool.query('INSERT INTO urunler (ad, grup) VALUES ($1,$2) RETURNING *', [ad, grup || null]);
  res.status(201).json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM urunler WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

export default router;
