import { estaActivo, activar, desactivar } from '../../database/modoadmin.js';
import { esAdminGrupo } from '../../lib/adminCheck.js';

export default {
    nombre: 'modoadmin',

    categoria: 'grupos',

    alias: ['adminmode', 'modoadmins', 'soloadmins'],

    descripcion: 'Activa o desactiva el modo admin (el bot solo responde a admins).',

    uso: '.modoadmin | .modoadmin off',

    ejecutar: async ({ sock, msg, argumento, responder, jid, isGroup }) => {

        if (!isGroup) {
            return await responder.texto('❌ Solo en grupos.');
        }

        const admin = await esAdminGrupo(sock, msg, jid);

        if (!admin) {
            return await responder.texto(
                '╭━━〔  𝐒𝐈 𝐏𝐄𝐑𝐌𝐈𝐒𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ Solo *admins* u *owner*\n' +
                '┃ pueden usar esto.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const accion = String(argumento || '').trim().toLowerCase();

        if (
            accion === 'off' ||
            accion === 'apagar' ||
            accion === 'desactivar'
        ) {
            desactivar(jid);

            return await responder.texto(
                '╭━━〔 🔓 𝐌𝐎𝐃𝐎 𝐀𝐃𝐌𝐈𝐍 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Modo admin *DESACTIVADO*\n' +
                '┃\n' +
                '┃ 👥 El bot vuelve a responder\n' +
                '┃    a todos los miembros.\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        activar(jid);

        return await responder.texto(
            '╭━━〔 🔒 𝐌𝐎𝐃𝐎 𝐀𝐃𝐌𝐈𝐍 〕━━⬣\n' +
            '┃\n' +
            '┃ ✅ Modo admin *ACTIVADO*\n' +
            '┃\n' +
            '┃ 🛡️ El bot solo responderá\n' +
            '┃    a *admins* y al *owner*.\n' +
            '┃\n' +
            '┃ 💡 Para desactivar:\n' +
            '┃ ➪ .modoadmin off\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
};