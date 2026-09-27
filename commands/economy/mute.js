import { mutear, estaMuteado } from '../../database/mutes.js';
import { verificarPermisosAdmin } from '../../lib/grupos.js';

export default {
    nombre: 'mute',
    categoria: 'economia',
    alias: ['silenciar', 'mutear', 'silenciaruser'],
    descripcion: 'Mutea a un usuario (el bot le borrará todos sus mensajes).',
    uso: '.mute @usuario [razón]',
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
                '╭━━〔 🔇 𝐌𝐔𝐓𝐄 𝐔𝐒𝐔𝐀𝐑𝐈𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Menciona al usuario\n' +
                '┃    o responde a su mensaje\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .mute @usuario\n' +
                '┃ ➪ .mute @usuario spam\n' +
                '┃\n' +
                '┃ 🤖 El bot le borrará todos\n' +
                '┃    los mensajes automáticamente\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const args = String(argumento || '').replace(/@\d+/g, '').trim();
        const razon = args || 'Sin razón';

        if (estaMuteado(jid, objetivo)) {
            return await responder.texto('⚠️ Ese usuario ya está muteado.');
        }

        const quienMutea = msg.key.participant || msg.key.remoteJid;
        mutear(jid, objetivo, razon, quienMutea);

        const numero = String(objetivo).split('@')[0];

        await sock.sendMessage(jid, {
            text:
                '╭━━〔 🔇 𝐔𝐒𝐔𝐀𝐑𝐈𝐎 𝐌𝐔𝐓𝐄𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 👤 Usuario: @' + numero + '\n' +
                '┃ 📝 Razón: ' + razon + '\n' +
                '┃\n' +
                '┃ 🤖 El bot le borrará todos\n' +
                '┃    los mensajes automáticamente\n' +
                '┃\n' +
                '┃ 💡 Para desmutear:\n' +
                '┃ ➪ .unmute @' + numero + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣',
            mentions: [objetivo]
        }, { quoted: msg });

        console.log(`[MUTE] ${numero} muteado en ${jid} | Razón: ${razon}`);
    }
};