

import {
    esGrupo,
    verificarPermisosAdmin
} from '../../lib/grupos.js';

export default {

    nombre: 'del',

    categoria: 'grupos',

    alias: [
        'delete',
        'eliminar',
        'borrar'
    ],

    descripcion:
        'Elimina el mensaje al que estás respondiendo.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        const chatId =
            msg?.key?.remoteJid;

        if (!esGrupo(chatId)) {

            return responder.texto(
                '❌ Este comando solo funciona dentro de un grupo.'
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

        const contexto =
            msg?.message
                ?.extendedTextMessage
                ?.contextInfo;

        const mensajeCitado =
            contexto?.quotedMessage;

        const participant =
            contexto?.participant;

        const stanzaId =
            contexto?.stanzaId;

        if (
            !mensajeCitado ||
            !stanzaId
        ) {

            return responder.texto(
                `╭〔 🗑️ 𝐃𝐄𝐋 〕⬣
┃
┃ ⚠️ Debes responder al mensaje
┃ que quieres eliminar.
┃
┃ 📌 Ejemplo:
┃ Responde a un mensaje y escribe:
┃ *.del*
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
            );
        }

        let autor =
            participant;

        const participantAlt =
            contexto?.participantAlt;

        if (
            participantAlt &&
            String(participantAlt)
                .includes('@')
        ) {

            autor =
                participantAlt;
        }

        if (!autor) {

            return responder.texto(
                '❌ No pude identificar al autor del mensaje.'
            );
        }

        const keyMensaje = {

            remoteJid:
                chatId,

            fromMe:
                false,

            id:
                stanzaId,

            participant:
                autor
        };

        try {

            await sock.sendMessage(
                chatId,
                {
                    delete: keyMensaje
                }
            );

            console.log(
                `[DEL] Mensaje eliminado en ${chatId}`
            );

        } catch (error) {

            console.error(
                '[DEL] Error eliminando mensaje:',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                `❌ No pude eliminar el mensaje.

Puede que:
• El mensaje ya haya sido eliminado.
• El bot no tenga permisos de administrador.
• WhatsApp no permita eliminar ese mensaje.`
            );
        }
    }
};
