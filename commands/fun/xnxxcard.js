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

        const titulo = String(argumento || '').trim() || 'Welcome to BOT-API 😈';
        let imageUrl = '';

        // ---------- CASO 1: IMAGEN ENVIADA CON CAPTION ----------
        if (msg.message?.imageMessage) {
            try {
                const buffer = await sock.downloadMediaMessage(msg);
                if (buffer && buffer.length > 0) {
                    imageUrl = await uploadToTelegraph(buffer, 'jpg');
                    console.log('[XNXX] Imagen subida a Telegraph:', imageUrl);
                }
            } catch (e) {
                console.error('[XNXX] Error descargando imagen enviada:', e.message);
                // Fallback: continuar sin imageUrl
            }
        }

        // ---------- CASO 2: IMAGEN CITADA ----------
        if (!imageUrl && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            try {
                const quoted = msg.message.extendedTextMessage.contextInfo;
                const quotedMsg = quoted.quotedMessage;

                const fakeMsg = {
                    message: quotedMsg,
                    key: {
                        remoteJid: chatJid,
                        fromMe: false,
                        participant: quoted.participant
                    }
                };

                const buffer = await sock.downloadMediaMessage(fakeMsg);
                if (buffer && buffer.length > 0) {
                    imageUrl = await uploadToTelegraph(buffer, 'jpg');
                    console.log('[XNXX] Imagen citada subida:', imageUrl);
                }
            } catch (e) {
                console.error('[XNXX] Error descargando imagen citada:', e.message);
            }
        }

        // ---------- CASO 3: FOTO DE PERFIL ----------
        if (!imageUrl) {
            try {
                const ppUrl = await sock.profilePictureUrl(sender, 'image');
                if (ppUrl) {
                    imageUrl = ppUrl;
                    console.log('[XNXX] Usando foto de perfil:', imageUrl);
                }
            } catch (e) {
                console.log('[XNXX] No hay foto de perfil, usando default');
                imageUrl = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';
            }
        }

        // Último recurso
        if (!imageUrl) {
            imageUrl = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';
        }

        // Construir URL de la API
        const apiUrl = `https://api.delirius.online/canvas/xnxxcard?image=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(titulo)}`;

        console.log('[XNXX] API URL:', apiUrl);

        // Enviar la imagen generada
        try {
            await responder.imagen(
                { url: apiUrl },
                `🔥 *XNXX Card*\n\n📝 ${titulo}\n\n⚡ BOT-API`
            );
        } catch (error) {
            console.error('[XNXX] Error enviando imagen:', error?.message || error);
            
            // Si falla la API, enviar texto con link
            await responder.texto(
                '╭━━〔 ❌ 𝐗𝐍𝐗𝐗 𝐂𝐀𝐑𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude generar la tarjeta.\n' +
                '┃\n' +
                '┃ 🔗 Link manual:\n' +
                '┃ ' + apiUrl + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};