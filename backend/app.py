from flask import Flask
from flask_cors import CORS
from config import Config
from models import init_db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize CORS
    CORS(app)
    
    # Initialize database tables
    init_db()
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.admin import admin_bp
    from routes.instructor import instructor_bp
    from routes.student import student_bp
    from routes.department_head import department_head_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(instructor_bp, url_prefix='/api/instructor')
    app.register_blueprint(student_bp, url_prefix='/api/student')
    app.register_blueprint(department_head_bp, url_prefix='/api/department-head')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)

