# Turan Tarım - Sözleşmeli Ekim Takip Sistemi

Çiftçi kaydı, arazi/parsel yönetimi (KML ile harita üzerinde), sözleşmeler ve
ürün/ekim takibi için web tabanlı bir yönetim sistemi.

## Kullanılan Teknolojiler

- **Veritabanı:** PostgreSQL + PostGIS (konumsal veri için)
- **Backend (sunucu):** Node.js + Express, `backend/` klasöründe
- **Frontend (arayüz):** React + Vite, `frontend/` klasöründe, Leaflet ile ücretsiz uydu/yol/topografik harita katmanları (hesap veya API anahtarı gerekmez)
- **Kimlik Doğrulama:** Kullanıcı adı/şifre ile giriş, JWT tabanlı oturum. Tüm veri API'leri girişsiz erişilemez.

## Klasör Yapısı

```
backend/     API sunucusu (cariler, araziler, sözleşmeler, ekimler)
frontend/    Web arayüzü (harita, listeler, formlar)
```

## Kurulum Durumu

Aşağıdakiler bu bilgisayarda zaten kuruldu ve yapılandırıldı, tekrar
yapmana gerek yok:

- PostgreSQL 17 + PostGIS kuruldu ve çalışıyor (kullanıcı: `postgres`,
  port: `5432`; şifre `backend/.env` içinde).
- `turan_tarim` veritabanı ve tüm tablolar (`cariler`, `araziler`,
  `sozlesmeler`, `urunler`, `ekimler`) oluşturuldu.
- Backend (`backend/.env`) ve frontend (`frontend/.env`) `.env`
  dosyaları hazır (oturum güvenliği için rastgele bir `JWT_SECRET` dahil).

Ekstra kurulum veya hesap gerekmiyor; aşağıdaki "Her gün nasıl
çalıştırılır" bölümündeki iki komutla sistem hazır.

## Kullanım

- **Harita:** Tüm arazileri uydu/yol/topografik katmanlarında (sağ üstten
  katman seçilir) gösterir. Parsele tıklayınca ada/parsel, alan,
  hissedarlar ve o arazide **ekili olan ürün(ler)** (Ekimler sayfasına
  girilen kayıtlardan otomatik özetlenir, örn. "Arpa (2026, Ana Ürün)")
  açılır pencerede görünür. Kayıtlı araziler varsa harita otomatik
  olarak onlara odaklanır.
- **Çiftçi / Cari:** Çiftçi ve/veya alıcı kaydı ekle/sil. Tek formda
  firma ünvanı ya da kişi adı, tür işaretlemesi (Çiftçi Kaydı / Alıcı —
  ikisi birden de seçilebilir), TC Kimlik No (11 hane) veya Vergi No
  (10 hane) + vergi dairesi, telefon, adres, **IBAN** (kira/ödeme yapılacak
  banka hesabı) girilir. İl/İlçe/Mahalle Türkiye'nin resmi listesinden
  birbirine bağlı açılır menülerle seçilir.
  Formun altındaki kutudan **Sözleşme Tarihi**, **Sözleşme No** girip
  **"Sözleşme Taraması (PDF)"** ile o kişi/firmayla yapılan sözleşmenin
  taranmış halini yükleyebilirsin; kayıt satırındaki dosya adına
  tıklayarak yeni sekmede açıp görüntüleyebilirsin (sadece PDF kabul
  edilir, 15 MB'a kadar).
- **Araziler:** Arazi ekle. Arazi Adı'nın hemen altında **"Firma Seç"**
  açılır listesi var — birden fazla firman varsa bu arazinin hangi
  firma üzerinden yürütüldüğünü seçersin (Firmalarımız sayfasında
  tanımlanır). Onun altında **"Sözleşme Yaptığımız Kişi/Firma (Cari)
  Seç"** açılır listesi var — bu, Çiftçi/Cari
  sayfasında kayıtlı, bu arazi için gerçekte sözleşme yaptığın tarafı
  gösterir (isteğe bağlı, boş bırakılabilir). İl/İlçe'yi açılır menüden
  seç, Mevki'yi (köy/kırsal alan adı — resmi mahalle listesinde
  olmayabileceği için serbest metin) elle yaz.
  Listede her arazinin yanındaki **"Hissedarları Yönet"** ile o arazinin
  tapudaki tüm hissedarlarını ekleyip çıkarabilirsin. Hissedarlar için
  ayrıca Çiftçi/Cari kaydı açman gerekmez — ad soyad, TC kimlik no,
  telefon ve hisse oranını (pay/payda, örn. 1/4) doğrudan bu panelden
  girersin; bu bilgiler sadece o araziye ait, bağımsız bir kayıttır.
  Yüklediğin KML, TKGM parsel sorgu sonucuysa (İl/İlçe/Mevkii/Ada/Parsel/Alan
  bilgisi içeriyorsa) sistem elle girdiğin bu alanları otomatik olarak KML
  içindeki gerçek verilerle karşılaştırır. Uyuşmazlık varsa turuncu bir
  uyarı kutusunda "Girdiğin" ve "KML Dosyasındaki" değerler yan yana
  gösterilir; "KML değerini kullan" ile tek tıkla düzeltebilirsin.
- **Sözleşmeler:** Bir araziyi, Çiftçi/Cari listesinden seçtiğin gerçek
  bir sözleşme tarafıyla (kira/ortaklık) ilişkilendir — sözleşme yaptığın
  kişi/firma mutlaka önce Çiftçi/Cari sayfasında kayıtlı olmalı. Arazi
  seçildiğinde o arazinin tapudaki hissedarları (ad/TC/telefon/hisse
  oranıyla) bilgi amaçlı listelenir; hisseli bir arazide kiralama için
  genelde her hissedarla (Çiftçi/Cari'de karşılığı varsa) ayrı bir
  sözleşme kaydı oluşturman gerekir.
- **Ekimler (ÇKS Ürün Beyanı):** Bir arazide hangi sezon hangi ürünün
  ekildiğini kaydet. Ürün listesi, ÇKS (Çiftçi Kayıt Sistemi) beyannamesi/
  e-Devlet ÇKS Başvurusu ekranındaki standart gruplara göre tek bir açılır
  listede başlık (ürün grubu: Hububat, Baklagiller, Yağlı Tohumlu
  Bitkiler, Endüstri Bitkileri, Yumru Bitkiler, Yem Bitkileri, Sebzeler,
  Meyveler, Baharat ve Tıbbi Bitkiler, Nadas) ve altında o gruba ait
  ürünler halinde sunulur. Ayrıca ÇKS'deki gibi **Ana Ürün / İkinci
  Ürün** ekim dönemi seçilir.
  Her ekimin yanındaki **"Takip"** ile o ekimin gübreleme/ilaçlama/sulama
  işlemlerini (planlanan ve yapılan tarih, doz, hasat öncesi bekleme süresi)
  ve boy/renk/gelişim evresi gözlemlerini tutarsın. Gözlemlere ve
  işlemlere fotoğraf eklenebilir (telefonda kamerayı açar; yüklemeden
  önce küçültülür). Gözlemlerdeki renkler "Renk Takibi" zaman çizgisinde
  ekimden hasada kadar görünür. Yüklenen dosyalar (fotoğraf ve sözleşme
  PDF'leri) sadece giriş yapmış kullanıcıya açıktır.
- **Reçeteler → Renk Skalası:** Ürün başına kendi renklerini (renk seçici +
  ad) tanımlarsın; gözlem girerken bu renklerden seçilir.
- **Reçeteler:** Ürün başına şablon adımlar (ekimden kaç gün sonra hangi
  gübre/ilaç/sulama, doz, hasat öncesi bekleme süresi). Yeni ekim
  eklerken "Ürün reçetesini uygula" işaretliyse adımlar ekim tarihine
  göre tarihlenerek o ekime kopyalanır. Özet sayfasında önümüzdeki 7
  günün (ve geciken) işleri ile bekleme süresi uyarıları görünür.
- **Firmalarımız:** Birden fazla kendi firman varsa hepsini buradan
  tanımlarsın — ünvan, adres, il/ilçe, vergi dairesi, vergi no. Her
  firmanın yanındaki **"Banka Hesapları"** ile o firmaya ait birden
  fazla banka hesabını (banka adı, hesap adı, IBAN) ayrı ayrı
  yönetebilirsin. Araziler sayfasında her arazi bu firmalardan
  birine bağlanabilir.
- **Kullanıcılar:** Programı kullanacak kişileri kullanıcı adı + şifre
  ile tanımlarsın. İlk açılışta sistemde hiç kullanıcı yoksa "İlk
  Kullanıcıyı Oluştur" ekranı çıkar; o kullanıcıyla giriş yaptıktan
  sonra Kullanıcılar sekmesinden yeni kullanıcı ekleyip silebilirsin
  (kendi hesabını silemezsin, sistemde en az bir kullanıcı kalmalı).
  Sağ üstteki "Çıkış" butonuyla oturumu kapatabilirsin.

## Her gün nasıl çalıştırılır

**Otomatik:** Windows oturumu açılınca "Turan Tarim Sunucu" zamanlanmış
görevi `sunucu-baslat.ps1`'i çalıştırır; backend ve Cloudflare tüneli gizli
pencerede başlar, kapanırlarsa 30 saniye içinde yeniden açılır. Kayıtlar
`loglar/` klasöründedir. Elle bir şey yapmaya gerek yoktur.

Arayüz derlenip backend üzerinden verilir; site http://localhost:4000
adresinde ve `cnrsystem.com.tr` üzerinden açılır. Otomatik başlatma
kapalıysa elle çalıştırmak için iki ayrı PowerShell penceresi gerekir:

```powershell
cd "backend"; npm run dev
```

```powershell
cloudflared tunnel run turan-tarim
```

Arayüzde (`frontend/`) bir değişiklik yapıldığında bir kez yeniden derle;
backend'i yeniden başlatmak gerekmez:

```powershell
cd "frontend"; npm run build
```

Arayüz üzerinde çalışırken anında yenilenen geliştirme sunucusu için
`cd "frontend"; npm run dev` (http://localhost:5173) hâlâ kullanılabilir.

**Telefona kurulum (Android):** Chrome'da siteyi aç → sağ üstteki ⋮ menü →
"Ana ekrana ekle" / "Uygulamayı yükle". Gonca simgesiyle tam ekran açılır.
turanlar tarım projeyi çalıştır
