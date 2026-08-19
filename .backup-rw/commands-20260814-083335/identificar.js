import { llamarApi } from '../lib/api.js';

export default {
    nombre: 'identificar',
    categoria: 'ultilidades',
    alias: ['id'],
    descripcion: '¿Qué plataforma y tipo de contenido es un link? Uso: .identificar <link>',
    ejecutar: async ({ responder, argumento }) => {
        if (!argumento) return responder.texto('Manda un link. Ej: .identificar https://vm.tiktok.com/xxxx');
        const data = await llamarApi('/api/v1/identify', { url: argumento });
        if (!data.status) return responder.texto('❌ ' + data.message);
        await responder.texto(`🔎 Plataforma: ${data.result.plataforma}\nTipo: ${data.result.tipo}`);
    }
};