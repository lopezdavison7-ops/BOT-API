import { mutear, estaMuteado } from '../../database/mutes.js';

async function esAdmin(sock, msg, jid) {
    try {
        const dueno = String(process.env.OWNER || '50578391933')
            .split(',')
            .map(n => n.replace(/\D/g, ''))
            .filter(Boolean);

        const nums = [
            msg.key?.senderPn,
            msg.key?.participantAlt,
            msg.key?.participant,
            msg.key?.remoteJid
        ]
            .map(j => String(j || '').split('@')[0].replace(/\D/g, ''))
            .filter(Boolean);

        if (nums.some(n => dueno.includes(n))) return true;

        const meta = await sock.groupMetadata(jid);

        const admins = (meta.participants || [])
            .filter(p => p.admin)
            .map(p => String(p.id).split('@')[0].replace(/\D/g, ''));

        if (nums.some(n => admins.includes(n))) return true;

        if (msg.key?.participant?.endsWith('@lid')) {
            if (sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn =
                    await sock.signalRepository.lidMapper.getPNForLid(
                        msg.key.participant
                    );
                if (pn) {
                    const n = String(pn).split('@')[0].replace(/\D/g, '');
                    if (admins.includes(n) || dueno.includes(n)) return true;
                }
            }
        }
    } catch {}

    return false;
}

export default {
    nombre: 'mute',

    categoria: 'grupos',

    alias: ['silenciar', 'mutear', 'silenciaruser'],

    descripcion: 'Mutea a un usuario (el bot le borrará todos sus mensajes).',

    uso: '.mute @usuario [razón]',

    ejecutar: async ({ sock, msg, argumento, responder, jid, isGroup }) => {

        if (!isGroup) {
            return await responder.texto('❌ Solo en grupos.');
        }

        const admin = await esAdmin(sock, msg, jid);

        if (!admin) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐒𝐈𝐍 𝐏𝐄𝐑𝐌𝐈𝐒𝐎𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ Necesitas ser *admin* del grupo\n' +
                '┃ o el *owner* del bot.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const mentions =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        const quotedKey =
            msg.message?.extendedTextMessage?.contextInfo?.participant;

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
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const razon =
            String(argumento || '').replace(/@\d+/g, '').trim() || 'Sin razón';

        if (estaMuteado(jid, objetivo)) {
            return await responder.texto('⚠️ Ese usuario ya está muteado.');
        }

        const quienMutea =
            msg.key.participant || msg.key.remoteJid;

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
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣',
            mentions: [objetivo]
        }, { quoted: msg });
    }
};