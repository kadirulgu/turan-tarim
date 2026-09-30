import { api } from '../api';

export default function KmlUyusmazlikPaneli({ arazi, uyusmazliklar, onKapat, onDuzeltildi }) {
  const kmlDegeriniKullan = async (uyusmazlik) => {
    const guncel = { ...arazi, [uyusmazlik.alan]: uyusmazlik.kml };
    await api.put(`/araziler/${arazi.id}`, guncel);
    onDuzeltildi(uyusmazlik.alan);
  };

  return (
    <div className="uyari-kutu">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>⚠️ "{arazi.ad}" — girdiğin bilgiler KML dosyasıyla uyuşmuyor</strong>
        <button className="btn-ikincil" onClick={onKapat}>Kapat</button>
      </div>

      <table style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th>Alan</th>
            <th>Girdiğin</th>
            <th>KML Dosyasındaki</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {uyusmazliklar.map((u) => (
            <tr key={u.alan}>
              <td>{u.etiket}</td>
              <td>{u.girilen}</td>
              <td>{u.kml}</td>
              <td>
                <button onClick={() => kmlDegeriniKullan(u)}>KML değerini kullan</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
