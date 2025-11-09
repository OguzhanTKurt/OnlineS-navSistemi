import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { logout } from '../utils/auth';
import { translateError } from '../utils/errorMessages';
import './Dashboard.css';

function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '', password: '', full_name: '', role: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  // Form states
  const [studentForm, setStudentForm] = useState({
    username: '', password: '', full_name: '', student_number: ''
  });
  const [instructorForm, setInstructorForm] = useState({
    username: '', password: '', full_name: '', department: ''
  });
  const [courseForm, setCourseForm] = useState({
    code: '', name: '', instructor_id: ''
  });
  const [enrollmentForm, setEnrollmentForm] = useState({
    student_id: '', course_id: ''
  });
  const [studentEnrolledCourses, setStudentEnrolledCourses] = useState([]);
  const [formErrors, setFormErrors] = useState({
    student: {},
    instructor: {},
    course: {},
    enrollment: {}
  });

  useEffect(() => {
    // Sayfa ilk yüklendiğinde tüm istatistikleri yükle
    loadAllStats();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (enrollmentForm.student_id) {
      loadStudentCourses(enrollmentForm.student_id);
    } else {
      setStudentEnrolledCourses([]);
    }
  }, [enrollmentForm.student_id]);

  // Tüm istatistikleri yükle (bilgi kartları için)
  const loadAllStats = async () => {
    try {
      const [studentsRes, instructorsRes, coursesRes, enrollmentsRes] = await Promise.all([
        adminAPI.getStudents(),
        adminAPI.getInstructors(),
        adminAPI.getCourses(),
        adminAPI.getEnrollments()
      ]);
      setStudents(studentsRes.data);
      setInstructors(instructorsRes.data);
      setCourses(coursesRes.data);
      setEnrollments(enrollmentsRes.data);
    } catch (err) {
      console.error('Stats yüklenirken hata:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'students') {
        const res = await adminAPI.getStudents();
        setStudents(res.data);
      } else if (activeTab === 'instructors') {
        const res = await adminAPI.getInstructors();
        setInstructors(res.data);
      } else if (activeTab === 'courses') {
        const [coursesRes, instructorsRes] = await Promise.all([
          adminAPI.getCourses(),
          adminAPI.getInstructors()
        ]);
        setCourses(coursesRes.data);
        setInstructors(instructorsRes.data);
      } else if (activeTab === 'enrollments') {
        const [enrollmentsRes, studentsRes, coursesRes] = await Promise.all([
          adminAPI.getEnrollments(),
          adminAPI.getStudents(),
          adminAPI.getCourses()
        ]);
        setEnrollments(enrollmentsRes.data);
        setStudents(studentsRes.data);
        setCourses(coursesRes.data);
      } else if (activeTab === 'users') {
        const res = await adminAPI.getUsers();
        setUsers(res.data);
        setFilteredUsers(res.data);
      }
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Veri yüklenirken hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadStudentCourses = async (studentId) => {
    try {
      const res = await adminAPI.getStudentCourses(studentId);
      setStudentEnrolledCourses(res.data);
    } catch (err) {
      console.error('Failed to load student courses:', err);
      setStudentEnrolledCourses([]);
    }
  };

  const validateStudentForm = () => {
    const errors = {};
    if (!studentForm.username || studentForm.username.trim().length < 3) {
      errors.username = 'Kullanıcı adı en az 3 karakter olmalıdır';
    }
    if (!studentForm.password || studentForm.password.length < 6) {
      errors.password = 'Şifre en az 6 karakter olmalıdır';
    }
    if (!studentForm.full_name || studentForm.full_name.trim().length < 3) {
      errors.full_name = 'Ad soyad en az 3 karakter olmalıdır';
    }
    if (!studentForm.student_number || studentForm.student_number.trim().length < 3) {
      errors.student_number = 'Öğrenci numarası gereklidir';
    }
    return errors;
  };

  const createStudent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormErrors({ ...formErrors, student: {} });
    
    const validationErrors = validateStudentForm();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors({ ...formErrors, student: validationErrors });
      setError('Lütfen formdaki hataları düzeltin');
      return;
    }
    
    try {
      await adminAPI.createStudent(studentForm);
      setSuccess('Öğrenci başarıyla oluşturuldu');
      setStudentForm({ username: '', password: '', full_name: '', student_number: '' });
      setFormErrors({ ...formErrors, student: {} });
      loadAllStats();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Öğrenci oluşturulamadı'));
    }
  };

  const createInstructor = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await adminAPI.createInstructor(instructorForm);
      setSuccess('Öğretim üyesi başarıyla oluşturuldu');
      setInstructorForm({ username: '', password: '', full_name: '', department: '' });
      loadAllStats();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Öğretim üyesi oluşturulamadı'));
    }
  };

  const createCourse = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await adminAPI.createCourse(courseForm);
      setSuccess('Ders başarıyla oluşturuldu');
      setCourseForm({ code: '', name: '', instructor_id: '' });
      loadAllStats();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Ders oluşturulamadı'));
    }
  };

  const createEnrollment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await adminAPI.createEnrollment(enrollmentForm);
      setSuccess('Kayıt başarıyla oluşturuldu');
      setEnrollmentForm({ student_id: '', course_id: '' });
      setStudentEnrolledCourses([]);
      loadAllStats();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Kayıt oluşturulamadı'));
    }
  };

  const deleteStudent = async (id) => {
    if (!window.confirm('Bu öğrenciyi silmek istediğinizden emin misiniz?')) return;
    try {
      await adminAPI.deleteStudent(id);
      setSuccess('Öğrenci başarıyla silindi');
      loadAllStats();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Öğrenci silinemedi'));
    }
  };

  const deleteInstructor = async (id) => {
    if (!window.confirm('Bu öğretim üyesini silmek istediğinizden emin misiniz?')) return;
    try {
      await adminAPI.deleteInstructor(id);
      setSuccess('Öğretim üyesi başarıyla silindi');
      loadAllStats();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Öğretim üyesi silinemedi'));
    }
  };

  const deleteCourse = async (id) => {
    if (!window.confirm('Bu dersi silmek istediğinizden emin misiniz?')) return;
    try {
      await adminAPI.deleteCourse(id);
      setSuccess('Ders başarıyla silindi');
      loadAllStats();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Ders silinemedi'));
    }
  };

  const deleteEnrollment = async (id) => {
    if (!window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
      await adminAPI.deleteEnrollment(id);
      setSuccess('Kayıt başarıyla silindi');
      loadAllStats();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Kayıt silinemedi'));
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) return;
    try {
      await adminAPI.deleteUser(id);
      setSuccess('Kullanıcı başarıyla silindi');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Kullanıcı silinemedi'));
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      password: '',
      full_name: user.full_name,
      role: user.role
    });
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditForm({ username: '', password: '', full_name: '', role: '' });
  };

  const updateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const updateData = {
        username: editForm.username,
        full_name: editForm.full_name,
        role: editForm.role
      };
      
      // Only include password if it's provided
      if (editForm.password && editForm.password.trim() !== '') {
        if (editForm.password.length < 6) {
          setError('Şifre en az 6 karakter olmalıdır');
          return;
        }
        updateData.password = editForm.password;
      }
      
      await adminAPI.updateUser(editingUser.id, updateData);
      setSuccess('Kullanıcı başarıyla güncellendi');
      closeEditModal();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Kullanıcı güncellenemedi'));
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      if (roleFilter === 'all') {
        setFilteredUsers(users);
      } else {
        setFilteredUsers(users.filter(u => u.role === roleFilter));
      }
    }
  }, [roleFilter, users, activeTab]);

  // Header Component
  const renderHeader = () => {
    return React.createElement('div', { className: 'dashboard-header' },
      React.createElement('div', { className: 'header-content' },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } },
          React.createElement('img', { 
            src: '/logo.png', 
            alt: 'Logo',
            style: { height: '90px', width: 'auto' }
          })
        ),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', lineHeight: '1.2', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 'auto' } },
          React.createElement('span', { style: { fontSize: '18px', fontWeight: '700', color: '#000', textAlign: 'center', fontFamily: '"Roboto", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif', display: 'block', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)', letterSpacing: '0.5px', whiteSpace: 'nowrap' } }, 'KOCAELİ SAĞLIK VE TEKNOLOJİ ÜNİVERSİTESİ'),
          React.createElement('span', { style: { fontSize: '18px', fontWeight: '700', color: '#000', fontFamily: '"Roboto", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif', textAlign: 'center', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)', letterSpacing: '0.3px', whiteSpace: 'nowrap' } }, 'ONLİNE SINAV SİSTEMİ')
        ),
        React.createElement('div', { className: 'user-info' },
          React.createElement('div', { className: 'user-details' },
            React.createElement('span', { className: 'user-role' }, 'Admin'),
            React.createElement('span', { className: 'user-name' }, user?.full_name === 'System Administrator' ? 'Sistem Yöneticisi' : user?.full_name)
          ),
          React.createElement('button', { 
            className: 'btn btn-secondary', 
            onClick: handleLogout 
          }, '👋 Çıkış Yap')
        )
      )
    );
  };

  // Stats Component
  const renderStats = () => {
    return React.createElement('div', { className: 'stats-grid' },
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-icon' }, '👨‍🎓'),
        React.createElement('div', { className: 'stat-content' },
          React.createElement('div', { className: 'stat-value' }, students.length),
          React.createElement('div', { className: 'stat-label' }, 'Toplam Öğrenci')
        )
      ),
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-icon' }, '👨‍🏫'),
        React.createElement('div', { className: 'stat-content' },
          React.createElement('div', { className: 'stat-value' }, instructors.length),
          React.createElement('div', { className: 'stat-label' }, 'Toplam Öğretim Üyesi')
        )
      ),
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-icon' }, '📚'),
        React.createElement('div', { className: 'stat-content' },
          React.createElement('div', { className: 'stat-value' }, courses.length),
          React.createElement('div', { className: 'stat-label' }, 'Toplam Ders')
        )
      ),
      React.createElement('div', { className: 'stat-card' },
        React.createElement('div', { className: 'stat-icon' }, '📝'),
        React.createElement('div', { className: 'stat-content' },
          React.createElement('div', { className: 'stat-value' }, enrollments.length),
          React.createElement('div', { className: 'stat-label' }, 'Toplam Kayıt')
        )
      )
    );
  };

  // Tab Navigation
  const renderTabs = () => {
    const tabs = [
      { id: 'students', label: '👨‍🎓 Öğrenciler' },
      { id: 'instructors', label: '👨‍🏫 Öğretim Üyeleri' },
      { id: 'courses', label: '📚 Dersler' },
      { id: 'enrollments', label: '📝 Kayıtlar' },
      { id: 'users', label: '👥 Kullanıcılar' }
    ];

    return React.createElement('div', { className: 'tabs' },
      tabs.map(tab =>
        React.createElement('button', {
          key: tab.id,
          className: `tab ${activeTab === tab.id ? 'active' : ''}`,
          onClick: () => setActiveTab(tab.id)
        }, tab.label)
      )
    );
  };

  // Students Tab
  const renderStudentsTab = () => {
    return React.createElement('div', null,
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
          React.createElement('h2', null, '➕ Yeni Öğrenci Ekle')
        ),
        React.createElement('form', { onSubmit: createStudent, className: 'card-body' },
          React.createElement('div', { className: 'grid-2' },
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Kullanıcı Adı'),
              React.createElement('input', {
                type: 'text',
                className: `form-control ${formErrors.student.username ? 'error' : ''}`,
                value: studentForm.username,
                onChange: (e) => {
                  setStudentForm({ ...studentForm, username: e.target.value });
                  if (formErrors.student.username) {
                    setFormErrors({ ...formErrors, student: { ...formErrors.student, username: '' } });
                  }
                },
                placeholder: 'örn: student11',
                required: true
              }),
              formErrors.student.username && React.createElement('span', { 
                className: 'form-error' 
              }, formErrors.student.username)
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Şifre'),
              React.createElement('input', {
                type: 'password',
                className: `form-control ${formErrors.student.password ? 'error' : ''}`,
                value: studentForm.password,
                onChange: (e) => {
                  setStudentForm({ ...studentForm, password: e.target.value });
                  if (formErrors.student.password) {
                    setFormErrors({ ...formErrors, student: { ...formErrors.student, password: '' } });
                  }
                },
                placeholder: 'Güçlü bir şifre girin',
                required: true
              }),
              formErrors.student.password && React.createElement('span', { 
                className: 'form-error' 
              }, formErrors.student.password)
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Ad Soyad'),
              React.createElement('input', {
                type: 'text',
                className: `form-control ${formErrors.student.full_name ? 'error' : ''}`,
                value: studentForm.full_name,
                onChange: (e) => {
                  setStudentForm({ ...studentForm, full_name: e.target.value });
                  if (formErrors.student.full_name) {
                    setFormErrors({ ...formErrors, student: { ...formErrors.student, full_name: '' } });
                  }
                },
                placeholder: 'örn: Ahmet Yılmaz',
                required: true
              }),
              formErrors.student.full_name && React.createElement('span', { 
                className: 'form-error' 
              }, formErrors.student.full_name)
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Öğrenci Numarası'),
              React.createElement('input', {
                type: 'text',
                className: `form-control ${formErrors.student.student_number ? 'error' : ''}`,
                value: studentForm.student_number,
                onChange: (e) => {
                  setStudentForm({ ...studentForm, student_number: e.target.value });
                  if (formErrors.student.student_number) {
                    setFormErrors({ ...formErrors, student: { ...formErrors.student, student_number: '' } });
                  }
                },
                placeholder: 'örn: 20210011',
                required: true
              }),
              formErrors.student.student_number && React.createElement('span', { 
                className: 'form-error' 
              }, formErrors.student.student_number)
            )
          ),
          React.createElement('button', { 
            type: 'submit', 
            className: 'btn btn-primary',
            style: { marginTop: '1rem' }
          }, '✅ Öğrenci Oluştur')
        )
      ),

      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
          React.createElement('h2', null, `📋 Öğrenci Listesi (${students.length})`)
        ),
        React.createElement('div', { className: 'card-body' },
          React.createElement('div', { className: 'table-container' },
          React.createElement('table', { className: 'table' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', null, 'Öğrenci No'),
                React.createElement('th', null, 'Ad Soyad'),
                React.createElement('th', null, 'Kullanıcı Adı'),
                React.createElement('th', null, 'İşlemler')
              )
            ),
            React.createElement('tbody', null,
              students.length === 0 ? 
                React.createElement('tr', null,
                  React.createElement('td', { colSpan: 4, style: { textAlign: 'center', padding: '2rem' } },
                    '📭 Henüz öğrenci bulunmuyor'
                  )
                ) :
                students.map(student =>
                  React.createElement('tr', { key: student.id },
                    React.createElement('td', null, student.student_number),
                    React.createElement('td', null, student.full_name),
                    React.createElement('td', null, student.username),
                    React.createElement('td', null,
                      React.createElement('button', {
                        className: 'btn btn-danger btn-sm',
                        onClick: () => deleteStudent(student.id)
                      }, '🗑️ Sil')
                    )
                  )
                )
            )
          )
          )
        )
      )
    );
  };

  // Instructors Tab
  const renderInstructorsTab = () => {
    return React.createElement('div', null,
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
          React.createElement('h2', null, '➕ Yeni Öğretim Üyesi Ekle')
        ),
        React.createElement('form', { onSubmit: createInstructor, className: 'card-body' },
          React.createElement('div', { className: 'grid-2' },
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Kullanıcı Adı'),
              React.createElement('input', {
                type: 'text',
                className: 'form-control',
                value: instructorForm.username,
                onChange: (e) => setInstructorForm({ ...instructorForm, username: e.target.value }),
                placeholder: 'örn: instructor3',
                required: true
              })
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Şifre'),
              React.createElement('input', {
                type: 'password',
                className: 'form-control',
                value: instructorForm.password,
                onChange: (e) => setInstructorForm({ ...instructorForm, password: e.target.value }),
                placeholder: 'Güçlü bir şifre girin',
                required: true
              })
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Ad Soyad'),
              React.createElement('input', {
                type: 'text',
                className: 'form-control',
                value: instructorForm.full_name,
                onChange: (e) => setInstructorForm({ ...instructorForm, full_name: e.target.value }),
                placeholder: 'örn: Prof. Dr. Mehmet Demir',
                required: true
              })
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Bölüm'),
              React.createElement('input', {
                type: 'text',
                className: 'form-control',
                value: instructorForm.department,
                onChange: (e) => setInstructorForm({ ...instructorForm, department: e.target.value }),
                placeholder: 'örn: Bilgisayar Mühendisliği',
                required: true
              })
            )
          ),
          React.createElement('button', { 
            type: 'submit', 
            className: 'btn btn-primary',
            style: { marginTop: '1rem' }
          }, '✅ Öğretim Üyesi Oluştur')
        )
      ),

      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
          React.createElement('h2', null, `📋 Öğretim Üyesi Listesi (${instructors.length})`)
        ),
        React.createElement('div', { className: 'card-body' },
          React.createElement('div', { className: 'table-container' },
          React.createElement('table', { className: 'table' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', null, 'Ad Soyad'),
                React.createElement('th', null, 'Kullanıcı Adı'),
                React.createElement('th', null, 'Bölüm'),
                React.createElement('th', null, 'İşlemler')
              )
            ),
            React.createElement('tbody', null,
              instructors.length === 0 ?
                React.createElement('tr', null,
                  React.createElement('td', { colSpan: 4, style: { textAlign: 'center', padding: '2rem' } },
                    '📭 Henüz öğretim üyesi bulunmuyor'
                  )
                ) :
                instructors.map(instructor =>
                  React.createElement('tr', { key: instructor.id },
                    React.createElement('td', null, instructor.full_name),
                    React.createElement('td', null, instructor.username),
                    React.createElement('td', null, instructor.department),
                    React.createElement('td', null,
                      React.createElement('button', {
                        className: 'btn btn-danger btn-sm',
                        onClick: () => deleteInstructor(instructor.id)
                      }, '🗑️ Sil')
                    )
                  )
                )
            )
          )
          )
        )
      )
    );
  };

  // Courses Tab
  const renderCoursesTab = () => {
    return React.createElement('div', null,
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
          React.createElement('h2', null, '➕ Yeni Ders Ekle')
        ),
        React.createElement('form', { onSubmit: createCourse, className: 'card-body' },
          React.createElement('div', { className: 'grid-2' },
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Ders Kodu'),
              React.createElement('input', {
                type: 'text',
                className: 'form-control',
                value: courseForm.code,
                onChange: (e) => setCourseForm({ ...courseForm, code: e.target.value }),
                placeholder: 'örn: CS301',
                required: true
              })
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Ders Adı'),
              React.createElement('input', {
                type: 'text',
                className: 'form-control',
                value: courseForm.name,
                onChange: (e) => setCourseForm({ ...courseForm, name: e.target.value }),
                placeholder: 'örn: Yapay Zeka',
                required: true
              })
            )
          ),
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', null, 'Öğretim Üyesi'),
            React.createElement('select', {
              className: 'form-control',
              value: courseForm.instructor_id,
              onChange: (e) => setCourseForm({ ...courseForm, instructor_id: e.target.value }),
              required: true
            },
              React.createElement('option', { value: '' }, 'Öğretim üyesi seçin...'),
              instructors.map(inst =>
                React.createElement('option', { key: inst.id, value: inst.id }, 
                  `${inst.full_name} - ${inst.department}`
                )
              )
            )
          ),
          React.createElement('button', { 
            type: 'submit', 
            className: 'btn btn-primary',
            style: { marginTop: '1rem' }
          }, '✅ Ders Oluştur')
        )
      ),

      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
          React.createElement('h2', null, `📋 Ders Listesi (${courses.length})`)
        ),
        React.createElement('div', { className: 'card-body' },
          React.createElement('div', { className: 'table-container' },
          React.createElement('table', { className: 'table' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', null, 'Ders Kodu'),
                React.createElement('th', null, 'Ders Adı'),
                React.createElement('th', null, 'Öğretim Üyesi'),
                React.createElement('th', null, 'İşlemler')
              )
            ),
            React.createElement('tbody', null,
              courses.length === 0 ?
                React.createElement('tr', null,
                  React.createElement('td', { colSpan: 4, style: { textAlign: 'center', padding: '2rem' } },
                    '📭 Henüz ders bulunmuyor'
                  )
                ) :
                courses.map(course =>
                  React.createElement('tr', { key: course.id },
                    React.createElement('td', null, 
                      React.createElement('span', { className: 'badge badge-info' }, course.code)
                    ),
                    React.createElement('td', null, course.name),
                    React.createElement('td', null, course.instructor_name),
                    React.createElement('td', null,
                      React.createElement('button', {
                        className: 'btn btn-danger btn-sm',
                        onClick: () => deleteCourse(course.id)
                      }, '🗑️ Sil')
                    )
                  )
                )
            )
          )
          )
        )
      )
    );
  };

  // Enrollments Tab
  const renderEnrollmentsTab = () => {
    return React.createElement('div', null,
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
          React.createElement('h2', null, '➕ Yeni Ders Kaydı Oluştur')
        ),
        React.createElement('form', { onSubmit: createEnrollment, className: 'card-body' },
          React.createElement('div', { className: 'grid-2' },
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Öğrenci'),
              React.createElement('select', {
                className: 'form-control',
                value: enrollmentForm.student_id,
                onChange: (e) => setEnrollmentForm({ ...enrollmentForm, student_id: e.target.value }),
                required: true
              },
                React.createElement('option', { value: '' }, 'Öğrenci seçin...'),
                students.map(student =>
                  React.createElement('option', { key: student.id, value: student.id },
                    `${student.full_name} (${student.student_number})`
                  )
                )
              )
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 
                enrollmentForm.student_id && studentEnrolledCourses.length > 0 
                  ? `Ders (Öğrenci ${studentEnrolledCourses.length} derse kayıtlı)` 
                  : 'Ders'
              ),
              React.createElement('select', {
                className: 'form-control',
                value: enrollmentForm.course_id,
                onChange: (e) => setEnrollmentForm({ ...enrollmentForm, course_id: e.target.value }),
                required: true,
                disabled: !enrollmentForm.student_id
              },
                React.createElement('option', { value: '' }, 
                  !enrollmentForm.student_id 
                    ? 'Önce öğrenci seçin...' 
                    : 'Ders seçin...'
                ),
                courses.map(course => {
                  const isEnrolled = studentEnrolledCourses.includes(course.id);
                  return React.createElement('option', { 
                    key: course.id, 
                    value: course.id,
                    disabled: isEnrolled
                  },
                    `${course.code} - ${course.name}${isEnrolled ? ' (Zaten kayıtlı)' : ''}`
                  );
                })
              )
            )
          ),
          React.createElement('button', { 
            type: 'submit', 
            className: 'btn btn-primary',
            style: { marginTop: '1rem' }
          }, '✅ Kayıt Oluştur')
        )
      ),

      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
          React.createElement('h2', null, `📋 Ders Kayıtları Listesi (${enrollments.length})`)
        ),
        React.createElement('div', { className: 'card-body' },
          React.createElement('div', { className: 'table-container' },
          React.createElement('table', { className: 'table' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', null, 'Öğrenci'),
                React.createElement('th', null, 'Ders'),
                React.createElement('th', null, 'İşlemler')
              )
            ),
            React.createElement('tbody', null,
              enrollments.length === 0 ?
                React.createElement('tr', null,
                  React.createElement('td', { colSpan: 3, style: { textAlign: 'center', padding: '2rem' } },
                    '📭 Henüz ders kaydı bulunmuyor'
                  )
                ) :
                enrollments.map(enrollment =>
                  React.createElement('tr', { key: enrollment.id },
                    React.createElement('td', null, enrollment.student_name),
                    React.createElement('td', null, 
                      React.createElement('span', { className: 'badge badge-info' }, enrollment.course_code),
                      ' ',
                      enrollment.course_name
                    ),
                    React.createElement('td', null,
                      React.createElement('button', {
                        className: 'btn btn-danger btn-sm',
                        onClick: () => deleteEnrollment(enrollment.id)
                      }, '🗑️ Sil')
                    )
                  )
                )
            )
          )
          )
        )
      )
    );
  };

  // Users Tab
  const renderUsersTab = () => {
    const getRoleLabel = (role) => {
      const labels = {
        'admin': 'Yönetici',
        'student': 'Öğrenci',
        'instructor': 'Öğretim Üyesi',
        'department_head': 'Bölüm Başkanı'
      };
      return labels[role] || role;
    };

    const getRoleBadgeClass = (role) => {
      const classes = {
        'admin': 'badge-danger',
        'student': 'badge-info',
        'instructor': 'badge-warning',
        'department_head': 'badge-success'
      };
      return classes[role] || 'badge-secondary';
    };

    return React.createElement('div', null,
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          React.createElement('h2', null, `👥 Kullanıcı Listesi (${filteredUsers.length})`),
          React.createElement('div', { className: 'form-group', style: { margin: 0, minWidth: '200px' } },
            React.createElement('select', {
              className: 'form-control',
              value: roleFilter,
              onChange: (e) => setRoleFilter(e.target.value)
            },
              React.createElement('option', { value: 'all' }, 'Tüm Yetkiler'),
              React.createElement('option', { value: 'admin' }, 'Yönetici'),
              React.createElement('option', { value: 'student' }, 'Öğrenci'),
              React.createElement('option', { value: 'instructor' }, 'Öğretim Üyesi'),
              React.createElement('option', { value: 'department_head' }, 'Bölüm Başkanı')
            )
          )
        ),
        React.createElement('div', { className: 'card-body' },
          React.createElement('div', { className: 'table-container' },
            React.createElement('table', { className: 'table' },
              React.createElement('thead', null,
                React.createElement('tr', null,
                  React.createElement('th', null, 'ID'),
                  React.createElement('th', null, 'Kullanıcı Adı'),
                  React.createElement('th', null, 'Ad Soyad'),
                  React.createElement('th', null, 'Yetki'),
                  React.createElement('th', null, 'Oluşturulma Tarihi'),
                  React.createElement('th', null, 'İşlemler')
                )
              ),
              React.createElement('tbody', null,
                filteredUsers.length === 0 ?
                  React.createElement('tr', null,
                    React.createElement('td', { colSpan: 6, style: { textAlign: 'center', padding: '2rem' } },
                      '📭 Kullanıcı bulunamadı'
                    )
                  ) :
                  filteredUsers.map(user =>
                    React.createElement('tr', { key: user.id },
                      React.createElement('td', null, user.id),
                      React.createElement('td', null, user.username),
                      React.createElement('td', null, user.full_name),
                      React.createElement('td', null,
                        React.createElement('span', { className: `badge ${getRoleBadgeClass(user.role)}` },
                          getRoleLabel(user.role)
                        )
                      ),
                      React.createElement('td', null, 
                        user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '-'
                      ),
                      React.createElement('td', null,
                        React.createElement('div', { style: { display: 'flex', gap: '0.5rem' } },
                          React.createElement('button', {
                            className: 'btn btn-primary btn-sm',
                            onClick: () => openEditModal(user)
                          }, '✏️ Düzenle'),
                          React.createElement('button', {
                            className: 'btn btn-danger btn-sm',
                            onClick: () => deleteUser(user.id)
                          }, '🗑️ Sil')
                        )
                      )
                    )
                  )
              )
            )
          )
        )
      ),

      // Edit Modal
      editingUser && React.createElement('div', { 
        className: 'modal-overlay',
        style: {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        },
        onClick: closeEditModal
      },
        React.createElement('div', {
          className: 'modal-content',
          style: {
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          },
          onClick: (e) => e.stopPropagation()
        },
          React.createElement('div', { className: 'card-header', style: { marginBottom: '1.5rem' } },
            React.createElement('h2', null, '✏️ Kullanıcı Düzenle'),
            React.createElement('button', {
              onClick: closeEditModal,
              style: {
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }
            }, '×')
          ),
          React.createElement('form', { onSubmit: updateUser },
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Kullanıcı Adı'),
              React.createElement('input', {
                type: 'text',
                className: 'form-control',
                value: editForm.username,
                onChange: (e) => setEditForm({ ...editForm, username: e.target.value }),
                required: true
              })
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Ad Soyad'),
              React.createElement('input', {
                type: 'text',
                className: 'form-control',
                value: editForm.full_name,
                onChange: (e) => setEditForm({ ...editForm, full_name: e.target.value }),
                required: true
              })
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Şifre (Değiştirmek için doldurun)'),
              React.createElement('input', {
                type: 'password',
                className: 'form-control',
                value: editForm.password,
                onChange: (e) => setEditForm({ ...editForm, password: e.target.value }),
                placeholder: 'Boş bırakılırsa değiştirilmez'
              })
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Yetki'),
              React.createElement('select', {
                className: 'form-control',
                value: editForm.role,
                onChange: (e) => setEditForm({ ...editForm, role: e.target.value }),
                required: true
              },
                React.createElement('option', { value: 'admin' }, 'Yönetici'),
                React.createElement('option', { value: 'student' }, 'Öğrenci'),
                React.createElement('option', { value: 'instructor' }, 'Öğretim Üyesi'),
                React.createElement('option', { value: 'department_head' }, 'Bölüm Başkanı')
              )
            ),
            React.createElement('div', { style: { display: 'flex', gap: '0.5rem', marginTop: '1.5rem' } },
              React.createElement('button', {
                type: 'submit',
                className: 'btn btn-primary'
              }, '✅ Kaydet'),
              React.createElement('button', {
                type: 'button',
                className: 'btn btn-secondary',
                onClick: closeEditModal
              }, '❌ İptal')
            )
          )
        )
      )
    );
  };

  return React.createElement('div', { className: 'dashboard' },
    renderHeader(),
    
    React.createElement('div', { className: 'container' },
      // Alerts
      error && React.createElement('div', { className: 'alert alert-error' }, 
        React.createElement('span', null, '⚠️ ' + error),
        React.createElement('button', { 
          className: 'alert-close', 
          onClick: () => setError('') 
        }, '×')
      ),
      success && React.createElement('div', { className: 'alert alert-success' }, 
        React.createElement('span', null, '✓ ' + success),
        React.createElement('button', { 
          className: 'alert-close', 
          onClick: () => setSuccess('') 
        }, '×')
      ),

      // Stats
      renderStats(),

      // Tabs
      renderTabs(),

      // Loading
      loading && React.createElement('div', { className: 'loading' },
        React.createElement('div', { className: 'spinner' }),
        React.createElement('p', null, 'Yükleniyor...')
      ),

      // Tab Content
      !loading && activeTab === 'students' && renderStudentsTab(),
      !loading && activeTab === 'instructors' && renderInstructorsTab(),
      !loading && activeTab === 'courses' && renderCoursesTab(),
      !loading && activeTab === 'enrollments' && renderEnrollmentsTab(),
      !loading && activeTab === 'users' && renderUsersTab()
    )
  );
}

export default AdminDashboard;
