// Production - Render Backend
export const API_BASE_URL = 'https://printr-backend.onrender.com';
// export const API_BASE_URL = 'http://localhost:5000'; // Local testing
export const getHeaders = () => {
    const token = localStorage.getItem('printr_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};
