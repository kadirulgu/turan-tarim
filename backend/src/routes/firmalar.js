import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM firmalar ORDER BY unvan');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM firmalar WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' });
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
  try {
    const { unvan, adres, il, ilce, vergi_dairesi, vergi_no } = req.body;
    if (!unvan || !unvan.trim()) {
      return res.status(400).json({ error: 'Firma eklenemedi', detay: 'Ünvan zorunlu.' });
    }
    if (vergi_no && !/^\d{10}$/.test(vergi_no)) {
      return res.status(400).json({ error: 'Firma eklenemedi', detay: 'Vergi No 10 haneli rakamdan oluşmalı.' });
    }
    const { rows } = await pool.query(
      `INSERT INTO firmalar (unvan, adres, il, ilce, vergi_dairesi, vergi_no)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [unvan.trim(), adres || null, il || null, ilce || null, vergi_dairesi || null, vergi_no || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Firma eklenemedi', detay: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { unvan, adres, il, ilce, vergi_dairesi, vergi_no } = req.body;
    if (vergi_no && !/^\d{10}$/.test(vergi_no)) {
      return res.status(400).json({ error: 'Firma güncellenemedi', detay: 'Vergi No 10 haneli rakamdan oluşmalı.' });
    }
    const { rows } = await pool.query(
      `UPDATE firmalar SET unvan=$1, adres=$2, il=$3, ilce=$4, vergi_dairesi=$5, vergi_no=$6
       WHERE id=$7 RETURNING *`,
      [unvan, adres || null, il || null, ilce || null, vergi_dairesi || null, vergi_no || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Firma güncellenemedi', detay: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM firmalar WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

router.get('/:id/banka-hesaplari', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM firma_banka_hesaplari WHERE firma_id=$1 ORDER BY id',
    [req.params.id]
  );
  res.json(rows);
});

router.post('/:id/banka-hesaplari', async (req, res) => {
  try {
    const { banka_adi, hesap_adi, iban } = req.body;
    if (!banka_adi || !banka_adi.trim()) {
      return res.status(400).json({ error: 'Banka hesabı eklenemedi', detay: 'Banka adı zorunlu.' });
    }
    const { rows } = await pool.query(
      `INSERT INTO firma_banka_hesaplari (firma_id, banka_adi, hesap_adi, iban)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, banka_adi.trim(), hesap_adi || null, iban ? iban.replace(/\s+/g, '').toUpperCase() : null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Banka hesabı eklenemedi', detay: err.message });
  }
});

router.delete('/:id/banka-hesaplari/:hesapId', async (req, res) => {
  await pool.query('DELETE FROM firma_banka_hesaplari WHERE id=$1 AND firma_id=$2', [
    req.params.hesapId,
    req.params.id,
  ]);
  res.status(204).end();
});

export default router;
