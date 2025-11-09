/**
 * Backend'den gelen teknik error mesajlarını kullanıcı dostu Türkçe mesajlara çevirir
 */
export const translateError = (error) => {
  if (!error) return 'Bir hata oluştu';
  
  const errorStr = error.toString().toLowerCase();
  
  // Teknik mesajları kullanıcı dostu mesajlara çevir
  const errorMap = {
    'invalid username or password': 'Kullanıcı adı veya şifre hatalı',
    'username and password are required': 'Kullanıcı adı ve şifre gereklidir',
    'token is missing': 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın',
    'token is invalid or expired': 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın',
    'insufficient permissions': 'Bu işlem için yetkiniz bulunmamaktadır',
    'not enrolled in this course': 'Bu derse kayıtlı değilsiniz',
    'exam not found': 'Sınav bulunamadı',
    'student not found': 'Öğrenci bulunamadı',
    'instructor not found': 'Öğretim üyesi bulunamadı',
    'course not found': 'Ders bulunamadı',
    'you have already completed this exam': 'Bu sınavı zaten tamamladınız',
    'you have already attempted this exam': 'Bu sınavı zaten başlattınız',
    'sınav henüz başlamadı': 'Sınav henüz başlamadı',
    'sınav süresi doldu': 'Sınav süresi doldu',
    'sınavda en az 5 soru bulunmalıdır': 'Sınavda en az 5 soru bulunmalıdır',
    'duplicate question text': 'Bu soru metni zaten kullanılıyor',
    'duplicate options': 'Aynı soruda aynı seçenek iki kez kullanılamaz',
    'empty option': 'Tüm seçenekler doldurulmalıdır',
    'sınav başladı': 'Sınav başladığı için soru eklenemez',
    'failed to create': 'Oluşturma işlemi başarısız oldu',
    'failed to delete': 'Silme işlemi başarısız oldu',
    'failed to update': 'Güncelleme işlemi başarısız oldu',
    'network error': 'Bağlantı hatası. İnternet bağlantınızı kontrol edin',
    'timeout': 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin',
    'server error': 'Sunucu hatası. Lütfen daha sonra tekrar deneyin'
  };
  
  // Tam eşleşme kontrolü
  for (const [key, value] of Object.entries(errorMap)) {
    if (errorStr.includes(key)) {
      return value;
    }
  }
  
  // Eğer mesaj zaten Türkçe ve anlaşılır görünüyorsa, olduğu gibi döndür
  if (errorStr.includes('türkçe') || errorStr.includes('lütfen') || errorStr.includes('başarı')) {
    return error;
  }
  
  // Varsayılan mesaj
  return error || 'Bir hata oluştu. Lütfen tekrar deneyin';
};

