import random
from models import Question, ExamAttempt, Answer, Exam, Enrollment, get_db_cursor
from datetime import datetime

def get_random_questions(exam_id, count=5):
    """Get random questions from exam question pool (always returns 5 questions)"""
    questions = Question.get_by_exam(exam_id, include_answer=False)
    
    if len(questions) < count:
        # If there are fewer questions than requested, return all
        return questions
    
    # Return exactly 5 random questions
    return random.sample(questions, count)

def calculate_score(attempt_id):
    """Calculate score for an exam attempt (always based on 5 questions)"""
    attempt = ExamAttempt.get_by_id(attempt_id)
    if not attempt:
        return None
    
    # Get student's answers (these are the 5 questions they were given)
    answers = Answer.get_by_attempt(attempt_id)
    
    if not answers:
        return 0
    
    # Get the questions that the student answered (from their attempt)
    # We need to get the correct answers for these specific questions
    question_ids = [answer['question_id'] for answer in answers]
    
    if not question_ids:
        return 0
    
    # Get correct answers for these specific questions
    with get_db_cursor() as (conn, cur):
        placeholders = ','.join(['%s'] * len(question_ids))
        cur.execute(f'''
            SELECT id, correct_answer
            FROM questions 
            WHERE id IN ({placeholders})
        ''', question_ids)
        questions = cur.fetchall()
    
    # Create a dict for quick lookup
    question_dict = {q['id']: q['correct_answer'] for q in questions}
    
    # Calculate correct answers
    correct_count = 0
    total_questions = len(answers)
    
    for answer in answers:
        correct_answer = question_dict.get(answer['question_id'])
        selected = answer.get('selected_answer', '').upper() if answer.get('selected_answer') else ''
        correct = correct_answer.upper() if correct_answer else ''
        
        if correct_answer and selected == correct:
            correct_count += 1
    
    # Calculate score as percentage (always out of 5 questions)
    if total_questions > 0:
        score = (correct_count / total_questions) * 100
        final_score = round(score, 2)
        return final_score
    else:
        return 0

def get_exam_average(exam_id):
    """Calculate average score for an exam"""
    attempts = ExamAttempt.get_by_exam(exam_id)
    
    if not attempts:
        return 0
    
    scores = [attempt['score'] for attempt in attempts if attempt['score'] is not None]
    
    if not scores:
        return 0
    
    return round(sum(scores) / len(scores), 2)

def is_exam_available(exam):
    """Check if exam is currently available"""
    from datetime import timezone
    
    now = datetime.now(timezone.utc)  # Always use UTC, timezone-aware
    
    # Parse ISO format strings to datetime if needed
    start_time_str = exam['start_time']
    end_time_str = exam['end_time']
    
    # Parse start_time
    if isinstance(start_time_str, str):
        # String format - parse it
        try:
            if start_time_str.endswith('Z'):
                start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
            elif '+' in start_time_str or start_time_str.count('-') > 2:
                # Has timezone info
                start_time = datetime.fromisoformat(start_time_str)
                if start_time.tzinfo is None:
                    start_time = start_time.replace(tzinfo=timezone.utc)
            else:
                # No timezone, parse and add UTC
                start_time = datetime.fromisoformat(start_time_str)
                if start_time.tzinfo is None:
                    start_time = start_time.replace(tzinfo=timezone.utc)
        except (ValueError, AttributeError) as e:
            # Fallback: try parsing as is
            try:
                start_time = datetime.fromisoformat(start_time_str)
                if start_time.tzinfo is None:
                    start_time = start_time.replace(tzinfo=timezone.utc)
            except:
                # Last resort: assume it's a naive datetime string
                start_time = datetime.fromisoformat(start_time_str.replace('T', ' ').split('.')[0])
                start_time = start_time.replace(tzinfo=timezone.utc)
    else:
        # Already datetime object
        start_time = start_time_str
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        else:
            start_time = start_time.astimezone(timezone.utc)
    
    # Parse end_time
    if isinstance(end_time_str, str):
        try:
            if end_time_str.endswith('Z'):
                end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
            elif '+' in end_time_str or end_time_str.count('-') > 2:
                end_time = datetime.fromisoformat(end_time_str)
                if end_time.tzinfo is None:
                    end_time = end_time.replace(tzinfo=timezone.utc)
            else:
                end_time = datetime.fromisoformat(end_time_str)
                if end_time.tzinfo is None:
                    end_time = end_time.replace(tzinfo=timezone.utc)
        except (ValueError, AttributeError) as e:
            try:
                end_time = datetime.fromisoformat(end_time_str)
                if end_time.tzinfo is None:
                    end_time = end_time.replace(tzinfo=timezone.utc)
            except:
                end_time = datetime.fromisoformat(end_time_str.replace('T', ' ').split('.')[0])
                end_time = end_time.replace(tzinfo=timezone.utc)
    else:
        end_time = end_time_str
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)
        else:
            end_time = end_time.astimezone(timezone.utc)
    
    # All times should be UTC timezone-aware now
    # Compare: start_time <= now <= end_time
    is_available = start_time <= now <= end_time
    
    return is_available

def has_student_attempted(student_id, exam_id):
    """Check if student has already completed the exam (not just started)"""
    attempt = ExamAttempt.get_by_student_and_exam(student_id, exam_id)
    if attempt is None:
        return False
    # Only return True if the attempt is completed
    return attempt.get('is_completed', False) is True

def calculate_course_grade(student_id, course_id):
    """Calculate final course grade based on exam weights"""
    # Check if student is enrolled
    with get_db_cursor() as (conn, cur):
        cur.execute('''
            SELECT id FROM enrollments 
            WHERE student_id = %s AND course_id = %s
        ''', (student_id, course_id))
        enrollment = cur.fetchone()
    
    if not enrollment:
        return None
    
    # Get all exams for the course
    exams = Exam.get_by_course(course_id)
    
    if not exams:
        return None
    
    total_grade = 0
    total_weight = 0
    
    for exam in exams:
        # Get student's attempt for this exam
        with get_db_cursor() as (conn, cur):
            cur.execute('''
                SELECT score FROM exam_attempts 
                WHERE student_id = %s AND exam_id = %s AND is_completed = TRUE
            ''', (student_id, exam['id']))
            attempt = cur.fetchone()
        
        if attempt and attempt['score'] is not None:
            weighted_score = (attempt['score'] * exam['weight_percentage']) / 100
            total_grade += weighted_score
            total_weight += exam['weight_percentage']
    
    if total_weight == 0:
        return None
    
    return round(total_grade, 2)
