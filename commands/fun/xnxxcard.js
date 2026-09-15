// commands/canvas/xnxx.js
// ============================================================
// BOT-API — XNXX CARD (Delirius API)
// Compatible con baileys-beta (fork personalizado)
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

    throw new Error('No se pudo subir la imagen a Telegraph');
}

// ---------- DESCARGAR CONTENIDO DE MEDIA ----------
async function descargarMedia(message, sock) {
    // Método 1: función downloadContentFromMessage (disponible en todos los forks)
    try {
        const baileys = await import('baileys');
        const downloadFn = baileys.downloadContentFromMessage || baileys.default?.downloadContentFromMessage;
        
        if (downloadFn) {
            const mediaType = message.imageMessage ? 'image' : 'video';
            const stream = await downloadFn(message.imageMessage || message.videoMessage, mediaType);
            
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        }
    } catch (e) {
        console.error('[XNXX] downloadContentFromMessage falló:', e.message);
    }

    // Método 2: método del socket (si existe)
    try {
        if (typeof sock.downloadMediaMessage === 'function') {
            const fakeMsg = { message, key: { remoteJid: 'dummy', fromMe: false } };
            return await sock.downloadMediaMessage(fakeMsg, 'buffer');
        }
    } catch (e) {
        console.error('[XNXX] sock.downloadMediaMessage falló:', e.message);
    }

    // Método 3: URL directa (siempre existe)
    const mediaObj = message.imageMessage || message.videoMessage;
    if (mediaObj?.url) {
        const res = await fetch(mediaObj.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (res.ok) {
            return Buffer.from(await res.arrayBuffer());
        }
    }

    throw new Error('Ningún método de descarga funcionó');
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

        const s = global.conns?.[0] || Object.values(global.conns || {})[0] || sock;
        const titulo = String(argumento || '').trim() || 'Welcome to BOT-API 😈';
        let imageUrl = '';
        let metodoUsado = '';

        // ---------- CASO 1: IMAGEN ENVIADA CON CAPTION ----------
        if (msg.message?.imageMessage) {
            try {
                const buffer = await descargarMedia(msg.message, s);
                if (buffer && buffer.length > 0) {
                    imageUrl = await uploadToTelegraph(buffer, 'jpg');
                    metodoUsado = 'imagen enviada';
                }
            } catch (e) {
                await responder.texto(
                    '⚠️ *Error con imagen enviada*\n\n' +
                    `❌ ${e.message}\n\n` +
                    '💡 Usando foto de perfil como alternativa...'
                );
            }
        }

        // ---------- CASO 2: IMAGEN CITADA ----------
        if (!imageUrl && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            try {
                const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                const buffer = await descargarMedia(quotedMsg, s);
                if (buffer && buffer.length > 0) {
                    imageUrl = await uploadToTelegraph(buffer, 'jpg');
                    metodoUsado = 'imagen citada';
                }
            } catch (e) {
                await responder.texto(
                    '⚠️ *Error con imagen citada*\n\n' +
                    `❌ ${e.message}\n\n` +
                    '💡 Usando foto de perfil como alternativa...'
                );
            }
        }

        // ---------- CASO 3: FOTO DE PERFIL ----------
        if (!imageUrl) {
            try {
                imageUrl = await s.profilePictureUrl(sender, 'image');
                metodoUsado = 'foto de perfil';
            } catch (e) {
                imageUrl = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';
                metodoUsado = 'imagen por defecto';
            }
        }

        if (!imageUrl) {
            imageUrl = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';
            metodoUsado = 'imagen por defecto';
        }

        const apiUrl = `https://api.delirius.online/canvas/xnxxcard?image=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(titulo)}`;

        try {
            await responder.imagen(
                { url: apiUrl },
                `🔥 *XNXX Card*\n\n📝 ${titulo}\n📸 Fuente: ${metodoUsado}\n\n⚡ BOT-API`
            );
        } catch (error) {
            await responder.texto(
                '╭━━〔 ❌ 𝐗𝐍𝐗𝐗 𝐂𝐀𝐑𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude generar la tarjeta.\n' +
                '┃\n' +
                `┃ ❌ Error: ${error?.message || 'Desconocido'}\n` +
                '┃\n' +
                '┃ 🔗 URL de la API:\n' +
                '┃ ' + apiUrl + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};