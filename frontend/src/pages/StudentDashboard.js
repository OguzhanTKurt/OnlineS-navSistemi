import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../services/api';
import { logout } from '../utils/auth';
import { translateError } from '../utils/errorMessages';
import './Dashboard.css';

function StudentDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadExams();
    }
  }, [selectedCourse]);

  // Sınav durumunu periyodik olarak kontrol et (her 5 saniyede bir)
  useEffect(() => {
    if (!selectedCourse) return;

    const interval = setInterval(() => {
      // Sınav durumunu kontrol et - eğer bir sınav başladı veya bitti ise listeyi yenile
      // Loading state'ini değiştirmeden arka planda güncelle
      const updateExams = async () => {
        try {
          const res = await studentAPI.getCourseExams(selectedCourse);
          setExams(res.data);
        } catch (err) {
          // Sessizce hata yok say (kullanıcıya gösterme)
          console.error('Sınav durumu güncellenemedi:', err);
        }
      };
      updateExams();
    }, 5000); // Her 5 saniyede bir kontrol et ve güncelle

    return () => clearInterval(interval);
  }, [selectedCourse]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await studentAPI.getCourses();
      setCourses(res.data);
      if (res.data.length > 0) {
        setSelectedCourse(res.data[0].id);
      }
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Dersler yüklenemedi'));
    } finally {
      setLoading(false);
    }
  };

  const loadExams = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await studentAPI.getCourseExams(selectedCourse);
      setExams(res.data);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Sınavlar yüklenemedi'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const startExam = (examId) => {
    navigate(`/student/exam/${examId}`);
  };

  const currentCourse = courses.find(c => c.id === selectedCourse);

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
            React.createElement('span', { className: 'user-role' }, 'Öğrenci'),
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

      loading && React.createElement('div', { className: 'loading', style: { margin: '2rem 0', textAlign: 'center' } }, 
        React.createElement('div', { className: 'spinner' }),
        React.createElement('p', { style: { marginTop: '1rem', color: 'var(--text-secondary)' } }, 'Yükleniyor...')
      ),

      !loading && React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
          React.createElement('h2', null, '📚 Derslerim')
        ),
        React.createElement('div', { className: 'card-body' },
          courses.length === 0 ?
            React.createElement('div', { className: 'empty-state' },
              React.createElement('p', null, '📖 Kayıtlı ders bulunmuyor')
            ) :
            React.createElement('div', { className: 'grid' },
              courses.map(course =>
                React.createElement('div', {
                  key: course.id,
                  className: `course-card ${selectedCourse === course.id ? 'selected' : ''}`,
                  onClick: () => setSelectedCourse(course.id)
                },
                  React.createElement('div', { className: 'course-header' },
                    React.createElement('h3', null, course.code),
                    selectedCourse === course.id && 
                      React.createElement('span', { className: 'badge badge-primary' }, '✓ Seçili')
                  ),
                  React.createElement('p', { className: 'course-name' }, course.name),
                  React.createElement('div', { className: 'course-info' },
                    React.createElement('span', { className: 'info-label' }, 'Öğretim Üyesi:'),
                    React.createElement('span', { className: 'info-value' }, course.instructor_name)
                  ),
                  course.course_grade !== null &&
                    React.createElement('div', { className: 'course-grade' },
                      React.createElement('span', { className: 'grade-label' }, 'Ders Notu:'),
                      React.createElement('span', { 
                        className: `grade-value ${course.course_grade >= 50 ? 'pass' : 'fail'}` 
                      }, `${course.course_grade}%`)
                    )
                )
              )
            )
        )
      ),

      currentCourse && React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
          React.createElement('h2', null, `📝 Sınavlar - ${currentCourse.code}`)
        ),
        React.createElement('div', { className: 'card-body' },
          loading ? 
            React.createElement('div', { className: 'loading' }, 
              React.createElement('div', { className: 'spinner' }),
              React.createElement('p', null, 'Yükleniyor...')
            ) :
            exams.length === 0 ? 
              React.createElement('div', { className: 'empty-state' },
                React.createElement('p', null, '📋 Henüz sınav bulunmuyor')
              ) :
              React.createElement('div', { className: 'grid' },
                exams.map(exam => {
                  // Backend'den gelen zamanlar UTC formatında (Z ile bitiyor)
                  // new Date() ile parse ettiğimizde JavaScript otomatik olarak UTC olarak parse ediyor
                  const now = new Date();
                  const startTime = new Date(exam.start_time);
                  const endTime = new Date(exam.end_time);
                  
                  const hasAttempted = exam.has_attempted;
                  
                  // Client-side'da da sınav durumunu kontrol et (backend'e ek olarak)
                  const nowTime = now.getTime();
                  const startTimeMs = startTime.getTime();
                  const endTimeMs = endTime.getTime();
                  
                  // Client-side kontrol: sınav başladı mı ve bitti mi?
                  const isStarted = nowTime >= startTimeMs;
                  const isEnded = nowTime > endTimeMs;
                  const isInTimeRange = isStarted && !isEnded;

                  let statusText = '';
                  let statusClass = '';
                  let statusIcon = '';
                  let canStart = false;

                  if (hasAttempted) {
                    // Öğrenci sınavı tamamlamış
                    statusText = 'Tamamlandı';
                    statusClass = 'completed';
                    statusIcon = '✓';
                    canStart = false;
                  } else if (isEnded) {
                    // Sınav süresi dolmuş
                    statusText = 'Süresi Doldu';
                    statusClass = 'expired';
                    statusIcon = '⏰';
                    canStart = false;
                  } else if (!isStarted) {
                    // Sınav henüz başlamamış
                    statusText = 'Henüz Başlamadı';
                    statusClass = 'pending';
                    statusIcon = '⏳';
                    canStart = false;
                  } else if (isInTimeRange) {
                    // Sınav başladı ve devam ediyor - müsait
                    statusText = 'Müsait';
                    statusClass = 'available';
                    statusIcon = '✓';
                    canStart = true;
                  } else {
                    // Diğer durumlar
                    statusText = 'Müsait Değil';
                    statusClass = 'pending';
                    statusIcon = '⏳';
                    canStart = false;
                  }

                  return React.createElement('div', {
                    key: exam.id,
                    className: `exam-card ${statusClass}`
                  },
                    React.createElement('div', { className: 'exam-card-header' },
                      React.createElement('h3', null, 
                        exam.exam_type === 'vize' ? '📘 Vize' : '📕 Final'
                      ),
                      React.createElement('span', { className: 'badge badge-primary' }, 
                        `%${exam.weight_percentage}`
                      )
                    ),
                    React.createElement('div', { className: 'exam-info' },
                      React.createElement('div', { className: 'info-row' },
                        React.createElement('span', { className: 'info-label' }, '🕐 Başlangıç:'),
                        React.createElement('span', { className: 'info-value' }, 
                          startTime.toLocaleString('tr-TR', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit',
                            timeZone: 'Europe/Istanbul'
                          })
                        )
                      ),
                      React.createElement('div', { className: 'info-row' },
                        React.createElement('span', { className: 'info-label' }, '🕐 Bitiş:'),
                        React.createElement('span', { className: 'info-value' }, 
                          endTime.toLocaleString('tr-TR', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit',
                            timeZone: 'Europe/Istanbul'
                          })
                        )
                      ),
                      React.createElement('div', { className: 'info-row' },
                        React.createElement('span', { className: 'info-label' }, '⏱️ Süre:'),
                        React.createElement('span', { className: 'info-value' }, 
                          `${exam.duration_minutes} dakika`
                        )
                      ),
                      React.createElement('div', { className: 'info-row' },
                        React.createElement('span', { className: 'info-label' }, '📊 Durum:'),
                        React.createElement('span', { 
                          className: `badge badge-${statusClass}` 
                        }, `${statusIcon} ${statusText}`)
                      )
                    ),
                    hasAttempted && exam.attempt && 
                      React.createElement('div', { className: 'exam-result' },
                        React.createElement('div', { className: 'result-label' }, 'Puanınız'),
                        React.createElement('div', { 
                          className: `result-value ${exam.attempt.score !== null && exam.attempt.score !== undefined && exam.attempt.score >= 50 ? 'pass' : 'fail'}` 
                        }, exam.attempt.score !== null && exam.attempt.score !== undefined ? `${exam.attempt.score}%` : 'Hesaplanıyor...')
                      ),
                    canStart && React.createElement('button', {
                      className: 'btn btn-success btn-block',
                      onClick: () => startExam(exam.id)
                    }, '🚀 Sınava Başla')
                  );
                })
              )
        )
      )
    )
  );
}

export default StudentDashboard;
