export default {
    nombre: 'ping',
    categoria: 'ultilidades',
    alias: [],
    descripcion: 'Muestra la velocidad de respuesta del bot',
    ejecutar: async ({ responder, msg }) => {
        const inicio = Date.now();
        const marcaMensaje = (msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : inicio);
        const latencia = Math.max(inicio - marcaMensaje, 0);
        await responder.texto(`🏓 *Pong!*\nLatencia: ${latencia}ms`);
    }
};