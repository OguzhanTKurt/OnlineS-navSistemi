from flask import Blueprint, request, jsonify
from models import User, Student, Instructor, DepartmentHead
from utils.auth import generate_token

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login endpoint for all user types"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400
    
    username = data['username']
    password = data['password']
    
    # Find user
    user = User.get_by_username(username)
    
    if not user or not User.check_password(user['password_hash'], password):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # Generate token
    token = generate_token(user['id'], user['role'])
    
    # Get role-specific data
    role_data = {}
    if user['role'] == 'student':
        student = Student.get_by_user_id(user['id'])
        if student:
            role_data = {'student_id': student['id'], 'student_number': student['student_number']}
    elif user['role'] == 'instructor':
        instructor = Instructor.get_by_user_id(user['id'])
        if instructor:
            role_data = {'instructor_id': instructor['id'], 'department': instructor['department']}
    elif user['role'] == 'department_head':
        dept_head = DepartmentHead.get_by_user_id(user['id'])
        if dept_head:
            role_data = {'department_head_id': dept_head['id'], 'department': dept_head['department']}
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'role': user['role'],
            'full_name': user['full_name'],
            **role_data
        }
    }), 200

