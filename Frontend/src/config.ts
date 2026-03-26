export const API_BASE_URL = 'https://printr-desktop1.onrender.com';
export const getHeaders = () => {
    const token = localStorage.getItem('printr_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};
