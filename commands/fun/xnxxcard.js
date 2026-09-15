// commands/canvas/xnxx.js
// ============================================================
// BOT-API — XNXX CARD (Delirius API)
// ============================================================
// .xnxx <título> (con foto de perfil o imagen enviada/citada)
// ============================================================

import FormData from 'form-data';

async function uploadToTelegraph(buffer, extension = 'jpg') {
    const form = new FormData();
    form.append('file', buffer, {
        filename: `image.${extension}`,
        contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`
    });

    const response = await fetch('https://telegra.ph/upload', {
        method: 'POST',
        body: form
    });

    const result = await response.json();
    if (result && result[0]) {
        return 'https://telegra.ph' + result[0].src;
    }

    throw new Error('No se pudo subir la imagen');
}

export default {
    nombre: 'xnxx',
    categoria: 'canvas',
    alias: ['xnxxcard', 'xcard'],
    descripcion: 'Genera una tarjeta estilo XNXX con imagen y título',
    uso: '.xnxx <título>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        // Extraer título
        const titulo = String(argumento || '').trim() || 'Welcome to BOT-API 😈';

        let imageUrl = '';

        // CASO 1: Usuario envió imagen con el comando
        const tipoMensaje = Object.keys(msg.message || {})[0];

        if (tipoMensaje === 'imageMessage') {
            try {
                const buffer = await sock.downloadMediaMessage(msg);
                imageUrl = await uploadToTelegraph(buffer, 'jpg');
            } catch (e) {
                console.error('[XNXX] Error descargando imagen:', e);
                return await responder.texto('❌ Error al procesar la imagen que enviaste.');
            }
        }
        // CASO 2: Imagen citada
        else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quoted = msg.message.extendedTextMessage.contextInfo;
            const quotedMsg = quoted.quotedMessage;

            if (quotedMsg.imageMessage) {
                try {
                    const fakeMsg = {
                        message: quotedMsg,
                        key: {
                            remoteJid: chatJid,
                            fromMe: false,
                            participant: quoted.participant
                        }
                    };
                    const buffer = await sock.downloadMediaMessage(fakeMsg);
                    imageUrl = await uploadToTelegraph(buffer, 'jpg');
                } catch (e) {
                    console.error('[XNXX] Error descargando imagen citada:', e);
                }
            }
        }

        // CASO 3: Foto de perfil
        if (!imageUrl) {
            try {
                imageUrl = await sock.profilePictureUrl(sender, 'image');
            } catch (e) {
                imageUrl = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';
            }
        }

        // Construir URL de la API
        const apiUrl = `https://api.delirius.online/canvas/xnxxcard?image=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(titulo)}`;

        // Enviar la imagen generada
        try {
            await responder.imagen(
                { url: apiUrl },
                `🔥 *XNXX Card*\n\n📝 ${titulo}\n\n⚡ BOT-API`
            );
        } catch (error) {
            console.error('[XNXX] Error enviando:', error?.message || error);
            await responder.texto('❌ Error generando la tarjeta: ' + (error?.message || 'Intenta de nuevo'));
        }
    }
};