// commands/fun/encuesta.js
export default {
    nombre: 'encuesta',
    categoria: 'Diversión',
    alias: ['poll'],
    descripcion: 'Crea una encuesta real de WhatsApp. Uso: .encuesta pregunta|opcion1|opcion2',
    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const partes = argumento.split('|').map(p => p.trim()).filter(Boolean);
        if (partes.length < 3) {
            return responder.texto('Formato: .encuesta pregunta|opcion1|opcion2|opcion3...\nMínimo 2 opciones.\nEj: .encuesta ¿Cuál plataforma prefieres?|TikTok|YouTube|Ambas');
        }
        const [pregunta, ...opciones] = partes;
        if (opciones.length > 12) return responder.texto('Máximo 12 opciones.');

        await sock.sendMessage(msg.key.remoteJid, {
            poll: {
                name: pregunta,
                values: opciones,
                selectableCount: 1
            }
        });
    }
};