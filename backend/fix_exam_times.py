"""
Mevcut sınavların zamanlarını düzelt
Kullanıcılar 21:35 gibi zamanlar seçtiğinde bunlar UTC olarak saklanmış
Ama aslında 21:35 Türkiye saati (UTC+3) = 18:35 UTC olmalıydı
Bu script tüm sınavların zamanlarını 3 saat geri alır (UTC+3'ten UTC'ye çevirir)
"""

import psycopg2
import psycopg2.extras
from datetime import timedelta
import os

# PostgreSQL bağlantı ayarları
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME', 'exam_system'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}

def fix_exam_times():
    """Tüm sınavların start_time ve end_time değerlerini 3 saat geri al"""
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        # Tüm sınavları al
        cur.execute('SELECT id, start_time, end_time FROM exams')
        exams = cur.fetchall()
        
        print(f"Toplam {len(exams)} sınav bulundu\n")
        
        for exam in exams:
            exam_id = exam['id']
            start_time = exam['start_time']
            end_time = exam['end_time']
            
            # 3 saat geri al
            new_start_time = start_time - timedelta(hours=3)
            new_end_time = end_time - timedelta(hours=3)
            
            print(f"Sınav ID {exam_id}:")
            print(f"  Eski başlangıç: {start_time}")
            print(f"  Yeni başlangıç: {new_start_time}")
            print(f"  Eski bitiş: {end_time}")
            print(f"  Yeni bitiş: {new_end_time}\n")
            
            # Güncelle
            cur.execute('''
                UPDATE exams 
                SET start_time = %s, end_time = %s 
                WHERE id = %s
            ''', (new_start_time, new_end_time, exam_id))
        
        conn.commit()
        print("Tüm sınavlar güncellendi!")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    fix_exam_times()

