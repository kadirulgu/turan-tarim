import { useEffect } from 'react';

// Telefonda tablolar kart olarak gösterilir; her hücrenin başına sütun adı
// CSS ile (data-etiket) yazılır. Sayfalardaki tabloları tek tek değiştirmemek
// için sütun adları başlık satırından otomatik olarak hücrelere kopyalanır.
function etiketle(kok) {
  for (const tablo of kok.querySelectorAll('table')) {
    const basliklar = tablo.tHead?.rows[0]?.cells;
    if (!basliklar) continue;
    const adlar = [...basliklar].map((th) => th.textContent.trim());
    for (const govde of tablo.tBodies) {
      for (const satir of govde.rows) {
        [...satir.cells].forEach((hucre, i) => {
          const etiket = hucre.colSpan > 1 ? '' : adlar[i] || '';
          if (hucre.dataset.etiket !== etiket) hucre.dataset.etiket = etiket;
        });
      }
    }
  }
}

export function useTabloEtiketleri() {
  useEffect(() => {
    const kok = document.getElementById('root');
    let bekleyen = 0;
    const gozlemci = new MutationObserver(() => {
      cancelAnimationFrame(bekleyen);
      bekleyen = requestAnimationFrame(() => etiketle(kok));
    });
    gozlemci.observe(kok, { childList: true, subtree: true, characterData: true });
    etiketle(kok);
    return () => {
      gozlemci.disconnect();
      cancelAnimationFrame(bekleyen);
    };
  }, []);
}
