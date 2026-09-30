import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const GIZLI_ANAHTAR = process.env.JWT_SECRET || 'gelistirme-ortami-varsayilan-anahtari';

export function tokenOlustur(kullanici) {
  return jwt.sign(
    { sub: kullanici.id, kullanici_adi: kullanici.kullanici_adi, ad_soyad: kullanici.ad_soyad },
    GIZLI_ANAHTAR,
    { expiresIn: '30d' }
  );
}

export function dogrula(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Giriş yapmanız gerekiyor' });
  try {
    req.kullanici = jwt.verify(token, GIZLI_ANAHTAR);
    next();
  } catch {
    return res.status(401).json({ error: 'Oturum geçersiz, tekrar giriş yapın' });
  }
}
