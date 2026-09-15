// commands/canvas/xnxx.js
// ============================================================
// BOT-API — XNXX CARD (Delirius API)
// Usa servicios que dan URL directa de imagen (no HTML wrapper)
// ============================================================

// ---------- VERIFICAR QUE UNA URL ES IMAGEN VÁLIDA ----------
async function esImagenValida(url) {
    try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        const ct = res.headers.get('content-type') || '';
        return res.ok && ct.startsWith('image/');
    } catch {
        return false;
    }
}

// ---------- 1) IMGBB (URL directa al CDN) ----------
async function uploadToImgbb(buffer) {
    const params = new URLSearchParams();
    params.append('key', '64a2723a04b67c579c8977c14b498535');
    params.append('image', buffer.toString('base64'));

    const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);

    const result = JSON.parse(text);
    if (result?.success && result.data?.display_url) {
        return result.data.display_url; // URL directa a i.ibb.co/xxx.jpg
    }
    throw new Error('Respuesta: ' + text.substring(0, 150));
}

// ---------- 2) IMGUR anónimo (URL directa, sin key) ----------
async function uploadToImgur(buffer) {
    // Client-ID público (se puede usar sin registro)
    const CLIENT_ID = '546c25a59c58ad7';
    
    const formData = new FormData();
    formData.append('image', new Blob([buffer], { type: 'image/jpeg' }), 'image.jpg');
    formData.append('type', 'file');

    const response = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': `Client-ID ${CLIENT_ID}`
        }
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
    }

    const result = await response.json();
    if (result?.data?.link) {
        return result.data.link; // URL directa a i.imgur.com/xxx.jpg
    }
    throw new Error('Respuesta inválida');
}

// ---------- 3) FREEIMAGE.HOST (key pública) ----------
async function uploadToFreeImage(buffer) {
    const params = new URLSearchParams();
    params.append('key', '6d207e02198a847aa98d0a2a901485a5');
    params.append('source', buffer.toString('base64'));
    params.append('format', 'json');

    const response = await fetch('https://freeimage.host/api/1/upload', {
        method: 'POST',
        body: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    if (result?.image?.url) {
        return result.image.url; // URL directa
    }
    throw new Error('Respuesta inválida');
}

// ---------- 4) 0X0.ST (URL directa) ----------
async function uploadTo0x0(buffer) {
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'image.jpg');

    const response = await fetch('https://0x0.st', {
        method: 'POST',
        body: formData,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const url = (await response.text()).trim();
    if (url.startsWith('https://')) return url;
    throw new Error('Respuesta inválida');
}

// ---------- 5) CATBOX.MOE (URL directa, si funciona) ----------
async function uploadToCatbox(buffer) {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', new Blob([buffer], { type: 'image/jpeg' }), 'image.jpg');

    const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const url = (await response.text()).trim();
    if (url.includes('catbox.moe')) return url;
    throw new Error('Respuesta inválida');
}

// ---------- SUBIR CON FALLBACK + VERIFICACIÓN ----------
async function subirImagen(buffer) {
    const errores = [];

    // Orden: los que más probable funcionan primero
    const servicios = [
        ['Imgbb', uploadToImgbb],
        ['FreeImage', uploadToFreeImage],
        ['Imgur', uploadToImgur],
        ['Catbox', uploadToCatbox],
        ['0x0.st', uploadTo0x0]
    ];

    for (const [nombre, fn] of servicios) {
        try {
            const url = await fn(buffer);
            
            // Verificar que sea URL de imagen directa
            const esValida = await esImagenValida(url);
            if (!esValida) {
                throw new Error(`URL no es imagen directa: ${url}`);
            }
            
            console.log(`[XNXX] ✅ ${nombre}: ${url}`);
            return url;
        } catch (e) {
            errores.push(`${nombre}: ${e.message}`);
            console.error(`[XNXX] ❌ ${nombre}: ${e.message}`);
        }
    }

    throw new Error('Todos fallaron:\n' + errores.join('\n'));
}

// ---------- DESCARGAR CONTENIDO DE MEDIA ----------
async function descargarMedia(message, sock) {
    try {
        const baileys = await import('baileys');
        const downloadFn = baileys.downloadContentFromMessage || baileys.default?.downloadContentFromMessage;
        
        if (downloadFn) {
            const mediaType = message.imageMessage ? 'image' : 'video';
            const stream = await downloadFn(message.imageMessage || message.videoMessage, mediaType);
            
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            return Buffer.concat(chunks);
        }
    } catch (e) {
        console.error('[XNXX] downloadContentFromMessage:', e.message);
    }

    try {
        if (typeof sock.downloadMediaMessage === 'function') {
            const fakeMsg = { message, key: { remoteJid: 'dummy', fromMe: false } };
            return await sock.downloadMediaMessage(fakeMsg, 'buffer');
        }
    } catch (e) {
        console.error('[XNXX] sock.downloadMediaMessage:', e.message);
    }

    const mediaObj = message.imageMessage || message.videoMessage;
    if (mediaObj?.url) {
        const res = await fetch(mediaObj.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (res.ok) return Buffer.from(await res.arrayBuffer());
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
                    imageUrl = await subirImagen(buffer);
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
                    imageUrl = await subirImagen(buffer);
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