// commands/canvas/xnxx.js
// ============================================================
// BOT-API — XNXX CARD (Delirius API)
// ============================================================
// .xnxx <título> (con foto de perfil o imagen enviada/citada)
// ============================================================

import FormData from 'form-data';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

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

export default {
    nombre: 'xnxx',
    categoria: 'canvas',
    alias: ['xnxxcard', 'xcard'],
    descripcion: 'Genera una tarjeta estilo XNXX con imagen y título',
    uso: '.xnxx <título>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        // Socket correcto
        const s = global.conns?.[0] || Object.values(global.conns || {})[0] || sock;

        const titulo = String(argumento || '').trim() || 'Welcome to BOT-API 😈';
        let imageUrl = '';
        let metodoUsado = '';

        // ---------- CASO 1: IMAGEN ENVIADA CON CAPTION ----------
        if (msg.message?.imageMessage) {
            try {
                // Usar la función importada de Baileys
                const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
                    logger: console,
                    reuploadRequest: s.updateMediaMessage
                });

                if (buffer && buffer.length > 0) {
                    imageUrl = await uploadToTelegraph(buffer, 'jpg');
                    metodoUsado = 'imagen enviada';
                } else {
                    throw new Error('Buffer vacío');
                }
            } catch (e) {
                console.error('[XNXX] Error downloadMediaMessage:', e.message);
                
                // Fallback: descarga directa desde URL
                try {
                    const imgMsg = msg.message.imageMessage;
                    if (imgMsg.url) {
                        const res = await fetch(imgMsg.url, {
                            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                        });
                        if (res.ok) {
                            const buffer = Buffer.from(await res.arrayBuffer());
                            if (buffer.length > 0) {
                                imageUrl = await uploadToTelegraph(buffer, 'jpg');
                                metodoUsado = 'imagen enviada (URL directa)';
                            }
                        }
                    }
                    if (!imageUrl) throw new Error(`No se pudo descargar: ${e.message}`);
                } catch (e2) {
                    await responder.texto(
                        '⚠️ *Error con imagen enviada*\n\n' +
                        `❌ ${e.message}\n` +
                        `❌ ${e2.message}\n\n` +
                        '💡 Usando foto de perfil como alternativa...'
                    );
                }
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

                const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, {
                    logger: console,
                    reuploadRequest: s.updateMediaMessage
                });

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

        // Último recurso
        if (!imageUrl) {
            imageUrl = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';
            metodoUsado = 'imagen por defecto';
        }

        // Construir URL de la API
        const apiUrl = `https://api.delirius.online/canvas/xnxxcard?image=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(titulo)}`;

        // Enviar la imagen generada
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
                '┃ 💡 Copia la URL y ábrela en el navegador\n' +
                '┃    para ver si la API responde.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};