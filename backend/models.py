import psycopg2
import psycopg2.extras
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import os
from contextlib import contextmanager

# PostgreSQL bağlantı ayarları
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME', 'exam_system'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}

def get_db_connection():
    """Veritabanı bağlantısı oluştur"""
    try:
        return psycopg2.connect(**DB_CONFIG)
    except psycopg2.OperationalError as e:
        if "does not exist" in str(e):
            create_database()
            return psycopg2.connect(**DB_CONFIG)
        raise

def create_database():
    """Veritabanını oluştur"""
    temp_config = DB_CONFIG.copy()
    temp_config['database'] = 'postgres'
    conn = psycopg2.connect(**temp_config)
    conn.autocommit = True
    cur = conn.cursor()
    try:
        cur.execute(f"CREATE DATABASE {DB_CONFIG['database']}")
    except psycopg2.Error as e:
        if "already exists" not in str(e):
            raise
    finally:
        cur.close()
        conn.close()

@contextmanager
def get_db_cursor():
    """Context manager ile veritabanı cursor'ı"""
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            yield conn, cur
    finally:
        conn.close()

def init_db():
    """Veritabanı tablolarını oluştur"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Users tablosu
        cur.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(80) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'student', 'instructor', 'department_head')),
                full_name VARCHAR(120) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Students tablosu
        cur.execute('''
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                student_number VARCHAR(20) UNIQUE NOT NULL
            )
        ''')

        # Instructors tablosu
        cur.execute('''
            CREATE TABLE IF NOT EXISTS instructors (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                department VARCHAR(100) NOT NULL
            )
        ''')

        # Department Heads tablosu
        cur.execute('''
            CREATE TABLE IF NOT EXISTS department_heads (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                department VARCHAR(100) NOT NULL
            )
        ''')

        # Courses tablosu
        cur.execute('''
            CREATE TABLE IF NOT EXISTS courses (
                id SERIAL PRIMARY KEY,
                code VARCHAR(20) UNIQUE NOT NULL,
                name VARCHAR(120) NOT NULL,
                instructor_id INTEGER NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Enrollments tablosu
        cur.execute('''
            CREATE TABLE IF NOT EXISTS enrollments (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, course_id)
            )
        ''')

        # Exams tablosu
        cur.execute('''
            CREATE TABLE IF NOT EXISTS exams (
                id SERIAL PRIMARY KEY,
                course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                exam_type VARCHAR(20) NOT NULL,
                weight_percentage INTEGER NOT NULL CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                duration_minutes INTEGER DEFAULT 10,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Questions tablosu
        cur.execute('''
            CREATE TABLE IF NOT EXISTS questions (
                id SERIAL PRIMARY KEY,
                exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
                question_text TEXT NOT NULL,
                option_a VARCHAR(255) NOT NULL,
                option_b VARCHAR(255) NOT NULL,
                option_c VARCHAR(255) NOT NULL,
                option_d VARCHAR(255) NOT NULL,
                option_e VARCHAR(255) NOT NULL,
                correct_answer VARCHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Exam Attempts tablosu
        cur.execute('''
            CREATE TABLE IF NOT EXISTS exam_attempts (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
                start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP,
                score FLOAT,
                is_completed BOOLEAN DEFAULT FALSE
            )
        ''')

        # Answers tablosu
        cur.execute('''
            CREATE TABLE IF NOT EXISTS answers (
                id SERIAL PRIMARY KEY,
                attempt_id INTEGER NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
                question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                selected_answer VARCHAR(1) NOT NULL CHECK (selected_answer IN ('A', 'B', 'C', 'D', 'E')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(attempt_id, question_id)
            )
        ''')

        conn.commit()
        cur.close()
        conn.close()

    except Exception as e:
        pass


class User:
    """User modeli"""
    
    @staticmethod
    def create(username, password, role, full_name):
        """Yeni kullanıcı oluştur"""
        with get_db_cursor() as (conn, cur):
            try:
                # Önce username'in gerçekten kullanılabilir olduğunu kontrol et
                cur.execute('SELECT id FROM users WHERE username = %s', (username,))
                existing = cur.fetchone()
                if existing:
                    return None
                
                password_hash = generate_password_hash(password)
                cur.execute('''
                    INSERT INTO users (username, password_hash, role, full_name)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, username, role, full_name, created_at
                ''', (username, password_hash, role, full_name))
                result = cur.fetchone()
                conn.commit()
                
                if result:
                    result_dict = dict(result)
                    if result_dict.get('created_at'):
                        result_dict['created_at'] = result_dict['created_at'].isoformat()
                    return result_dict
                return None
            except psycopg2.IntegrityError as e:
                conn.rollback()
                # UNIQUE constraint hatası
                if 'username' in str(e).lower() or 'unique' in str(e).lower():
                    return None
                raise
            except Exception as e:
                conn.rollback()
                raise
    
    @staticmethod
    def get_by_username(username):
        """Username ile kullanıcı bul"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT id, username, password_hash, role, full_name, created_at
                FROM users WHERE username = %s
            ''', (username,))
            result = cur.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def get_by_id(user_id):
        """ID ile kullanıcı bul"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT id, username, role, full_name, created_at
                FROM users WHERE id = %s
            ''', (user_id,))
            result = cur.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def check_password(password_hash, password):
        """Şifre doğrula"""
        return check_password_hash(password_hash, password)
    
    @staticmethod
    def get_all():
        """Tüm kullanıcıları getir"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT id, username, role, full_name, created_at
                FROM users
                ORDER BY created_at DESC
            ''')
            results = cur.fetchall()
            users = []
            for result in results:
                user_dict = dict(result)
                if user_dict.get('created_at'):
                    user_dict['created_at'] = user_dict['created_at'].isoformat()
                users.append(user_dict)
            return users
    
    @staticmethod
    def update(user_id, username=None, password=None, full_name=None, role=None):
        """Kullanıcı bilgilerini güncelle"""
        with get_db_cursor() as (conn, cur):
            updates = []
            params = []
            
            if username is not None:
                updates.append('username = %s')
                params.append(username)
            if password is not None:
                password_hash = generate_password_hash(password)
                updates.append('password_hash = %s')
                params.append(password_hash)
            if full_name is not None:
                updates.append('full_name = %s')
                params.append(full_name)
            if role is not None:
                updates.append('role = %s')
                params.append(role)
            
            if not updates:
                return None
            
            params.append(user_id)
            query = f'''
                UPDATE users 
                SET {', '.join(updates)}
                WHERE id = %s
                RETURNING id, username, role, full_name, created_at
            '''
            cur.execute(query, params)
            result = cur.fetchone()
            conn.commit()
            
            if result:
                result_dict = dict(result)
                if result_dict.get('created_at'):
                    result_dict['created_at'] = result_dict['created_at'].isoformat()
                return result_dict
            return None
    
    @staticmethod
    def delete(user_id):
        """Kullanıcıyı sil (CASCADE DELETE ile ilgili kayıtlar da silinir)"""
        with get_db_cursor() as (conn, cur):
            try:
                # Önce kullanıcının var olup olmadığını kontrol et
                cur.execute('SELECT id FROM users WHERE id = %s', (user_id,))
                if not cur.fetchone():
                    return False
                
                # Kullanıcıyı sil
                cur.execute('DELETE FROM users WHERE id = %s', (user_id,))
                conn.commit()
                
                # Silme işleminin başarılı olduğunu doğrula
                cur.execute('SELECT id FROM users WHERE id = %s', (user_id,))
                deleted = cur.fetchone() is None
                
                return deleted
            except Exception as e:
                conn.rollback()
                raise


class Student:
    """Student modeli"""
    
    @staticmethod
    def create(user_id, student_number):
        """Yeni öğrenci oluştur"""
        with get_db_cursor() as (conn, cur):
            try:
                # Önce student_number'ın kullanılabilir olduğunu kontrol et
                cur.execute('SELECT id FROM students WHERE student_number = %s', (student_number,))
                existing = cur.fetchone()
                if existing:
                    return None
                
                cur.execute('''
                    INSERT INTO students (user_id, student_number)
                    VALUES (%s, %s)
                    RETURNING id, user_id, student_number
                ''', (user_id, student_number))
                result = cur.fetchone()
                conn.commit()
                return dict(result) if result else None
            except psycopg2.IntegrityError as e:
                conn.rollback()
                # UNIQUE constraint hatası
                if 'student_number' in str(e).lower() or 'unique' in str(e).lower():
                    return None
                raise
            except Exception as e:
                conn.rollback()
                raise
    
    @staticmethod
    def get_by_id(student_id):
        """ID ile öğrenci bul"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT s.id, s.user_id, s.student_number, u.full_name, u.username
                FROM students s
                JOIN users u ON s.user_id = u.id
                WHERE s.id = %s
            ''', (student_id,))
            result = cur.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def get_by_user_id(user_id):
        """User ID ile öğrenci bul"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT s.id, s.user_id, s.student_number, u.full_name, u.username
                FROM students s
                JOIN users u ON s.user_id = u.id
                WHERE s.user_id = %s
            ''', (user_id,))
            result = cur.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def get_by_student_number(student_number):
        """Student number ile öğrenci bul"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT s.id, s.user_id, s.student_number, u.full_name, u.username
                FROM students s
                JOIN users u ON s.user_id = u.id
                WHERE s.student_number = %s
            ''', (student_number,))
            result = cur.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def get_all():
        """Tüm öğrencileri getir"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT s.id, s.user_id, s.student_number, u.full_name, u.username
                FROM students s
                JOIN users u ON s.user_id = u.id
                ORDER BY s.student_number
            ''')
            return [dict(row) for row in cur.fetchall()]
    
    @staticmethod
    def delete(student_id):
        """Öğrenci sil - CASCADE DELETE ile user da silinir"""
        with get_db_cursor() as (conn, cur):
            try:
                # Önce user_id'yi al
                cur.execute('SELECT user_id FROM students WHERE id = %s', (student_id,))
                result = cur.fetchone()
                if not result:
                    return False
                
                user_id = result['user_id']
                
                # User'ı sil (CASCADE DELETE ile students, enrollments, exam_attempts vb. de silinir)
                cur.execute('DELETE FROM users WHERE id = %s', (user_id,))
                conn.commit()
                
                # Silme işleminin başarılı olduğunu doğrula
                cur.execute('SELECT id FROM students WHERE id = %s', (student_id,))
                deleted = cur.fetchone() is None
                
                return deleted
            except Exception as e:
                conn.rollback()
                raise


class Instructor:
    """Instructor modeli"""
    
    @staticmethod
    def create(user_id, department):
        """Yeni öğretim üyesi oluştur"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                INSERT INTO instructors (user_id, department)
                VALUES (%s, %s)
                RETURNING id, user_id, department
            ''', (user_id, department))
            result = cur.fetchone()
            conn.commit()
            return dict(result) if result else None
    
    @staticmethod
    def get_by_id(instructor_id):
        """ID ile öğretim üyesi bul"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT i.id, i.user_id, i.department, u.full_name, u.username
                FROM instructors i
                JOIN users u ON i.user_id = u.id
                WHERE i.id = %s
            ''', (instructor_id,))
            result = cur.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def get_by_user_id(user_id):
        """User ID ile öğretim üyesi bul"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT i.id, i.user_id, i.department, u.full_name, u.username
                FROM instructors i
                JOIN users u ON i.user_id = u.id
                WHERE i.user_id = %s
            ''', (user_id,))
            result = cur.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def get_all():
        """Tüm öğretim üyelerini getir"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT i.id, i.user_id, i.department, u.full_name, u.username
                FROM instructors i
                JOIN users u ON i.user_id = u.id
                ORDER BY u.full_name
            ''')
            return [dict(row) for row in cur.fetchall()]
    
    @staticmethod
    def delete(instructor_id):
        """Öğretim üyesi sil - CASCADE DELETE ile user da silinir"""
        with get_db_cursor() as (conn, cur):
            try:
                # Önce user_id'yi al
                cur.execute('SELECT user_id FROM instructors WHERE id = %s', (instructor_id,))
                result = cur.fetchone()
                if not result:
                    return False
                
                user_id = result['user_id']
                
                # User'ı sil (CASCADE DELETE ile instructors, courses vb. de silinir)
                cur.execute('DELETE FROM users WHERE id = %s', (user_id,))
                conn.commit()
                
                # Silme işleminin başarılı olduğunu doğrula
                cur.execute('SELECT id FROM instructors WHERE id = %s', (instructor_id,))
                deleted = cur.fetchone() is None
                
                return deleted
            except Exception as e:
                conn.rollback()
                raise


class DepartmentHead:
    """Department Head modeli"""
    
    @staticmethod
    def create(user_id, department):
        """Yeni bölüm başkanı oluştur"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                INSERT INTO department_heads (user_id, department)
                VALUES (%s, %s)
                RETURNING id, user_id, department
            ''', (user_id, department))
            result = cur.fetchone()
            conn.commit()
            return dict(result) if result else None
    
    @staticmethod
    def get_by_user_id(user_id):
        """User ID ile bölüm başkanı bul"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT d.id, d.user_id, d.department, u.full_name, u.username
                FROM department_heads d
                JOIN users u ON d.user_id = u.id
                WHERE d.user_id = %s
            ''', (user_id,))
            result = cur.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def delete(department_head_id):
        """Bölüm başkanı sil - CASCADE DELETE ile user da silinir"""
        with get_db_cursor() as (conn, cur):
            try:
                # Önce user_id'yi al
                cur.execute('SELECT user_id FROM department_heads WHERE id = %s', (department_head_id,))
                result = cur.fetchone()
                if not result:
                    return False
                
                user_id = result['user_id']
                
                # User'ı sil (CASCADE DELETE ile department_heads de silinir)
                cur.execute('DELETE FROM users WHERE id = %s', (user_id,))
                conn.commit()
                
                # Silme işleminin başarılı olduğunu doğrula
                cur.execute('SELECT id FROM department_heads WHERE id = %s', (department_head_id,))
                deleted = cur.fetchone() is None
                
                return deleted
            except Exception as e:
                conn.rollback()
                raise


class Course:
    """Course modeli"""
    
    @staticmethod
    def create(code, name, instructor_id):
        """Yeni ders oluştur"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                INSERT INTO courses (code, name, instructor_id)
                VALUES (%s, %s, %s)
                RETURNING id, code, name, instructor_id, created_at
            ''', (code, name, instructor_id))
            result = cur.fetchone()
            conn.commit()
            
            if result:
                result_dict = dict(result)
                if result_dict.get('created_at'):
                    result_dict['created_at'] = result_dict['created_at'].isoformat()
                return result_dict
            return None
    
    @staticmethod
    def get_by_id(course_id):
        """ID ile ders bul"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT c.id, c.code, c.name, c.instructor_id, u.full_name as instructor_name
                FROM courses c
                JOIN instructors i ON c.instructor_id = i.id
                JOIN users u ON i.user_id = u.id
                WHERE c.id = %s
            ''', (course_id,))
            result = cur.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def get_by_instructor(instructor_id):
        """Öğretim üyesinin derslerini getir (exam_count ve student_count ile)"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT 
                    c.id, 
                    c.code, 
                    c.name, 
                    c.instructor_id, 
                    u.full_name as instructor_name,
                    (SELECT COUNT(*) FROM exams WHERE course_id = c.id) as exam_count,
                    (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as student_count
                FROM courses c
                JOIN instructors i ON c.instructor_id = i.id
                JOIN users u ON i.user_id = u.id
                WHERE c.instructor_id = %s
                ORDER BY c.code
            ''', (instructor_id,))
            results = cur.fetchall()
            courses = []
            for row in results:
                course_dict = dict(row)
                # exam_count ve student_count'u integer'a çevir
                course_dict['exam_count'] = int(course_dict.get('exam_count', 0) or 0)
                course_dict['student_count'] = int(course_dict.get('student_count', 0) or 0)
                courses.append(course_dict)
            return courses
    
    @staticmethod
    def get_all():
        """Tüm dersleri getir"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT c.id, c.code, c.name, c.instructor_id, u.full_name as instructor_name
                FROM courses c
                JOIN instructors i ON c.instructor_id = i.id
                JOIN users u ON i.user_id = u.id
                ORDER BY c.code
            ''')
            return [dict(row) for row in cur.fetchall()]
    
    @staticmethod
    def delete(course_id):
        """Ders sil"""
        with get_db_cursor() as (conn, cur):
            cur.execute('DELETE FROM courses WHERE id = %s RETURNING id', (course_id,))
            result = cur.fetchone()
            conn.commit()
            return result is not None


class Enrollment:
    """Enrollment modeli"""
    
    @staticmethod
    def create(student_id, course_id):
        """Yeni kayıt oluştur"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                INSERT INTO enrollments (student_id, course_id)
                VALUES (%s, %s)
                RETURNING id, student_id, course_id, enrolled_at
            ''', (student_id, course_id))
            result = cur.fetchone()
            conn.commit()
            
            if result:
                result_dict = dict(result)
                if result_dict.get('enrolled_at'):
                    result_dict['enrolled_at'] = result_dict['enrolled_at'].isoformat()
                return result_dict
            return None
    
    @staticmethod
    def get_by_student(student_id):
        """Öğrencinin kayıtlarını getir"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT e.id, e.student_id, e.course_id, c.name as course_name, c.code as course_code,
                       u.full_name as student_name, iu.full_name as instructor_name
                FROM enrollments e
                JOIN courses c ON e.course_id = c.id
                JOIN instructors i ON c.instructor_id = i.id
                JOIN users iu ON i.user_id = iu.id
                JOIN students s ON e.student_id = s.id
                JOIN users u ON s.user_id = u.id
                WHERE e.student_id = %s
                ORDER BY c.code
            ''', (student_id,))
            return [dict(row) for row in cur.fetchall()]
    
    @staticmethod
    def get_by_course(course_id):
        """Derse kayıtlı öğrencileri getir"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT e.id, e.student_id, e.course_id, u.full_name as student_name, s.student_number
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                JOIN users u ON s.user_id = u.id
                WHERE e.course_id = %s
                ORDER BY s.student_number
            ''', (course_id,))
            return [dict(row) for row in cur.fetchall()]
    
    @staticmethod
    def get_all():
        """Tüm kayıtları getir"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT e.id, e.student_id, e.course_id, 
                       u.full_name as student_name, c.name as course_name, c.code as course_code
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                JOIN users u ON s.user_id = u.id
                JOIN courses c ON e.course_id = c.id
                ORDER BY c.code, s.student_number
            ''')
            return [dict(row) for row in cur.fetchall()]
    
    @staticmethod
    def delete(enrollment_id):
        """Kayıt sil"""
        with get_db_cursor() as (conn, cur):
            cur.execute('DELETE FROM enrollments WHERE id = %s RETURNING id', (enrollment_id,))
            result = cur.fetchone()
            conn.commit()
            return result is not None


class Exam:
    """Exam modeli"""
    
    @staticmethod
    def create(course_id, exam_type, weight_percentage, start_time, end_time, duration_minutes=10):
        """Yeni sınav oluştur"""
        from datetime import timezone
        
        # PostgreSQL TIMESTAMP timezone-aware değil, bu yüzden timezone-aware datetime'ları naive UTC'ye çevir
        # Timezone-aware ise UTC'ye çevir ve timezone bilgisini kaldır
        if hasattr(start_time, 'tzinfo') and start_time.tzinfo is not None:
            start_time = start_time.astimezone(timezone.utc).replace(tzinfo=None)
        elif hasattr(start_time, 'tzinfo') and start_time.tzinfo is None:
            # Zaten naive, UTC olarak kabul et
            pass
        
        if hasattr(end_time, 'tzinfo') and end_time.tzinfo is not None:
            end_time = end_time.astimezone(timezone.utc).replace(tzinfo=None)
        elif hasattr(end_time, 'tzinfo') and end_time.tzinfo is None:
            # Zaten naive, UTC olarak kabul et
            pass
        
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                INSERT INTO exams (course_id, exam_type, weight_percentage, start_time, end_time, duration_minutes)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, course_id, exam_type, weight_percentage, start_time, end_time, duration_minutes, created_at
            ''', (course_id, exam_type, weight_percentage, start_time, end_time, duration_minutes))
            result = cur.fetchone()
            conn.commit()
            
            if result:
                result_dict = dict(result)
                if result_dict.get('start_time'):
                    result_dict['start_time'] = result_dict['start_time'].isoformat()
                if result_dict.get('end_time'):
                    result_dict['end_time'] = result_dict['end_time'].isoformat()
                if result_dict.get('created_at'):
                    result_dict['created_at'] = result_dict['created_at'].isoformat()
                return result_dict
            return None
    
    @staticmethod
    def get_by_id(exam_id):
        """ID ile sınav bul"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT e.*, c.name as course_name, c.code as course_code,
                       (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count
                FROM exams e
                JOIN courses c ON e.course_id = c.id
                WHERE e.id = %s
            ''', (exam_id,))
            result = cur.fetchone()
            
            if result:
                result_dict = dict(result)
                if result_dict.get('start_time'):
                    result_dict['start_time'] = result_dict['start_time'].isoformat()
                if result_dict.get('end_time'):
                    result_dict['end_time'] = result_dict['end_time'].isoformat()
                if result_dict.get('created_at'):
                    result_dict['created_at'] = result_dict['created_at'].isoformat()
                return result_dict
            return None
    
    @staticmethod
    def get_by_course(course_id):
        """Dersin sınavlarını getir"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT e.*, c.name as course_name, c.code as course_code,
                       (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count
                FROM exams e
                JOIN courses c ON e.course_id = c.id
                WHERE e.course_id = %s
                ORDER BY e.start_time
            ''', (course_id,))
            results = cur.fetchall()
            
            exams = []
            for result in results:
                result_dict = dict(result)
                if result_dict.get('start_time'):
                    dt = result_dict['start_time']
                    from datetime import timezone
                    # If timezone-aware, convert to UTC
                    if hasattr(dt, 'tzinfo') and dt.tzinfo is not None:
                        dt = dt.astimezone(timezone.utc)
                    elif hasattr(dt, 'tzinfo') and dt.tzinfo is None:
                        # Naive datetime, assume UTC
                        dt = dt.replace(tzinfo=timezone.utc)
                    # Format with Z suffix for UTC
                    if hasattr(dt, 'isoformat'):
                        iso_str = dt.isoformat()
                        # Replace +00:00 with Z for UTC
                        if iso_str.endswith('+00:00'):
                            iso_str = iso_str[:-6] + 'Z'
                        elif not iso_str.endswith('Z') and dt.tzinfo == timezone.utc:
                            iso_str = iso_str + 'Z'
                        result_dict['start_time'] = iso_str
                    else:
                        result_dict['start_time'] = str(dt)
                if result_dict.get('end_time'):
                    dt = result_dict['end_time']
                    from datetime import timezone
                    # If timezone-aware, convert to UTC
                    if hasattr(dt, 'tzinfo') and dt.tzinfo is not None:
                        dt = dt.astimezone(timezone.utc)
                    elif hasattr(dt, 'tzinfo') and dt.tzinfo is None:
                        # Naive datetime, assume UTC
                        dt = dt.replace(tzinfo=timezone.utc)
                    # Format with Z suffix for UTC
                    if hasattr(dt, 'isoformat'):
                        iso_str = dt.isoformat()
                        # Replace +00:00 with Z for UTC
                        if iso_str.endswith('+00:00'):
                            iso_str = iso_str[:-6] + 'Z'
                        elif not iso_str.endswith('Z') and dt.tzinfo == timezone.utc:
                            iso_str = iso_str + 'Z'
                        result_dict['end_time'] = iso_str
                    else:
                        result_dict['end_time'] = str(dt)
                if result_dict.get('created_at'):
                    result_dict['created_at'] = result_dict['created_at'].isoformat()
                exams.append(result_dict)
            return exams
    
    @staticmethod
    def delete(exam_id):
        """Sınav sil"""
        with get_db_cursor() as (conn, cur):
            cur.execute('DELETE FROM exams WHERE id = %s RETURNING id', (exam_id,))
            result = cur.fetchone()
            conn.commit()
            return result is not None


class Question:
    """Question modeli"""
    
    @staticmethod
    def create(exam_id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer):
        """Yeni soru oluştur"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, exam_id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, created_at
            ''', (exam_id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer))
            result = cur.fetchone()
            conn.commit()
            
            if result:
                result_dict = dict(result)
                if result_dict.get('created_at'):
                    result_dict['created_at'] = result_dict['created_at'].isoformat()
                return result_dict
            return None
    
    @staticmethod
    def get_by_exam(exam_id, include_answer=False):
        """Sınavın sorularını getir"""
        with get_db_cursor() as (conn, cur):
            if include_answer:
                cur.execute('''
                    SELECT id, exam_id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer
                    FROM questions WHERE exam_id = %s
                    ORDER BY id
                ''', (exam_id,))
            else:
                cur.execute('''
                    SELECT id, exam_id, question_text, option_a, option_b, option_c, option_d, option_e
                    FROM questions WHERE exam_id = %s
                    ORDER BY id
                ''', (exam_id,))
            return [dict(row) for row in cur.fetchall()]
    
    @staticmethod
    def get_by_id(question_id):
        """ID ile soru bul"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT id, exam_id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer
                FROM questions WHERE id = %s
            ''', (question_id,))
            result = cur.fetchone()
            return dict(result) if result else None
    
    @staticmethod
    def count_by_exam(exam_id):
        """Bir sınavdaki soru sayısını döndür"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT COUNT(*) as count
                FROM questions WHERE exam_id = %s
            ''', (exam_id,))
            result = cur.fetchone()
            if result and 'count' in result:
                return int(result['count'])
            return 0
    
    @staticmethod
    def check_duplicate_question_text(exam_id, question_text):
        """Aynı sınavda aynı soru metninin olup olmadığını kontrol et"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT id FROM questions 
                WHERE exam_id = %s AND LOWER(TRIM(question_text)) = LOWER(TRIM(%s))
            ''', (exam_id, question_text))
            result = cur.fetchone()
            return result is not None
    
    @staticmethod
    def check_duplicate_options(option_a, option_b, option_c, option_d, option_e):
        """Bir sorunun şıklarında aynı değerlerin olup olmadığını kontrol et"""
        options = [
            option_a.strip() if option_a else '',
            option_b.strip() if option_b else '',
            option_c.strip() if option_c else '',
            option_d.strip() if option_d else '',
            option_e.strip() if option_e else ''
        ]
        
        # Boş şık kontrolü
        if any(not opt for opt in options):
            return True, 'Tüm şıklar doldurulmalıdır'
        
        # Aynı şık kontrolü (case-insensitive)
        options_lower = [opt.lower() for opt in options]
        seen = set()
        duplicates = []
        for i, opt in enumerate(options_lower):
            if opt in seen:
                duplicates.append(chr(65 + i))  # A, B, C, D, E
            seen.add(opt)
        
        if duplicates:
            return True, f'Aynı şık değerleri bulundu: {", ".join(duplicates)}. Her şık farklı olmalıdır.'
        
        return False, None
    
    @staticmethod
    def delete(question_id):
        """Soru sil"""
        with get_db_cursor() as (conn, cur):
            cur.execute('DELETE FROM questions WHERE id = %s RETURNING id', (question_id,))
            result = cur.fetchone()
            conn.commit()
            return result is not None


class ExamAttempt:
    """Exam Attempt modeli"""
    
    @staticmethod
    def create(student_id, exam_id):
        """Yeni sınav denemesi oluştur"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                INSERT INTO exam_attempts (student_id, exam_id)
                VALUES (%s, %s)
                RETURNING id, student_id, exam_id, start_time, end_time, score, is_completed
            ''', (student_id, exam_id))
            result = cur.fetchone()
            conn.commit()
            
            if result:
                result_dict = dict(result)
                if result_dict.get('start_time'):
                    result_dict['start_time'] = result_dict['start_time'].isoformat()
                if result_dict.get('end_time'):
                    result_dict['end_time'] = result_dict['end_time'].isoformat() if result_dict['end_time'] else None
                return result_dict
            return None
    
    @staticmethod
    def get_by_id(attempt_id):
        """ID ile deneme bul"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT id, student_id, exam_id, start_time, end_time, score, is_completed
                FROM exam_attempts WHERE id = %s
            ''', (attempt_id,))
            result = cur.fetchone()
            
            if result:
                result_dict = dict(result)
                if result_dict.get('start_time'):
                    result_dict['start_time'] = result_dict['start_time'].isoformat()
                if result_dict.get('end_time'):
                    result_dict['end_time'] = result_dict['end_time'].isoformat() if result_dict['end_time'] else None
                return result_dict
            return None
    
    @staticmethod
    def get_by_student_and_exam(student_id, exam_id):
        """Öğrencinin sınav denemesini bul"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT id, student_id, exam_id, start_time, end_time, score, is_completed
                FROM exam_attempts WHERE student_id = %s AND exam_id = %s
            ''', (student_id, exam_id))
            result = cur.fetchone()
            
            if result:
                result_dict = dict(result)
                if result_dict.get('start_time'):
                    result_dict['start_time'] = result_dict['start_time'].isoformat()
                if result_dict.get('end_time'):
                    result_dict['end_time'] = result_dict['end_time'].isoformat() if result_dict['end_time'] else None
                return result_dict
            return None
    
    @staticmethod
    def get_by_exam(exam_id):
        """Sınavın denemelerini getir"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT ea.id, ea.student_id, ea.exam_id, ea.start_time, ea.end_time, ea.score, ea.is_completed
                FROM exam_attempts ea
                WHERE ea.exam_id = %s AND ea.is_completed = TRUE
                ORDER BY ea.end_time DESC
            ''', (exam_id,))
            results = cur.fetchall()
            
            attempts = []
            for result in results:
                result_dict = dict(result)
                if result_dict.get('start_time'):
                    result_dict['start_time'] = result_dict['start_time'].isoformat()
                if result_dict.get('end_time'):
                    result_dict['end_time'] = result_dict['end_time'].isoformat() if result_dict['end_time'] else None
                attempts.append(result_dict)
            return attempts
    
    @staticmethod
    def update(attempt_id, end_time, score, is_completed):
        """Denemeyi güncelle"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                UPDATE exam_attempts 
                SET end_time = %s, score = %s, is_completed = %s
                WHERE id = %s
                RETURNING id, student_id, exam_id, start_time, end_time, score, is_completed
            ''', (end_time, score, is_completed, attempt_id))
            result = cur.fetchone()
            conn.commit()
            
            if result:
                result_dict = dict(result)
                if result_dict.get('start_time'):
                    result_dict['start_time'] = result_dict['start_time'].isoformat()
                if result_dict.get('end_time'):
                    result_dict['end_time'] = result_dict['end_time'].isoformat() if result_dict['end_time'] else None
                return result_dict
            return None


class Answer:
    """Answer modeli"""
    
    @staticmethod
    def create(attempt_id, question_id, selected_answer):
        """Yeni cevap oluştur"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                INSERT INTO answers (attempt_id, question_id, selected_answer)
                VALUES (%s, %s, %s)
                ON CONFLICT (attempt_id, question_id) 
                DO UPDATE SET selected_answer = EXCLUDED.selected_answer
                RETURNING id, attempt_id, question_id, selected_answer, created_at
            ''', (attempt_id, question_id, selected_answer))
            result = cur.fetchone()
            conn.commit()
            
            if result:
                result_dict = dict(result)
                if result_dict.get('created_at'):
                    result_dict['created_at'] = result_dict['created_at'].isoformat()
                return result_dict
            return None
    
    @staticmethod
    def get_by_attempt(attempt_id):
        """Denemenin cevaplarını getir"""
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT id, attempt_id, question_id, selected_answer
                FROM answers WHERE attempt_id = %s
                ORDER BY question_id
            ''', (attempt_id,))
            return [dict(row) for row in cur.fetchall()]

