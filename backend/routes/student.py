from flask import Blueprint, request, jsonify
from models import Student, Enrollment, Exam, ExamAttempt, Question, Answer, Course, get_db_cursor
from utils.auth import require_role
from utils.exam_helpers import (
    calculate_score, 
    get_exam_average, 
    is_exam_available,
    has_student_attempted,
    calculate_course_grade
)
from datetime import datetime

student_bp = Blueprint('student', __name__)

@student_bp.route('/courses', methods=['GET'])
@require_role('student')
def get_courses():
    """Get all courses the student is enrolled in"""
    # Get student by user_id
    student = Student.get_by_user_id(request.user_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    enrollments = Enrollment.get_by_student(student['id'])
    courses = []
    
    for enrollment in enrollments:
        course_data = {
            'id': enrollment['course_id'],
            'code': enrollment['course_code'],
            'name': enrollment['course_name'],
            'instructor_name': enrollment.get('instructor_name', '')
        }
        
        # Add course grade
        course_grade = calculate_course_grade(student['id'], enrollment['course_id'])
        course_data['course_grade'] = course_grade
        
        courses.append(course_data)
    
    return jsonify(courses), 200

@student_bp.route('/courses/<int:course_id>/exams', methods=['GET'])
@require_role('student')
def get_course_exams(course_id):
    """Get all exams for a course"""
    try:
        # Get student by user_id
        student = Student.get_by_user_id(request.user_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Check if student is enrolled
        enrollments = Enrollment.get_by_student(student['id'])
        enrolled_course_ids = [e['course_id'] for e in enrollments]
        
        if course_id not in enrolled_course_ids:
            return jsonify({'error': 'Not enrolled in this course'}), 403
        
        exams = Exam.get_by_course(course_id)
        exam_list = []
        
        for exam in exams:
            try:
                # Check if exam has at least 5 questions - if not, don't show it to students
                question_count = exam.get('question_count', 0) or 0
                if question_count < 5:
                    continue  # Skip exams with less than 5 questions
                
                # Check if student has attempted
                attempt = ExamAttempt.get_by_student_and_exam(student['id'], exam['id'])
                
                exam['has_attempted'] = attempt is not None
                # Calculate availability - make sure we use the exam dict with string times
                exam['is_available'] = is_exam_available(exam)
                
                if attempt:
                    # Check if there are answers for this attempt
                    from models import Answer
                    answers = Answer.get_by_attempt(attempt['id'])
                    answer_count = len(answers) if answers else 0
                    
                    # If attempt has no answers and is not completed, delete it (incomplete attempt)
                    if answer_count == 0 and not attempt.get('is_completed', False):
                        with get_db_cursor() as (conn, cur):
                            cur.execute('DELETE FROM exam_attempts WHERE id = %s', (attempt['id'],))
                            conn.commit()
                        # Don't include this attempt in the response
                        exam['has_attempted'] = False
                        exam['attempt'] = None
                    else:
                        # If attempt has answers but is not completed, mark it as completed and calculate score
                        score = attempt.get('score')
                        is_completed = attempt.get('is_completed', False)
                        
                        if answer_count > 0 and not is_completed:
                            from utils.exam_helpers import calculate_score
                            from datetime import datetime, timezone
                            
                            score = calculate_score(attempt['id'])
                            
                            if score is not None:
                                end_time = attempt.get('end_time')
                                if isinstance(end_time, str):
                                    try:
                                        end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                                    except:
                                        end_time = datetime.now(timezone.utc)
                                elif end_time is None:
                                    end_time = datetime.now(timezone.utc)
                                
                                updated = ExamAttempt.update(
                                    attempt_id=attempt['id'],
                                    end_time=end_time,
                                    score=score,
                                    is_completed=True
                                )
                                if updated:
                                    score = updated.get('score', score)
                                    is_completed = True
                        elif is_completed and (score is None or score == '' or score == 'None'):
                            # Recalculate score for completed attempts with null score
                            from utils.exam_helpers import calculate_score
                            score = calculate_score(attempt['id'])
                            
                            if score is not None:
                                # Update the attempt with the calculated score
                                from datetime import datetime, timezone
                                end_time = attempt.get('end_time')
                                if isinstance(end_time, str):
                                    try:
                                        end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                                    except:
                                        end_time = datetime.now(timezone.utc)
                                elif end_time is None:
                                    end_time = datetime.now(timezone.utc)
                                
                                updated = ExamAttempt.update(
                                    attempt_id=attempt['id'],
                                    end_time=end_time,
                                    score=score,
                                    is_completed=True
                                )
                                if updated:
                                    score = updated.get('score', score)
                        
                        exam['attempt'] = {
                            'score': score,
                            'is_completed': is_completed,
                            'start_time': attempt['start_time'],
                            'end_time': attempt['end_time']
                        }
                
                exam_list.append(exam)
            except Exception as e:
                continue  # Skip this exam and continue with others
        
        return jsonify(exam_list), 200
    except Exception as e:
        return jsonify({'error': f'Sınavlar yüklenirken hata oluştu: {str(e)}'}), 500

@student_bp.route('/exam/<int:exam_id>/start', methods=['POST'])
@require_role('student')
def start_exam(exam_id):
    """Start an exam attempt"""
    # Get student by user_id
    student = Student.get_by_user_id(request.user_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    # Get exam
    exam = Exam.get_by_id(exam_id)
    if not exam:
        return jsonify({'error': 'Exam not found'}), 404
    
    # Check if student is enrolled in the course
    enrollments = Enrollment.get_by_student(student['id'])
    enrolled_course_ids = [e['course_id'] for e in enrollments]
    
    if exam['course_id'] not in enrolled_course_ids:
        return jsonify({'error': 'Not enrolled in this course'}), 403
    
    # Check if exam is available (between start_time and end_time)
    now = datetime.utcnow()
    start_time = exam['start_time']
    end_time = exam['end_time']
    
    # Parse datetime strings if needed
    if isinstance(start_time, str):
        if start_time.endswith('Z'):
            start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        else:
            start_time = datetime.fromisoformat(start_time)
            if start_time.tzinfo is None:
                from datetime import timezone
                start_time = start_time.replace(tzinfo=timezone.utc)
    
    if isinstance(end_time, str):
        if end_time.endswith('Z'):
            end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        else:
            end_time = datetime.fromisoformat(end_time)
            if end_time.tzinfo is None:
                from datetime import timezone
                end_time = end_time.replace(tzinfo=timezone.utc)
    
    # Make now timezone-aware if needed
    if now.tzinfo is None:
        from datetime import timezone
        now = now.replace(tzinfo=timezone.utc)
    
    if now < start_time:
        return jsonify({
            'error': f'Sınav henüz başlamadı. Başlangıç zamanı: {start_time.strftime("%Y-%m-%d %H:%M")}'
        }), 400
    
    if now > end_time:
        return jsonify({
            'error': f'Sınav süresi doldu. Bitiş zamanı: {end_time.strftime("%Y-%m-%d %H:%M")}'
        }), 400
    
    # Check if student has already completed the exam
    existing_attempt = ExamAttempt.get_by_student_and_exam(student['id'], exam_id)
    if existing_attempt and existing_attempt.get('is_completed', False):
        return jsonify({'error': 'You have already completed this exam'}), 400
    
    # Check if exam has at least 5 questions (double check for security)
    question_count = Question.count_by_exam(exam_id)
    if question_count < 5:
        return jsonify({'error': 'Sınavda en az 5 soru bulunmalıdır. Sınav başlatılamaz.'}), 400
    
    # Get 5 random questions from the question pool
    from utils.exam_helpers import get_random_questions
    questions = get_random_questions(exam_id, count=5)
    
    try:
        # If there's an incomplete attempt, use it; otherwise create a new one
        if existing_attempt and not existing_attempt.get('is_completed', False):
            attempt = existing_attempt
            # Get questions for this attempt from answers
            with get_db_cursor() as (conn, cur):
                cur.execute('''
                    SELECT DISTINCT q.id, q.exam_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.option_e, q.correct_answer
                    FROM questions q
                    INNER JOIN answers a ON q.id = a.question_id
                    WHERE a.attempt_id = %s
                    ORDER BY q.id
                ''', (attempt['id'],))
                existing_questions = cur.fetchall()
                if existing_questions and len(existing_questions) > 0:
                    questions = [dict(q) for q in existing_questions]
                # If no answers exist yet, use the new random questions
        else:
            # Create new exam attempt
            attempt = ExamAttempt.create(student['id'], exam_id)
            if not attempt:
                return jsonify({'error': 'Failed to create exam attempt'}), 500
        
        return jsonify({
            'attempt_id': attempt['id'],
            'exam': exam,
            'questions': questions,
            'duration_minutes': exam['duration_minutes'],
            'start_time': attempt.get('start_time')
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@student_bp.route('/exam/<int:exam_id>/submit', methods=['POST'])
@require_role('student')
def submit_exam(exam_id):
    """Submit exam answers"""
    data = request.get_json()
    
    if not data or 'answers' not in data:
        return jsonify({'error': 'Answers are required'}), 400
    
    # Get student by user_id
    student = Student.get_by_user_id(request.user_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    # Get exam attempt
    with get_db_cursor() as (conn, cur):
        cur.execute('''
            SELECT id, student_id, exam_id, start_time, end_time, score, is_completed
            FROM exam_attempts 
            WHERE student_id = %s AND exam_id = %s AND is_completed = FALSE
        ''', (student['id'], exam_id))
        attempt_result = cur.fetchone()
    
    if not attempt_result:
        return jsonify({'error': 'No active exam attempt found'}), 404
    
    attempt = dict(attempt_result)
    
    try:
        # Save answers
        for answer_data in data['answers']:
            Answer.create(
                attempt_id=attempt['id'],
                question_id=answer_data['question_id'],
                selected_answer=answer_data['selected_answer'].upper()
            )
        
        # Calculate score
        score = calculate_score(attempt['id'])
        
        # Update attempt
        updated_attempt = ExamAttempt.update(
            attempt_id=attempt['id'],
            end_time=datetime.utcnow(),
            score=score,
            is_completed=True
        )
        
        # Get exam average
        exam_average = get_exam_average(exam_id)
        
        return jsonify({
            'score': score,
            'exam_average': exam_average,
            'attempt': updated_attempt
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@student_bp.route('/exam/<int:exam_id>/result', methods=['GET'])
@require_role('student')
def get_exam_result(exam_id):
    """Get exam result"""
    # Get student by user_id
    student = Student.get_by_user_id(request.user_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    # Get exam attempt
    with get_db_cursor() as (conn, cur):
        cur.execute('''
            SELECT id, student_id, exam_id, start_time, end_time, score, is_completed
            FROM exam_attempts 
            WHERE student_id = %s AND exam_id = %s AND is_completed = TRUE
        ''', (student['id'], exam_id))
        attempt_result = cur.fetchone()
    
    if not attempt_result:
        return jsonify({'error': 'No completed exam attempt found'}), 404
    
    attempt = dict(attempt_result)
    if attempt.get('start_time'):
        attempt['start_time'] = attempt['start_time'].isoformat()
    if attempt.get('end_time'):
        attempt['end_time'] = attempt['end_time'].isoformat() if attempt['end_time'] else None
    
    # Get exam average
    exam_average = get_exam_average(exam_id)
    
    # Get exam details
    exam = Exam.get_by_id(exam_id)
    
    return jsonify({
        'score': attempt['score'],
        'exam_average': exam_average,
        'exam': exam,
        'attempt': attempt
    }), 200
