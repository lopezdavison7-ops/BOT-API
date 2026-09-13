// commands/fun/xnxxcard.js
// ============================================================
// BOT-API — XNXX CARD GENERATOR
// ============================================================
// Genera una tarjeta estilo XNXX con imagen y título personalizado
//
// Formas de usar:
// 1. Responde a una imagen + .xnxxcard <título>
// 2. .xnxxcard <url_imagen> | <título>
// ============================================================

export default {
    nombre: 'pornocarta',
    categoria: 'Fun',
    alias: ['xnxx', 'tarjetaxnxx', 'cardxnxx', 'pornocarta'],
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

        // Intentar extraer imagen de un mensaje citado
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;

        if (quoted) {
            if (quoted.imageMessage) {
                try {
                    // Descargar la imagen citada y obtener su URL temporal
                    const buffer = await sock.downloadMediaMessage({ message: quoted });
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
                    }
                } catch (e) {
                    console.error('[XNXXCARD] Error subiendo imagen:', e?.message);
                }
            }
            titulo = args;
        }

        // Si no hay imagen citada, buscar formato "url | titulo"
        if (!imageUrl) {
            if (args.includes('|')) {
                const partes = args.split('|').map(s => s.trim());
                const posibleUrl = partes[0];
                titulo = partes.slice(1).join('|').trim();
                
                if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(posibleUrl)) {
                    imageUrl = posibleUrl;
                } else if (posibleUrl.startsWith('http')) {
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
                '┃ Responde a una foto o usa:\n' +
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

            await responder.imagen(
                { url: apiUrl },
                '🔞 *' + titulo + '*\n\n_Generado con Delirius API_'
            );

        } catch (error) {
            console.error('[XNXXCARD] Error:', error?.message || error);
            await responder.texto('❌ Error generando la tarjeta: ' + (error?.message || 'Intenta de nuevo.'));
        }
    }
};