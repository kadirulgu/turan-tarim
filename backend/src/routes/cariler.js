import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'sozlesmeler');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const guvenliAd = file.originalname.replace(/[^a-zA-Z0-9.\-_ğüşıöçĞÜŞİÖÇ ]/g, '_');
    cb(null, `${Date.now()}-${guvenliAd}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Sadece PDF dosyası yüklenebilir.'));
    }
    cb(null, true);
  },
  limits: { fileSize: 15 * 1024 * 1024 },
});

function pdfYukle(req, res, next) {
  upload.single('sozlesme_pdf')(req, res, (err) => {
    if (err) return res.status(400).json({ error: 'Sözleşme dosyası yüklenemedi', detay: err.message });
    next();
  });
}

const router = Router();

function veriyiHazirla(body) {
  const {
    isim_unvan,
    ciftci_mi,
    alici_mi,
    kimlik_turu,
    tc_no,
    vergi_no,
    vergi_dairesi,
    telefon,
    adres,
    il,
    ilce,
    mahalle,
    iban,
    sozlesme_tarihi,
    sozlesme_no,
    dogum_tarihi,
    cinsiyet,
    kimlik_seri_no,
    kimlik_gecerlilik,
    anne_adi,
    baba_adi,
  } = body;

  const kisiMi = kimlik_turu !== 'vergi';
  return [
    isim_unvan,
    ciftci_mi === true || ciftci_mi === 'true',
    alici_mi === true || alici_mi === 'true',
    kimlik_turu === 'vergi' ? 'vergi' : 'tc',
    kimlik_turu === 'vergi' ? null : tc_no || null,
    kimlik_turu === 'vergi' ? vergi_no || null : null,
    vergi_dairesi || null,
    telefon || null,
    adres || null,
    il || null,
    ilce || null,
    mahalle || null,
    iban ? iban.replace(/\s+/g, '').toUpperCase() : null,
    sozlesme_tarihi || null,
    sozlesme_no || null,
    // Kimlik bilgileri yalnızca kişi (TC) kayıtlarında tutulur
    (kisiMi && dogum_tarihi) || null,
    (kisiMi && ['E', 'K'].includes(cinsiyet) && cinsiyet) || null,
    (kisiMi && kimlik_seri_no) || null,
    (kisiMi && kimlik_gecerlilik) || null,
    (kisiMi && anne_adi) || null,
    (kisiMi && baba_adi) || null,
  ];
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM cariler ORDER BY isim_unvan');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM cariler WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' });
  res.json(rows[0]);
});

router.post('/', pdfYukle, async (req, res) => {
  try {
    const degerler = veriyiHazirla(req.body);
    const sozlesmeDosyasi = req.file ? req.file.filename : null;
    const sozlesmeDosyaAdi = req.file ? req.file.originalname : null;
    const { rows } = await pool.query(
      `INSERT INTO cariler
        (isim_unvan, ciftci_mi, alici_mi, kimlik_turu, tc_no, vergi_no, vergi_dairesi, telefon, adres, il, ilce, mahalle,
         iban, sozlesme_tarihi, sozlesme_no,
         dogum_tarihi, cinsiyet, kimlik_seri_no, kimlik_gecerlilik, anne_adi, baba_adi,
         sozlesme_dosyasi, sozlesme_dosya_adi)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING *`,
      [...degerler, sozlesmeDosyasi, sozlesmeDosyaAdi]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Cari eklenemedi', detay: err.message });
  }
});

router.put('/:id', pdfYukle, async (req, res) => {
  try {
    const degerler = veriyiHazirla(req.body);

    let sozlesmeDosyasi;
    let sozlesmeDosyaAdi;
    if (req.file) {
      const { rows: mevcut } = await pool.query('SELECT sozlesme_dosyasi FROM cariler WHERE id=$1', [req.params.id]);
      if (mevcut[0]?.sozlesme_dosyasi) {
        fs.unlink(path.join(uploadDir, mevcut[0].sozlesme_dosyasi), () => {});
      }
      sozlesmeDosyasi = req.file.filename;
      sozlesmeDosyaAdi = req.file.originalname;
    } else {
      const { rows: mevcut } = await pool.query(
        'SELECT sozlesme_dosyasi, sozlesme_dosya_adi FROM cariler WHERE id=$1',
        [req.params.id]
      );
      sozlesmeDosyasi = mevcut[0]?.sozlesme_dosyasi || null;
      sozlesmeDosyaAdi = mevcut[0]?.sozlesme_dosya_adi || null;
    }

    const { rows } = await pool.query(
      `UPDATE cariler SET
        isim_unvan=$1, ciftci_mi=$2, alici_mi=$3, kimlik_turu=$4, tc_no=$5, vergi_no=$6,
        vergi_dairesi=$7, telefon=$8, adres=$9, il=$10, ilce=$11, mahalle=$12,
        iban=$13, sozlesme_tarihi=$14, sozlesme_no=$15,
        dogum_tarihi=$16, cinsiyet=$17, kimlik_seri_no=$18, kimlik_gecerlilik=$19, anne_adi=$20, baba_adi=$21,
        sozlesme_dosyasi=$22, sozlesme_dosya_adi=$23
       WHERE id=$24 RETURNING *`,
      [...degerler, sozlesmeDosyasi, sozlesmeDosyaAdi, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Cari güncellenemedi', detay: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT sozlesme_dosyasi FROM cariler WHERE id=$1', [req.params.id]);
  if (rows[0]?.sozlesme_dosyasi) {
    fs.unlink(path.join(uploadDir, rows[0].sozlesme_dosyasi), () => {});
  }
  await pool.query('DELETE FROM cariler WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

export default router;
