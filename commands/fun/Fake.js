

export default {
    nombre: 'fake',
    categoria: 'tools',
    alias: ['fitnah', 'fakereply', 'falsoreply', 'respuesta-falsa'],
    descripcion: 'Crea una respuesta falsa simulando que otro usuario escribió.',
    uso: '.fake <texto falso> @usuario <respuesta>',
    soloGrupos: true,

    ejecutar: async ({ sock, msg, argumento, responder, jid, isGroup }) => {
        if (!isGroup) {
            return await responder.texto('❌ Este comando solo funciona en grupos.');
        }

        const texto = String(argumento || '').trim();

        if (!texto) {
            return await responder.texto(
                '╭━━〔 💬 𝐅𝐀𝐊𝐄 𝐑𝐄𝐏𝐋𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el texto del fake\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ ➪ .fake Hola @usuario Buenas\n' +
                '┃\n' +
                '┃ 📖 Cómo funciona:\n' +
                '┃ 1️⃣ Escribe el texto falso\n' +
                '┃ 2️⃣ Menciona al usuario\n' +
                '┃ 3️⃣ Escribe la respuesta\n' +
                '┃\n' +
                '┃ 🎯 El bot simulará que ese\n' +
                '┃    usuario escribió el primer\n' +
                '┃    texto y responderá al segundo\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            // Extraer menciones del mensaje
            const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

            if (mentions.length === 0) {
                return await responder.texto('❌ Debes mencionar a un usuario con @');
            }

            const quien = mentions[0];

            // Separar el texto en "fake" y "respuesta"
            const sp = '@' + quien.split('@')[0];
            const partes = texto.split(sp);

            if (partes.length < 2) {
                return await responder.texto(
                    '❌ Formato incorrecto.\n\n' +
                    '💡 Ejemplo:\n' +
                    '.fake Hola @usuario Buenas'
                );
            }

            const fakeText = partes[0].trimEnd();
            const realText = partes.slice(1).join(sp).trimStart();

            if (!fakeText || !realText) {
                return await responder.texto('❌ El texto falso y la respuesta no pueden estar vacíos.');
            }

            // Crear el mensaje falso
            await sock.sendMessage(jid, {
                text: realText,
                contextInfo: {
                    participant: quien,
                    quotedMessage: {
                        conversation: fakeText
                    },
                    mentionedJid: [quien],
                    stanzaId: msg.key.id,
                    remoteJid: isGroup ? jid : false
                }
            }, { quoted: msg });

            console.log(`[FAKE] Fake reply creado para ${quien}`);

        } catch (error) {
            console.error('[FAKE] Error:', error?.message || error);
            await responder.texto('❌ Error al crear el fake reply: ' + (error?.message || error));
        }
    }
};