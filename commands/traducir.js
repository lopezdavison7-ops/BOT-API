import { llamarApi } from '../lib/api.js';

export default {
    nombre: 'traducir',
    alias: ['tr'],
    descripcion: 'Traduce texto. Uso: .traducir <texto>|<idioma>',
    ejecutar: async ({ responder, argumento }) => {
        if (!argumento.includes('|')) return responder.texto('Formato: .traducir texto|idioma\nEj: .traducir hola amigo|en');
        const data = await llamarApi('/api/v1/tools/traducir', { q: argumento });
        if (!data.status) return responder.texto('❌ ' + data.message);
        await responder.texto(`🌐 ${data.result.traduccion}`);
    }
};