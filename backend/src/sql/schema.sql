CREATE EXTENSION IF NOT EXISTS postgis;

-- Sisteme giriş yapabilen kullanıcılar
CREATE TABLE IF NOT EXISTS kullanicilar (
  id SERIAL PRIMARY KEY,
  kullanici_adi VARCHAR(50) NOT NULL UNIQUE,
  sifre_hash VARCHAR(255) NOT NULL,
  ad_soyad VARCHAR(200),
  created_at TIMESTAMP DEFAULT now()
);

-- Kendi firmalarımız (birden fazla firma üzerinden çalışılabiliyor)
CREATE TABLE IF NOT EXISTS firmalar (
  id SERIAL PRIMARY KEY,
  unvan VARCHAR(200) NOT NULL,
  adres TEXT,
  il VARCHAR(100),
  ilce VARCHAR(100),
  vergi_dairesi VARCHAR(100),
  vergi_no VARCHAR(10) CHECK (vergi_no IS NULL OR vergi_no ~ '^[0-9]{10}$'),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS firma_banka_hesaplari (
  id SERIAL PRIMARY KEY,
  firma_id INTEGER NOT NULL REFERENCES firmalar(id) ON DELETE CASCADE,
  banka_adi VARCHAR(150) NOT NULL,
  hesap_adi VARCHAR(150),
  iban VARCHAR(34),
  created_at TIMESTAMP DEFAULT now()
);

-- Eski tek-firma (singleton) modelinden çoklu firma modeline geçiş
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'firma') THEN
    INSERT INTO firmalar (unvan, adres, il, ilce, vergi_dairesi, vergi_no)
    SELECT COALESCE(unvan, 'Firmam'), adres, il, ilce, vergi_dairesi, vergi_no
    FROM firma
    WHERE unvan IS NOT NULL;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'firma_banka_hesaplari' AND column_name = 'firma_id'
    ) IS FALSE THEN
      ALTER TABLE firma_banka_hesaplari ADD COLUMN firma_id INTEGER REFERENCES firmalar(id) ON DELETE CASCADE;
      UPDATE firma_banka_hesaplari SET firma_id = (SELECT id FROM firmalar ORDER BY id LIMIT 1)
      WHERE firma_id IS NULL;
      DELETE FROM firma_banka_hesaplari WHERE firma_id IS NULL;
      ALTER TABLE firma_banka_hesaplari ALTER COLUMN firma_id SET NOT NULL;
    END IF;

    DROP TABLE firma;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cariler (
  id SERIAL PRIMARY KEY,
  isim_unvan VARCHAR(200) NOT NULL,
  ciftci_mi BOOLEAN NOT NULL DEFAULT true,
  alici_mi BOOLEAN NOT NULL DEFAULT false,
  kimlik_turu VARCHAR(10) NOT NULL DEFAULT 'tc' CHECK (kimlik_turu IN ('tc', 'vergi')),
  tc_no VARCHAR(11) CHECK (tc_no IS NULL OR tc_no ~ '^[0-9]{11}$'),
  vergi_no VARCHAR(10) CHECK (vergi_no IS NULL OR vergi_no ~ '^[0-9]{10}$'),
  vergi_dairesi VARCHAR(100),
  telefon VARCHAR(20),
  adres TEXT,
  il VARCHAR(100),
  ilce VARCHAR(100),
  mahalle VARCHAR(150),
  sozlesme_dosyasi VARCHAR(255),
  sozlesme_dosya_adi VARCHAR(255),
  sozlesme_tarihi DATE,
  sozlesme_no VARCHAR(50),
  iban VARCHAR(34),
  created_at TIMESTAMP DEFAULT now()
);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS mahalle VARCHAR(150);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS sozlesme_dosyasi VARCHAR(255);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS sozlesme_dosya_adi VARCHAR(255);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS sozlesme_tarihi DATE;
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS sozlesme_no VARCHAR(50);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS iban VARCHAR(34);
-- Kimlik kartından okunan bilgiler (kişi kayıtları için)
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS dogum_tarihi DATE;
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS cinsiyet VARCHAR(1) CHECK (cinsiyet IS NULL OR cinsiyet IN ('E', 'K'));
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS kimlik_seri_no VARCHAR(20);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS kimlik_gecerlilik DATE;
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS anne_adi VARCHAR(100);
ALTER TABLE cariler ADD COLUMN IF NOT EXISTS baba_adi VARCHAR(100);

CREATE TABLE IF NOT EXISTS araziler (
  id SERIAL PRIMARY KEY,
  ad VARCHAR(150) NOT NULL,
  firma_id INTEGER REFERENCES firmalar(id) ON DELETE SET NULL,
  sozlesme_cari_id INTEGER REFERENCES cariler(id) ON DELETE SET NULL,
  il VARCHAR(100),
  ilce VARCHAR(100),
  koy VARCHAR(100),
  ada VARCHAR(20),
  parsel VARCHAR(20),
  alan_dekar NUMERIC(10,2),
  geom GEOMETRY(Geometry, 4326),
  kml_dosya_adi VARCHAR(255),
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS araziler_geom_idx ON araziler USING GIST (geom);
ALTER TABLE araziler ADD COLUMN IF NOT EXISTS sozlesme_cari_id INTEGER REFERENCES cariler(id) ON DELETE SET NULL;
ALTER TABLE araziler ADD COLUMN IF NOT EXISTS firma_id INTEGER REFERENCES firmalar(id) ON DELETE SET NULL;

-- Eski tek "ada_parsel" metin alanından ayrı ada/parsel alanlarına geçiş
DO $$
BEGIN
  ALTER TABLE araziler ADD COLUMN IF NOT EXISTS ada VARCHAR(20);
  ALTER TABLE araziler ADD COLUMN IF NOT EXISTS parsel VARCHAR(20);

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'araziler' AND column_name = 'ada_parsel'
  ) THEN
    UPDATE araziler SET
      ada = NULLIF(split_part(ada_parsel, '/', 1), ''),
      parsel = NULLIF(split_part(ada_parsel, '/', 2), '')
    WHERE ada_parsel IS NOT NULL AND ada_parsel <> '';

    ALTER TABLE araziler DROP COLUMN ada_parsel;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS arazi_hissedarlar (
  id SERIAL PRIMARY KEY,
  arazi_id INTEGER NOT NULL REFERENCES araziler(id) ON DELETE CASCADE,
  ad_soyad VARCHAR(200) NOT NULL,
  tc_no VARCHAR(11) CHECK (tc_no IS NULL OR tc_no ~ '^[0-9]{11}$'),
  telefon VARCHAR(20),
  pay INTEGER NOT NULL DEFAULT 1 CHECK (pay > 0),
  payda INTEGER NOT NULL DEFAULT 1 CHECK (payda > 0),
  created_at TIMESTAMP DEFAULT now()
);

-- Hissedarları ayrı bir cari kaydına zorunlu bağlayan eski modelden,
-- ad/tc no/telefonun doğrudan girildiği bağımsız modele geçiş
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arazi_hissedarlar' AND column_name = 'cari_id'
  ) THEN
    ALTER TABLE arazi_hissedarlar ADD COLUMN IF NOT EXISTS ad_soyad VARCHAR(200);
    ALTER TABLE arazi_hissedarlar ADD COLUMN IF NOT EXISTS tc_no VARCHAR(11);
    ALTER TABLE arazi_hissedarlar ADD COLUMN IF NOT EXISTS telefon VARCHAR(20);

    UPDATE arazi_hissedarlar h
    SET ad_soyad = c.isim_unvan, tc_no = c.tc_no, telefon = c.telefon
    FROM cariler c
    WHERE h.cari_id = c.id;

    ALTER TABLE arazi_hissedarlar ALTER COLUMN ad_soyad SET NOT NULL;
    ALTER TABLE arazi_hissedarlar DROP CONSTRAINT IF EXISTS arazi_hissedarlar_arazi_id_cari_id_key;
    ALTER TABLE arazi_hissedarlar DROP COLUMN cari_id;
  END IF;
END $$;

-- Eski tek-sahip modelinden (sahip_cari_id) çoklu hissedar modeline geçiş
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'araziler' AND column_name = 'sahip_cari_id'
  ) THEN
    INSERT INTO arazi_hissedarlar (arazi_id, cari_id, pay, payda)
    SELECT id, sahip_cari_id, 1, 1 FROM araziler WHERE sahip_cari_id IS NOT NULL
    ON CONFLICT (arazi_id, cari_id) DO NOTHING;

    ALTER TABLE araziler DROP COLUMN sahip_cari_id;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS urunler (
  id SERIAL PRIMARY KEY,
  ad VARCHAR(100) NOT NULL UNIQUE,
  grup VARCHAR(100)
);
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS grup VARCHAR(100);

CREATE TABLE IF NOT EXISTS sozlesmeler (
  id SERIAL PRIMARY KEY,
  arazi_id INTEGER NOT NULL REFERENCES araziler(id) ON DELETE CASCADE,
  cari_id INTEGER NOT NULL REFERENCES cariler(id) ON DELETE CASCADE,
  sozlesme_tipi VARCHAR(50),
  baslangic_tarihi DATE,
  bitis_tarihi DATE,
  kira_bedeli NUMERIC(12,2),
  aciklama TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ekimler (
  id SERIAL PRIMARY KEY,
  arazi_id INTEGER NOT NULL REFERENCES araziler(id) ON DELETE CASCADE,
  urun_id INTEGER NOT NULL REFERENCES urunler(id),
  ekim_donemi VARCHAR(20) NOT NULL DEFAULT 'Ana Ürün',
  sezon_yili INTEGER NOT NULL,
  ekim_tarihi DATE,
  hasat_tarihi DATE,
  aciklama TEXT,
  created_at TIMESTAMP DEFAULT now()
);
ALTER TABLE ekimler ADD COLUMN IF NOT EXISTS ekim_donemi VARCHAR(20) NOT NULL DEFAULT 'Ana Ürün';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ekimler_ekim_donemi_check') THEN
    ALTER TABLE ekimler ADD CONSTRAINT ekimler_ekim_donemi_check
      CHECK (ekim_donemi IN ('Ana Ürün', 'İkinci Ürün'));
  END IF;
END $$;

-- ÇKS (Çiftçi Kayıt Sistemi) beyannamesindeki standart ürün gruplarına göre
-- kategorize edilmiş ürün listesi. Var olan kayıtların grubu da güncellenir.
INSERT INTO urunler (ad, grup) VALUES
  ('Buğday (Ekmeklik)', 'Hububat'),
  ('Buğday (Durum/Makarnalık)', 'Hububat'),
  ('Arpa', 'Hububat'),
  ('Çavdar', 'Hububat'),
  ('Yulaf', 'Hububat'),
  ('Tritikale', 'Hububat'),
  ('Çeltik (Pirinç)', 'Hububat'),
  ('Mısır (Dane)', 'Hububat'),
  ('Mısır (Silajlık)', 'Yem Bitkileri'),

  ('Nohut', 'Baklagiller'),
  ('Kırmızı Mercimek', 'Baklagiller'),
  ('Yeşil Mercimek', 'Baklagiller'),
  ('Kuru Fasulye', 'Baklagiller'),
  ('Bakla', 'Baklagiller'),
  ('Bezelye (Kuru)', 'Baklagiller'),

  ('Ayçiçeği (Yağlık)', 'Yağlı Tohumlu Bitkiler'),
  ('Ayçiçeği (Çerezlik)', 'Yağlı Tohumlu Bitkiler'),
  ('Kolza/Kanola', 'Yağlı Tohumlu Bitkiler'),
  ('Susam', 'Yağlı Tohumlu Bitkiler'),
  ('Soya', 'Yağlı Tohumlu Bitkiler'),
  ('Yerfıstığı', 'Yağlı Tohumlu Bitkiler'),
  ('Aspir', 'Yağlı Tohumlu Bitkiler'),

  ('Pamuk', 'Endüstri Bitkileri'),
  ('Şeker Pancarı', 'Endüstri Bitkileri'),
  ('Tütün', 'Endüstri Bitkileri'),
  ('Keten', 'Endüstri Bitkileri'),
  ('Kenevir', 'Endüstri Bitkileri'),

  ('Patates', 'Yumru Bitkiler'),
  ('Tatlı Patates', 'Yumru Bitkiler'),

  ('Yonca', 'Yem Bitkileri'),
  ('Korunga', 'Yem Bitkileri'),
  ('Fiğ', 'Yem Bitkileri'),
  ('Sudan Otu', 'Yem Bitkileri'),
  ('Hayvan Pancarı', 'Yem Bitkileri'),

  ('Domates', 'Sebzeler'),
  ('Biber', 'Sebzeler'),
  ('Patlıcan', 'Sebzeler'),
  ('Salatalık', 'Sebzeler'),
  ('Kabak', 'Sebzeler'),
  ('Soğan', 'Sebzeler'),
  ('Sarımsak', 'Sebzeler'),
  ('Havuç', 'Sebzeler'),
  ('Lahana', 'Sebzeler'),
  ('Marul', 'Sebzeler'),
  ('Ispanak', 'Sebzeler'),
  ('Karpuz', 'Sebzeler'),
  ('Kavun', 'Sebzeler'),

  ('Elma', 'Meyveler'),
  ('Armut', 'Meyveler'),
  ('Şeftali', 'Meyveler'),
  ('Kayısı', 'Meyveler'),
  ('Erik', 'Meyveler'),
  ('Kiraz', 'Meyveler'),
  ('Vişne', 'Meyveler'),
  ('Üzüm', 'Meyveler'),
  ('İncir', 'Meyveler'),
  ('Nar', 'Meyveler'),
  ('Zeytin', 'Meyveler'),
  ('Turunçgil (Portakal/Mandalina/Limon)', 'Meyveler'),
  ('Fındık', 'Meyveler'),
  ('Ceviz', 'Meyveler'),
  ('Badem', 'Meyveler'),
  ('Antep Fıstığı', 'Meyveler'),
  ('Çilek', 'Meyveler'),

  ('Kimyon', 'Baharat ve Tıbbi Bitkiler'),
  ('Anason', 'Baharat ve Tıbbi Bitkiler'),
  ('Kekik', 'Baharat ve Tıbbi Bitkiler'),
  ('Nane', 'Baharat ve Tıbbi Bitkiler'),
  ('Rezene', 'Baharat ve Tıbbi Bitkiler'),
  ('Haşhaş', 'Baharat ve Tıbbi Bitkiler'),

  ('Nadas (Boş Bırakılan Alan)', 'Nadas')
ON CONFLICT (ad) DO UPDATE SET grup = EXCLUDED.grup;

-- Kendi arazilerimiz haricinde, haritada referans olarak gösterilecek
-- (komşu/çevre) parseller. Sahiplik/cari/sözleşme bilgisi tutulmaz, sadece
-- KML'den otomatik okunan sınır çizgisi ve varsa ada/parsel/alan bilgisi.
CREATE TABLE IF NOT EXISTS referans_parseller (
  id SERIAL PRIMARY KEY,
  ad VARCHAR(150),
  ada VARCHAR(20),
  parsel VARCHAR(20),
  il VARCHAR(100),
  ilce VARCHAR(100),
  koy VARCHAR(100),
  alan_dekar NUMERIC(10,2),
  geom GEOMETRY(Geometry, 4326) NOT NULL,
  kml_dosya_adi VARCHAR(255),
  notlar TEXT,
  durum VARCHAR(20) NOT NULL DEFAULT 'İnceleniyor',
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referans_parseller_geom_idx ON referans_parseller USING GIST (geom);
ALTER TABLE referans_parseller ADD COLUMN IF NOT EXISTS notlar TEXT;
ALTER TABLE referans_parseller ADD COLUMN IF NOT EXISTS durum VARCHAR(20) NOT NULL DEFAULT 'İnceleniyor';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referans_parseller_durum_check') THEN
    ALTER TABLE referans_parseller ADD CONSTRAINT referans_parseller_durum_check
      CHECK (durum IN ('İnceleniyor', 'Olumlu', 'Vazgeçildi'));
  END IF;
END $$;

-- Eski genel isimli kayıtları (varsa) yeni standart adlarla eşleştir
UPDATE urunler SET grup = 'Hububat' WHERE ad = 'Buğday' AND grup IS NULL;
UPDATE urunler SET grup = 'Hububat' WHERE ad = 'Arpa' AND grup IS NULL;
UPDATE urunler SET grup = 'Hububat' WHERE ad = 'Mısır' AND grup IS NULL;
UPDATE urunler SET grup = 'Endüstri Bitkileri' WHERE ad = 'Pamuk' AND grup IS NULL;
UPDATE urunler SET grup = 'Yağlı Tohumlu Bitkiler' WHERE ad = 'Ayçiçeği' AND grup IS NULL;
UPDATE urunler SET grup = 'Baklagiller' WHERE ad = 'Nohut' AND grup IS NULL;
UPDATE urunler SET grup = 'Baklagiller' WHERE ad = 'Mercimek' AND grup IS NULL;

-- Ürün reçetesi: her ürün için ekimden kaç gün sonra hangi gübreleme/ilaçlama/
-- sulama işleminin yapılacağını tanımlayan şablon adımları. Yeni ekim kaydı
-- açılırken bu adımlar o ekime kopyalanır (ekim_uygulamalari).
CREATE TABLE IF NOT EXISTS recete_adimlari (
  id SERIAL PRIMARY KEY,
  urun_id INTEGER NOT NULL REFERENCES urunler(id) ON DELETE CASCADE,
  tur VARCHAR(20) NOT NULL CHECK (tur IN ('Gübreleme', 'İlaçlama', 'Sulama', 'Diğer')),
  ad VARCHAR(150) NOT NULL,
  ekimden_gun INTEGER NOT NULL DEFAULT 0,
  doz VARCHAR(100),
  bekleme_gun INTEGER,
  aciklama TEXT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recete_adimlari_urun_idx ON recete_adimlari (urun_id);

-- Bir ekim kaydına uygulanan (planlanan ve yapılan) işlemler. bekleme_gun,
-- ilaçlamadan sonra hasada kadar beklenmesi gereken süredir.
CREATE TABLE IF NOT EXISTS ekim_uygulamalari (
  id SERIAL PRIMARY KEY,
  ekim_id INTEGER NOT NULL REFERENCES ekimler(id) ON DELETE CASCADE,
  tur VARCHAR(20) NOT NULL CHECK (tur IN ('Gübreleme', 'İlaçlama', 'Sulama', 'Diğer')),
  ad VARCHAR(150) NOT NULL,
  planlanan_tarih DATE,
  yapilan_tarih DATE,
  doz VARCHAR(100),
  bekleme_gun INTEGER,
  aciklama TEXT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ekim_uygulamalari_ekim_idx ON ekim_uygulamalari (ekim_id);

-- Sahada yapılan gelişim gözlemleri (boy, renk, gelişim evresi).
CREATE TABLE IF NOT EXISTS ekim_gozlemleri (
  id SERIAL PRIMARY KEY,
  ekim_id INTEGER NOT NULL REFERENCES ekimler(id) ON DELETE CASCADE,
  tarih DATE NOT NULL DEFAULT CURRENT_DATE,
  boy_cm NUMERIC(6,1),
  renk VARCHAR(50),
  evre VARCHAR(100),
  notlar TEXT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ekim_gozlemleri_ekim_idx ON ekim_gozlemleri (ekim_id);
-- Ürün başına kullanıcının kendi belirlediği renk skalası (örn. buğday için
-- yeşil -> sarı -> altın sarısı). Gözlem girerken bu renklerden seçilir.
CREATE TABLE IF NOT EXISTS renk_skalasi (
  id SERIAL PRIMARY KEY,
  urun_id INTEGER NOT NULL REFERENCES urunler(id) ON DELETE CASCADE,
  ad VARCHAR(50) NOT NULL,
  renk_kodu VARCHAR(7) NOT NULL CHECK (renk_kodu ~ '^#[0-9a-fA-F]{6}$'),
  sira INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS renk_skalasi_urun_idx ON renk_skalasi (urun_id);

ALTER TABLE ekim_gozlemleri ADD COLUMN IF NOT EXISTS renk_kodu VARCHAR(7);

-- Gözleme ya da uygulamaya (gübreleme/ilaçlama/sulama) bağlı fotoğraflar.
-- Dosyalar backend/uploads/fotograflar altında tutulur, burada sadece adı saklanır.
CREATE TABLE IF NOT EXISTS ekim_fotograflari (
  id SERIAL PRIMARY KEY,
  ekim_id INTEGER NOT NULL REFERENCES ekimler(id) ON DELETE CASCADE,
  gozlem_id INTEGER REFERENCES ekim_gozlemleri(id) ON DELETE CASCADE,
  uygulama_id INTEGER REFERENCES ekim_uygulamalari(id) ON DELETE CASCADE,
  dosya_adi VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  CHECK (num_nonnulls(gozlem_id, uygulama_id) = 1)
);
CREATE INDEX IF NOT EXISTS ekim_fotograflari_ekim_idx ON ekim_fotograflari (ekim_id);