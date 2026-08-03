import axios from 'axios';

const ALEX_API_URL = process.env.ALEX_API_URL || 'https://alex-api-scraper2-1.onrender.com';
const ALEX_API_KEY = process.env.ALEX_API_KEY;

export async function llamarApi(ruta, params = {}) {
    const { data } = await axios.get(`${ALEX_API_URL}${ruta}`, {
        params: { ...params, apikey: ALEX_API_KEY },
        timeout: 30000
    });
    return data;
}