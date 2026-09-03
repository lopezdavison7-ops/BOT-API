// commands/group/tag.js
// ============================================================
// COMANDO: TAG
// ALEX BOT
// Solo administradores
//
// Uso:
// Responde a un mensaje y escribe:
// .tag
//
// El bot vuelve a enviar únicamente el contenido del mensaje
// respondido, pero incluye a todos los miembros del grupo
// como mencionados.
// ============================================================

import { identificadoresDe } from '../../lib/resolverJid.js';

function obtenerTextoCitado(msg) {
    const contexto =
        msg?.message?.extendedTextMessage?.contextInfo;

    const citado = contexto?.quotedMessage;

    if (!citado) return null;

    // Mensaje de texto normal
    if (citado.conversation) {
        return citado.conversation;
    }

    // Texto extendido
    if (citado.extendedTextMessage?.text) {
        return citado.extendedTextMessage.text;
    }

    // Imagen con descripción
    if (citado.imageMessage?.caption) {
        return citado.imageMessage.caption;
    }

    // Video con descripción
    if (citado.videoMessage?.caption) {
        return citado.videoMessage.caption;
    }

    // Documento con descripción
    if (citado.documentWithCaptionMessage?.message?.documentMessage?.caption) {
        return citado.documentWithCaptionMessage.message.documentMessage.caption;
    }

    return null;
}

// ============================================================
// COMPROBAR SI EL USUARIO ES ADMIN
// ============================================================

async function esAdministrador(sock, msg) {
    const jid = msg?.key?.remoteJid;

    // Solo funciona en grupos
    if (!jid || !jid.endsWith('@g.us')) {
        return false;
    }

    const metadata = await sock.groupMetadata(jid);

    const participantes = metadata?.participants || [];

    const posiblesJids = [
        msg?.key?.participant,
        msg?.key?.senderPn,
        msg?.key?.participantAlt
    ].filter(Boolean);

    const posiblesNumeros = posiblesJids.map(
        posible => String(posible).split('@')[0].split(':')[0]
    );

    for (const participante of participantes) {
        const admin =
            participante.admin === 'admin' ||
            participante.admin === 'superadmin';

        if (!admin) continue;

        // Se revisan TODOS los identificadores del participante
        // (id, jid, phoneNumber, lid) — no solo `id`, que puede
        // venir como @lid y nunca coincidir con el número real
        // que trae el mensaje.
        const idsParticipante = identificadoresDe(participante).map(
            id => String(id).split('@')[0].split(':')[0]
        );

        const coincide = idsParticipante.some(
            numeroParticipante => posiblesNumeros.includes(numeroParticipante)
        );

        if (coincide) {
            return true;
        }
    }

    return false;
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'tag',

    categoria: 'Grupos',

    alias: [],

    descripcion:
        'Menciona a todos los miembros usando el mensaje respondido.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        try {

            // ------------------------------------------------
            // COMPROBAR GRUPO
            // ------------------------------------------------

            const jid = msg?.key?.remoteJid;

            if (!jid || !jid.endsWith('@g.us')) {
                await responder.texto(
                    '❌ Este comando solamente funciona en grupos.'
                );

                return;
            }

            // ------------------------------------------------
            // COMPROBAR ADMIN
            // ------------------------------------------------

            const admin = await esAdministrador(sock, msg);

            if (!admin) {
                await responder.texto(
                    '⛔ Este comando es exclusivo de los administradores.'
                );

                return;
            }

            // ------------------------------------------------
            // OBTENER MENSAJE RESPONDIDO
            // ------------------------------------------------

            const texto = obtenerTextoCitado(msg);

            if (!texto) {
                await responder.texto(
                    '❌ Responde a un mensaje con *.tag*.\n\n' +
                    'Ejemplo:\n' +
                    'Hola\n' +
                    '↳ *.tag*'
                );

                return;
            }

            // ------------------------------------------------
            // OBTENER MIEMBROS DEL GRUPO
            // ------------------------------------------------

            const metadata = await sock.groupMetadata(jid);

            const miembros =
                (metadata?.participants || [])
                    .map(participante => participante.id)
                    .filter(Boolean);

            if (miembros.length === 0) {
                await responder.texto(
                    '❌ No pude obtener los miembros del grupo.'
                );

                return;
            }

            console.log(
                `[TAG] Mensaje: "${texto}"`
            );

            console.log(
                `[TAG] Mencionando ${miembros.length} miembros.`
            );

            // ------------------------------------------------
            // ENVIAR SOLAMENTE EL MENSAJE
            // ------------------------------------------------
            //
            // NO agregamos @usuario al texto.
            // La lista de JID va en "mentions".
            //
            // De esta forma el texto visible sigue siendo:
            //
            // Hola
            //
            // ------------------------------------------------

            await sock.sendMessage(
                jid,
                {
                    text: texto,
                    mentions: miembros
                },
                {
                    quoted: msg
                }
            );

            console.log(
                '[TAG] ✓ Mensaje enviado correctamente.'
            );

        } catch (error) {

            console.error(
                '[TAG] Error:',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                '❌ No pude realizar el tag.\n\n' +
                `⚠️ ${error?.message || 'Error desconocido.'}`
            );
        }
    }
};