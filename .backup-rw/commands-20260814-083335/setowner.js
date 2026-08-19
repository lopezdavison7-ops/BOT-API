// ============================================================
// COMANDO: SETOWNER
// ALEX BOT
// Agrega un nuevo Owner sin quitar al Owner principal
// ============================================================

import {
    guardarOwner,
    obtenerOwner,
    obtenerOwners
} from '../lib/owner.js';

// ============================================================
// OBTENER USUARIO OBJETIVO
// ============================================================

function obtenerObjetivo(msg) {

    const contexto =
        msg?.message
            ?.extendedTextMessage
            ?.contextInfo;

    // --------------------------------------------------------
    // SI MENCIONÓ A ALGUIEN
    // --------------------------------------------------------

    const mencionado =
        contexto?.mentionedJid?.[0];

    if (mencionado) {
        return mencionado;
    }

    // --------------------------------------------------------
    // SI RESPONDIÓ A UN MENSAJE
    // --------------------------------------------------------

    const citado =
        contexto?.participant;

    if (citado) {
        return citado;
    }

    return null;
}

// ============================================================
// NÚMERO VISIBLE
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
        'Agrega un nuevo Owner sin quitar al Owner principal.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        // ----------------------------------------------------
        // OBTENER OBJETIVO
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // NO PERMITIR GRUPOS
        // ----------------------------------------------------

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

            // ------------------------------------------------
            // OWNER PRINCIPAL
            // ------------------------------------------------

            const principal =
                obtenerOwner();

            // ------------------------------------------------
            // AGREGAR OWNER
            // ------------------------------------------------

            const nuevo =
                guardarOwner(objetivo);

            const numero =
                numeroVisible(nuevo);

            // ------------------------------------------------
            // LISTA ACTUAL
            // ------------------------------------------------

            const owners =
                obtenerOwners();

            // ------------------------------------------------
            // ENVIAR CONFIRMACIÓN
            // ------------------------------------------------

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text:
                        '╭━━〔 👑 𝐎𝐖𝐍𝐄𝐑 〕━━⬣\n' +
                        '┃\n' +
                        `┃ ✅ Nuevo Owner › @${numero}\n` +
                        '┃ 🔐 Permisos activados\n' +
                        '┃ 💾 Owner guardado correctamente\n' +
                        '┃\n' +
                        '┃ 👑 Owner principal › @' +
                        numeroVisible(principal) +
                        '\n' +
                        `┃ 👥 Total Owners › ${owners.length}\n` +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━⬣',

                    mentions: [
                        nuevo,
                        `${principal}@s.whatsapp.net`
                    ]
                },
                {
                    quoted: msg
                }
            );

            console.log(
                `[SETOWNER] Owner agregado: ${nuevo}`
            );

        } catch (error) {

            console.error(
                '[SETOWNER] Error:',
                error
            );

            await responder.texto(
                '❌ *SETOWNER*\n\n' +
                'No se pudo agregar el Owner.\n\n' +
                `⚠️ ${error.message}`
            );
        }
    }
};
