import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Yüklenen dosyalar (fotoğraf, sözleşme PDF'i) giriş gerektirdiği için <img src> ya da
// <a href> ile doğrudan açılamaz; oturum bilgisiyle indirilip geçici bir adrese çevrilir.
export async function dosyaBlobUrl(yol) {
  const res = await api.get(`/dosyalar/${yol}`, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
}

export async function dosyaAc(yol) {
  // Açılır pencere engelleyicilerine takılmamak için sekme tıklama anında açılır
  const sekme = window.open('', '_blank');
  try {
    const url = await dosyaBlobUrl(yol);
    if (sekme) sekme.location.href = url;
    else window.location.href = url;
  } catch {
    sekme?.close();
    alert('Dosya açılamadı.');
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('kullanici');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);
