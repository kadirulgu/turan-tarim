import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.js';
import carilerRouter from './routes/cariler.js';
import arazilerRouter from './routes/araziler.js';
import sozlesmelerRouter from './routes/sozlesmeler.js';
import urunlerRouter from './routes/urunler.js';
import ekimlerRouter from './routes/ekimler.js';
import recetelerRouter from './routes/receteler.js';
import renkSkalasiRouter from './routes/renkSkalasi.js';
import firmalarRouter from './routes/firmalar.js';
import hububatBorsasiRouter from './routes/hububatBorsasi.js';
import havaDurumuRouter from './routes/havaDurumu.js';
import referansParselerRouter from './routes/referansParseller.js';
import ozetRouter from './routes/ozet.js';
import { dogrula } from './dogrula.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);

app.use('/api/cariler', dogrula, carilerRouter);
app.use('/api/araziler', dogrula, arazilerRouter);
app.use('/api/sozlesmeler', dogrula, sozlesmelerRouter);
app.use('/api/urunler', dogrula, urunlerRouter);
app.use('/api/ekimler', dogrula, ekimlerRouter);
app.use('/api/receteler', dogrula, recetelerRouter);
app.use('/api/renk-skalasi', dogrula, renkSkalasiRouter);
// Yüklenen dosyalar (sözleşme PDF'leri, tarla fotoğrafları) yalnızca giriş yapmış kullanıcıya açık
app.use('/api/dosyalar', dogrula, express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api/firmalar', dogrula, firmalarRouter);
app.use('/api/hububat-borsasi', dogrula, hububatBorsasiRouter);
app.use('/api/hava-durumu', dogrula, havaDurumuRouter);
app.use('/api/referans-parseller', dogrula, referansParselerRouter);
app.use('/api/ozet', dogrula, ozetRouter);

// Derlenmiş arayüz (frontend/dist, "npm run build" ile oluşur) aynı sunucudan verilir.
// assets/ altındaki dosyaların adında içerik özeti olduğu için uzun süre önbelleklenebilir.
const arayuzKlasoru = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(arayuzKlasoru)) {
  app.use(
    express.static(arayuzKlasoru, {
      setHeaders: (res, dosyaYolu) => {
        if (dosyaYolu.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );
  // /harita gibi arayüz sayfaları doğrudan açılınca da index.html dönsün
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(arayuzKlasoru, 'index.html')));
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`));
