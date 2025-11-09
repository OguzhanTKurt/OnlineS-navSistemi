import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentAPI } from '../services/api';
import { translateError } from '../utils/errorMessages';
import './Dashboard.css';

function ExamTaking({ user }) {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [attemptId, setAttemptId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    
    const initExam = async () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      try {
        const res = await studentAPI.startExam(examId);
        if (!isMounted) return;
        
        setExam(res.data.exam);
        setQuestions(res.data.questions);
        setAttemptId(res.data.attempt_id);
        
        // Calculate remaining time based on start_time
        const durationSeconds = res.data.duration_minutes * 60;
        if (res.data.start_time) {
          const startTime = new Date(res.data.start_time);
          const now = new Date();
          const elapsedSeconds = Math.floor((now - startTime) / 1000);
          const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
          setTimeLeft(remainingSeconds);
        } else {
          setTimeLeft(durationSeconds);
        }
        
        // Start timer - ensure only one interval
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError(translateError(err.response?.data?.error || 'Sınav başlatılamadı'));
        setLoading(false);
      }
    };
    
    initExam();
    
    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [examId]);

  useEffect(() => {
    if (timeLeft === 0 && exam && !result) {
      handleSubmit();
    }
  }, [timeLeft]);


  const handleAnswerChange = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    try {
      const answersArray = Object.keys(answers).map(questionId => ({
        question_id: parseInt(questionId),
        selected_answer: answers[questionId]
      }));

      const res = await studentAPI.submitExam(examId, answersArray);
      setResult(res.data);
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Sınav gönderilemedi'));
      setSubmitting(false);
    }
  };

  const formatTime = React.useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const goBackToDashboard = () => {
    navigate('/student');
  };

  if (loading) {
    return React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'loading' }, 'Sınav yükleniyor...')
    );
  }

  if (error) {
    return React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'alert alert-error' }, error),
      React.createElement('button', {
        className: 'btn btn-primary',
        onClick: goBackToDashboard
      }, 'Panele Dön')
    );
  }

  if (result) {
    const isPass = result.score >= 50;
    return React.createElement('div', { className: 'dashboard' },
      React.createElement('div', { className: 'dashboard-header' },
        React.createElement('div', { className: 'header-content' },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } },
            React.createElement('img', { 
              src: '/logo.png', 
              alt: 'Logo',
              style: { height: '135px', width: 'auto' }
            }),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', lineHeight: '1.3', gap: '0.25rem' } },
              React.createElement('span', { style: { fontSize: '16px', fontWeight: '700', color: '#000', fontFamily: '"Roboto", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)', letterSpacing: '0.5px', whiteSpace: 'nowrap', display: 'block' } }, 'KOCAELİ SAĞLIK VE TEKNOLOJİ ÜNİVERSİTESİ'),
              React.createElement('span', { style: { fontSize: '14px', fontWeight: '700', color: '#000', fontFamily: '"Roboto", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)', letterSpacing: '0.3px', whiteSpace: 'nowrap', display: 'block' } }, 'ONLİNE SINAV SİSTEMİ')
            )
          ),
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', lineHeight: '1.2', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 'auto' } },
            React.createElement('span', { style: { fontSize: '1.25rem', fontWeight: '700', color: '#000', textAlign: 'center', fontFamily: '"Roboto", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif', display: 'block', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)', letterSpacing: '0.5px', whiteSpace: 'nowrap', marginBottom: '0.2rem' } }, exam && exam.exam_type === 'vize' ? 'VİZE' : 'FİNAL'),
            React.createElement('span', { style: { fontSize: '0.875rem', fontWeight: '600', color: '#000', fontFamily: '"Roboto", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif', textAlign: 'center', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)', letterSpacing: '0.3px', whiteSpace: 'nowrap' } }, exam ? exam.course_name : '')
          ),
          React.createElement('div', { className: 'user-info' },
            React.createElement('div', { className: 'user-details' },
              React.createElement('span', { className: 'user-name' }, user?.full_name),
              React.createElement('span', { className: 'user-role' }, 'Öğrenci')
            )
          )
        )
      ),
      React.createElement('div', { className: 'container' },
        React.createElement('div', { className: 'card result-container' },
          React.createElement('div', { style: { 
            textAlign: 'center',
            marginBottom: '2rem'
          } },
            React.createElement('h2', { style: { 
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#0f172a',
              marginBottom: '0.5rem'
            } }, 'Sınav Tamamlandı!'),
            React.createElement('p', { style: {
              fontSize: '1rem',
              color: '#475569'
            } }, 'Sınavınız başarıyla tamamlandı')
          ),
          React.createElement('div', { className: 'result-details' },
            React.createElement('div', { className: 'result-item' },
              React.createElement('p', null, 'Puanınız'),
              React.createElement('h3', { style: { 
                color: isPass ? '#10b981' : '#ef4444'
              } }, `${result.score}%`)
            ),
            React.createElement('div', { className: 'result-item' },
              React.createElement('p', null, 'Sınıf Ortalaması'),
              React.createElement('h3', null, `${result.exam_average}%`)
            )
          ),
          React.createElement('div', { style: {
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #f1f5f9',
            textAlign: 'center'
          } },
            React.createElement('button', {
              className: 'btn btn-primary',
              onClick: goBackToDashboard,
              style: {
                fontSize: '1.125rem',
                padding: '1rem 3rem',
                fontWeight: '600',
                minWidth: '200px'
              }
            }, '← Panele Dön')
          )
        )
      )
    );
  }

  return React.createElement('div', { className: 'dashboard' },
    React.createElement('div', { className: 'dashboard-header' },
      React.createElement('div', { className: 'header-content' },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '15px' } },
          React.createElement('img', { 
            src: '/logo.png', 
            alt: 'Logo',
            style: { height: '90px', width: 'auto' }
          }),
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', lineHeight: '1.3', gap: '0.25rem' } },
            React.createElement('span', { style: { fontSize: '16px', fontWeight: '700', color: '#000', fontFamily: '"Roboto", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)', letterSpacing: '0.5px', whiteSpace: 'nowrap', display: 'block' } }, 'KOCAELİ SAĞLIK VE TEKNOLOJİ ÜNİVERSİTESİ'),
            React.createElement('span', { style: { fontSize: '14px', fontWeight: '700', color: '#000', fontFamily: '"Roboto", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)', letterSpacing: '0.3px', whiteSpace: 'nowrap', display: 'block' } }, 'ONLİNE SINAV SİSTEMİ')
          )
        ),
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', lineHeight: '1.2', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 'auto' } },
          React.createElement('span', { style: { fontSize: '1.25rem', fontWeight: '700', color: '#000', textAlign: 'center', fontFamily: '"Roboto", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif', display: 'block', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)', letterSpacing: '0.5px', whiteSpace: 'nowrap', marginBottom: '0.2rem' } }, exam && exam.exam_type === 'vize' ? 'VİZE' : 'FİNAL'),
          React.createElement('span', { style: { fontSize: '0.875rem', fontWeight: '600', color: '#000', fontFamily: '"Roboto", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif', textAlign: 'center', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)', letterSpacing: '0.3px', whiteSpace: 'nowrap' } }, exam ? exam.course_name : '')
        ),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '1.5rem', marginLeft: 'auto' } },
          React.createElement('div', { className: 'user-info' },
            React.createElement('div', { className: 'user-details' },
              React.createElement('span', { className: 'user-name' }, user?.full_name),
              React.createElement('span', { className: 'user-role' }, 'Öğrenci')
            )
          ),
          React.createElement('div', {
            className: `timer ${timeLeft < 60 ? 'warning' : ''}`,
            style: { 
              position: 'relative',
              top: '0',
              right: '0',
              margin: '0',
              color: '#000',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }
          }, formatTime(timeLeft))
        )
      )
    ),

    React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'alert alert-info' },
        `Tüm soruları süre dolmadan önce cevaplayın. Süre dolduğunda sınav otomatik olarak gönderilecektir.`
      ),

      questions.map((question, index) => {
        return React.createElement('div', { key: question.id, className: 'question-container' },
          React.createElement('h3', null, `Soru ${index + 1}`),
          React.createElement('p', null, question.question_text || 'Soru metni yok'),
          React.createElement('div', { className: 'options' },
            ['A', 'B', 'C', 'D', 'E'].map(option => {
              const optionKey = `option_${option.toLowerCase()}`;
              const optionValue = question[optionKey] || 'Seçenek yok';
              const isSelected = answers[question.id] === option;
              
              return React.createElement('label', {
                key: option,
                className: `option ${isSelected ? 'selected' : ''}`,
                onClick: () => handleAnswerChange(question.id, option)
              },
                React.createElement('input', {
                  type: 'radio',
                  name: `question_${question.id}`,
                  value: option,
                  checked: isSelected,
                  onChange: () => handleAnswerChange(question.id, option)
                }),
                React.createElement('span', null, `${option}) ${optionValue}`)
              );
            })
          )
        );
      }),

      React.createElement('div', { className: 'card', style: { 
        textAlign: 'center', 
        marginTop: '2rem',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, #ffffff 100%)',
        border: '2px solid #10b981'
      } },
        React.createElement('div', { style: { 
          marginBottom: '1rem',
          fontSize: '1rem',
          fontWeight: '600',
          color: '#0f172a'
        } }, 
          `Cevaplanan: ${Object.keys(answers).length} / ${questions.length}`
        ),
        React.createElement('button', {
          className: 'btn btn-success',
          onClick: handleSubmit,
          disabled: submitting,
          style: { 
            fontSize: '1.125rem', 
            padding: '1rem 3rem',
            fontWeight: '600',
            minWidth: '200px'
          }
        }, submitting ? 'Gönderiliyor...' : '✓ Sınavı Gönder')
      )
    )
  );
}

export default ExamTaking;

