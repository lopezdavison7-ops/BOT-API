// commands/fun/xnxxcard.js
// ============================================================
// BOT-API — XNXX CARD GENERATOR (versión simple)
// ============================================================
// Genera una tarjeta estilo XNXX con imagen y título
// ============================================================
import fs from 'fs';
import path from 'path';
import os from 'os';

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
            try {
                // Método 1: Usar URL directa del mensaje (la más simple)
                if (quotedMsg.imageMessage.url) {
                    imageUrl = quotedMsg.imageMessage.url;
                }
                
                // Método 2: Si no hay URL, descargar y guardar temporal
                if (!imageUrl) {
                    const buffer = await sock.downloadMediaMessage({
                        key: {
                            remoteJid: msg.key.remoteJid,
                            id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                            fromMe: false,
                            participant: msg.message.extendedTextMessage.contextInfo.participant
                        },
                        message: quotedMsg
                    });
                    
                    // Guardar en archivo temporal
                    const tmpPath = path.join(os.tmpdir(), `xnxx_${Date.now()}.jpg`);
                    fs.writeFileSync(tmpPath, buffer);
                    
                    // Usar file:// URL (puede no funcionar con API externa)
                    // Por eso intentamos con la URL del mensaje primero
                    fs.unlinkSync(tmpPath); // Limpiar
                }
                
                if (!imageUrl) {
                    return await responder.texto(
                        '❌ No se pudo obtener la URL de la imagen.\n' +
                        'Intenta con el método 2:\n' +
                        '`.xnxxcard https://url-imagen.jpg | Mi título`'
                    );
                }
                
            } catch (e) {
                console.error('[XNXXCARD] Error:', e?.message || e);
                return await responder.texto(
                    '❌ Error procesando imagen.\n' +
                    'Usa URL directa:\n' +
                    '`.xnxxcard https://url-imagen.jpg | Mi título`\n\n' +
                    'Tip: sube tu foto a https://imgur.com y copia el link directo'
                );
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
                '┃ 💡 Tip: sube fotos a imgur.com\n' +
                '┃    y usa el link directo\n' +
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
            await responder.texto(
                '❌ Error generando tarjeta.\n' +
                'La URL de WhatsApp es temporal.\n' +
                'Usa una URL pública:\n\n' +
                '1. Sube tu foto a https://imgur.com\n' +
                '2. Copia el link directo\n' +
                '3. Usa: `.xnxxcard https://i.imgur.com/XXX.jpg | Mi título`'
            );
        }
    }
};