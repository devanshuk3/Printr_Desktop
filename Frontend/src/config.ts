// Use localhost for local development, switch to Render for production
export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : 'https://printr-desktop1.onrender.com';
export const getHeaders = () => {
    const token = localStorage.getItem('printr_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};
