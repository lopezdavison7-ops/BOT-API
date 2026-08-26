import {
    estaCasado,
    obtenerPareja,
    obtenerPropuestaPendiente,
    crearPropuesta,
    eliminarPropuesta
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

        // NUEVO 1: Checar si EL EMISOR ya tiene una propuesta enviada
        const perfilEmisor = obtenerPerfil(emisor);
        // Buscamos si alguien tiene propuestaDe = emisor
        const db = datos();
        const yaPropusoA = Object.keys(db).find(id => db[id].propuestaDe === emisor);

        if (yaPropusoA) {
            const tiempo = db[yaPropusoA].propuestaFecha;
            const restante = DOS_MINUTOS - (Date.now() - tiempo);
            if (restante > 0) {
                const seg = Math.ceil(restante / 1000);
                return responder.texto(`╭〔 ⚠️ 𝐌𝐀𝐑𝐘 〕⬣\n┃\n┃ Ya tienes una propuesta pendiente.\n┃ Espera a que responda o se cancele.\n┃ ⏰ Te quedan ${seg}s\n┃\n╰━━━━━━━━⬣`);
            } else {
                eliminarPropuesta(yaPropusoA); // limpiar la vieja
            }
        }

        const prop = obtenerPropuestaPendiente(receptor);

        // Si hay propuesta al receptor, checar si expiró
        if (prop) {
            if (Date.now() - prop.timestamp > DOS_MINUTOS) {
                eliminarPropuesta(receptor);
            } else {
                return responder.texto('╭〔 ⚠️ 𝐌𝐀𝐑𝐘 〕⬣\n┃\n┃ Esa persona ya tiene una propuesta pendiente.\n┃\n╰━━━━━━━━⬣');
            }
        }

        crearPropuesta(emisor, receptor);

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

        // NUEVO 2: Aviso de "tiempo agotado" cuando se cumpla
        setTimeout(async () => {
            const p = obtenerPropuestaPendiente(receptor);
            if (p && p.emisor === emisor) {
                eliminarPropuesta(receptor);
                let timeoutMsg = '╭〔 ⏰ 𝐓𝐈𝐄𝐌𝐏𝐎 𝐀𝐆𝐎𝐓𝐀𝐃𝐎 〕⬣\n';
                timeoutMsg += '┃\n';
                timeoutMsg += `┃ La propuesta de @${emisor.split('@')[0]} a\n`;
                timeoutMsg += `┃ @${receptor.split('@')[0]} expiró 💔\n`;
                timeoutMsg += '┃\n';
                timeoutMsg += '╰━━━━━━━━⬣';
                await s.sendMessage(chatJid, { text: timeoutMsg, mentions: [emisor, receptor] });
            }
        }, DOS_MINUTOS);
    }
};

// Import que faltaba arriba
import { obtenerPerfil, datos } from '../../database/perfiles.js';