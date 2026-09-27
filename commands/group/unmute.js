import { desmutear, estaMuteado } from '../../database/mutes.js';

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
    nombre: 'unmute',

    categoria: 'grupos',

    alias: ['desmutear', 'desilenciar', 'quitarMute'],

    descripcion: 'Quita el muteo a un usuario.',

    uso: '.unmute @usuario',

    ejecutar: async ({ sock, msg, argumento, responder, jid, isGroup }) => {

        if (!isGroup) {
            return await responder.texto('❌ Solo en grupos.');
        }

        const admin = await esAdmin(sock, msg, jid);

        if (!admin) {
            return await responder.texto(
                '╭━━〔  𝐒𝐈 𝐏𝐄𝐑𝐌𝐈𝐒𝐎𝐒 〕━━⬣\n' +
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
                '╭━━〔 🔊 𝐍𝐌𝐔𝐓𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Menciona al usuario\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ ➪ .unmute @usuario\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
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
    }
};