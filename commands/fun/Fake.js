

export default {
    nombre: 'fake',
    categoria: 'fun',
    alias: ['fakem', 'fakemessage', 'falso'],
    descripcion: 'Envía un mensaje simulando que otro usuario lo escribió.',
    uso: '.fake @usuario <mensaje>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const texto = String(argumento || '').trim();

        // Validar que mencionen a alguien
        const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        if (mentions.length === 0) {
            return await responder.texto(
                '╭━━〔 💬 𝐅𝐀𝐊𝐄 𝐑𝐄𝐏𝐋𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Menciona a alguien\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ ➪ .fake @usuario hola gente\n' +
                '┃    como estan\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const quien = mentions[0];

        // Quitar la mención del texto
        const mensaje = texto.replace(/@\d+/, '').trim();

        if (!mensaje) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ Escribe el mensaje\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ ➪ .fake @usuario hola\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            // Enviar mensaje falso simulando que el mencionado lo escribió
            await sock.sendMessage(jid, {
                text: mensaje,
                contextInfo: {
                    participant: quien,
                    quotedMessage: {
                        conversation: ''
                    },
                    mentionedJid: [quien]
                }
            });

            console.log(`[FAKE] Mensaje falso enviado como ${quien}`);

        } catch (error) {
            console.error('[FAKE] Error:', error?.message || error);
            await responder.texto('❌ Error al enviar el fake: ' + (error?.message || error));
        }
    }
};