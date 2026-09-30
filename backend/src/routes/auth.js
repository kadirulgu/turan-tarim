import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { dogrula, tokenOlustur } from '../dogrula.js';

const router = Router();

async function kullaniciSayisi() {
  const { rows } = await pool.query('SELECT count(*)::int AS adet FROM kullanicilar');
  return rows[0].adet;
}

async function kayitIcinYetkiKontrolu(req, res, next) {
  const adet = await kullaniciSayisi();
  if (adet === 0) return next(); // sistemde hiç kullanıcı yoksa ilk kaydı serbest bırak
  return dogrula(req, res, next);
}

router.get('/durum', async (req, res) => {
  const adet = await kullaniciSayisi();
  res.json({ kullanici_var: adet > 0 });
});

router.post('/kayit', kayitIcinYetkiKontrolu, async (req, res) => {
  try {
    const { kullanici_adi, sifre, ad_soyad } = req.body;
    if (!kullanici_adi || !kullanici_adi.trim() || !sifre) {
      return res.status(400).json({ error: 'Kullanıcı oluşturulamadı', detay: 'Kullanıcı adı ve şifre zorunlu.' });
    }
    if (sifre.length < 6) {
      return res.status(400).json({ error: 'Kullanıcı oluşturulamadı', detay: 'Şifre en az 6 karakter olmalı.' });
    }
    const sifreHash = await bcrypt.hash(sifre, 10);
    const { rows } = await pool.query(
      `INSERT INTO kullanicilar (kullanici_adi, sifre_hash, ad_soyad)
       VALUES ($1,$2,$3) RETURNING id, kullanici_adi, ad_soyad, created_at`,
      [kullanici_adi.trim(), sifreHash, ad_soyad || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Kullanıcı oluşturulamadı', detay: 'Bu kullanıcı adı zaten kullanılıyor.' });
    }
    res.status(400).json({ error: 'Kullanıcı oluşturulamadı', detay: err.message });
  }
});

router.post('/giris', async (req, res) => {
  try {
    const { kullanici_adi, sifre } = req.body;
    const { rows } = await pool.query('SELECT * FROM kullanicilar WHERE kullanici_adi=$1', [kullanici_adi]);
    const kullanici = rows[0];
    if (!kullanici) {
      return res.status(401).json({ error: 'Giriş başarısız', detay: 'Kullanıcı adı veya şifre hatalı.' });
    }
    const dogruMu = await bcrypt.compare(sifre || '', kullanici.sifre_hash);
    if (!dogruMu) {
      return res.status(401).json({ error: 'Giriş başarısız', detay: 'Kullanıcı adı veya şifre hatalı.' });
    }
    const token = tokenOlustur(kullanici);
    res.json({
      token,
      kullanici: { id: kullanici.id, kullanici_adi: kullanici.kullanici_adi, ad_soyad: kullanici.ad_soyad },
    });
  } catch (err) {
    res.status(500).json({ error: 'Giriş yapılamadı', detay: err.message });
  }
});

router.get('/ben', dogrula, async (req, res) => {
  const { rows } = await pool.query('SELECT id, kullanici_adi, ad_soyad FROM kullanicilar WHERE id=$1', [
    req.kullanici.sub,
  ]);
  if (!rows[0]) return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
  res.json(rows[0]);
});

router.get('/kullanicilar', dogrula, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, kullanici_adi, ad_soyad, created_at FROM kullanicilar ORDER BY kullanici_adi'
  );
  res.json(rows);
});

router.delete('/kullanicilar/:id', dogrula, async (req, res) => {
  const adet = await kullaniciSayisi();
  if (adet <= 1) {
    return res.status(400).json({ error: 'Silinemedi', detay: 'Sistemde en az bir kullanıcı kalmalı.' });
  }
  if (Number(req.params.id) === req.kullanici.sub) {
    return res.status(400).json({ error: 'Silinemedi', detay: 'Kendi hesabınızı silemezsiniz.' });
  }
  await pool.query('DELETE FROM kullanicilar WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

export default router;
