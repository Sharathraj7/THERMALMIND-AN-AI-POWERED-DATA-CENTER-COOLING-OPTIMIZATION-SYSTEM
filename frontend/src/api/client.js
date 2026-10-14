import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('thermalmind_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor to handle session expiration
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired and not on login page
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('thermalmind_token');
        localStorage.removeItem('thermalmind_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
