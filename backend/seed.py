"""
Seed script to populate the database with initial data
Run this script after creating the database tables
"""
from models import init_db, User, Student, Instructor, DepartmentHead, Course, Enrollment

def seed_database():
    print("Initializing database...")
    init_db()
    
    print("\n" + "="*50)
    print("Starting database seeding...")
    print("="*50)
    
    # Create Admin
    print("\n1. Creating admin user...")
    admin = User.create(
        username='admin',
        password='admin123',
        role='admin',
        full_name='System Administrator'
    )
    if admin:
        print(f"   ✓ Admin created: {admin['username']}")
    
    # Create Department Head
    print("\n2. Creating department head...")
    dept_head_user = User.create(
        username='depthead',
        password='dept123',
        role='department_head',
        full_name='Dr. Ahmet Yılmaz'
    )
    if dept_head_user:
        dept_head = DepartmentHead.create(
            user_id=dept_head_user['id'],
            department='Computer Engineering'
        )
        print(f"   ✓ Department Head created: {dept_head_user['username']}")
    
    # Create Instructors
    print("\n3. Creating instructors...")
    instructors_data = [
        {
            'username': 'instructor1',
            'full_name': 'Prof. Dr. Mehmet Demir',
            'password': 'inst123',
            'department': 'Computer Engineering'
        },
        {
            'username': 'instructor2',
            'full_name': 'Doç. Dr. Ayşe Kaya',
            'password': 'inst123',
            'department': 'Computer Engineering'
        }
    ]
    
    instructors = []
    for inst_data in instructors_data:
        user = User.create(
            username=inst_data['username'],
            password=inst_data['password'],
            role='instructor',
            full_name=inst_data['full_name']
        )
        
        if user:
            instructor = Instructor.create(
                user_id=user['id'],
                department=inst_data['department']
            )
            instructors.append(instructor)
            print(f"   ✓ Instructor created: {inst_data['username']}")
    
    # Create Students
    print("\n4. Creating students...")
    students_data = [
        {'username': 'student1', 'full_name': 'Ali Yılmaz', 'student_number': '20210001'},
        {'username': 'student2', 'full_name': 'Zeynep Şahin', 'student_number': '20210002'},
        {'username': 'student3', 'full_name': 'Burak Öztürk', 'student_number': '20210003'},
        {'username': 'student4', 'full_name': 'Elif Aydın', 'student_number': '20210004'},
        {'username': 'student5', 'full_name': 'Can Yıldız', 'student_number': '20210005'},
        {'username': 'student6', 'full_name': 'Selin Arslan', 'student_number': '20210006'},
        {'username': 'student7', 'full_name': 'Emre Doğan', 'student_number': '20210007'},
        {'username': 'student8', 'full_name': 'Deniz Çelik', 'student_number': '20210008'},
        {'username': 'student9', 'full_name': 'Berk Koç', 'student_number': '20210009'},
        {'username': 'student10', 'full_name': 'Merve Acar', 'student_number': '20210010'}
    ]
    
    students = []
    for student_data in students_data:
        user = User.create(
            username=student_data['username'],
            password='student123',
            role='student',
            full_name=student_data['full_name']
        )
        
        if user:
            student = Student.create(
                user_id=user['id'],
                student_number=student_data['student_number']
            )
            students.append(student)
            print(f"   ✓ Student created: {student_data['username']} ({student_data['student_number']})")
    
    # Create Courses
    print("\n5. Creating courses...")
    courses_data = [
        {
            'code': 'CS101',
            'name': 'Introduction to Programming',
            'instructor_id': instructors[0]['id']
        },
        {
            'code': 'CS102',
            'name': 'Data Structures and Algorithms',
            'instructor_id': instructors[0]['id']
        },
        {
            'code': 'CS201',
            'name': 'Database Management Systems',
            'instructor_id': instructors[1]['id']
        },
        {
            'code': 'CS202',
            'name': 'Web Development',
            'instructor_id': instructors[1]['id']
        }
    ]
    
    courses = []
    for course_data in courses_data:
        course = Course.create(
            code=course_data['code'],
            name=course_data['name'],
            instructor_id=course_data['instructor_id']
        )
        courses.append(course)
        print(f"   ✓ Course created: {course_data['code']} - {course_data['name']}")
    
    # Create Enrollments
    print("\n6. Creating enrollments...")
    enrollment_count = 0
    
    # Students 1-5: CS101 (Instructor 1) and CS201 (Instructor 2)
    for i in range(5):
        Enrollment.create(student_id=students[i]['id'], course_id=courses[0]['id'])
        Enrollment.create(student_id=students[i]['id'], course_id=courses[2]['id'])
        enrollment_count += 2
    
    # Students 6-10: CS102 (Instructor 1) and CS202 (Instructor 2)
    for i in range(5, 10):
        Enrollment.create(student_id=students[i]['id'], course_id=courses[1]['id'])
        Enrollment.create(student_id=students[i]['id'], course_id=courses[3]['id'])
        enrollment_count += 2
    
    # Some students take additional courses
    extra_enrollments = [
        (students[0]['id'], courses[1]['id']),  # Student 1 also takes CS102
        (students[5]['id'], courses[0]['id']),  # Student 6 also takes CS101
        (students[2]['id'], courses[3]['id']),  # Student 3 also takes CS202
    ]
    
    for student_id, course_id in extra_enrollments:
        Enrollment.create(student_id=student_id, course_id=course_id)
        enrollment_count += 1
    
    print(f"   ✓ {enrollment_count} enrollments created")
    
    print("\n" + "="*50)
    print("✓ Database seeded successfully!")
    print("="*50)
    print("\n📋 LOGIN CREDENTIALS:")
    print("-" * 50)
    print("\n👤 Admin:")
    print("   Username: admin")
    print("   Password: admin123")
    print("\n👔 Department Head:")
    print("   Username: depthead")
    print("   Password: dept123")
    print("\n👨‍🏫 Instructors:")
    print("   Username: instructor1 | Password: inst123")
    print("   Username: instructor2 | Password: inst123")
    print("\n👨‍🎓 Students:")
    print("   Username: student1-student10 | Password: student123")
    print("-" * 50)
    print(f"\n📊 Summary:")
    print(f"   • 1 Admin")
    print(f"   • 1 Department Head")
    print(f"   • 2 Instructors")
    print(f"   • 10 Students")
    print(f"   • 4 Courses")
    print(f"   • {enrollment_count} Enrollments")
    print("="*50)
    print("\n✨ You can now start the application with: python app.py")
    print("="*50 + "\n")

if __name__ == '__main__':
    try:
        seed_database()
    except Exception as e:
        print(f"\n❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
