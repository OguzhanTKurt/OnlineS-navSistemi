import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { departmentHeadAPI } from '../services/api';
import { logout } from '../utils/auth';
import { translateError } from '../utils/errorMessages';
import './Dashboard.css';

function DepartmentHeadDashboard({ user }) {
  const [statistics, setStatistics] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'overview') {
        const res = await departmentHeadAPI.getStatistics();
        setStatistics(res.data);
      } else if (activeTab === 'courses') {
        const res = await departmentHeadAPI.getCourses();
        setCourses(res.data);
      } else if (activeTab === 'students') {
        const res = await departmentHeadAPI.getStudents();
        setStudents(res.data);
      }
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Veriler yüklenemedi'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return React.createElement('div', { className: 'dashboard' },
    React.createElement('div', { className: 'dashboard-header' },
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
            React.createElement('span', { className: 'user-role' }, 'Bölüm Başkanı'),
            React.createElement('span', { className: 'user-name' }, user?.full_name)
          ),
          React.createElement('button', { 
            className: 'btn btn-secondary', 
            onClick: handleLogout 
          }, '👋 Çıkış Yap')
        )
      )
    ),

    React.createElement('div', { className: 'container' },
      error && React.createElement('div', { className: 'alert alert-error' }, 
        React.createElement('span', null, '⚠️ ' + error),
        React.createElement('button', { 
          className: 'alert-close', 
          onClick: () => setError('') 
        }, '×')
      ),

      React.createElement('div', { className: 'tabs' },
        React.createElement('button', {
          className: `tab ${activeTab === 'overview' ? 'active' : ''}`,
          onClick: () => setActiveTab('overview')
        }, '📊 Genel Bakış'),
        React.createElement('button', {
          className: `tab ${activeTab === 'courses' ? 'active' : ''}`,
          onClick: () => setActiveTab('courses')
        }, '📚 Dersler'),
        React.createElement('button', {
          className: `tab ${activeTab === 'students' ? 'active' : ''}`,
          onClick: () => setActiveTab('students')
        }, '👥 Öğrenciler')
      ),

      loading && React.createElement('div', { className: 'loading' }, 
        React.createElement('div', { className: 'spinner' }),
        React.createElement('p', null, 'Yükleniyor...')
      ),

      // Genel Bakış Sekmesi
      activeTab === 'overview' && statistics && React.createElement('div', null,
        React.createElement('div', { className: 'stats-grid' },
          React.createElement('div', { className: 'stat-card' },
            React.createElement('div', { className: 'stat-icon' }, '👥'),
            React.createElement('div', { className: 'stat-content' },
              React.createElement('div', { className: 'stat-value' }, statistics.total_students),
              React.createElement('div', { className: 'stat-label' }, 'Toplam Öğrenci')
            )
          ),
          React.createElement('div', { className: 'stat-card' },
            React.createElement('div', { className: 'stat-icon' }, '📚'),
            React.createElement('div', { className: 'stat-content' },
              React.createElement('div', { className: 'stat-value' }, statistics.total_courses),
              React.createElement('div', { className: 'stat-label' }, 'Toplam Ders')
            )
          ),
          React.createElement('div', { className: 'stat-card' },
            React.createElement('div', { className: 'stat-icon' }, '📝'),
            React.createElement('div', { className: 'stat-content' },
              React.createElement('div', { className: 'stat-value' }, statistics.total_exams),
              React.createElement('div', { className: 'stat-label' }, 'Toplam Sınav')
            )
          ),
          React.createElement('div', { className: 'stat-card' },
            React.createElement('div', { className: 'stat-icon' }, '✓'),
            React.createElement('div', { className: 'stat-content' },
              React.createElement('div', { className: 'stat-value' }, statistics.total_completed_attempts),
              React.createElement('div', { className: 'stat-label' }, 'Tamamlanan Sınav')
            )
          ),
          React.createElement('div', { className: 'stat-card primary' },
            React.createElement('div', { className: 'stat-icon' }, '📊'),
            React.createElement('div', { className: 'stat-content' },
              React.createElement('div', { className: 'stat-value' }, 
                statistics.overall_average ? `${statistics.overall_average}%` : 'N/A'
              ),
              React.createElement('div', { className: 'stat-label' }, 'Genel Ortalama')
            )
          )
        ),

        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-header' },
            React.createElement('h2', null, '📈 Ders İstatistikleri')
          ),
          React.createElement('div', { className: 'card-body' },
            statistics.course_statistics.length === 0 ?
              React.createElement('div', { className: 'empty-state' },
                React.createElement('p', null, '📋 Henüz ders istatistiği bulunmuyor')
              ) :
              React.createElement('div', { className: 'table-container' },
                React.createElement('table', { className: 'table' },
                  React.createElement('thead', null,
                    React.createElement('tr', null,
                      React.createElement('th', null, 'Ders Kodu'),
                      React.createElement('th', null, 'Ders Adı'),
                      React.createElement('th', null, 'Öğretim Üyesi'),
                      React.createElement('th', null, 'Öğrenci Sayısı'),
                      React.createElement('th', null, 'Ortalama'),
                      React.createElement('th', null, 'Min'),
                      React.createElement('th', null, 'Max')
                    )
                  ),
                  React.createElement('tbody', null,
                    statistics.course_statistics.map(course =>
                      React.createElement('tr', { key: course.course_id },
                        React.createElement('td', null, 
                          React.createElement('strong', null, course.course_code)
                        ),
                        React.createElement('td', null, course.course_name),
                        React.createElement('td', null, course.instructor_name),
                        React.createElement('td', null, 
                          React.createElement('span', { className: 'badge badge-secondary' }, 
                            course.student_count
                          )
                        ),
                        React.createElement('td', null, 
                          course.average_grade !== null ? 
                            React.createElement('span', { 
                              className: `badge ${course.average_grade >= 50 ? 'badge-success' : 'badge-danger'}` 
                            }, `${course.average_grade}%`) : 
                            React.createElement('span', { className: 'badge badge-secondary' }, 'Henüz Yok')
                        ),
                        React.createElement('td', null, 
                          course.min_grade !== null ? `${course.min_grade}%` : 'N/A'
                        ),
                        React.createElement('td', null, 
                          course.max_grade !== null ? `${course.max_grade}%` : 'N/A'
                        )
                      )
                    )
                  )
                )
              )
          )
        )
      ),

      // Dersler Sekmesi
      activeTab === 'courses' && React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
          React.createElement('h2', null, '📚 Tüm Dersler')
        ),
        React.createElement('div', { className: 'card-body' },
          courses.length === 0 ?
            React.createElement('div', { className: 'empty-state' },
              React.createElement('p', null, '📖 Henüz ders bulunmuyor')
            ) :
            React.createElement('div', { className: 'table-container' },
              React.createElement('table', { className: 'table' },
                React.createElement('thead', null,
                  React.createElement('tr', null,
                    React.createElement('th', null, 'Ders Kodu'),
                    React.createElement('th', null, 'Ders Adı'),
                    React.createElement('th', null, 'Öğretim Üyesi'),
                    React.createElement('th', null, 'Öğrenci Sayısı'),
                    React.createElement('th', null, 'Ortalama Not')
                  )
                ),
                React.createElement('tbody', null,
                  courses.map(course =>
                    React.createElement('tr', { key: course.id },
                      React.createElement('td', null, 
                        React.createElement('strong', null, course.code)
                      ),
                      React.createElement('td', null, course.name),
                      React.createElement('td', null, course.instructor_name),
                      React.createElement('td', null, 
                        React.createElement('span', { className: 'badge badge-secondary' }, 
                          course.student_count
                        )
                      ),
                      React.createElement('td', null, 
                        course.average_grade !== null ? 
                          React.createElement('span', { 
                            className: `badge ${course.average_grade >= 50 ? 'badge-success' : 'badge-danger'}` 
                          }, `${course.average_grade}%`) : 
                          React.createElement('span', { className: 'badge badge-secondary' }, 'Henüz Yok')
                      )
                    )
                  )
                )
              )
            )
        )
      ),

      // Öğrenciler Sekmesi
      activeTab === 'students' && React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
          React.createElement('h2', null, '👥 Tüm Öğrenciler')
        ),
        React.createElement('div', { className: 'card-body' },
          students.length === 0 ?
            React.createElement('div', { className: 'empty-state' },
              React.createElement('p', null, '👤 Henüz öğrenci bulunmuyor')
            ) :
            React.createElement('div', { className: 'table-container' },
              React.createElement('table', { className: 'table' },
                React.createElement('thead', null,
                  React.createElement('tr', null,
                    React.createElement('th', null, 'Öğrenci No'),
                    React.createElement('th', null, 'Ad Soyad'),
                    React.createElement('th', null, 'Dersler'),
                    React.createElement('th', null, 'Genel Ortalama')
                  )
                ),
                React.createElement('tbody', null,
                  students.map(student =>
                    React.createElement('tr', { key: student.id },
                      React.createElement('td', null, 
                        React.createElement('strong', null, student.student_number)
                      ),
                      React.createElement('td', null, student.full_name),
                      React.createElement('td', null,
                        React.createElement('div', { className: 'course-grades' },
                          student.courses.map(course =>
                            React.createElement('div', { 
                              key: course.course_id, 
                              className: 'course-grade-item' 
                            },
                              React.createElement('span', { className: 'course-code' }, 
                                course.course_code + ':'
                              ),
                              React.createElement('span', { 
                                className: `grade-badge ${course.grade !== null && course.grade >= 50 ? 'pass' : course.grade !== null ? 'fail' : ''}` 
                              }, 
                                course.grade !== null ? `${course.grade}%` : 'Henüz Yok'
                              )
                            )
                          )
                        )
                      ),
                      React.createElement('td', null, 
                        student.overall_average !== null ? 
                          React.createElement('span', { 
                            className: `badge ${student.overall_average >= 50 ? 'badge-success' : 'badge-danger'}` 
                          }, `${student.overall_average}%`) : 
                          React.createElement('span', { className: 'badge badge-secondary' }, 'Henüz Yok')
                      )
                    )
                  )
                )
              )
            )
        )
      )
    )
  );
}

export default DepartmentHeadDashboard;
