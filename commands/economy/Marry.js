import {
    estaCasado,
    obtenerPareja,
    obtenerPropuestaPendiente,
    crearPropuesta
} from '../../database/perfiles.js';

export default {
    nombre: 'marry',
    categoria: 'economia',
    alias: ['casar', 'casarse'],
    descripcion: 'Propón matrimonio a alguien. Uso:.marry @usuario',

    ejecutar: async ({ msg, responder, sock }) => { // <- agregué sock
        const s = sock || global.conns?.[0] || Object.values(global.conns)[0]; // <- para sendMessage
        const chatJid = msg.key.remoteJid;
        const emisor = msg.key.participant || msg.key.remoteJid;

        const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        if (mencionados.length === 0) {
            let text = '╭〔 ⚠️ 𝐌𝐀𝐑𝐘 〕⬣\n';
            text += '┃\n';
            text += '┃ ❌ Menciona a la persona.\n';
            text += '┃\n';
            text += '┃ 📌 Uso:.marry @usuario\n';
            text += '┃\n';
            text += '╰━━━━━━━━⬣';
            return responder.texto(text);
        }

        const receptor = mencionados[0];

        if (receptor === emisor) {
            let text = '╭〔 ❌ 𝐌𝐀𝐑𝐘 〕⬣\n';
            text += '┃\n';
            text += '┃ No puedes proponerte matrimonio a\n';
            text += '┃ ti mismo.\n';
            text += '┃\n';
            text += '╰━━━━━━━━⬣';
            return responder.texto(text);
        }

        if (estaCasado(emisor)) {
            const parejaActual = obtenerPareja(emisor);
            let text = '╭〔 ❌ 𝐌𝐀𝐑𝐘 〕⬣\n';
            text += '┃\n';
            text += '┃ Ya estás casado con\n';
            text += `┃ @${parejaActual.split('@')[0]}\n`;
            text += '┃\n';
            text += '╰━━━━━━━━⬣';
            return await s.sendMessage(chatJid, { text, mentions: [parejaActual] }, { quoted: msg }); // <- FIX
        }

        if (estaCasado(receptor)) {
            let text = '╭〔 ❌ 𝐌𝐀𝐑𝐑𝐘 〕⬣\n';
            text += '┃\n';
            text += '┃ Esa persona ya está casada.\n';
            text += '┃\n';
            text += '╰━━━━━━━━⬣';
            return responder.texto(text);
        }

        if (obtenerPropuestaPendiente(receptor) === emisor) {
            let text = '╭〔 ⚠️ 𝐌𝐀𝐑𝐑𝐘 〕⬣\n';
            text += '┃\n';
            text += '┃ Ya le mandaste una propuesta.\n';
            text += '┃ Espera a que use *.aceptar*\n';
            text += '┃\n';
            text += '╰━━━━━━━━⬣';
            return responder.texto(text);
        }

        crearPropuesta(emisor, receptor);

        let text = '╭〔 💍 𝐏𝐑𝐎𝐏𝐔𝐄𝐒𝐓𝐀 𝐃𝐄 𝐌𝐀𝐓𝐑𝐈𝐌𝐎𝐍𝐈𝐎 〕⬣\n';
        text += '┃\n';
        text += `┃ @${emisor.split('@')[0]} le propone\n`;
        text += `┃ matrimonio a @${receptor.split('@')[0]} 💕\n`;
        text += '┃\n';
        text += '┃ Para aceptar, escribe:\n';
        text += '┃ *.aceptar*\n';
        text += '┃\n';
        text += '╰━━━━━━━━⬣';

        // SOLO CAMBIE ESTO: usar sendMessage con mentions
        await s.sendMessage(chatJid, { text, mentions: [emisor, receptor] }, { quoted: msg });
    }
};