// commands/utils/readviewonce.js — 👁️ Ver mensajes de vista única (imagen/video/audio)
// ============================================================
// Extrae el contenido real de un mensaje "ver una vez" y lo
// reenvía al chat como mensaje normal, conservando el caption.
// ============================================================

import { downloadContentFromMessage, extractMessageContent } from 'baileys';

// ============================================================
// REACCIONES
// ============================================================

async function reaccionar(sock, msg, emoji) {
    try {
        await sock.sendMessage(msg.key.remoteJid, {
            react: { text: emoji, key: msg.key }
        });
    } catch (e) {
        // Si falla la reacción, no interrumpe el flujo
    }
}

// ============================================================
// EXTRAER MENSAJE CITADO
// ============================================================

function obtenerMensajeCitado(msg) {
    return (
        msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
        null
    );
}

// ============================================================
// DESAPACETAR VIEWONCE
// ============================================================
// Los mensajes viewOnce vienen envueltos en un contenedor:
// { viewOnceMessage: { message: { imageMessage: {...} } } }
// Hay que extraer el message real para poder descargarlo.

function desempaquetarViewOnce(content) {
    if (!content) return null;

    // Si viene envuelto en viewOnceMessage, desenvolver
    if (content.viewOnceMessage) {
        const interno = content.viewOnceMessage.message || content.viewOnceMessage;
        return interno;
    }

    // Si viene envuelto en viewOnceMessageV2 (versión nueva)
    if (content.viewOnceMessageV2) {
        const interno = content.viewOnceMessageV2.message || content.viewOnceMessageV2;
        return interno;
    }

    // Si viene envuelto en viewOnceMessageV2Extension
    if (content.viewOnceMessageV2Extension) {
        const interno = content.viewOnceMessageV2Extension.message || content.viewOnceMessageV2Extension;
        return interno;
    }

    return null;
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'readviewonce',
    categoria: 'utils',
    alias: ['read', 'readvo', 'rvo', 'ver', 'verunavez', 'v'],
    descripcion: 'Ver el contenido de un mensaje de vista única (imagen/video/audio).',
    uso: '.readviewonce (responde a un mensaje viewOnce)',

    ejecutar: async ({ sock, msg, responder, jid }) => {
        const mensajeCitado = obtenerMensajeCitado(msg);

        // Validar que hay mensaje citado
        if (!mensajeCitado) {
            return await responder.texto(
                '╭━━〔 👁️ 𝐑𝐄𝐀𝐃 𝐕𝐈𝐄𝐖𝐎𝐍𝐂𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Responde a un mensaje de\n' +
                '┃    vista única usando *.readviewonce*\n' +
                '┃\n' +
                '┃ 💡 También puedes usar:\n' +
                '┃ ➪ .readvo\n' +
                '┃ ➪ .rvo\n' +
                '┃ ➪ .ver\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        await reaccionar(sock, msg, '🕒');

        try {
            // Extraer contenido real del mensaje citado
            const contenidoOriginal = extractMessageContent(mensajeCitado);

            if (!contenidoOriginal) {
                await reaccionar(sock, msg, '❌');
                return await responder.texto('❌ No se pudo extraer el contenido del mensaje.');
            }

            // Desenvolver si es viewOnce
            const contenidoReal = desempaquetarViewOnce(contenidoOriginal) || contenidoOriginal;

            // Detectar tipo de mensaje (image, video, audio)
            const tipoMensaje = Object.keys(contenidoReal)[0];

            if (!tipoMensaje) {
                await reaccionar(sock, msg, '❌');
                return await responder.texto('❌ No se detectó ningún tipo de multimedia en el mensaje.');
            }

            const mediaMessage = contenidoReal[tipoMensaje];

            // Verificar que tenga datos descargables
            if (!mediaMessage || (!mediaMessage.url && !mediaMessage.directPath)) {
                await reaccionar(sock, msg, '❌');
                return await responder.texto('❌ El mensaje no contiene multimedia descargable.');
            }

            // Determinar tipo de medio
            const mediaType = tipoMensaje.replace('Message', '').toLowerCase();

            // Descargar contenido
            const stream = await downloadContentFromMessage(mediaMessage, mediaType);

            if (!stream) {
                await reaccionar(sock, msg, '❌');
                return await responder.texto('❌ No se pudo iniciar la descarga del contenido.');
            }

            // Concatenar chunks en un buffer
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            if (!buffer || !buffer.length) {
                await reaccionar(sock, msg, '❌');
                return await responder.texto('❌ El contenido descargado está vacío.');
            }

            // Caption original (si existe)
            const captionOriginal = mediaMessage.caption || '';
            const caption = captionOriginal
                ? '👁️ *ViewOnce extraído:*\n\n' + captionOriginal
                : '👁️ *Contenido extraído ten chismoso*';

            // Enviar según el tipo
            if (/video/i.test(tipoMensaje)) {
                await sock.sendMessage(jid, {
                    video: buffer,
                    caption,
                    mimetype: 'video/mp4'
                }, { quoted: msg });
            } else if (/image/i.test(tipoMensaje)) {
                await sock.sendMessage(jid, {
                    image: buffer,
                    caption
                }, { quoted: msg });
            } else if (/audio/i.test(tipoMensaje)) {
                await sock.sendMessage(jid, {
                    audio: buffer,
                    mimetype: 'audio/ogg; codecs=opus',
                    ptt: mediaMessage.ptt || false
                }, { quoted: msg });
            } else {
                await reaccionar(sock, msg, '❌');
                return await responder.texto('❌ Tipo de multimedia no soportado: ' + tipoMensaje);
            }

            await reaccionar(sock, msg, '✔️');

        } catch (error) {
            console.error('[READVO] Error:', error?.stack || error?.message || error);
            await reaccionar(sock, msg, '❌');

            try {
                await responder.texto(
                    '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No se pudo extraer el viewOnce.\n' +
                    '┃\n' +
                    '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            } catch {}
        }
    }
};