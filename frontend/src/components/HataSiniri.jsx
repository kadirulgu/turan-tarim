import { Component } from 'react';

export default class HataSiniri extends Component {
  constructor(props) {
    super(props);
    this.state = { hataVar: false };
  }

  static getDerivedStateFromError() {
    return { hataVar: true };
  }

  componentDidCatch(hata, bilgi) {
    console.error('Uygulama hatası:', hata, bilgi);
  }

  render() {
    if (this.state.hataVar) {
      return (
        <div className="form-kart" style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
          <h2 style={{ border: 'none', margin: '0 0 8px' }}>⚠️ Bir şeyler ters gitti</h2>
          <p style={{ color: 'var(--renk-metin-soluk)' }}>
            Sayfa beklenmedik bir hatayla karşılaştı. Diğer menülere geçmeyi deneyebilir
            veya sayfayı yenileyebilirsin.
          </p>
          <button onClick={() => window.location.reload()}>🔄 Sayfayı Yenile</button>
        </div>
      );
    }
    return this.props.children;
  }
}
