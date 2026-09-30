import { bugunISO, tarihGoster } from '../receteSabitleri';

const gunSayisi = (tarih) => {
  const [y, a, g] = tarih.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, a - 1, g) / 86400000;
};

// Ekimden hasada kadar girilen renk gözlemlerini zaman çizgisi olarak gösterir:
// her renk, girildiği günden bir sonraki gözleme kadar çizgide o rengin şeridi olarak görünür.
export default function RenkTakibi({ gozlemler, ekimTarihi, hasatTarihi }) {
  const renkli = gozlemler
    .filter((g) => g.renk_kodu)
    .sort((a, b) => a.tarih.localeCompare(b.tarih) || a.id - b.id);

  if (renkli.length === 0) {
    return <p className="soluk-metin">Renk gözlemi girdikçe ekimden hasada kadar rengin nasıl değiştiği burada görünür.</p>;
  }

  const bugun = bugunISO();
  const ilkGun = gunSayisi(renkli[0].tarih);
  const sonGozlemGunu = gunSayisi(renkli[renkli.length - 1].tarih);
  const baslangic = Math.min(ekimTarihi ? gunSayisi(ekimTarihi) : ilkGun, ilkGun);
  const bitis = Math.max(hasatTarihi ? gunSayisi(hasatTarihi) : sonGozlemGunu + 1, sonGozlemGunu + 1);
  const toplam = bitis - baslangic;
  const yuzde = (gun) => ((gun - baslangic) / toplam) * 100;

  const dilimler = renkli.map((g, i) => {
    const bas = gunSayisi(g.tarih);
    const son = i + 1 < renkli.length ? gunSayisi(renkli[i + 1].tarih) : bitis;
    return { ...g, sol: yuzde(bas), genislik: yuzde(son) - yuzde(bas) };
  });

  const bugunGunu = gunSayisi(bugun);
  const bugunGorunur = bugunGunu >= baslangic && bugunGunu <= bitis;
  const hasataKalan = hasatTarihi ? gunSayisi(hasatTarihi) - bugunGunu : null;

  return (
    <div className="renk-takibi">
      <div className="renk-seridi">
        {dilimler.map((d) => (
          <div
            key={d.id}
            className="renk-dilim"
            style={{ left: `${d.sol}%`, width: `${d.genislik}%`, background: d.renk_kodu }}
            title={`${tarihGoster(d.tarih)} — ${d.renk || d.renk_kodu}`}
          />
        ))}
        {bugunGorunur && <div className="renk-bugun" style={{ left: `${yuzde(bugunGunu)}%` }} title="Bugün" />}
      </div>
      <div className="renk-uclar">
        <span>{ekimTarihi ? `🌱 Ekim ${tarihGoster(ekimTarihi)}` : `İlk gözlem ${tarihGoster(renkli[0].tarih)}`}</span>
        {hasataKalan !== null && (
          <span>{hasataKalan > 0 ? `Hasada ${hasataKalan} gün` : hasataKalan === 0 ? 'Hasat bugün' : 'Hasat tarihi geçti'}</span>
        )}
        <span>{hasatTarihi ? `🌾 Hasat ${tarihGoster(hasatTarihi)}` : 'Hasat tarihi girilmemiş'}</span>
      </div>
      <div className="renk-gecmis">
        {renkli.map((g) => (
          <span key={g.id} className="renk-etiket">
            <i style={{ background: g.renk_kodu }} />
            {tarihGoster(g.tarih).slice(0, 5)} {g.renk}
          </span>
        ))}
      </div>
    </div>
  );
}
