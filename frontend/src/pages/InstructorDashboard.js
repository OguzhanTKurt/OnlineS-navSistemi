import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { instructorAPI } from '../services/api';
import { logout } from '../utils/auth';
import { translateError } from '../utils/errorMessages';
import './Dashboard.css';

function InstructorDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [examResults, setExamResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showExamModal, setShowExamModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examFormErrors, setExamFormErrors] = useState({});
  const [questionFormErrors, setQuestionFormErrors] = useState({});
  const navigate = useNavigate();

  const [examForm, setExamForm] = useState({
    exam_type: 'vize',
    weight_percentage: 40,
    start_time: '',
    end_time: '',
    duration_minutes: 10
  });

  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    option_e: '',
    correct_answer: 'A'
  });

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseData();
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await instructorAPI.getCourses();
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

  const loadCourseData = async () => {
    setLoading(true);
    setError('');
    try {
      const [examsRes, studentsRes] = await Promise.all([
        instructorAPI.getCourseExams(selectedCourse),
        instructorAPI.getCourseStudents(selectedCourse)
      ]);
      setExams(examsRes.data);
      setStudents(studentsRes.data);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Ders verileri yüklenemedi'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const createExam = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setExamFormErrors({});
    
    const validationErrors = validateExamForm();
    if (Object.keys(validationErrors).length > 0) {
      setExamFormErrors(validationErrors);
      setError('Lütfen formdaki hataları düzeltin');
      return;
    }
    
    try {
      // datetime-local input gives us a string like "2025-11-08T21:15" (local timezone, no timezone info)
      // Kullanıcı local timezone'da bir zaman seçiyor (örn: Türkiye UTC+3)
      // Bunu UTC'ye çevirmemiz gerekiyor
      let startTime = '';
      let endTime = '';
      
      if (examForm.start_time) {
        // datetime-local format: "YYYY-MM-DDTHH:MM"
        // Bunu local timezone'da parse et, sonra UTC'ye çevir
        // new Date() ile parse ettiğimizde JavaScript local timezone'da parse eder
        // Sonra toISOString() ile UTC'ye çevirir
        const localDate = new Date(examForm.start_time);
        startTime = localDate.toISOString();
      }
      
      if (examForm.end_time) {
        // datetime-local format: "YYYY-MM-DDTHH:MM"
        // Bunu local timezone'da parse et, sonra UTC'ye çevir
        const localDate = new Date(examForm.end_time);
        endTime = localDate.toISOString();
      }
      
      await instructorAPI.createExam({
        ...examForm,
        start_time: startTime,
        end_time: endTime,
        course_id: selectedCourse
      });
      setSuccess('Sınav başarıyla oluşturuldu');
      setShowExamModal(false);
      setExamForm({
        exam_type: 'vize',
        weight_percentage: 40,
        start_time: '',
        end_time: '',
        duration_minutes: 10
      });
      setExamFormErrors({});
      loadCourseData();
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Sınav oluşturulamadı'));
    }
  };

  const validateExamForm = () => {
    const errors = {};
    if (!examForm.start_time) errors.start_time = 'Başlangıç zamanı gereklidir';
    if (!examForm.end_time) errors.end_time = 'Bitiş zamanı gereklidir';
    if (examForm.start_time && examForm.end_time) {
      const start = new Date(examForm.start_time);
      const end = new Date(examForm.end_time);
      if (end <= start) errors.end_time = 'Bitiş zamanı başlangıç zamanından sonra olmalıdır';
    }
    if (examForm.weight_percentage < 1 || examForm.weight_percentage > 100) {
      errors.weight_percentage = 'Ağırlık yüzdesi 1-100 arasında olmalıdır';
    }
    if (examForm.duration_minutes < 1) {
      errors.duration_minutes = 'Süre en az 1 dakika olmalıdır';
    }
    return errors;
  };

  const viewQuestions = async (exam) => {
    setSelectedExam(exam);
    try {
      const res = await instructorAPI.getExamQuestions(exam.id);
      setQuestions(res.data);
      setShowQuestionModal(true);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Sorular yüklenemedi'));
    }
  };

  // Check if exam has started
  const isExamStarted = (exam) => {
    if (!exam || !exam.start_time) return false;
    const now = new Date();
    const startTime = new Date(exam.start_time);
    return now >= startTime;
  };

  const addQuestion = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setQuestionFormErrors({});
    
    const validationErrors = validateQuestionForm();
    if (Object.keys(validationErrors).length > 0) {
      setQuestionFormErrors(validationErrors);
      setError('Lütfen formdaki hataları düzeltin');
      return;
    }
    
    try {
      await instructorAPI.createQuestion({
        ...questionForm,
        exam_id: selectedExam.id
      });
      setSuccess('Soru başarıyla eklendi');
      setTimeout(() => setSuccess(''), 3000);
      setQuestionForm({
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        option_e: '',
        correct_answer: 'A'
      });
      
      // Soru listesini güncelle
      const res = await instructorAPI.getExamQuestions(selectedExam.id);
      setQuestions(res.data);
      
      // Sınav listesini de güncelle (has_minimum_questions flag'i değişebilir)
      if (selectedCourse) {
        const examsRes = await instructorAPI.getCourseExams(selectedCourse);
        setExams(examsRes.data);
        // Seçili sınavın güncel halini güncelle
        const updatedExam = examsRes.data.find(e => e.id === selectedExam.id);
        if (updatedExam) {
          setSelectedExam(updatedExam);
        }
      }
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Soru eklenemedi'));
      setTimeout(() => setError(''), 5000);
    }
  };

  const validateQuestionForm = () => {
    const errors = {};
    if (!questionForm.question_text || questionForm.question_text.trim().length < 5) {
      errors.question_text = 'Soru metni en az 5 karakter olmalıdır';
    }
    if (!questionForm.option_a || !questionForm.option_b || !questionForm.option_c || 
        !questionForm.option_d || !questionForm.option_e) {
      errors.options = 'Tüm seçenekler doldurulmalıdır';
    }
    if (!questionForm.correct_answer) {
      errors.correct_answer = 'Doğru cevap seçilmelidir';
    }
    return errors;
  };

  const deleteQuestion = async (questionId) => {
    setError('');
    setSuccess('');
    try {
      const res = await instructorAPI.deleteQuestion(questionId);
      // Uyarı varsa göster
      if (res.data.warning) {
        setError(res.data.warning);
        setTimeout(() => setError(''), 8000);
      } else {
        setSuccess('Soru başarıyla silindi');
        setTimeout(() => setSuccess(''), 3000);
      }
      
      // Soru listesini güncelle
      const questionsRes = await instructorAPI.getExamQuestions(selectedExam.id);
      setQuestions(questionsRes.data);
      
      // Sınav listesini de güncelle (has_minimum_questions flag'i değişebilir)
      if (selectedCourse) {
        const examsRes = await instructorAPI.getCourseExams(selectedCourse);
        setExams(examsRes.data);
        // Seçili sınavın güncel halini güncelle
        const updatedExam = examsRes.data.find(e => e.id === selectedExam.id);
        if (updatedExam) {
          setSelectedExam(updatedExam);
        }
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Soru silinemedi';
      setError(errorMessage);
      // Hata mesajını 5 saniye sonra otomatik kaldır
      setTimeout(() => setError(''), 5000);
    }
  };

  const viewResults = async (exam) => {
    try {
      const res = await instructorAPI.getExamResults(exam.id);
      setExamResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Sonuçlar yüklenemedi');
    }
  };

  const deleteExam = async (examId) => {
    if (!window.confirm('Bu sınavı silmek istediğinizden emin misiniz?')) return;
    try {
      await instructorAPI.deleteExam(examId);
      setSuccess('Sınav başarıyla silindi');
      loadCourseData();
    } catch (err) {
      setError(err.response?.data?.error || 'Sınav silinemedi');
    }
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
            React.createElement('span', { className: 'user-role' }, 'Öğretim Üyesi'),
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
      success && React.createElement('div', { className: 'alert alert-success' }, 
        React.createElement('span', null, '✓ ' + success),
        React.createElement('button', { 
          className: 'alert-close', 
          onClick: () => setSuccess('') 
        }, '×')
      ),

      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-header' },
          React.createElement('h2', null, '📚 Derslerim')
        ),
        React.createElement('div', { className: 'card-body' },
          courses.length === 0 ?
            React.createElement('div', { className: 'empty-state' },
              React.createElement('p', null, '📖 Henüz size atanmış ders bulunmuyor')
            ) :
            React.createElement('div', { className: 'grid' },
              courses.map(course =>
                React.createElement('div', {
                  key: course.id,
                  className: `course-card ${selectedCourse === course.id ? 'selected' : ''}`,
                  onClick: () => setSelectedCourse(course.id),
                  style: { cursor: 'pointer' }
                },
                  React.createElement('div', { className: 'course-header' },
                    React.createElement('h3', null, course.code),
                    selectedCourse === course.id && 
                      React.createElement('span', { className: 'badge badge-primary' }, '✓ Seçili')
                  ),
                  React.createElement('p', { className: 'course-name' }, course.name),
                  React.createElement('div', { className: 'course-info', style: { marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--bg-tertiary)' } },
                    React.createElement('div', { className: 'info-row' },
                      React.createElement('span', { className: 'info-label' }, '📝 Sınav Sayısı:'),
                      React.createElement('span', { className: 'info-value' }, course.exam_count || 0)
                    ),
                    React.createElement('div', { className: 'info-row' },
                      React.createElement('span', { className: 'info-label' }, '👥 Öğrenci Sayısı:'),
                      React.createElement('span', { className: 'info-value' }, course.student_count || 0)
                    )
                  )
                )
              )
            )
        )
      ),

      currentCourse && React.createElement('div', null,
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-header' },
            React.createElement('h2', null, '📝 Sınavlar'),
            React.createElement('button', {
              className: 'btn btn-primary',
              onClick: () => setShowExamModal(true)
            }, '➕ Yeni Sınav Oluştur')
          ),
          React.createElement('div', { className: 'card-body' },
            exams.length === 0 ? 
              React.createElement('div', { className: 'empty-state' },
                React.createElement('p', null, '📋 Henüz sınav oluşturulmamış'),
                React.createElement('p', { style: { fontSize: '14px', color: 'var(--text-secondary)' } }, 
                  'Yeni bir sınav oluşturmak için yukarıdaki butona tıklayın'
                )
              ) :
              React.createElement('div', { className: 'grid' },
                exams.map(exam =>
                  React.createElement('div', { 
                    key: exam.id, 
                    className: 'exam-card',
                    style: !exam.has_minimum_questions ? { border: '2px solid #ff9800' } : {}
                  },
                    !exam.has_minimum_questions && React.createElement('div', { 
                      className: 'alert alert-warning',
                      style: { 
                        marginBottom: '15px', 
                        padding: '12px',
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffc107',
                        borderRadius: '4px',
                        color: '#856404'
                      }
                    }, 
                      React.createElement('strong', null, '⚠️ Uyarı: '),
                      'Bu sınavda en az 5 soru bulunmalıdır. Şu anda ',
                      exam.question_count || 0,
                      ' soru var. Öğrenciler bu sınavı görmeyecektir.'
                    ),
                    React.createElement('div', { className: 'exam-card-header' },
                      React.createElement('h3', null, exam.exam_type === 'vize' ? '📘 Vize' : '📕 Final'),
                      React.createElement('span', { className: 'badge badge-primary' }, 
                        `%${exam.weight_percentage}`
                      )
                    ),
                    React.createElement('div', { className: 'exam-info' },
                      React.createElement('div', { className: 'info-row' },
                        React.createElement('span', { className: 'info-label' }, '🕐 Başlangıç:'),
                        React.createElement('span', { className: 'info-value' }, 
                          (() => {
                            const dt = new Date(exam.start_time);
                            return dt.toLocaleString('tr-TR', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              second: '2-digit',
                              timeZone: 'Europe/Istanbul'
                            });
                          })()
                        )
                      ),
                      React.createElement('div', { className: 'info-row' },
                        React.createElement('span', { className: 'info-label' }, '🕐 Bitiş:'),
                        React.createElement('span', { className: 'info-value' }, 
                          (() => {
                            const dt = new Date(exam.end_time);
                            return dt.toLocaleString('tr-TR', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              second: '2-digit',
                              timeZone: 'Europe/Istanbul'
                            });
                          })()
                        )
                      ),
                      React.createElement('div', { className: 'info-row' },
                        React.createElement('span', { className: 'info-label' }, '❓ Soru Sayısı:'),
                        React.createElement('span', { 
                          className: 'info-value',
                          style: !exam.has_minimum_questions ? { color: '#ff9800', fontWeight: 'bold' } : {}
                        }, exam.question_count || 0)
                      )
                    ),
                    (() => {
                      const now = new Date();
                      const startTime = new Date(exam.start_time);
                      const endTime = new Date(exam.end_time);
                      const hasStarted = now >= startTime;
                      const hasEnded = now > endTime;
                      
                      if (hasStarted) {
                        // Sınav başladı veya bitti, sadece soru yönetimini kaldır
                        return React.createElement('div', { className: 'exam-actions' },
                          React.createElement('div', { 
                            style: { 
                              marginBottom: '10px',
                              padding: '0.5rem 1rem',
                              backgroundColor: hasEnded ? '#d1ecf1' : '#fff3cd',
                              border: `1px solid ${hasEnded ? '#bee5eb' : '#ffc107'}`,
                              borderRadius: '0.5rem',
                              color: hasEnded ? '#0c5460' : '#856404',
                              textAlign: 'center',
                              fontSize: '0.8125rem',
                              fontWeight: '500',
                              minHeight: '36px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }
                          }, hasEnded ? '⏰ Sınav Süresi Doldu' : '▶️ Sınav Başladı'),
                          React.createElement('div', { 
                            style: { 
                              display: 'flex', 
                              gap: '0.5rem',
                              alignItems: 'stretch'
                            } 
                          },
                            React.createElement('button', {
                              className: 'btn btn-sm btn-success',
                              onClick: () => viewResults(exam),
                              style: { flex: 1, fontWeight: '600' }
                            }, '📊 Sonuçlar'),
                            React.createElement('button', {
                              className: 'btn btn-sm btn-danger',
                              onClick: () => deleteExam(exam.id),
                              style: { flex: 1, fontWeight: '600' }
                            }, '🗑️ Sil')
                          )
                        );
                      } else {
                        // Sınav henüz başlamadı, tüm butonları göster
                        return React.createElement('div', { className: 'exam-actions' },
                          React.createElement('button', {
                            className: 'btn btn-sm btn-primary',
                            onClick: () => viewQuestions(exam),
                            style: { 
                              width: '100%',
                              marginBottom: '10px',
                              fontWeight: '600'
                            }
                          }, '📝 Soruları Yönet'),
                          React.createElement('div', { 
                            style: { 
                              display: 'flex', 
                              gap: '0.5rem',
                              alignItems: 'stretch'
                            } 
                          },
                            React.createElement('button', {
                              className: 'btn btn-sm btn-success',
                              onClick: () => viewResults(exam),
                              style: { flex: 1, fontWeight: '600' }
                            }, '📊 Sonuçlar'),
                            React.createElement('button', {
                              className: 'btn btn-sm btn-danger',
                              onClick: () => deleteExam(exam.id),
                              style: { flex: 1, fontWeight: '600' }
                            }, '🗑️ Sil')
                          )
                        );
                      }
                    })()
                  )
                )
              )
          )
        ),

        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-header' },
            React.createElement('h2', null, '👥 Kayıtlı Öğrenciler')
          ),
          React.createElement('div', { className: 'card-body' },
            students.length === 0 ?
              React.createElement('div', { className: 'empty-state' },
                React.createElement('p', null, '👤 Bu derse kayıtlı öğrenci bulunmuyor')
              ) :
              React.createElement('div', { className: 'table-container' },
                React.createElement('table', { className: 'table' },
                  React.createElement('thead', null,
                    React.createElement('tr', null,
                      React.createElement('th', null, 'Öğrenci No'),
                      React.createElement('th', null, 'Ad Soyad'),
                      React.createElement('th', null, 'Ders Notu')
                    )
                  ),
                  React.createElement('tbody', null,
                    students.map(student =>
                      React.createElement('tr', { key: student.id },
                        React.createElement('td', null, student.student_number),
                        React.createElement('td', null, student.full_name),
                        React.createElement('td', null, 
                          student.course_grade !== null ? 
                            React.createElement('span', { className: 'badge badge-success' }, 
                              `${student.course_grade}%`
                            ) : 
                            React.createElement('span', { className: 'badge badge-secondary' }, 'Henüz Yok')
                        )
                      )
                    )
                  )
                )
              )
          )
        )
      ),

      // Sınav Sonuçları Modal
      examResults && React.createElement('div', { 
        className: 'modal-overlay', 
        onClick: () => setExamResults(null) 
      },
        React.createElement('div', { 
          className: 'modal large-modal', 
          onClick: (e) => e.stopPropagation() 
        },
          React.createElement('div', { className: 'modal-header' },
            React.createElement('h2', null, '📊 Sınav Sonuçları'),
            React.createElement('button', { 
              className: 'close-btn', 
              onClick: () => setExamResults(null) 
            }, '×')
          ),
          React.createElement('div', { className: 'modal-body' },
            React.createElement('div', { className: 'stats-grid' },
              React.createElement('div', { className: 'stat-card' },
                React.createElement('div', { className: 'stat-value' }, `${examResults.average}%`),
                React.createElement('div', { className: 'stat-label' }, 'Ortalama Puan')
              ),
              React.createElement('div', { className: 'stat-card' },
                React.createElement('div', { className: 'stat-value' }, examResults.total_attempts),
                React.createElement('div', { className: 'stat-label' }, 'Katılım Sayısı')
              )
            ),
            React.createElement('div', { className: 'table-container', style: { marginTop: '24px' } },
              React.createElement('table', { className: 'table' },
                React.createElement('thead', null,
                  React.createElement('tr', null,
                    React.createElement('th', null, 'Öğrenci No'),
                    React.createElement('th', null, 'Ad Soyad'),
                    React.createElement('th', null, 'Puan')
                  )
                ),
                React.createElement('tbody', null,
                  examResults.results.map((result, idx) =>
                    React.createElement('tr', { key: idx },
                      React.createElement('td', null, result.student_number),
                      React.createElement('td', null, result.student_name),
                      React.createElement('td', null, 
                        React.createElement('span', { 
                          className: `badge ${result.score >= 50 ? 'badge-success' : 'badge-danger'}` 
                        }, `${result.score}%`)
                      )
                    )
                  )
                )
              )
            )
          )
        )
      ),

      // Sınav Oluşturma Modal
      showExamModal && React.createElement('div', { 
        className: 'modal-overlay', 
        onClick: () => setShowExamModal(false) 
      },
        React.createElement('div', { 
          className: 'modal', 
          onClick: (e) => e.stopPropagation() 
        },
          React.createElement('div', { className: 'modal-header' },
            React.createElement('h2', null, '➕ Yeni Sınav Oluştur'),
            React.createElement('button', { 
              className: 'close-btn', 
              onClick: () => setShowExamModal(false) 
            }, '×')
          ),
          React.createElement('form', { onSubmit: createExam, className: 'modal-body' },
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Sınav Türü'),
              React.createElement('select', {
                value: examForm.exam_type,
                onChange: (e) => setExamForm({ ...examForm, exam_type: e.target.value }),
                className: 'form-control',
                required: true
              },
                React.createElement('option', { value: 'vize' }, 'Vize'),
                React.createElement('option', { value: 'final' }, 'Final')
              )
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Ağırlık Yüzdesi (%)'),
              React.createElement('input', {
                type: 'number',
                min: 0,
                max: 100,
                value: examForm.weight_percentage,
                onChange: (e) => {
                  setExamForm({ ...examForm, weight_percentage: Number(e.target.value) });
                  if (examFormErrors.weight_percentage) {
                    setExamFormErrors({ ...examFormErrors, weight_percentage: '' });
                  }
                },
                className: `form-control ${examFormErrors.weight_percentage ? 'error' : ''}`,
                required: true
              }),
              examFormErrors.weight_percentage && React.createElement('span', { 
                className: 'form-error' 
              }, examFormErrors.weight_percentage)
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Başlangıç Zamanı'),
              React.createElement('input', {
                type: 'datetime-local',
                value: examForm.start_time,
                onChange: (e) => {
                  setExamForm({ ...examForm, start_time: e.target.value });
                  if (examFormErrors.start_time) {
                    setExamFormErrors({ ...examFormErrors, start_time: '' });
                  }
                },
                className: `form-control ${examFormErrors.start_time ? 'error' : ''}`,
                required: true
              }),
              examFormErrors.start_time && React.createElement('span', { 
                className: 'form-error' 
              }, examFormErrors.start_time)
            ),
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', null, 'Bitiş Zamanı'),
              React.createElement('input', {
                type: 'datetime-local',
                value: examForm.end_time,
                onChange: (e) => {
                  setExamForm({ ...examForm, end_time: e.target.value });
                  if (examFormErrors.end_time) {
                    setExamFormErrors({ ...examFormErrors, end_time: '' });
                  }
                },
                className: `form-control ${examFormErrors.end_time ? 'error' : ''}`,
                required: true
              }),
              examFormErrors.end_time && React.createElement('span', { 
                className: 'form-error' 
              }, examFormErrors.end_time)
            ),
            React.createElement('div', { className: 'modal-actions' },
              React.createElement('button', {
                type: 'button',
                className: 'btn btn-secondary',
                onClick: () => setShowExamModal(false)
              }, 'İptal'),
              React.createElement('button', { 
                type: 'submit', 
                className: 'btn btn-primary' 
              }, '✓ Oluştur')
            )
          )
        )
      ),

      // Soru Yönetimi Modal
      showQuestionModal && React.createElement('div', { 
        className: 'modal-overlay', 
        onClick: () => setShowQuestionModal(false) 
      },
        React.createElement('div', { 
          className: 'modal large-modal', 
          onClick: (e) => e.stopPropagation()
        },
          React.createElement('div', { className: 'modal-header' },
            React.createElement('h2', null, 
              `📝 Soru Yönetimi - ${selectedExam?.exam_type === 'vize' ? 'Vize' : 'Final'}`
            ),
            React.createElement('button', { 
              className: 'close-btn', 
              onClick: () => setShowQuestionModal(false) 
            }, '×')
          ),
          React.createElement('div', { className: 'modal-body' },
            isExamStarted(selectedExam) && React.createElement('div', { 
              className: 'alert alert-warning',
              style: { marginBottom: '24px' }
            }, 
              '⚠️ Sınav başladıktan sonra soru eklenemez veya silinemez.'
            ),
            React.createElement('div', { 
              className: `alert ${questions.length >= 5 ? 'alert-success' : 'alert-warning'}`,
              style: { marginBottom: '24px' }
            }, 
              React.createElement('div', null,
                React.createElement('strong', null, `Havuz Soru Sayısı: ${questions.length}`),
                questions.length >= 5 ? 
                  React.createElement('div', { style: { marginTop: '8px', fontSize: '14px' } }, 
                    '✓ Her öğrenciye rastgele 5 soru gösterilecek'
                  ) :
                  React.createElement('div', { style: { marginTop: '8px', fontSize: '14px' } }, 
                    '⚠ Minimum 5 soru gerekli'
                  )
              )
            ),
            
            React.createElement('div', { className: 'card', style: { marginBottom: '24px' } },
              React.createElement('div', { className: 'card-header' },
                React.createElement('h3', null, '➕ Yeni Soru Ekle')
              ),
              isExamStarted(selectedExam) ? 
                React.createElement('div', { className: 'card-body' },
                  React.createElement('p', { style: { color: '#999', fontStyle: 'italic' } }, 
                    'Sınav başladığı için yeni soru eklenemez.'
                  )
                ) :
                React.createElement('form', { onSubmit: addQuestion, className: 'card-body' },
                React.createElement('div', { className: 'form-group' },
                  React.createElement('label', null, 'Soru Metni'),
                  React.createElement('textarea', {
                    value: questionForm.question_text,
                    onChange: (e) => {
                      setQuestionForm({ ...questionForm, question_text: e.target.value });
                      if (questionFormErrors.question_text) {
                        setQuestionFormErrors({ ...questionFormErrors, question_text: '' });
                      }
                    },
                    className: `form-control ${questionFormErrors.question_text ? 'error' : ''}`,
                    required: true,
                    rows: 3,
                    placeholder: 'Soru metnini buraya yazın...'
                  }),
                  questionFormErrors.question_text && React.createElement('span', { 
                    className: 'form-error' 
                  }, questionFormErrors.question_text)
                ),
                React.createElement('div', { className: 'grid grid-2' },
                  questionFormErrors.options && React.createElement('div', { 
                    className: 'alert alert-error',
                    style: { marginBottom: '1rem', fontSize: '0.875rem', gridColumn: '1 / -1' }
                  }, questionFormErrors.options),
                  React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'A Şıkkı'),
                    React.createElement('input', {
                      type: 'text',
                      value: questionForm.option_a,
                      onChange: (e) => {
                        setQuestionForm({ ...questionForm, option_a: e.target.value });
                        if (questionFormErrors.options) {
                          setQuestionFormErrors({ ...questionFormErrors, options: '' });
                        }
                      },
                      className: `form-control ${questionFormErrors.options ? 'error' : ''}`,
                      required: true,
                      placeholder: 'A şıkkı'
                    })
                  ),
                  React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'B Şıkkı'),
                    React.createElement('input', {
                      type: 'text',
                      value: questionForm.option_b,
                      onChange: (e) => {
                        setQuestionForm({ ...questionForm, option_b: e.target.value });
                        if (questionFormErrors.options) {
                          setQuestionFormErrors({ ...questionFormErrors, options: '' });
                        }
                      },
                      className: `form-control ${questionFormErrors.options ? 'error' : ''}`,
                      required: true,
                      placeholder: 'B şıkkı'
                    })
                  ),
                  React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'C Şıkkı'),
                    React.createElement('input', {
                      type: 'text',
                      value: questionForm.option_c,
                      onChange: (e) => {
                        setQuestionForm({ ...questionForm, option_c: e.target.value });
                        if (questionFormErrors.options) {
                          setQuestionFormErrors({ ...questionFormErrors, options: '' });
                        }
                      },
                      className: `form-control ${questionFormErrors.options ? 'error' : ''}`,
                      required: true,
                      placeholder: 'C şıkkı'
                    })
                  ),
                  React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'D Şıkkı'),
                    React.createElement('input', {
                      type: 'text',
                      value: questionForm.option_d,
                      onChange: (e) => {
                        setQuestionForm({ ...questionForm, option_d: e.target.value });
                        if (questionFormErrors.options) {
                          setQuestionFormErrors({ ...questionFormErrors, options: '' });
                        }
                      },
                      className: `form-control ${questionFormErrors.options ? 'error' : ''}`,
                      required: true,
                      placeholder: 'D şıkkı'
                    })
                  ),
                  React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'E Şıkkı'),
                    React.createElement('input', {
                      type: 'text',
                      value: questionForm.option_e,
                      onChange: (e) => {
                        setQuestionForm({ ...questionForm, option_e: e.target.value });
                        if (questionFormErrors.options) {
                          setQuestionFormErrors({ ...questionFormErrors, options: '' });
                        }
                      },
                      className: `form-control ${questionFormErrors.options ? 'error' : ''}`,
                      required: true,
                      placeholder: 'E şıkkı'
                    })
                  ),
                  React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Doğru Cevap'),
                    React.createElement('select', {
                      value: questionForm.correct_answer,
                      onChange: (e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value }),
                      className: 'form-control',
                      required: true
                    },
                      React.createElement('option', { value: 'A' }, 'A'),
                      React.createElement('option', { value: 'B' }, 'B'),
                      React.createElement('option', { value: 'C' }, 'C'),
                      React.createElement('option', { value: 'D' }, 'D'),
                      React.createElement('option', { value: 'E' }, 'E')
                    )
                  )
                ),
                React.createElement('button', { 
                  type: 'submit', 
                  className: 'btn btn-primary' 
                }, '✓ Soru Ekle')
              )
            ),
            
            React.createElement('div', { className: 'card' },
              React.createElement('div', { className: 'card-header' },
                React.createElement('h3', null, '📋 Soru Listesi')
              ),
              React.createElement('div', { className: 'card-body' },
                questions.length === 0 ? 
                  React.createElement('div', { className: 'empty-state' },
                    React.createElement('p', null, '❓ Henüz soru eklenmemiş')
                  ) :
                  questions.map((q, idx) =>
                    React.createElement('div', { key: q.id, className: 'question-item' },
                      React.createElement('div', { className: 'question-header' },
                        React.createElement('h4', null, `Soru ${idx + 1}`),
                        isExamStarted(selectedExam) ? 
                          React.createElement('button', {
                            className: 'btn btn-sm btn-danger',
                            disabled: true,
                            style: { opacity: 0.5, cursor: 'not-allowed' },
                            title: 'Sınav başladığı için soru silinemez'
                          }, '🗑️ Sil') :
                          React.createElement('button', {
                            className: 'btn btn-sm btn-danger',
                            onClick: () => deleteQuestion(q.id)
                          }, '🗑️ Sil')
                      ),
                      React.createElement('p', { className: 'question-text' }, q.question_text),
                      React.createElement('div', { className: 'question-options' },
                        React.createElement('div', { className: 'option' }, `A) ${q.option_a}`),
                        React.createElement('div', { className: 'option' }, `B) ${q.option_b}`),
                        React.createElement('div', { className: 'option' }, `C) ${q.option_c}`),
                        React.createElement('div', { className: 'option' }, `D) ${q.option_d}`),
                        React.createElement('div', { className: 'option' }, `E) ${q.option_e}`)
                      ),
                      React.createElement('div', { className: 'correct-answer' }, 
                        `✓ Doğru Cevap: ${q.correct_answer}`
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

export default InstructorDashboard;
