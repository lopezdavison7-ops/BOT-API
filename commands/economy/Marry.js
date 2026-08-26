import {
    estaCasado,
    obtenerPareja,
    obtenerPropuestaPendiente,
    crearPropuesta,
    eliminarPropuesta // <- ahora sí existe
} from '../../database/perfiles.js';

export default {
    nombre: 'marry',
    categoria: 'economia',
    alias: ['casar', 'casarse'],
    descripcion: 'Propón matrimonio. Dura 2 minutos. Uso:.marry @usuario',

    ejecutar: async ({ msg, responder, sock }) => {
        const s = sock || global.conns?.[0] || Object.values(global.conns)[0];
        const chatJid = msg.key.remoteJid;
        const emisor = msg.key.participant || msg.key.remoteJid;
        const DOS_MINUTOS = 2 * 60 * 1000;

        const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        if (mencionados.length === 0) {
            return responder.texto('╭〔 ⚠️ 𝐌𝐀𝐑𝐘 〕⬣\n┃\n┃ ❌ Menciona a la persona.\n┃\n┃ 📌 Uso:.marry @usuario\n┃\n╰━━━━━━━━⬣');
        }

        const receptor = mencionados[0];

        if (receptor === emisor) {
            return responder.texto('╭〔 ❌ 𝐌𝐀𝐑𝐘 〕⬣\n┃\n┃ No puedes proponerte matrimonio a\n┃ ti mismo.\n┃\n╰━━━━━━━━⬣');
        }

        if (estaCasado(emisor)) {
            const parejaActual = obtenerPareja(emisor);
            let text = '╭〔 ❌ 𝐌𝐀𝐑𝐑𝐘 〕⬣\n┃\n┃ Ya estás casado con\n';
            text += `┃ @${parejaActual.split('@')[0]}\n┃\n╰━━━━━━━━⬣`;
            return await s.sendMessage(chatJid, { text, mentions: [parejaActual] }, { quoted: msg });
        }

        if (estaCasado(receptor)) {
            return responder.texto('╭〔 ❌ 𝐌𝐀𝐑𝐘 〕⬣\n┃\n┃ Esa persona ya está casada.\n┃\n╰━━━━━━━━⬣');
        }

        const prop = obtenerPropuestaPendiente(receptor);

        // Si hay propuesta, checar si expiró
        if (prop) {
            if (Date.now() - prop.timestamp > DOS_MINUTOS) {
                eliminarPropuesta(receptor); // expiró, la borramos
            } else {
                if (prop.emisor === emisor) {
                    return responder.texto('╭〔 ⚠️ 𝐌𝐀𝐑𝐑𝐘 〕⬣\n┃\n┃ Ya le mandaste una propuesta.\n┃ Espera a que use *.aceptar*\n┃ ⏰ Expira en 2 min\n┃\n╰━━━━━━━━⬣');
                } else {
                    return responder.texto('╭〔 ⚠️ 𝐌𝐀𝐑𝐘 〕⬣\n┃\n┃ Esa persona ya tiene una propuesta pendiente.\n┃\n╰━━━━━━━━⬣');
                }
            }
        }

        crearPropuesta(emisor, receptor); // ya guarda el timestamp

        let text = '╭〔 💍 𝐏𝐑𝐎𝐏𝐔𝐄𝐒𝐓𝐀 𝐃𝐄 𝐌𝐀𝐓𝐑𝐈𝐌𝐎𝐍𝐈𝐎 〕⬣\n';
        text += '┃\n';
        text += `┃ @${emisor.split('@')[0]} le propone\n`;
        text += `┃ matrimonio a @${receptor.split('@')[0]} 💕\n`;
        text += '┃\n';
        text += '┃ Para aceptar, escribe:\n';
        text += '┃ *.aceptar*\n';
        text += '┃ ⏰ Tienes 2 minutos\n';
        text += '┃\n';
        text += '╰━━━━━━━━⬣';

        await s.sendMessage(chatJid, { text, mentions: [emisor, receptor] }, { quoted: msg });

        // Auto-borrar a los 2 min
        setTimeout(() => {
            const p = obtenerPropuestaPendiente(receptor);
            if (p && p.emisor === emisor) {
                eliminarPropuesta(receptor);
            }
        }, DOS_MINUTOS);
    }
};