import axios from 'axios';

// TEMP for local viewing: macOS AirPlay Receiver already occupies :5000 on
// this machine, so the backend is running on :5050 instead for now. Revert
// to :5000 (or make this configurable) before committing.
const API = axios.create({
  baseURL: 'http://localhost:5050/api',
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const getCurrentUser = () => API.get('/auth/me');

export const getUserProfile = () => API.get('/users/profile');
export const updateUserProfile = (data) => API.put('/users/profile', data);

export const getReports = () => API.get('/reports');
export const getReport = (id) => API.get(`/reports/${id}`);
export const createReport = (data) => API.post('/reports', data);
export const updateReport = (id, data) => API.put(`/reports/${id}`, data);
export const deleteReport = (id) => API.delete(`/reports/${id}`);
export const getTransposedData = () => API.post('/reports/transpose/data');

// Issues a short-lived, single-use code the digital-twin app (a different
// origin/port) can exchange for its own session token — see
// routes/auth.js's /handoff and /handoff/exchange.
export const requestDigitalTwinHandoff = () => API.post('/auth/handoff');

export default API;
