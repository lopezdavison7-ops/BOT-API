// commands/fun/xnxxcard.js
// ============================================================
// BOT-API — XNXX CARD GENERATOR (con subida automática)
// ============================================================
import fs from 'fs';
import path from 'path';
import os from 'os';

async function subirImagen(buffer) {
    try {
        // Intentar con catbox.moe (API pública sin autenticación)
        const fetch = (await import('node-fetch')).default;
        
        const boundary = '----FormBoundary' + Date.now();
        const body = [
            `--${boundary}\r\n`,
            `Content-Disposition: form-data; name="reqtype"\r\n\r\n`,
            `fileupload\r\n`,
            `--${boundary}\r\n`,
            `Content-Disposition: form-data; name="fileToUpload"; filename="image.jpg"\r\n`,
            `Content-Type: image/jpeg\r\n\r\n`,
            buffer,
            `\r\n--${boundary}--\r\n`
        ];

        const res = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: Buffer.concat(body.map(part => 
                typeof part === 'string' ? Buffer.from(part) : part
            ))
        });

        const url = await res.text();
        if (url.startsWith('https://')) {
            return url;
        }
        
        // Fallback: intentar con 0x0.st
        const FormData = (await import('form-data')).default;
        const form = new FormData();
        form.append('file', buffer, 'image.jpg');
        
        const res2 = await fetch('https://0x0.st', {
            method: 'POST',
            body: form
        });
        
        return await res2.text();
    } catch (e) {
        console.error('[UPLOAD] Error:', e?.message);
        return null;
    }
}

export default {
    nombre: 'porno',
    categoria: 'Fun',
    alias: ['xnxx', 'tarjetaxnxx', 'cardxnxx', 'pornocarta'],
    descripcion: 'Genera una tarjeta estilo XNXX con tu imagen y título',
    uso: '.xnxxcard <titulo> (respondiendo a imagen) · .xnxxcard <url> | <titulo>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const args = String(argumento || '').trim();

        if (!args) {
            return await responder.texto(
                '╭━━〔 🔞 𝐗𝐍𝐗𝐗 𝐂𝐀𝐑𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Debes indicar un título y una imagen\n' +
                '┃\n' +
                '┃ 📋 Formas de usar:\n' +
                '┃\n' +
                '┃ 1️⃣ Responde a una imagen y escribe:\n' +
                '┃    .xnxxcard Mi video épico\n' +
                '┃\n' +
                '┃ 2️⃣ Con URL de imagen:\n' +
                '┃    .xnxxcard https://... | Mi título\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        let imageUrl = null;
        let titulo = '';

        // Buscar imagen en mensaje citado
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (quotedMsg?.imageMessage) {
            titulo = args;
            
            await responder.texto('⏳ Subiendo imagen...');
            
            try {
                const buffer = await sock.downloadMediaMessage({
                    key: {
                        remoteJid: msg.key.remoteJid,
                        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                        fromMe: false,
                        participant: msg.message.extendedTextMessage.contextInfo.participant
                    },
                    message: quotedMsg
                });
                
                imageUrl = await subirImagen(buffer);
                
                if (!imageUrl) {
                    return await responder.texto('❌ Error subiendo imagen. Intenta de nuevo.');
                }
                
            } catch (e) {
                console.error('[XNXXCARD] Error:', e?.message || e);
                return await responder.texto('❌ Error procesando imagen: ' + (e?.message || 'Intenta de nuevo'));
            }
        }
        // Formato URL | titulo
        else if (args.includes('|')) {
            const partes = args.split('|').map(s => s.trim());
            const posibleUrl = partes[0];
            titulo = partes.slice(1).join('|').trim();
            
            if (posibleUrl.startsWith('http')) {
                imageUrl = posibleUrl;
            }
        }
        else if (args.startsWith('http')) {
            return await responder.texto('❌ Si usas URL, separa con | :\n`.xnxxcard https://... | Mi título`');
        }

        if (!imageUrl) {
            return await responder.texto(
                '╭━━〔 🔞 𝐗𝐍𝐗𝐗 𝐂𝐀𝐑𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ No se detectó imagen\n' +
                '┃\n' +
                '┃ 📋 Formas de usar:\n' +
                '┃\n' +
                '┃ 1️⃣ Responde a una foto:\n' +
                '┃    .xnxxcard <título>\n' +
                '┃\n' +
                '┃ 2️⃣ Con URL de imagen:\n' +
                '┃    .xnxxcard https://... | <titulo>\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (!titulo) {
            titulo = 'Sin título';
        }

        try {
            const apiUrl = `https://api.delirius.online/canvas/xnxxcard?image=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(titulo)}`;

            await responder.imagen(
                { url: apiUrl },
                '🔞 *' + titulo + '*\n\n_Generado con Delirius API_'
            );

        } catch (error) {
            console.error('[XNXXCARD] Error generando:', error?.message || error);
            await responder.texto('❌ Error generando tarjeta: ' + (error?.message || 'Intenta de nuevo'));
        }
    }
};