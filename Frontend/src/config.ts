// Backend Configuration
export const API_BASE_URL = 'https://printr-backend.onrender.com'; // production URL
export const getHeaders = () => {
    const token = localStorage.getItem('printr_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};
