import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import StudentDashboard from './pages/StudentDashboard';
import DepartmentHeadDashboard from './pages/DepartmentHeadDashboard';
import ExamTaking from './pages/ExamTaking';
import { isAuthenticated, getUserData } from './utils/auth';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getUserData());
    }
  }, []);

  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!isAuthenticated()) {
      return React.createElement(Navigate, { to: '/login', replace: true });
    }

    const userData = getUserData();
    if (allowedRoles && !allowedRoles.includes(userData.role)) {
      return React.createElement('div', { className: 'container' },
        React.createElement('div', { className: 'alert alert-error' },
          'Access denied. You do not have permission to view this page.'
        )
      );
    }

    return children;
  };

  return React.createElement(Router, null,
    React.createElement(Routes, null,
      React.createElement(Route, {
        path: '/login',
        element: React.createElement(Login, { setUser: setUser })
      }),
      React.createElement(Route, {
        path: '/admin',
        element: React.createElement(ProtectedRoute, { allowedRoles: ['admin'] },
          React.createElement(AdminDashboard, { user: user })
        )
      }),
      React.createElement(Route, {
        path: '/instructor',
        element: React.createElement(ProtectedRoute, { allowedRoles: ['instructor'] },
          React.createElement(InstructorDashboard, { user: user })
        )
      }),
      React.createElement(Route, {
        path: '/student',
        element: React.createElement(ProtectedRoute, { allowedRoles: ['student'] },
          React.createElement(StudentDashboard, { user: user })
        )
      }),
      React.createElement(Route, {
        path: '/student/exam/:examId',
        element: React.createElement(ProtectedRoute, { allowedRoles: ['student'] },
          React.createElement(ExamTaking, { user: user })
        )
      }),
      React.createElement(Route, {
        path: '/department-head',
        element: React.createElement(ProtectedRoute, { allowedRoles: ['department_head'] },
          React.createElement(DepartmentHeadDashboard, { user: user })
        )
      }),
      React.createElement(Route, {
        path: '/',
        element: React.createElement(Navigate, { to: '/login', replace: true })
      })
    )
  );
}

export default App;

