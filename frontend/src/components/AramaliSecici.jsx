import { useEffect, useRef, useState } from 'react';

export default function AramaliSecici({ secenekler, deger, onDegisti, placeholder, formatla, genislik = 260 }) {
  const [arama, setArama] = useState('');
  const [acik, setAcik] = useState(false);
  const kutuRef = useRef(null);

  const seciliSecenek = secenekler.find((s) => String(s.id) === String(deger));

  useEffect(() => {
    function disariTikla(e) {
      if (kutuRef.current && !kutuRef.current.contains(e.target)) setAcik(false);
    }
    document.addEventListener('mousedown', disariTikla);
    return () => document.removeEventListener('mousedown', disariTikla);
  }, []);

  const filtrelenmis = secenekler.filter((s) =>
    formatla(s).toLocaleLowerCase('tr').includes(arama.toLocaleLowerCase('tr'))
  );

  return (
    <div ref={kutuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <input
        placeholder={placeholder}
        value={acik ? arama : seciliSecenek ? formatla(seciliSecenek) : ''}
        onFocus={() => {
          setAcik(true);
          setArama('');
        }}
        onChange={(e) => setArama(e.target.value)}
        style={{ width: genislik }}
      />
      {acik && (
        <div
          style={{
            position: 'absolute',
            zIndex: 10,
            background: 'var(--renk-beyaz)',
            border: '1px solid var(--renk-sinir)',
            borderRadius: 8,
            marginTop: 2,
            maxHeight: 240,
            overflowY: 'auto',
            width: genislik,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          <div
            onMouseDown={() => {
              onDegisti('');
              setAcik(false);
            }}
            style={{ padding: '7px 10px', cursor: 'pointer', color: 'var(--renk-metin-soluk)' }}
          >
            (Seçimi temizle)
          </div>
          {filtrelenmis.length === 0 && (
            <div style={{ padding: '7px 10px', color: 'var(--renk-metin-soluk)' }}>Sonuç yok</div>
          )}
          {filtrelenmis.map((s) => (
            <div
              key={s.id}
              onMouseDown={() => {
                onDegisti(String(s.id));
                setAcik(false);
              }}
              style={{
                padding: '7px 10px',
                cursor: 'pointer',
                background: String(s.id) === String(deger) ? '#eaf3e8' : 'var(--renk-beyaz)',
              }}
            >
              {formatla(s)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
