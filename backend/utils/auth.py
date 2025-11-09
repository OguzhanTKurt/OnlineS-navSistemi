import jwt
from functools import wraps
from flask import request, jsonify
from datetime import datetime, timedelta
from config import Config

def generate_token(user_id, role):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.utcnow() + Config.JWT_ACCESS_TOKEN_EXPIRES
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')
    return token

def decode_token(token):
    """Decode JWT token"""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        # Decode token
        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'Token is invalid or expired'}), 401
        
        # Add user info to request
        request.user_id = payload['user_id']
        request.user_role = payload['role']
        
        return f(*args, **kwargs)
    
    return decorated_function

def require_role(*allowed_roles):
    """Decorator to require specific role(s)"""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs):
            if request.user_role not in allowed_roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

