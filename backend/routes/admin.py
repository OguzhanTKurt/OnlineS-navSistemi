from flask import Blueprint, request, jsonify
from models import User, Student, Instructor, DepartmentHead, Course, Enrollment
from utils.auth import require_role

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/students', methods=['GET'])
@require_role('admin')
def get_students():
    """Get all students"""
    students = Student.get_all()
    return jsonify(students), 200

@admin_bp.route('/students', methods=['POST'])
@require_role('admin')
def create_student():
    """Create a new student"""
    data = request.get_json()
    
    required_fields = ['username', 'password', 'full_name', 'student_number']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if username already exists
    existing_user = User.get_by_username(data['username'])
    if existing_user:
        return jsonify({'error': 'Username already exists'}), 400
    
    # Check if student_number already exists
    existing_student = Student.get_by_student_number(data['student_number'])
    if existing_student:
        return jsonify({'error': 'Student number already exists'}), 400
    
    try:
        # Create user
        user = User.create(
            username=data['username'],
            password=data['password'],
            role='student',
            full_name=data['full_name']
        )
        
        if not user:
            # User.create returns None if username exists or other error
            # Double check to give better error message
            existing_user = User.get_by_username(data['username'])
            if existing_user:
                return jsonify({'error': 'Username already exists'}), 400
            return jsonify({'error': 'Failed to create user. Please try again.'}), 500
        
        # Create student
        student = Student.create(
            user_id=user['id'],
            student_number=data['student_number']
        )
        
        if not student:
            # Student.create returns None if student_number exists or other error
            # Double check to give better error message
            existing_student = Student.get_by_student_number(data['student_number'])
            if existing_student:
                # Rollback: Delete the user we just created
                User.delete(user['id'])
                return jsonify({'error': 'Student number already exists'}), 400
            return jsonify({'error': 'Failed to create student. Please try again.'}), 500
        
        # Get full student data
        student_data = Student.get_by_id(student['id'])
        return jsonify(student_data), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/students/<int:student_id>', methods=['DELETE'])
@require_role('admin')
def delete_student(student_id):
    """Delete a student"""
    student = Student.get_by_id(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    try:
        # CASCADE DELETE will handle user deletion
        if Student.delete(student_id):
            return jsonify({'message': 'Student deleted successfully'}), 200
        else:
            return jsonify({'error': 'Failed to delete student'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/instructors', methods=['GET'])
@require_role('admin')
def get_instructors():
    """Get all instructors"""
    instructors = Instructor.get_all()
    return jsonify(instructors), 200

@admin_bp.route('/instructors', methods=['POST'])
@require_role('admin')
def create_instructor():
    """Create a new instructor"""
    data = request.get_json()
    
    required_fields = ['username', 'password', 'full_name', 'department']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if username already exists
    existing_user = User.get_by_username(data['username'])
    if existing_user:
        return jsonify({'error': 'Username already exists'}), 400
    
    try:
        # Create user
        user = User.create(
            username=data['username'],
            password=data['password'],
            role='instructor',
            full_name=data['full_name']
        )
        
        if not user:
            # Double check to give better error message
            existing_user = User.get_by_username(data['username'])
            if existing_user:
                return jsonify({'error': 'Username already exists'}), 400
            return jsonify({'error': 'Failed to create user. Please try again.'}), 500
        
        # Create instructor
        instructor = Instructor.create(
            user_id=user['id'],
            department=data['department']
        )
        
        if not instructor:
            return jsonify({'error': 'Failed to create instructor'}), 500
        
        # Get full instructor data
        instructor_data = Instructor.get_by_id(instructor['id'])
        return jsonify(instructor_data), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/instructors/<int:instructor_id>', methods=['DELETE'])
@require_role('admin')
def delete_instructor(instructor_id):
    """Delete an instructor"""
    instructor = Instructor.get_by_id(instructor_id)
    if not instructor:
        return jsonify({'error': 'Instructor not found'}), 404
    
    try:
        # CASCADE DELETE will handle user deletion
        if Instructor.delete(instructor_id):
            return jsonify({'message': 'Instructor deleted successfully'}), 200
        else:
            return jsonify({'error': 'Failed to delete instructor'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/department-heads', methods=['POST'])
@require_role('admin')
def create_department_head():
    """Create a new department head"""
    data = request.get_json()
    
    required_fields = ['username', 'password', 'full_name', 'department']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if username already exists
    existing_user = User.get_by_username(data['username'])
    if existing_user:
        return jsonify({'error': 'Username already exists'}), 400
    
    try:
        # Create user
        user = User.create(
            username=data['username'],
            password=data['password'],
            role='department_head',
            full_name=data['full_name']
        )
        
        if not user:
            # Double check to give better error message
            existing_user = User.get_by_username(data['username'])
            if existing_user:
                return jsonify({'error': 'Username already exists'}), 400
            return jsonify({'error': 'Failed to create user. Please try again.'}), 500
        
        # Create department head
        dept_head = DepartmentHead.create(
            user_id=user['id'],
            department=data['department']
        )
        
        if not dept_head:
            return jsonify({'error': 'Failed to create department head'}), 500
        
        # Get full department head data
        dept_head_data = DepartmentHead.get_by_user_id(user['id'])
        return jsonify(dept_head_data), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/courses', methods=['GET'])
@require_role('admin')
def get_courses():
    """Get all courses"""
    courses = Course.get_all()
    return jsonify(courses), 200

@admin_bp.route('/courses', methods=['POST'])
@require_role('admin')
def create_course():
    """Create a new course"""
    data = request.get_json()
    
    required_fields = ['code', 'name', 'instructor_id']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if instructor exists
    if not Instructor.get_by_id(data['instructor_id']):
        return jsonify({'error': 'Instructor not found'}), 404
    
    try:
        course = Course.create(
            code=data['code'],
            name=data['name'],
            instructor_id=data['instructor_id']
        )
        
        if not course:
            return jsonify({'error': 'Failed to create course (code might already exist)'}), 500
        
        return jsonify(course), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/courses/<int:course_id>', methods=['DELETE'])
@require_role('admin')
def delete_course(course_id):
    """Delete a course"""
    course = Course.get_by_id(course_id)
    if not course:
        return jsonify({'error': 'Course not found'}), 404
    
    try:
        if Course.delete(course_id):
            return jsonify({'message': 'Course deleted successfully'}), 200
        else:
            return jsonify({'error': 'Failed to delete course'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/enrollments', methods=['GET'])
@require_role('admin')
def get_enrollments():
    """Get all enrollments"""
    enrollments = Enrollment.get_all()
    return jsonify(enrollments), 200

@admin_bp.route('/students/<int:student_id>/courses', methods=['GET'])
@require_role('admin')
def get_student_courses(student_id):
    """Get courses that a student is enrolled in"""
    student = Student.get_by_id(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    enrollments = Enrollment.get_by_student(student_id)
    course_ids = [e['course_id'] for e in enrollments]
    return jsonify(course_ids), 200

@admin_bp.route('/enrollments', methods=['POST'])
@require_role('admin')
def create_enrollment():
    """Enroll a student in a course"""
    data = request.get_json()
    
    required_fields = ['student_id', 'course_id']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if student exists
    if not Student.get_by_id(data['student_id']):
        return jsonify({'error': 'Student not found'}), 404
    
    # Check if course exists
    if not Course.get_by_id(data['course_id']):
        return jsonify({'error': 'Course not found'}), 404
    
    try:
        enrollment = Enrollment.create(
            student_id=data['student_id'],
            course_id=data['course_id']
        )
        
        if not enrollment:
            return jsonify({'error': 'Failed to create enrollment (might already exist)'}), 500
        
        return jsonify(enrollment), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/enrollments/<int:enrollment_id>', methods=['DELETE'])
@require_role('admin')
def delete_enrollment(enrollment_id):
    """Delete an enrollment"""
    try:
        if Enrollment.delete(enrollment_id):
            return jsonify({'message': 'Enrollment deleted successfully'}), 200
        else:
            return jsonify({'error': 'Enrollment not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users', methods=['GET'])
@require_role('admin')
def get_users():
    """Get all users"""
    try:
        users = User.get_all()
        return jsonify(users), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@require_role('admin')
def update_user(user_id):
    """Update a user"""
    data = request.get_json()
    
    # Check if user exists
    user = User.get_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check if username is being changed and if it already exists
    if 'username' in data and data['username'] != user['username']:
        existing_user = User.get_by_username(data['username'])
        if existing_user:
            return jsonify({'error': 'Username already exists'}), 400
    
    try:
        updated_user = User.update(
            user_id=user_id,
            username=data.get('username'),
            password=data.get('password'),
            full_name=data.get('full_name'),
            role=data.get('role')
        )
        
        if not updated_user:
            return jsonify({'error': 'Failed to update user'}), 500
        
        return jsonify(updated_user), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@require_role('admin')
def delete_user(user_id):
    """Delete a user"""
    user = User.get_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    try:
        # Get username before deletion for verification
        username = user['username']
        
        # CASCADE DELETE will handle related records
        if User.delete(user_id):
            # Verify deletion
            verify_user = User.get_by_username(username)
            if verify_user:
                return jsonify({'error': 'User deletion may have failed. Please check database.'}), 500
            return jsonify({'message': 'User deleted successfully'}), 200
        else:
            return jsonify({'error': 'Failed to delete user'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/check-username/<username>', methods=['GET'])
@require_role('admin')
def check_username(username):
    """Check if username exists (for debugging)"""
    user = User.get_by_username(username)
    if user:
        return jsonify({
            'exists': True,
            'user_id': user['id'],
            'username': user['username'],
            'role': user['role'],
            'full_name': user['full_name']
        }), 200
    else:
        return jsonify({'exists': False}), 200