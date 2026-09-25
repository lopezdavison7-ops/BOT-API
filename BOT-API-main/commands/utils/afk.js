

import { obtenerAfk, setAfk, quitarAfk } from '../../lib/afkStore.js';
import { fmtTiempo } from '../../lib/helpers.js';

function jidDe(msg) {
    return msg.key.participant || msg.key.senderPn || msg.key.participantAlt || msg.key.remoteJid;
}
function limpiarNombre(n) {
    return String(n || '').replace(/[*_~`┃╭╰⬣@\n\r]/g, '').trim().slice(0, 25);
}

async function quienEs(sock, jid, nombreGuardado) {

    try {
        if (jid.endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
            const pn = await sock.signalRepository.lidMapper.getPNForLid(jid);
            if (pn) {
                const pj = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                return { texto: '@' + pj.split('@')[0], mentions: [pj] };
            }
        }
    } catch (e) {   }

    const nombre = limpiarNombre(nombreGuardado);
    if (nombre) return { texto: '*' + nombre + '*', mentions: [jid] };

    return { texto: '@' + jid.split('@')[0], mentions: [jid] };
}

export default {
    nombre: 'afk',
    categoria: 'Utils',
    alias: ['ausente', 'away', 'afkoff'],
    descripcion: 'Marca tu estado AFK con razón y aviso automático',
    uso: '.afk [razón] · .afk off',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const sender = jidDe(msg);
        const actual = obtenerAfk(sender);
        const accion = String(argumento || '').trim();

        if (/^(off|salir|volver)$/i.test(accion)) {
            if (!actual) return await responder.texto('⚠️ No estabas AFK.');
            quitarAfk(sender);
            return await responder.texto(
                '╭━━〔 🔙 𝐀𝐅𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ AFK desactivado\n' +
                '┃ ⏱️ Duraste: *' + fmtTiempo(Date.now() - actual.tiempo) + '*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (actual) {
            return await responder.texto(
                '╭━━〔 💤 𝐀𝐅𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ Ya estás AFK:\n' +
                '┃ 📝 ' + actual.razon + '\n' +
                '┃\n' +
                '┃ Usa .afk off para volver\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const nuevo = {
            razon: accion || 'Sin razón',
            tiempo: Date.now(),
            nombre: msg.pushName || ''
        };
        setAfk(sender, nuevo);

        const yo = await quienEs(sock, sender, msg.pushName);

        await sock.sendMessage(msg.key.remoteJid, {
            text:
                '╭━━〔 💤 𝐀𝐅𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ 💤 ' + yo.texto + ' ahora está AFK\n' +
                '┃ 📝 Razón: ' + nuevo.razon + '\n' +
                '┃\n' +
                '┃ Se avisará a quien te mencione,\n' +
                '┃ te responda o escriba tu nombre\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣',
            mentions: yo.mentions
        }, { quoted: msg });
    }
};