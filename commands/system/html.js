// ============================================================
// BOT-API
// COMANDO: HTML
// ============================================================
// Envía una tarjeta INTERACTIVA NATIVA de WhatsApp.
//
// Ejemplos:
// .html Hola mundo
// .html BOT-API | Mensaje interactivo
//
// IMPORTANTE:
// WhatsApp no ejecuta HTML/JavaScript arbitrario dentro de un
// mensaje normal. Este comando convierte el texto recibido en
// una interfaz native-flow real con botones.
// ============================================================

function limpiarTexto(valor, max = 1200) {
    return String(valor ?? '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}


function separarContenido(argumento) {
    const limpio = limpiarTexto(argumento);

    if (!limpio) {
        return {
            titulo: 'BOT-API',
            cuerpo: 'Mensaje interactivo nativo.',
        };
    }

    const partes = limpio.split(/\s*\|\s*/, 2);

    if (partes.length === 2) {
        return {
            titulo: partes[0].slice(0, 80) || 'BOT-API',
            cuerpo: partes[1].slice(0, 1100),
        };
    }

    return {
        titulo: 'BOT-API',
        cuerpo: limpio,
    };
}

function crearBoton(display_text, id) {
    return {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
            display_text,
            id,
        }),
    };
}

const comando = {
    nombre: 'html',
    alias: ['htmlcard', 'interactive'],
    categoria: 'utilidades',
    descripcion: 'Envía una tarjeta interactiva nativa de WhatsApp.',
    uso: '.html <titulo> | <texto>',

    async ejecutar({ sock, msg, jid, argumento, responder }) {
        const { titulo, cuerpo } = separarContenido(argumento);

        const mensajeInteractivo = {
            interactiveMessage: {
                header: {
                    title: titulo,
                    hasMediaAttachment: false,
                },
                body: {
                    text: cuerpo,
                },
                footer: {
                    text: '✨ BOT-API • Interactive',
                },
                nativeFlowMessage: {
                    buttons: [
                        crearBoton('✨ TOCAR', 'html_tocar'),
                        crearBoton('Cerrar', 'html_cerrar'),
                    ],
                    messageParamsJson: '',
                },
            },
        };

        try {
            await sock.sendMessage(
                jid,
                mensajeInteractivo,
                { quoted: msg }
            );
        } catch (error) {
            console.error('[HTML] Error enviando native-flow:', error?.stack || error);

            // Fallback: intenta la forma shorthand que algunas versiones
            // de Baileys beta normalizan internamente a native-flow.
            try {
                await sock.sendMessage(
                    jid,
                    {
                        text: cuerpo,
                        footer: `✨ ${titulo}`,
                        buttons: [
                            crearBoton('✨ TOCAR', 'html_tocar'),
                            crearBoton('Cerrar', 'html_cerrar'),
                        ],
                        viewOnce: true,
                    },
                    { quoted: msg }
                );
            } catch (fallbackError) {
                console.error('[HTML] Fallback también falló:', fallbackError?.stack || fallbackError);

                await responder.text(
                    `❌ No se pudo enviar el mensaje interactivo.\n\n${fallbackError?.message || error?.message || 'Error desconocido'}`
                );
            }
        }
    },
};

export default comando;
