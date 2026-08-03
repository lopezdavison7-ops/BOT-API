import { llamarApi } from '../lib/api.js';

export default {
    nombre: 'password',
    alias: ['clave'],
    descripcion: 'Genera una contraseña segura. Uso: .password <longitud>',
    ejecutar: async ({ responder, argumento }) => {
        const data = await llamarApi('/api/v1/tools/password', { q: argumento || '16' });
        await responder.texto(`🔐 Contraseña generada:\n\`\`\`${data.result.password}\`\`\``);
    }
};