// Express 4, async route işleyicilerinde fırlatılan hataları yakalamaz; bu da
// geçersiz bir tarih/ID gibi veritabanı hatalarında sunucunun çökmesine yol açar.
// Bu sarmalayıcı hatayı yakalayıp 400 döndürür.
export const asyncSarmal = (islem) => (req, res, next) =>
  Promise.resolve(islem(req, res, next)).catch((err) => {
    console.error(err);
    if (res.headersSent) return next(err);
    res.status(400).json({ error: 'İşlem yapılamadı, girdiğiniz bilgileri kontrol edin' });
  });
