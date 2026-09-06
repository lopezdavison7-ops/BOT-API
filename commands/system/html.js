// commands/system/html.js
// ============================================================
// BOT-API
// COMANDO: HTML
// ============================================================
// Crea una tarjeta interactiva de WhatsApp a partir de texto.
//
// Uso:
//   .html Hola mundo
//   .html <h1>Hola</h1><p>Esto es una tarjeta</p>
//
// IMPORTANTE:
// WhatsApp no ejecuta HTML/JavaScript arbitrario enviado como
// texto. Este comando convierte el contenido HTML básico a texto
// y lo presenta dentro de un mensaje InteractiveMessage nativo.
// El botón devuelve una respuesta interactiva a WhatsApp.
// ============================================================

import {
    proto,
    generateWAMessageFromContent
} from 'baileys';

// ------------------------------------------------------------
// Limpiar HTML básico sin ejecutar código.
// ------------------------------------------------------------

function limpiarHTML(valor = '') {
    return String(valor)
        // Eliminar scripts y estilos completos.
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
        // Saltos y bloques comunes.
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|section|article|h[1-6]|li)>/gi, '\n')
        .replace(/<li\b[^>]*>/gi, '• ')
        // Quitar el resto de etiquetas.
        .replace(/<[^>]+>/g, '')
        // Entidades HTML frecuentes.
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        // Espacios excesivos.
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// ------------------------------------------------------------
// Escapar JSON para buttonParamsJson.
// ------------------------------------------------------------

function jsonSeguro(obj) {
    return JSON.stringify(obj);
}

// ------------------------------------------------------------
// Enviar mensaje interactivo nativo.
// ------------------------------------------------------------

async function enviarInteractivo(sock, jid, quoted, titulo, cuerpo) {
    const interactive = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.create({
            text: cuerpo
        }),

        header: proto.Message.InteractiveMessage.Header.create({
            title: titulo,
            subtitle: 'BOT-API',
            hasMediaAttachment: false
        }),

        footer: proto.Message.InteractiveMessage.Footer.create({
            text: '✨ BOT-API • HTML'
        }),

        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: jsonSeguro({
                        display_text: '✨ Interactuar',
                        id: 'html_interactuar'
                    })
                }
            ]
        })
    });

    const content = {
        viewOnceMessage: {
            message: {
                interactiveMessage: interactive
            }
        }
    };

    const waMessage = generateWAMessageFromContent(
        jid,
        content,
        {
            userJid: sock.user?.id,
            quoted
        }
    );

    await sock.relayMessage(
        jid,
        waMessage.message,
        {
            messageId: waMessage.key.id
        }
    );
}

// ============================================================
// EXPORTAR COMANDO
// ============================================================

export default {
    nombre: 'html',

    categoria: 'sistema',

    alias: [
        'htm',
        'webcard'
    ],

    descripcion:
        'Crea una tarjeta interactiva usando texto/HTML básico.',

    ejecutar: async ({
        sock,
        jid,
        msg,
        argumento,
        responder
    }) => {

        try {

            if (!argumento?.trim()) {
                await responder.texto(
                    '╭━━〔 🌐 HTML 〕━━⬣\n' +
                    '┃\n' +
                    '┃ Usa:\n' +
                    '┃ `.html Hola mundo`\n' +
                    '┃\n' +
                    '┃ También puedes usar HTML básico:\n' +
                    '┃ `.html <h1>Hola</h1><p>Texto</p>`\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
                return;
            }

            const texto = limpiarHTML(argumento);

            if (!texto) {
                await responder.texto(
                    '❌ El contenido HTML no tiene texto visible.'
                );
                return;
            }

            // Limitar el tamaño para evitar mensajes gigantes.
            const cuerpo =
                texto.length > 3500
                    ? texto.slice(0, 3500) + '\n\n…'
                    : texto;

            await enviarInteractivo(
                sock,
                jid,
                msg,
                '🌐 HTML INTERACTIVO',
                cuerpo
            );

        } catch (error) {

            console.error(
                '[COMANDO html]',
                error
            );

            // Fallback: si la versión concreta de Baileys no
            // expone InteractiveMessage, el bot no queda roto.
            try {
                await responder.texto(
                    '⚠️ No se pudo crear el mensaje interactivo.\n\n' +
                    `Motivo: ${error?.message || 'error desconocido'}`
                );
            } catch {}
        }
    }
};
