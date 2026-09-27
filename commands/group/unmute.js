import { desmutear, estaMuteado } from '../../database/mutes.js';
import { verificarPermisosAdmin } from '../../lib/grupos.js';

export default {
    nombre: 'unmute',
    categoria: 'grupos',
    alias: ['desmutear', 'desilenciar', 'quitarMute'],
    descripcion: 'Quita el muteo a un usuario.',
    uso: '.unmute @usuario',
    soloGrupos: true,
    soloAdmins: true,

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const permiso = await verificarPermisosAdmin(sock, msg, jid);
        if (!permiso?.ok) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐒𝐈𝐍 𝐏𝐄𝐑𝐌𝐈𝐒𝐎𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ ' + (permiso?.mensaje || 'Necesitas ser admin.') + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quotedKey = msg.message?.extendedTextMessage?.contextInfo?.participant;
        const objetivo = mentions[0] || quotedKey;

        if (!objetivo) {
            return await responder.texto(
                '╭━━〔 🔊 𝐔𝐍𝐌𝐔𝐓𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Menciona al usuario\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ ➪ .unmute @usuario\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (!estaMuteado(jid, objetivo)) {
            return await responder.texto('⚠️ Ese usuario no está muteado.');
        }

        desmutear(jid, objetivo);
        const numero = String(objetivo).split('@')[0];

        await sock.sendMessage(jid, {
            text:
                '╭━━〔 🔊 𝐔𝐒𝐔𝐀𝐑𝐈𝐎 𝐃𝐄𝐒𝐌𝐔𝐓𝐄𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 👤 @' + numero + '\n' +
                '┃\n' +
                '┃ ✅ Ya puede enviar mensajes\n' +
                '┃    normalmente.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣',
            mentions: [objetivo]
        }, { quoted: msg });

        console.log(`[UNMUTE] ${numero} desmuteado en ${jid}`);
    }
};