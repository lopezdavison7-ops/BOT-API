// ============================================================
// API CLIENT
// Maneja las peticiones hacia Alex API
// ============================================================

import 'dotenv/config';
import axios from 'axios';

// ------------------------------------------------------------
// Configuración
// ------------------------------------------------------------

const ALEX_API_URL =
    process.env.ALEX_API_URL ||
    'https://alex-api-scraper2-1.onrender.com';

const ALEX_API_KEY =
    process.env.ALEX_API_KEY;

// ------------------------------------------------------------
// Cliente principal
// ------------------------------------------------------------

export async function llamarApi(ruta, params = {}) {
    if (!ALEX_API_KEY) {
        throw new Error(
            'ALEX_API_KEY no está configurada en .env'
        );
    }

    try {
        const { data } = await axios.get(
            `${ALEX_API_URL}${ruta}`,
            {
                params: {
                    ...params,
                    apikey: ALEX_API_KEY
                },

                timeout: 30000,

                headers: {
                    Accept: 'application/json'
                }
            }
        );

        return data;

    } catch (error) {
        const status = error.response?.status;
        const mensaje = error.response?.data?.message;

        console.error(
            '[API ERROR]',
            status || 'SIN STATUS',
            mensaje || error.message
        );

        throw error;
    }
}
