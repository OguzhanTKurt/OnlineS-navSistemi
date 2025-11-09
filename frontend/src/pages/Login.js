import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { setAuthToken, setUserData } from '../utils/auth';
import { translateError } from '../utils/errorMessages';
import './Login.css';

function Login({ setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(username, password);
      const { token, user } = response.data;

      setAuthToken(token);
      setUserData(user);
      setUser(user);

      // Redirect based on role
      switch (user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'instructor':
          navigate('/instructor');
          break;
        case 'student':
          navigate('/student');
          break;
        case 'department_head':
          navigate('/department-head');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      setError(translateError(err.response?.data?.error || 'Giriş başarısız. Lütfen tekrar deneyin.'));
    } finally {
      setLoading(false);
    }
  };

  return React.createElement('div', { className: 'login-container' },
    React.createElement('div', { className: 'login-card' },
      // Header
      React.createElement('div', { className: 'login-header' },
        React.createElement('div', { className: 'login-logo' },
          React.createElement('img', { 
            src: '/logo.png', 
            alt: 'KOSTÜ Logo',
            style: { width: '100%', height: '100%', objectFit: 'contain' }
          })
        ),
        React.createElement('h1', { className: 'login-title' }, 'Online Sınav Sistemi'),
        React.createElement('p', { className: 'login-subtitle' }, 'Devam etmek için giriş yapın')
      ),
      
      // Error Message
      error && React.createElement('div', { className: 'login-error' },
        React.createElement('span', null, error)
      ),
      
      // Login Form
      React.createElement('form', { className: 'login-form', onSubmit: handleSubmit },
        React.createElement('div', { className: 'login-input-group' },
          React.createElement('input', {
            type: 'text',
            className: 'login-input',
            value: username,
            onChange: (e) => setUsername(e.target.value),
            required: true,
            placeholder: 'Kullanıcı adı',
            autoComplete: 'username'
          })
        ),
        
        React.createElement('div', { className: 'login-input-group' },
          React.createElement('input', {
            type: 'password',
            className: 'login-input',
            value: password,
            onChange: (e) => setPassword(e.target.value),
            required: true,
            placeholder: 'Şifre',
            autoComplete: 'current-password'
          })
        ),
        
        React.createElement('button', {
          type: 'submit',
          className: 'login-button',
          disabled: loading
        }, 
          loading && React.createElement('span', { className: 'login-loading' }),
          React.createElement('span', null, loading ? 'Giriş yapılıyor...' : 'Giriş Yap')
        )
      ),
      
      // Footer
      React.createElement('div', { className: 'login-footer' },
        React.createElement('p', { className: 'login-footer-text' }, 
          '© 2025 KOCAELİ SAĞLIK VE TEKNOLOJİ ÜNİVERSİTESİ Online Sınav Sistemi. Tüm hakları saklıdır.'
        )
      )
    )
  );
}

export default Login;
