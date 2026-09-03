// ============================================================
// BOT-API
// COMANDO: ANTILINK
// ============================================================

import {
    esGrupo,
    verificarPermisosAdmin
} from '../../lib/grupos.js';

import {
    estaActivo,
    activar,
    desactivar
} from '../../lib/antilink.js';

export default {

    nombre: 'antilink',

    categoria: 'grupos',

    alias: [
        'antilinks',
        'nolink'
    ],

    descripcion:
        'Bloquea únicamente enlaces de WhatsApp.',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        const chatId =
            msg?.key?.remoteJid;

        if (!esGrupo(chatId)) {

            return responder.texto(
                '❌ Este comando solo funciona en grupos.'
            );
        }

        const permiso =
            await verificarPermisosAdmin(
                sock,
                msg,
                chatId
            );

        if (!permiso.ok) {
            return responder.texto(
                permiso.motivo
            );
        }

        const accion =
            String(argumento || '')
                .trim()
                .toLowerCase();

        if (!accion) {

            return responder.texto(
                `╭〔 🔗 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊 〕⬣
┃
┃ 📊 Estado: ${
    estaActivo(chatId)
        ? '🟢 ACTIVADO'
        : '🔴 DESACTIVADO'
}
┃
┃ 📌 Uso:
┃ • *.antilink on*
┃ • *.antilink off*
┃
┃ 🚫 Solo bloquea enlaces
┃ de WhatsApp.
┃
┃ ✅ TikTok
┃ ✅ Instagram
┃ ✅ YouTube
┃ ✅ Facebook
┃ ✅ Telegram
┃ ✅ Cualquier otra web
┃
╰━━━━━━━━━━━━━━━━⬣`
            );
        }

        if (
            accion === 'on' ||
            accion === 'activar' ||
            accion === 'enable'
        ) {

            activar(chatId);

            return responder.texto(
                `╭〔 🛡️ 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊 〕⬣
┃
┃ 🟢 *ACTIVADO*
┃
┃ 🚫 Se bloquearán únicamente
┃ los enlaces de WhatsApp.
┃
┃ 👮 Los administradores
┃ pueden enviar enlaces.
┃
╰━━━━━━━━━━━━━━━━⬣`
            );
        }

        if (
            accion === 'off' ||
            accion === 'desactivar' ||
            accion === 'disable'
        ) {

            desactivar(chatId);

            return responder.texto(
                `╭〔 🛡️ 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊 〕⬣
┃
┃ 🔴 *DESACTIVADO*
┃
┃ 🔗 Los enlaces de WhatsApp
┃ ya no serán bloqueados.
┃
╰━━━━━━━━━━━━━━━━⬣`
            );
        }

        return responder.texto(
            '❌ Usa *.antilink on* o *.antilink off*.'
        );
    }
};