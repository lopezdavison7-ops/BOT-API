// ============================================================
// COMANDO: SETOWNER
// ALEX BOT
// Cambia el Owner mediante mención o respuesta
// ============================================================

import {
    guardarOwner,
    obtenerOwner
} from '../lib/owner.js';

// ============================================================
// OBTENER USUARIO OBJETIVO
// ============================================================

function obtenerObjetivo(msg) {

    const contexto =
        msg?.message
            ?.extendedTextMessage
            ?.contextInfo;

    // Si mencionó a alguien
    const mencionado =
        contexto?.mentionedJid?.[0];

    if (mencionado) {
        return mencionado;
    }

    // Si respondió a un mensaje
    const citado =
        contexto?.participant;

    if (citado) {
        return citado;
    }

    return null;
}

// ============================================================
// NÚMERO PARA MOSTRAR
// ============================================================

function numeroVisible(jid) {

    return String(jid)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'setowner',

    categoria: 'Owner',

    alias: [
        'nuevoowner',
        'cambiarowner'
    ],

    owner: true,

    descripcion:
        'Cambia el Owner mencionando o respondiendo a un usuario.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        const objetivo =
            obtenerObjetivo(msg);

        if (!objetivo) {

            await responder.texto(
                '❌ *SETOWNER*\n\n' +
                'Debes mencionar al nuevo Owner o responder a su mensaje.\n\n' +
                'Ejemplos:\n' +
                '↳ *.setowner @usuario*\n' +
                '↳ Responde a un mensaje con *.setowner*'
            );

            return;
        }

        if (
            String(objetivo)
                .endsWith('@g.us')
        ) {

            await responder.texto(
                '❌ Ese objetivo no es un usuario válido.'
            );

            return;
        }

        try {

            const anterior =
                obtenerOwner();

            const nuevo =
                guardarOwner(objetivo);

            const numero =
                numeroVisible(nuevo);

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text:
                        '╭━━〔 👑 𝐎𝐖𝐍𝐄𝐑 〕━━⬣\n' +
                        '┃\n' +
                        `┃ ✅ Nuevo Owner › @${numero}\n` +
                        '┃ 🔐 Permisos actualizados\n' +
                        '┃ 💾 Owner guardado correctamente\n' +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━⬣',

                    mentions: [
                        nuevo
                    ]
                },
                {
                    quoted: msg
                }
            );

            console.log(
                `[SETOWNER] Owner cambiado: ${anterior} -> ${nuevo}`
            );

        } catch (error) {

            console.error(
                '[SETOWNER] Error:',
                error
            );

            await responder.texto(
                '❌ *SETOWNER*\n\n' +
                'No se pudo cambiar el Owner.\n\n' +
                `⚠️ ${error.message}`
            );
        }
    }
};
