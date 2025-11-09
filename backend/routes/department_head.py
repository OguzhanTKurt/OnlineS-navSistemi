from flask import Blueprint, request, jsonify
from models import DepartmentHead, Course, Student, Enrollment, Exam, ExamAttempt, get_db_cursor
from utils.auth import require_role
from utils.exam_helpers import calculate_course_grade

department_head_bp = Blueprint('department_head', __name__)

def calculate_all_course_grades():
    """Calculate all course grades for all students in a single optimized query"""
    with get_db_cursor() as (conn, cur):
        # Get all enrollments with their course and student info
        cur.execute('''
            SELECT 
                e.student_id,
                e.course_id,
                c.code as course_code,
                c.name as course_name
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
        ''')
        enrollments = cur.fetchall()
        
        # Get all exams with their weights grouped by course
        cur.execute('''
            SELECT 
                course_id,
                id as exam_id,
                weight_percentage
            FROM exams
            ORDER BY course_id
        ''')
        exams = cur.fetchall()
        
        # Group exams by course_id
        exams_by_course = {}
        for exam in exams:
            course_id = exam['course_id']
            if course_id not in exams_by_course:
                exams_by_course[course_id] = []
            exams_by_course[course_id].append(exam)
        
        # Get all completed exam attempts with scores
        cur.execute('''
            SELECT 
                student_id,
                exam_id,
                score
            FROM exam_attempts
            WHERE is_completed = TRUE AND score IS NOT NULL
        ''')
        attempts = cur.fetchall()
        
        # Group attempts by (student_id, exam_id)
        attempts_dict = {}
        for attempt in attempts:
            key = (attempt['student_id'], attempt['exam_id'])
            attempts_dict[key] = attempt['score']
        
        # Calculate grades for each enrollment
        grades_dict = {}
        for enrollment in enrollments:
            student_id = enrollment['student_id']
            course_id = enrollment['course_id']
            
            if course_id not in exams_by_course:
                continue
            
            total_grade = 0
            total_weight = 0
            
            for exam in exams_by_course[course_id]:
                exam_id = exam['exam_id']
                weight = exam['weight_percentage']
                key = (student_id, exam_id)
                
                if key in attempts_dict:
                    score = attempts_dict[key]
                    weighted_score = (score * weight) / 100
                    total_grade += weighted_score
                    total_weight += weight
            
            if total_weight > 0:
                grade = round(total_grade, 2)
                grades_dict[(student_id, course_id)] = grade
        
        return grades_dict

@department_head_bp.route('/courses', methods=['GET'])
@require_role('department_head')
def get_all_courses():
    """Get all courses in the system - OPTIMIZED VERSION"""
    # Calculate all grades in one go
    grades_dict = calculate_all_course_grades()
    
    courses = Course.get_all()
    course_list = []
    
    # Group grades by course_id
    grades_by_course = {}
    for (student_id, course_id), grade in grades_dict.items():
        if course_id not in grades_by_course:
            grades_by_course[course_id] = []
        grades_by_course[course_id].append(grade)
    
    for course in courses:
        course_id = course['id']
        enrollments = Enrollment.get_by_course(course_id)
        grades = grades_by_course.get(course_id, [])
        
        course['average_grade'] = round(sum(grades) / len(grades), 2) if grades else None
        course['student_count'] = len(enrollments)
        
        course_list.append(course)
    
    return jsonify(course_list), 200

@department_head_bp.route('/students', methods=['GET'])
@require_role('department_head')
def get_all_students():
    """Get all students in the system - OPTIMIZED VERSION"""
    # Calculate all grades in one go
    grades_dict = calculate_all_course_grades()
    
    students = Student.get_all()
    student_list = []
    
    for student in students:
        student_id = student['id']
        enrollments = Enrollment.get_by_student(student_id)
        courses = []
        all_grades = []
        
        for enrollment in enrollments:
            course_id = enrollment['course_id']
            grade = grades_dict.get((student_id, course_id))
            
            courses.append({
                'course_id': course_id,
                'course_code': enrollment['course_code'],
                'course_name': enrollment['course_name'],
                'grade': grade
            })
            
            if grade is not None:
                all_grades.append(grade)
        
        student['courses'] = courses
        student['overall_average'] = round(sum(all_grades) / len(all_grades), 2) if all_grades else None
        
        student_list.append(student)
    
    return jsonify(student_list), 200

@department_head_bp.route('/statistics', methods=['GET'])
@require_role('department_head')
def get_statistics():
    """Get overall system statistics - OPTIMIZED VERSION"""
    # Calculate all grades in one go
    grades_dict = calculate_all_course_grades()
    
    with get_db_cursor() as (conn, cur):
        # Total counts - combine into single query
        cur.execute('''
            SELECT 
                (SELECT COUNT(*) FROM students) as total_students,
                (SELECT COUNT(*) FROM courses) as total_courses,
                (SELECT COUNT(*) FROM exams) as total_exams,
                (SELECT COUNT(*) FROM exam_attempts WHERE is_completed = TRUE) as total_attempts
        ''')
        counts = cur.fetchone()
        total_students = counts['total_students']
        total_courses = counts['total_courses']
        total_exams = counts['total_exams']
        total_attempts = counts['total_attempts']
    
    # Course statistics
    course_stats = []
    courses = Course.get_all()
    
    # Group grades by course_id
    grades_by_course = {}
    for (student_id, course_id), grade in grades_dict.items():
        if course_id not in grades_by_course:
            grades_by_course[course_id] = []
        grades_by_course[course_id].append(grade)
    
    for course in courses:
        course_id = course['id']
        enrollments = Enrollment.get_by_course(course_id)
        grades = grades_by_course.get(course_id, [])
        
        course_stats.append({
            'course_id': course_id,
            'course_code': course['code'],
            'course_name': course['name'],
            'instructor_name': course['instructor_name'],
            'student_count': len(enrollments),
            'average_grade': round(sum(grades) / len(grades), 2) if grades else None,
            'min_grade': min(grades) if grades else None,
            'max_grade': max(grades) if grades else None
        })
    
    # Overall average - group grades by student_id
    grades_by_student = {}
    for (student_id, course_id), grade in grades_dict.items():
        if student_id not in grades_by_student:
            grades_by_student[student_id] = []
        grades_by_student[student_id].append(grade)
    
    all_grades = []
    for student_id, student_grades in grades_by_student.items():
        if student_grades:
            all_grades.append(sum(student_grades) / len(student_grades))
    
    overall_average = round(sum(all_grades) / len(all_grades), 2) if all_grades else None
    
    return jsonify({
        'total_students': total_students,
        'total_courses': total_courses,
        'total_exams': total_exams,
        'total_completed_attempts': total_attempts,
        'overall_average': overall_average,
        'course_statistics': course_stats
    }), 200

@department_head_bp.route('/courses/<int:course_id>/details', methods=['GET'])
@require_role('department_head')
def get_course_details(course_id):
    """Get detailed information about a specific course"""
    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404
    
    # Get exams
    exams = Exam.get_by_course(course_id)
    exam_list = []
    
    for exam in exams:
        attempts = ExamAttempt.get_by_exam(exam['id'])
        scores = [attempt['score'] for attempt in attempts if attempt['score'] is not None]
        
        exam_list.append({
            'exam_id': exam['id'],
            'exam_type': exam['exam_type'],
            'weight_percentage': exam['weight_percentage'],
            'average_score': round(sum(scores) / len(scores), 2) if scores else None,
            'attempt_count': len(attempts)
        })
    
    # Get students
    enrollments = Enrollment.get_by_course(course_id)
    student_list = []
    
    for enrollment in enrollments:
        grade = calculate_course_grade(enrollment['student_id'], course_id)
        
        student_list.append({
            'student_id': enrollment['student_id'],
            'student_number': enrollment['student_number'],
            'full_name': enrollment['student_name'],
            'grade': grade
        })
    
    course['exams'] = exam_list
    course['students'] = student_list
    
    return jsonify(course), 200
