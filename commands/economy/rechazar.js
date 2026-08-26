import { obtenerPropuestaPendiente, eliminarPropuesta } from '../../database/perfiles.js';
export default {
    nombre: 'rechazar',
    categoria: 'economia',
    descripcion: 'Rechaza una propuesta de matrimonio. Uso:.rechazar',
    ejecutar: async ({ msg, responder, sock }) => {
        const s = sock || global.conns?.[0];
        const chatJid = msg.key.remoteJid;
        const id = msg.key.participant || msg.key.remoteJid;
        const prop = obtenerPropuestaPendiente(id);
        if (!prop) return responder.texto('╭〔 ⚠️ 𝐑𝐄𝐂𝐇𝐀𝐙𝐀𝐑 〕⬣\n┃\n┃ No tienes propuestas pendientes.\n┃\n╰━━━━━━━━⬣');
        eliminarPropuesta(id);
        await s.sendMessage(chatJid, { text: `╭〔 💔 𝐑𝐄𝐂𝐇𝐀𝐙𝐀𝐃𝐎 〕⬣\n┃\n┃ @${id.split('@')[0]} rechazó la propuesta\n┃ de @${prop.emisor.split('@')[0]}\n┃\n╰━━━━━━━━⬣`, mentions: [id, prop.emisor] }, { quoted: msg });
    }
};