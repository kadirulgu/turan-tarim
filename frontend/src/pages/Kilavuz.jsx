const ADIMLAR = [
  { baslik: 'Kullanıcı oluştur / giriş yap', aciklama: 'Sistemde hiç kullanıcı yoksa ilk açılışta bu ekran otomatik çıkar.' },
  { baslik: 'Firma ve çiftçileri tanımla', aciklama: 'Birden fazla kendi firman varsa Firmalarımız\'dan, sözleşme yapacağın çiftçi/alıcıları Çiftçi/Cari\'den ekle.' },
  { baslik: 'Araziyi KML ile ekle', aciklama: 'TKGM parsel sorgu KML dosyasını yükle; ada, parsel ve alan bilgisi dosyadan otomatik okunur.' },
  { baslik: 'Sözleşmeyi bağla', aciklama: 'Araziyi hangi cari ile hangi şartlarda kiraladığını Sözleşmeler\'de kaydet.' },
  { baslik: 'Ekimi işle', aciklama: 'O sezon hangi ürünün ekildiğini Ekimler\'e gir.' },
  { baslik: 'Takip et', aciklama: 'Özet ve Harita\'dan işletmenin genel durumunu tek bakışta gör.' },
];

const MODULLER = [
  {
    emoji: '📊',
    baslik: 'Özet',
    aciklama: 'Girişten sonra karşılayan ana ekran. Ayrıntıya inmeden işletmenin güncel durumunu gösterir.',
    ozellikler: [
      'Toplam arazi sayısı ve toplam dekar',
      'Çiftçi/cari sayısı, aktif sözleşme sayısı, firma sayısı',
      'Bu sezon ekili ürün çeşidi',
      'Önümüzdeki 7 gün içinde yapılacak (ve geciken) gübreleme/ilaçlama/sulama işleri',
      'Hasat öncesi bekleme süresi uyarıları',
      'Önümüzdeki 30 gün içinde bitecek sözleşmeler',
    ],
  },
  {
    emoji: '🗺️',
    baslik: 'Harita',
    aciklama: 'Tüm arazileri gerçek sınırlarıyla uydu, yol veya topografik katmanlar üzerinde gösterir. Parselin üzerinde ada/parsel numarası doğrudan yazılı durur.',
    ozellikler: [
      'Ada/Parsel/Mevkii ile arama — bulunan parsel kırmızıya döner ve otomatik yakınlaşılır',
      'Ürüne göre vurgulama — listeden bir ürüne tıklayınca o ürünün ekili olduğu parseller turuncu görünür',
      '5 günlük hava durumu — sıcaklık, yağış ve don riski uyarısı',
      'Diğer parselleri içe aktarma — komşu/aday parselleri KML olarak toplu yükle, beyaz/şeffaf göster, üzerine durum ve not ekle',
    ],
    not: 'KML yüklerken girilen il/ilçe/ada/parsel/alan bilgisi dosyadaki gerçek verilerle otomatik karşılaştırılır; uyuşmazlık varsa tek tıkla düzeltme seçeneği çıkar.',
  },
  {
    emoji: '👤',
    baslik: 'Çiftçi / Cari',
    aciklama: 'Sözleşme yaptığın çiftçi ve alıcıların kayıtlarını tutar.',
    ozellikler: [
      'Firma unvanı ya da kişi adı, TC kimlik veya vergi no, telefon, adres, IBAN',
      'Çiftçi ve alıcı aynı kişide birleşebilir',
      'Sözleşme tarihi/no girip taranmış sözleşme PDF\'i yükleyebilir, kayıttan tek tıkla açabilirsin',
    ],
  },
  {
    emoji: '🌾',
    baslik: 'Araziler',
    aciklama: 'Kiraladığın veya işlettiğin arazilerin ana kaydı; harita üzerindeki sınırları buradan yüklenir.',
    ozellikler: [
      'Hangi firman üzerinden yürütüldüğü ve gerçek sözleşme tarafı (cari) seçilir',
      '"Hissedarları Yönet" ile tapudaki tüm hissedarları ayrı ayrı kaydedebilirsin — ayrıca cari kaydı açman gerekmez',
      'Alan (dekar) bilgisini elle girmezsen KML dosyasından otomatik hesaplanır',
    ],
  },
  {
    emoji: '📋',
    baslik: 'Sözleşmeler',
    aciklama: 'Bir araziyi, Çiftçi/Cari listesinden seçtiğin gerçek sözleşme tarafıyla ilişkilendirir.',
    ozellikler: [
      'Sözleşme tipi, başlangıç/bitiş tarihi, kira bedeli',
      'Arazi seçildiğinde tapudaki hissedarlar bilgi amaçlı listelenir',
      'Hisseli bir arazide her hissedarla ayrı sözleşme kaydı açman gerekebilir',
    ],
  },
  {
    emoji: '🌱',
    baslik: 'Ekimler',
    aciklama: 'Hangi arazide, hangi sezon, hangi ürünün ekildiğinin kaydı — ÇKS ürün beyanına uygun.',
    ozellikler: [
      'Ürün listesi ÇKS gruplarına göre (Hububat, Baklagiller, Yağlı Tohumlu Bitkiler, Sebzeler, Meyveler…) düzenli sunulur',
      'Ana Ürün / İkinci Ürün ekim dönemi ayrımı',
      'Buradaki kayıtlar hem Harita\'daki ürün özetini hem Özet ekranındaki sezon istatistiğini besler',
      'Her ekimin yanındaki "Takip" ile gübreleme/ilaçlama/sulama işlemlerini "yapıldı" olarak işaretleyebilir, boy, renk ve gelişim evresi gözlemlerini girebilirsin',
      'Yeni ekim eklerken "Ürün reçetesini uygula" işaretliyse, ürünün reçete adımları ekim tarihine göre tarihlenerek otomatik gelir',
      'Her gözleme ve her gübreleme/ilaçlama/sulama işlemine fotoğraf ekleyebilirsin; telefonda 📷 düğmesi kamerayı açar',
      '"Renk Takibi" bölümü, gözlemlerde seçtiğin renkleri ekimden hasada zaman çizgisi olarak gösterir',
    ],
  },
  {
    emoji: '🧪',
    baslik: 'Reçeteler',
    aciklama: 'Her ürün için ekimden hasada kadar yapılacak işlemlerin şablonu.',
    ozellikler: [
      'Adım türü (gübreleme, ilaçlama, sulama), ekimden kaç gün sonra yapılacağı ve doz',
      'İlaçlama gibi işlemler için hasat öncesi bekleme süresi — hasat tarihi bu süreden önceye düşerse Özet ve Ekimler\'de uyarı çıkar',
      'Reçeteyi bir kez tanımlarsın; sonraki her ekimde tekrar girmen gerekmez, tarla bazında değişiklik yapabilirsin',
      'Renk skalası — ürünün ekimden hasada alacağı renkleri kendin seçip adlandırırsın; gözlem girerken bu renklere dokunman yeter',
    ],
  },
  {
    emoji: '🏢',
    baslik: 'Firmalarımız',
    aciklama: 'Birden fazla kendi firman varsa hepsini burada tanımlarsın.',
    ozellikler: [
      'Unvan, adres, il/ilçe, vergi dairesi, vergi no',
      'Her firmaya ait birden fazla banka hesabı ayrı ayrı yönetilir',
      'Araziler sayfasında her arazi bu firmalardan birine bağlanabilir',
    ],
  },
  {
    emoji: '📈',
    baslik: 'Hububat Borsası',
    aciklama: 'Eskişehir bölgesindeki güncel hububat fiyatlarını gösterir: buğday, arpa, mısır, ayçiçeği, nohut gibi ürünlerin gün içindeki en düşük, en yüksek, ortalama fiyatı ve işlem hacmi.',
    ozellikler: [],
    not: 'Bülten, bölge ticaret borsasının günlük yayınına bağlıdır; genelde öğleden sonra saat 15:00 civarı güncellenir.',
  },
  {
    emoji: '👥',
    baslik: 'Kullanıcılar',
    aciklama: 'Programı kullanacak kişileri kullanıcı adı ve şifreyle tanımlarsın.',
    ozellikler: [
      'Tüm veri ekranları girişsiz erişilemez',
      'Kendi hesabını silemezsin; sistemde en az bir kullanıcı kalması zorunludur',
    ],
  },
];

export default function Kilavuz() {
  return (
    <div>
      <h2>📘 Kullanım Kılavuzu</h2>
      <p style={{ maxWidth: 680, color: 'var(--renk-metin-soluk)' }}>
        Gonca; çiftçilerle yapılan arazi kiralama ve ortaklık sözleşmelerini, arazilerin harita
        üzerindeki gerçek sınırlarını, hangi arazide hangi ürünün ekili olduğunu ve güncel
        hava/piyasa bilgilerini tek bir yerden takip etmeniz için hazırlandı.
      </p>

      <div className="panel-kart">
        <h3 style={{ marginTop: 0 }}>🚀 Nasıl Başlanır</h3>
        <ol style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 20, margin: 0 }}>
          {ADIMLAR.map((adim) => (
            <li key={adim.baslik}>
              <strong>{adim.baslik}</strong> — {adim.aciklama}
            </li>
          ))}
        </ol>
      </div>

      {MODULLER.map((modul) => (
        <div className="panel-kart" key={modul.baslik}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>{modul.emoji}</span> {modul.baslik}
          </h3>
          <p style={{ margin: '0 0 8px' }}>{modul.aciklama}</p>
          {modul.ozellikler.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {modul.ozellikler.map((ozellik) => (
                <li key={ozellik}>{ozellik}</li>
              ))}
            </ul>
          )}
          {modul.not && (
            <p
              style={{
                marginTop: 10,
                marginBottom: 0,
                fontSize: 13.5,
                color: 'var(--renk-metin-soluk)',
                borderLeft: '3px solid var(--renk-bugday-koyu)',
                paddingLeft: 10,
              }}
            >
              {modul.not}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
