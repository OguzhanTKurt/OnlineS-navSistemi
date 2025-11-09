from flask import Blueprint, request, jsonify
from models import Instructor, Course, Exam, Question, ExamAttempt, Enrollment, Student
from utils.auth import require_role
from utils.exam_helpers import get_exam_average, calculate_course_grade, is_exam_available
from datetime import datetime

instructor_bp = Blueprint('instructor', __name__)

@instructor_bp.route('/courses', methods=['GET'])
@require_role('instructor')
def get_courses():
    """Get all courses for the logged-in instructor"""
    # Get instructor by user_id
    instructor = Instructor.get_by_user_id(request.user_id)
    if not instructor:
        return jsonify({'error': 'Instructor not found'}), 404
    
    courses = Course.get_by_instructor(instructor['id'])
    return jsonify(courses), 200

@instructor_bp.route('/courses/<int:course_id>/students', methods=['GET'])
@require_role('instructor')
def get_course_students(course_id):
    """Get all students enrolled in a course"""
    # Verify instructor owns this course
    instructor = Instructor.get_by_user_id(request.user_id)
    course = Course.get_by_id(course_id)
    
    if not course or course['instructor_id'] != instructor['id']:
        return jsonify({'error': 'Course not found or access denied'}), 403
    
    enrollments = Enrollment.get_by_course(course_id)
    students = []
    
    for enrollment in enrollments:
        # Add course grade
        course_grade = calculate_course_grade(enrollment['student_id'], course_id)
        
        students.append({
            'id': enrollment['student_id'],
            'student_number': enrollment['student_number'],
            'full_name': enrollment['student_name'],
            'course_grade': course_grade
        })
    
    return jsonify(students), 200

@instructor_bp.route('/exams', methods=['POST'])
@require_role('instructor')
def create_exam():
    """Create a new exam"""
    data = request.get_json()
    
    required_fields = ['course_id', 'exam_type', 'weight_percentage', 'start_time', 'end_time']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Verify instructor owns this course
    instructor = Instructor.get_by_user_id(request.user_id)
    course = Course.get_by_id(data['course_id'])
    
    if not course or course['instructor_id'] != instructor['id']:
        return jsonify({'error': 'Course not found or access denied'}), 403
    
    try:
        # Parse datetime strings from frontend (now in ISO format with timezone)
        from datetime import timezone
        
        # Frontend'den artık ISO formatında UTC datetime geliyor
        start_time_str = data['start_time']
        end_time_str = data['end_time']
        
        # Parse ISO format datetime strings
        if start_time_str.endswith('Z'):
            start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        elif '+' in start_time_str or start_time_str.count('-') > 2:
            start_time = datetime.fromisoformat(start_time_str)
        else:
            # No timezone, assume UTC
            start_time = datetime.fromisoformat(start_time_str)
            start_time = start_time.replace(tzinfo=timezone.utc)
        
        if end_time_str.endswith('Z'):
            end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
        elif '+' in end_time_str or end_time_str.count('-') > 2:
            end_time = datetime.fromisoformat(end_time_str)
        else:
            # No timezone, assume UTC
            end_time = datetime.fromisoformat(end_time_str)
            end_time = end_time.replace(tzinfo=timezone.utc)
        
        # Ensure both are timezone-aware UTC
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        else:
            start_time = start_time.astimezone(timezone.utc)
        
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)
        else:
            end_time = end_time.astimezone(timezone.utc)
        
        exam = Exam.create(
            course_id=data['course_id'],
            exam_type=data['exam_type'],
            weight_percentage=data['weight_percentage'],
            start_time=start_time,
            end_time=end_time,
            duration_minutes=data.get('duration_minutes', 10)
        )
        
        if not exam:
            return jsonify({'error': 'Failed to create exam'}), 500
        
        return jsonify(exam), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@instructor_bp.route('/courses/<int:course_id>/exams', methods=['GET'])
@require_role('instructor')
def get_course_exams(course_id):
    """Get all exams for a course"""
    # Verify instructor owns this course
    instructor = Instructor.get_by_user_id(request.user_id)
    course = Course.get_by_id(course_id)
    
    if not course or course['instructor_id'] != instructor['id']:
        return jsonify({'error': 'Course not found or access denied'}), 403
    
    exams = Exam.get_by_course(course_id)
    
    # Add has_minimum_questions flag for each exam
    for exam in exams:
        question_count = exam.get('question_count', 0) or 0
        exam['has_minimum_questions'] = question_count >= 5
    
    return jsonify(exams), 200

@instructor_bp.route('/exams/<int:exam_id>', methods=['DELETE'])
@require_role('instructor')
def delete_exam(exam_id):
    """Delete an exam"""
    exam = Exam.get_by_id(exam_id)
    if not exam:
        return jsonify({'error': 'Exam not found'}), 404
    
    # Verify instructor owns this course
    instructor = Instructor.get_by_user_id(request.user_id)
    course = Course.get_by_id(exam['course_id'])
    
    if not course or course['instructor_id'] != instructor['id']:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        if Exam.delete(exam_id):
            return jsonify({'message': 'Exam deleted successfully'}), 200
        else:
            return jsonify({'error': 'Failed to delete exam'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@instructor_bp.route('/questions', methods=['POST'])
@require_role('instructor')
def create_question():
    """Add a question to an exam"""
    data = request.get_json()
    
    required_fields = ['exam_id', 'question_text', 'option_a', 'option_b', 
                      'option_c', 'option_d', 'option_e', 'correct_answer']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Verify instructor owns this exam
    exam = Exam.get_by_id(data['exam_id'])
    if not exam:
        return jsonify({'error': 'Exam not found'}), 404
    
    instructor = Instructor.get_by_user_id(request.user_id)
    course = Course.get_by_id(exam['course_id'])
    
    if not course or course['instructor_id'] != instructor['id']:
        return jsonify({'error': 'Access denied'}), 403
    
    # Validate correct answer
    if data['correct_answer'].upper() not in ['A', 'B', 'C', 'D', 'E']:
        return jsonify({'error': 'Correct answer must be A, B, C, D, or E'}), 400
    
    # Check for duplicate question text in the same exam
    if Question.check_duplicate_question_text(data['exam_id'], data['question_text']):
        return jsonify({
            'error': 'Bu sınavda aynı soru metni zaten mevcut. Lütfen farklı bir soru yazın.'
        }), 400
    
    # Check for duplicate options in the same question
    has_duplicate, duplicate_message = Question.check_duplicate_options(
        data['option_a'], data['option_b'], data['option_c'], 
        data['option_d'], data['option_e']
    )
    if has_duplicate:
        return jsonify({'error': duplicate_message}), 400
    
    # Check if exam has started - if so, don't allow modifications
    now = datetime.utcnow()
    start_time = exam['start_time']
    end_time = exam['end_time']
    
    # Parse datetime strings if needed
    if isinstance(start_time, str):
        start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
    if isinstance(end_time, str):
        end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
    
    # Check if exam has started (start_time has passed)
    if now >= start_time:
        return jsonify({
            'error': f'Sınav başladıktan sonra soru eklenemez veya silinemez. Sınav başlangıç zamanı: {start_time.strftime("%Y-%m-%d %H:%M")}'
        }), 400
    
    try:
        question = Question.create(
            exam_id=data['exam_id'],
            question_text=data['question_text'],
            option_a=data['option_a'],
            option_b=data['option_b'],
            option_c=data['option_c'],
            option_d=data['option_d'],
            option_e=data['option_e'],
            correct_answer=data['correct_answer'].upper()
        )
        
        if not question:
            return jsonify({'error': 'Failed to create question'}), 500
        
        return jsonify(question), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@instructor_bp.route('/exams/<int:exam_id>/questions', methods=['GET'])
@require_role('instructor')
def get_exam_questions(exam_id):
    """Get all questions for an exam"""
    exam = Exam.get_by_id(exam_id)
    if not exam:
        return jsonify({'error': 'Exam not found'}), 404
    
    # Verify instructor owns this exam
    instructor = Instructor.get_by_user_id(request.user_id)
    course = Course.get_by_id(exam['course_id'])
    
    if not course or course['instructor_id'] != instructor['id']:
        return jsonify({'error': 'Access denied'}), 403
    
    questions = Question.get_by_exam(exam_id, include_answer=True)
    return jsonify(questions), 200

@instructor_bp.route('/questions/<int:question_id>', methods=['DELETE'])
@require_role('instructor')
def delete_question(question_id):
    """Delete a question"""
    try:
        question = Question.get_by_id(question_id)
        if not question:
            return jsonify({'error': 'Question not found'}), 404
        
        # Verify instructor owns this question
        exam = Exam.get_by_id(question['exam_id'])
        if not exam:
            return jsonify({'error': 'Exam not found'}), 404
        
        instructor = Instructor.get_by_user_id(request.user_id)
        if not instructor:
            return jsonify({'error': 'Instructor not found'}), 404
        
        course = Course.get_by_id(exam['course_id'])
        if not course or course['instructor_id'] != instructor['id']:
            return jsonify({'error': 'Access denied'}), 403
        
        # Check if exam has started - if so, don't allow modifications
        now = datetime.utcnow()
        start_time = exam['start_time']
        end_time = exam['end_time']
        
        # Parse datetime strings if needed
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        if isinstance(end_time, str):
            end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        
        # Check if exam has started (start_time has passed)
        if now >= start_time:
            return jsonify({
                'error': f'Sınav başladıktan sonra soru eklenemez veya silinemez. Sınav başlangıç zamanı: {start_time.strftime("%Y-%m-%d %H:%M")}'
            }), 400
        
        # Check if deleting this question would bring the total below 5
        current_count = Question.count_by_exam(question['exam_id'])
        warning = None
        if current_count <= 5:
            warning = f'Uyarı: Sınavda en az 5 soru bulunmalıdır. Şu anda {current_count} soru var. Soru silindikten sonra {current_count - 1} soru kalacak ve öğrenciler bu sınavı görmeyecektir.'
        
        if Question.delete(question_id):
            response_data = {'message': 'Question deleted successfully'}
            if warning:
                response_data['warning'] = warning
            return jsonify(response_data), 200
        else:
            return jsonify({'error': 'Failed to delete question'}), 500
    except Exception as e:
        return jsonify({'error': f'Soru silinirken bir hata oluştu: {str(e)}'}), 500

@instructor_bp.route('/exams/<int:exam_id>/results', methods=['GET'])
@require_role('instructor')
def get_exam_results(exam_id):
    """Get results for an exam"""
    exam = Exam.get_by_id(exam_id)
    if not exam:
        return jsonify({'error': 'Exam not found'}), 404
    
    # Verify instructor owns this exam
    instructor = Instructor.get_by_user_id(request.user_id)
    course = Course.get_by_id(exam['course_id'])
    
    if not course or course['instructor_id'] != instructor['id']:
        return jsonify({'error': 'Access denied'}), 403
    
    # Get all completed attempts
    attempts = ExamAttempt.get_by_exam(exam_id)
    
    results = []
    for attempt in attempts:
        student = Student.get_by_id(attempt['student_id'])
        results.append({
            'student_id': student['id'],
            'student_name': student['full_name'],
            'student_number': student['student_number'],
            'score': attempt['score'],
            'start_time': attempt['start_time'],
            'end_time': attempt['end_time']
        })
    
    # Calculate average
    average = get_exam_average(exam_id)
    
    return jsonify({
        'exam': exam,
        'results': results,
        'average': average,
        'total_attempts': len(results)
    }), 200
