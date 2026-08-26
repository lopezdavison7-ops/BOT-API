import {
    obtenerPropuestaPendiente,
    aceptarPropuesta
} from '../../database/perfiles.js';

export default {
    nombre: 'aceptar',
    categoria: 'economia',
    alias: ['asectar', 'accept'],
    descripcion: 'Acepta una propuesta de matrimonio pendiente. Uso:.aceptar',

    ejecutar: async ({ msg, responder, sock }) => { // <- agregué sock
        const s = sock || global.conns?.[0] || Object.values(global.conns)[0];
        const chatJid = msg.key.remoteJid;
        const receptor = msg.key.participant || msg.key.remoteJid;

        const pendiente = obtenerPropuestaPendiente(receptor);

        if (!pendiente) {
            let text = '╭〔 ⚠️ 𝐀𝐂𝐄𝐏𝐓𝐀𝐑 〕⬣\n';
            text += '┃\n';
            text += '┃ No tienes ninguna propuesta de\n';
            text += '┃ matrimonio pendiente.\n';
            text += '┃\n';
            text += '┃ 📌 Pide que te propongan con:\n';
            text += '┃ *.marry @usuario*\n';
            text += '┃\n';
            text += '╰━━━━━━━━⬣';
            return responder.texto(text);
        }

        const pareja = aceptarPropuesta(receptor);

        // NUEVO: Checar si expiró
        if (pareja === 'expirado') {
            let text = '╭〔 ⏰ 𝐀𝐂𝐄𝐏𝐓𝐀𝐑 〕⬣\n';
            text += '┃\n';
            text += '┃ La propuesta de matrimonio expiró.\n';
            text += '┃ Tienes solo 2 minutos para aceptar.\n';
            text += '┃\n';
            text += '╰━━━━━━━━⬣';
            return responder.texto(text);
        }

        if (!pareja) {
            let text = '╭〔 ⚠️ 𝐀𝐂𝐄𝐏𝐓𝐀𝐑 〕⬣\n';
            text += '┃\n';
            text += '┃ Esa propuesta ya no está disponible.\n';
            text += '┃\n';
            text += '╰━━━━━━━━⬣';
            return responder.texto(text);
        }

        let text = '╭〔 💒 ¡𝐁𝐎𝐃𝐀! 〕⬣\n';
        text += '┃\n';
        text += `┃ @${pareja.split('@')[0]} y\n`;
        text += `┃ @${receptor.split('@')[0]}\n`;
        text += '┃ ahora están casados 💍💕\n';
        text += '┃\n';
        text += '┃ ¡Felicidades!\n';
        text += '┃\n';
        text += '╰━━━━━━━━⬣';

        // FIX: usar sendMessage para que mencione
        await s.sendMessage(chatJid, { text, mentions: [pareja, receptor] }, { quoted: msg });
    }
};