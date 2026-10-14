import {
    bienvenidaActivada,
    establecerBienvenida,
    obtenerMensaje,
    establecerMensaje
} from '../../lib/bienvenidaStore.js';

const OWNERS_PRINCIPALES = ['50578391933', '50577455383'];

function numeroVisible(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function esOwner(sock, msg) {
    const candidatos = [
        msg.key.participant, msg.key.senderPn, msg.key.participantAlt,
        msg.key.sender, msg.key.remoteJid
    ].filter(Boolean);

    for (const c of candidatos) {
        if (OWNERS_PRINCIPALES.includes(numeroVisible(c))) return true;
    }

    try {
        for (const c of candidatos) {
            if (String(c).endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(c);
                if (pn && OWNERS_PRINCIPALES.includes(numeroVisible(pn))) return true;
            }
        }
    } catch (e) {}

    return false;
}

async function esAdmin(sock, jid, sender) {
    try {
        const meta = await sock.groupMetadata(jid);
        const num = numeroVisible(sender);
        for (const p of meta.participants || []) {
            if (numeroVisible(p.id) === num) {
                return p.admin === 'admin' || p.admin === 'superadmin';
            }
        }
    } catch (e) {}
    return false;
}

export default {
    nombre: 'bienvenida',
    categoria: 'Grupos',
    alias: ['welcome', 'setwelcome'],
    descripcion: 'Activa, desactiva y personaliza la bienvenida del grupo',
    uso: '.bienvenida on | off | <mensaje> | reset',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        if (!jid?.endsWith('@g.us')) {
            return await responder.texto('❌ Este comando solo funciona en grupos.');
        }

        const sender = msg.key.participant || msg.key.senderPn || msg.key.remoteJid;
        const owner = await esOwner(sock, msg);
        const admin = owner ? true : await esAdmin(sock, jid, sender);

        if (!admin) {
            return await responder.texto(
                '╭━━〔 🔒 𝐀𝐂𝐂𝐄𝐒𝐎 𝐃𝐄𝐍𝐄𝐆𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ⛔ Solo *admins* o el *Owner*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const opcion = String(argumento || '').trim();

        if (!opcion) {
            const activa = bienvenidaActivada(jid);
            const mensaje = obtenerMensaje(jid);

            return await responder.texto(
                '╭━━━〔 🤖 𝐁𝐎𝐓-𝐀𝐏𝐈 〕━━━╮\n' +
                '┃\n' +
                '┃ 👋 *BIENVENIDA*\n' +
                '┃\n' +
                '┃ Estado: ' + (activa ? '🟢 ACTIVADA' : '🔴 DESACTIVADA') + '\n' +
                '┃ Mensaje: ' + (mensaje ? '📝 Personalizado' : '🤖 Por defecto') + '\n' +
                (mensaje ? '┃\n┃  ' + mensaje + '\n' : '') +
                '┃\n' +
                '┃ Comandos:\n' +
                '┃ • .bienvenida on\n' +
                '┃ • .bienvenida off\n' +
                '┃ • .bienvenida <mensaje>\n' +
                '┃ • .bienvenida reset\n' +
                '┃\n' +
                '┃ Variables:\n' +
                '┃ @user @name @group\n' +
                '┃ @members @date\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━╯'
            );
        }

        const baja = opcion.toLowerCase();

        if (['on', 'activar', 'encender'].includes(baja)) {
            establecerBienvenida(jid, true);
            return await responder.texto(
                '╭━━━〔 🤖 𝐁𝐎𝐓-𝐀𝐏𝐈 〕━━━╮\n' +
                '┃\n' +
                '┃ 🟢 *BIENVENIDA ACTIVADA*\n' +
                '┃\n' +
                '┃ Las nuevas personas que\n' +
                '┃ entren al grupo recibirán\n' +
                '┃ una bienvenida automática.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━╯'
            );
        }

        if (['off', 'desactivar', 'apagar'].includes(baja)) {
            establecerBienvenida(jid, false);
            return await responder.texto(
                '╭━━━〔 🤖 𝐁𝐎𝐓-𝐀𝐏𝐈 〕━━━╮\n' +
                '┃\n' +
                '┃ 🔴 *BIENVENIDA DESACTIVADA*\n' +
                '┃\n' +
                '┃ Ya no se enviarán mensajes\n' +
                '┃ automáticos al entrar.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━╯'
            );
        }

        if (['reset', 'default', 'eliminar'].includes(baja)) {
            establecerMensaje(jid, null);
            return await responder.texto(
                '╭━━━〔 🤖 𝐁𝐎𝐓-𝐀𝐏𝐈 〕━━━╮\n' +
                '┃\n' +
                '┃ 🔄 Mensaje restaurado al\n' +
                '┃    *por defecto*\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━╯'
            );
        }

        if (opcion.length > 1000) {
            return await responder.texto('❌ Máximo 1000 caracteres.');
        }

        establecerMensaje(jid, opcion);
        establecerBienvenida(jid, true);

        return await responder.texto(
            '╭━━━〔 🤖 𝐁𝐎𝐓-𝐀𝐏𝐈 〕━━━╮\n' +
            '┃\n' +
            '┃ 💾 Mensaje guardado:\n' +
            '┃\n' +
            '┃ ' + opcion + '\n' +
            '┃\n' +
            '┃ 🟢 Bienvenida activada\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯'
        );
    }
};