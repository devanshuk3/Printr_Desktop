// Backend Configuration
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '3000';
export const API_BASE_URL = isDev ? 'http://localhost:5000' : 'https://printr-backend.onrender.com';
export const getHeaders = () => {
    const token = localStorage.getItem('printr_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};
