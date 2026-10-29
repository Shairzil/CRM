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

// 401 = not logged in / session expired → back to the login page.
// 403 = logged in but this role is not allowed → the page shows the error.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('nexted_token');
        sessionStorage.removeItem('nexted_user');
        sessionStorage.removeItem('confidential_logged_in');
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

/** Turns an axios error into a readable message (Nest validation errors are arrays). */
export function apiErrorMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
  const data = err?.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join(' ');
  if (typeof msg === 'string') return msg;
  if (err?.response?.status === 403) return 'You do not have permission to do this.';
  return fallback;
}

export default api;
