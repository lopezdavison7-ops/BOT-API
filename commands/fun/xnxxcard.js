// commands/canvas/xnxx.js
// ============================================================
// BOT-API — XNXX CARD (Delirius API)
// Usa FormData NATIVO de Node.js (no el paquete form-data)
// ============================================================

// ---------- SUBIR A TELEGRAPH (FormData nativo) ----------
async function uploadToTelegraph(buffer) {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    formData.append('file', blob, 'image.jpg');

    const response = await fetch('https://telegra.ph/upload', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    
    if (Array.isArray(result) && result[0]?.src) {
        return 'https://telegra.ph' + result[0].src;
    }
    if (result?.src) {
        return 'https://telegra.ph' + result.src;
    }

    throw new Error('Respuesta: ' + JSON.stringify(result).substring(0, 150));
}

// ---------- SUBIR A IMGBB ----------
async function uploadToImgbb(buffer) {
    const params = new URLSearchParams();
    params.append('key', '64a2723a04b67c579c8977c14b498535');
    params.append('image', buffer.toString('base64'));

    const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    if (result?.data?.url) return result.data.url;

    throw new Error('Respuesta inválida');
}

// ---------- SUBIR A CATBOX (FormData nativo) ----------
async function uploadToCatbox(buffer) {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', new Blob([buffer], { type: 'image/jpeg' }), 'image.jpg');

    const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const url = await response.text();
    if (url.includes('catbox.moe')) return url.trim();

    throw new Error('Respuesta: ' + url.substring(0, 100));
}

// ---------- SUBIR A TMPFILES (FormData nativo) ----------
async function uploadToTmpfiles(buffer) {
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'image.jpg');

    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    if (result?.data?.url) {
        return result.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    }

    throw new Error('Respuesta inválida');
}

// ---------- SUBIR A UGUU (sin key) ----------
async function uploadToUguu(buffer) {
    const formData = new FormData();
    formData.append('files[]', new Blob([buffer], { type: 'image/jpeg' }), 'image.jpg');

    const response = await fetch('https://uguu.se/upload.php', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    if (result?.files?.[0]?.url) return result.files[0].url;

    throw new Error('Respuesta inválida');
}

// ---------- SUBIR CON FALLBACK ----------
async function subirImagen(buffer) {
    const errores = [];

    const servicios = [
        ['Telegraph', uploadToTelegraph],
        ['Imgbb', uploadToImgbb],
        ['Catbox', uploadToCatbox],
        ['Tmpfiles', uploadToTmpfiles],
        ['Uguu', uploadToUguu]
    ];

    for (const [nombre, fn] of servicios) {
        try {
            const url = await fn(buffer);
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
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
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