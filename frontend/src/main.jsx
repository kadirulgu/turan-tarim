import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// StrictMode kasıtlı olarak her sayfayı geliştirme modunda bir kez söküp
// yeniden takıyor; bu davranış react-leaflet'in harita katmanlarıyla
// çakışıp "removeChild" hatasına ve bembeyaz sayfaya yol açtığı için kapalı.
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
