

import { identificadoresDe } from '../../lib/resolverJid.js';

function obtenerTextoCitado(msg) {
    const contexto =
        msg?.message?.extendedTextMessage?.contextInfo;

    const citado = contexto?.quotedMessage;

    if (!citado) return null;

    if (citado.conversation) {
        return citado.conversation;
    }

    if (citado.extendedTextMessage?.text) {
        return citado.extendedTextMessage.text;
    }

    if (citado.imageMessage?.caption) {
        return citado.imageMessage.caption;
    }

    if (citado.videoMessage?.caption) {
        return citado.videoMessage.caption;
    }

    if (citado.documentWithCaptionMessage?.message?.documentMessage?.caption) {
        return citado.documentWithCaptionMessage.message.documentMessage.caption;
    }

    return null;
}

async function esAdministrador(sock, msg) {
    const jid = msg?.key?.remoteJid;

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

            const jid = msg?.key?.remoteJid;

            if (!jid || !jid.endsWith('@g.us')) {
                await responder.texto(
                    '❌ Este comando solamente funciona en grupos.'
                );

                return;
            }

            const admin = await esAdministrador(sock, msg);

            if (!admin) {
                await responder.texto(
                    '⛔ Este comando es exclusivo de los administradores.'
                );

                return;
            }

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