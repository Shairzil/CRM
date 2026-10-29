import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

// Attach JWT token from sessionStorage to every request
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('nexted_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401 response and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('nexted_token');
        sessionStorage.removeItem('confidential_logged_in');
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
