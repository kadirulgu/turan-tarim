import { useEffect, useState } from 'react';
import { api } from '../api';

export default function HububatBorsasi() {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = () => {
    setYukleniyor(true);
    setHata(null);
    api
      .get('/hububat-borsasi')
      .then((res) => setVeri(res.data))
      .catch((err) => setHata(err.response?.data?.hata || 'Borsa verisi alınamadı.'))
      .finally(() => setYukleniyor(false));
  };

  useEffect(() => {
    yukle();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2>🌾 Hububat Borsası — Eskişehir</h2>
        <button className="btn-ikincil" onClick={yukle} disabled={yukleniyor}>
          🔄 {yukleniyor ? 'Yükleniyor...' : 'Yenile'}
        </button>
      </div>

      {veri?.tarih && (
        <p style={{ color: 'var(--renk-metin-soluk)' }}>
          Kaynak: Polatlı Ticaret Borsası günlük bülteni (Eskişehir Ticaret Borsası sütunu) — {veri.tarih}
          {veri.saat ? `, Saat: ${veri.saat}` : ''}
        </p>
      )}

      {hata && (
        <p style={{ color: 'var(--renk-kirmizi)' }}>⚠️ {hata}</p>
      )}

      {!hata && veri && (
        veri.urunler.length === 0 ? (
          <p>Bugün için Eskişehir Ticaret Borsası'nda işlem gören hububat kaydı bulunmuyor.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>En Az ({veri.birim})</th>
                <th>En Çok ({veri.birim})</th>
                <th>Ortalama ({veri.birim})</th>
                <th>Miktar (Ton)</th>
              </tr>
            </thead>
            <tbody>
              {veri.urunler.map((u) => (
                <tr key={u.ad}>
                  <td>{u.ad}</td>
                  <td>{u.enAz || '-'}</td>
                  <td>{u.enCok || '-'}</td>
                  <td>{u.ortalama || '-'}</td>
                  <td>{u.miktarTon || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
