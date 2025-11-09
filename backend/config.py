import os
from datetime import timedelta

class Config:
    # JWT configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # App configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-flask-secret-key')
    DEBUG = os.getenv('DEBUG', 'True') == 'True'
    
    # Database configuration (psycopg2 kullanıyor, models.py'de tanımlı)
    # DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD environment variables'dan okunuyor

