-- Mevcut sınavların zamanlarını düzelt
-- Kullanıcılar 21:35 gibi zamanlar seçtiğinde bunlar UTC olarak saklanmış
-- Ama aslında 21:35 Türkiye saati (UTC+3) = 18:35 UTC olmalıydı
-- Bu SQL tüm sınavların zamanlarını 3 saat geri alır (UTC+3'ten UTC'ye çevirir)

UPDATE exams 
SET start_time = start_time - INTERVAL '3 hours',
    end_time = end_time - INTERVAL '3 hours';

-- Kontrol için tüm sınavları göster
SELECT id, start_time, end_time FROM exams;

