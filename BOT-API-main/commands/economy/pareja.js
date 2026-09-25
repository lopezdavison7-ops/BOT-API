import { estaCasado, obtenerPareja } from '../../database/perfiles.js';
export default {
    nombre: 'pareja',
    categoria: 'economia',
    alias: ['esposo', 'esposa'],
    descripcion: 'Ver info de tu pareja',
    ejecutar: async ({ msg, responder, sock }) => {
        const s = sock || global.conns?.[0];
        const chatJid = msg.key.remoteJid;
        const id = msg.key.participant || msg.key.remoteJid;
        if (!estaCasado(id)) return responder.texto('╭〔 💔 𝐏𝐀𝐑𝐄𝐉𝐀 〕⬣\n┃\n┃ No estás casado.\n┃\n╰━━━━━━━━⬣');
        const pareja = obtenerPareja(id);
        const perfil = obtenerPerfil(id);
        const dias = Math.floor((Date.now() - perfil.casadoDesde) / 86400000);
        await s.sendMessage(chatJid, { text: `╭〔 💍 𝐏𝐀𝐑𝐄𝐉𝐀 〕⬣\n┃\n┃ Estás casado con @${pareja.split('@')[0]}\n┃ Llevan ${dias} días juntos 💕\n┃\n╰━━━━━━━━⬣`, mentions: [pareja] }, { quoted: msg });
    }
};