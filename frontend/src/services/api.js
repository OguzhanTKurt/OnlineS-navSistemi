import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
};

// Admin API
export const adminAPI = {
  getStudents: () => api.get('/admin/students'),
  createStudent: (data) => api.post('/admin/students', data),
  deleteStudent: (id) => api.delete(`/admin/students/${id}`),
  
  getInstructors: () => api.get('/admin/instructors'),
  createInstructor: (data) => api.post('/admin/instructors', data),
  deleteInstructor: (id) => api.delete(`/admin/instructors/${id}`),
  
  getDepartmentHeads: () => api.get('/admin/department-heads'),
  createDepartmentHead: (data) => api.post('/admin/department-heads', data),
  
  getCourses: () => api.get('/admin/courses'),
  createCourse: (data) => api.post('/admin/courses', data),
  deleteCourse: (id) => api.delete(`/admin/courses/${id}`),
  
  getEnrollments: () => api.get('/admin/enrollments'),
  createEnrollment: (data) => api.post('/admin/enrollments', data),
  deleteEnrollment: (id) => api.delete(`/admin/enrollments/${id}`),
  
  getStudentCourses: (studentId) => api.get(`/admin/students/${studentId}/courses`),
  
  getUsers: () => api.get('/admin/users'),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
};

// Instructor API
export const instructorAPI = {
  getCourses: () => api.get('/instructor/courses'),
  getCourseStudents: (courseId) => api.get(`/instructor/courses/${courseId}/students`),
  getCourseExams: (courseId) => api.get(`/instructor/courses/${courseId}/exams`),
  
  createExam: (data) => api.post('/instructor/exams', data),
  deleteExam: (id) => api.delete(`/instructor/exams/${id}`),
  
  getExamQuestions: (examId) => api.get(`/instructor/exams/${examId}/questions`),
  createQuestion: (data) => api.post('/instructor/questions', data),
  deleteQuestion: (id) => api.delete(`/instructor/questions/${id}`),
  
  getExamResults: (examId) => api.get(`/instructor/exams/${examId}/results`),
};

// Student API
export const studentAPI = {
  getCourses: () => api.get('/student/courses'),
  getCourseExams: (courseId) => api.get(`/student/courses/${courseId}/exams`),
  
  startExam: (examId) => api.post(`/student/exam/${examId}/start`),
  submitExam: (examId, answers) => api.post(`/student/exam/${examId}/submit`, { answers }),
  
  getExamResult: (examId) => api.get(`/student/exam/${examId}/result`),
};

// Department Head API
export const departmentHeadAPI = {
  getCourses: () => api.get('/department-head/courses'),
  getStudents: () => api.get('/department-head/students'),
  getStatistics: () => api.get('/department-head/statistics'),
  getCourseDetails: (courseId) => api.get(`/department-head/courses/${courseId}/details`),
};

export default api;

