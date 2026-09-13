// commands/fun/xnxxcard.js
// ============================================================
// BOT-API — XNXX CARD GENERATOR (FIXED)
// ============================================================
// Genera una tarjeta estilo XNXX con imagen y título personalizado
//
// Formas de usar:
// 1. Responde a una imagen + .xnxxcard <título>
// 2. .xnxxcard <url_imagen> | <título>
// ============================================================

export default {
    nombre: 'xnxxcard',
    categoria: 'Fun',
    alias: ['porno', 'tarjetaxnxx', 'cardxnxx', 'pornocarta'],
    descripcion: 'Genera una tarjeta estilo XNXX con tu imagen y título',
    uso: '.xnxxcard <titulo> (respondiendo a una imagen) · .xnxxcard <url> | <titulo>',
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
        
        if (quotedMsg) {
            // Imagen citada
            if (quotedMsg.imageMessage) {
                try {
                    const buffer = await sock.downloadMediaMessage({
                        message: quotedMsg,
                        type: 'image'
                    });
                    
                    // Subir a tmpfiles.org
                    const FormData = (await import('form-data')).default;
                    const fetch = (await import('node-fetch')).default;
                    
                    const form = new FormData();
                    form.append('file', buffer, { filename: 'img.jpg', contentType: 'image/jpeg' });
                    
                    const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
                        method: 'POST',
                        body: form
                    });
                    const uploadJson = await uploadRes.json();
                    
                    if (uploadJson?.data?.url) {
                        imageUrl = uploadJson.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                        console.log('[XNXXCARD] Imagen subida:', imageUrl);
                    }
                } catch (e) {
                    console.error('[XNXXCARD] Error procesando imagen citada:', e?.message);
                    return await responder.texto('❌ Error al procesar la imagen. Intenta de nuevo.');
                }
            }
            
            // Sticker citado (convertir a imagen)
            else if (quotedMsg.stickerMessage) {
                return await responder.texto('❌ Los stickers no funcionan, usa una imagen normal.');
            }
            
            titulo = args;
        }

        // Si no hay imagen citada, buscar formato "url | titulo"
        if (!imageUrl) {
            if (args.includes('|')) {
                const partes = args.split('|').map(s => s.trim());
                const posibleUrl = partes[0];
                titulo = partes.slice(1).join('|').trim();
                
                if (posibleUrl.startsWith('http')) {
                    imageUrl = posibleUrl;
                }
            } else if (args.startsWith('http')) {
                return await responder.texto('❌ Si usas URL, separa con | :\n`.xnxxcard https://... | Mi título`');
            }
        }

        if (!imageUrl) {
            return await responder.texto(
                '╭━━〔 🔞 𝐗𝐍𝐗𝐗 𝐂𝐀𝐑𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ No se detectó imagen\n' +
                '┃\n' +
                '┃ Responde a una foto y escribe:\n' +
                '┃ .xnxxcard <título>\n' +
                '┃\n' +
                '┃ O usa URL:\n' +
                '┃ .xnxxcard <url> | <titulo>\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (!titulo) {
            titulo = 'Sin título';
        }

        try {
            const apiUrl = `https://api.delirius.online/canvas/xnxxcard?image=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(titulo)}`;
            
            console.log('[XNXXCARD] Generando:', apiUrl);

            await responder.imagen(
                { url: apiUrl },
                '🔞 *' + titulo + '*\n\n_Generado con Delirius API_'
            );

        } catch (error) {
            console.error('[XNXXCARD] Error generando tarjeta:', error?.message || error);
            await responder.texto('❌ Error generando la tarjeta: ' + (error?.message || 'Intenta de nuevo.'));
        }
    }
};