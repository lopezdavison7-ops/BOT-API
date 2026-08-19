import { llamarApi } from '../lib/api.js';

export default {
    nombre: 'qr',
    categoria: 'ultilidades',
    alias: [],
    descripcion: 'Genera un código QR. Uso: .qr <texto o link>',
    ejecutar: async ({ responder, argumento }) => {
        if (!argumento) return responder.texto('Manda el texto o link para el QR. Ej: .qr https://mi-sitio.com');
        const data = await llamarApi('/api/v1/tools/qr', { q: argumento });
        if (!data.status) return responder.texto('❌ ' + data.message);
        await responder.imagen(data.result.imagen_qr, 'Tu código QR');
    }
};