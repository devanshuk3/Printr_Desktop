// Backend Configuration
export const API_BASE_URL = 'https://printr-backend.onrender.com'; // production URL
export const getHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('printr_token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};
