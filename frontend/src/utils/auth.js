export const setAuthToken = (token) => {
  localStorage.setItem('token', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const removeAuthToken = () => {
  localStorage.removeItem('token');
};

export const setUserData = (userData) => {
  localStorage.setItem('user', JSON.stringify(userData));
};

export const getUserData = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const removeUserData = () => {
  localStorage.removeItem('user');
};

export const logout = () => {
  removeAuthToken();
  removeUserData();
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

