// commands/ia/age.js
// ============================================================
// BOT-API — DETECTOR DE EDAD (Delirius AI)
// Usa FormData NATIVO de Node (igual que xnxx.js)
// ============================================================

// ⚠️ NO importa form-data — usa el FormData global de Node 18+

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

// ---------- 1) IMGBB ----------
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
        return result.data.display_url;
    }
    throw new Error('Respuesta: ' + text.substring(0, 150));
}

// ---------- 2) TELEGRAPH ----------
async function uploadToTelegraph(buffer) {
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'foto.jpg');

    const response = await fetch('https://telegra.ph/upload', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch { throw new Error('No es JSON'); }

    if (Array.isArray(result) && result[0]?.src) {
        return 'https://telegra.ph' + result[0].src;
    }
    if (result?.src) {
        return 'https://telegra.ph' + result.src;
    }
    throw new Error('Respuesta: ' + text.substring(0, 100));
}

// ---------- 3) CATBOX ----------
async function uploadToCatbox(buffer) {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', new Blob([buffer], { type: 'image/jpeg' }), 'foto.jpg');

    const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const url = (await response.text()).trim();
    if (url.includes('catbox.moe')) return url;
    throw new Error('Respuesta: ' + url.substring(0, 80));
}

// ---------- 4) 0X0.ST ----------
async function uploadTo0x0(buffer) {
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'foto.jpg');

    const response = await fetch('https://0x0.st', {
        method: 'POST',
        body: formData,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const url = (await response.text()).trim();
    if (url.startsWith('https://')) return url;
    throw new Error('Respuesta: ' + url.substring(0, 80));
}

// ---------- 5) FREEIMAGE ----------
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
    if (result?.image?.url) return result.image.url;
    throw new Error('Respuesta inválida');
}

// ---------- SUBIR CON FALLBACK ----------
async function subirImagen(buffer) {
    const errores = [];

    const servicios = [
        ['Telegraph', uploadToTelegraph],
        ['Catbox', uploadToCatbox],
        ['0x0.st', uploadTo0x0],
        ['FreeImage', uploadToFreeImage],
        ['Imgbb', uploadToImgbb]
    ];

    for (const [nombre, fn] of servicios) {
        try {
            const url = await fn(buffer);
            const esValida = await esImagenValida(url);
            if (!esValida) throw new Error(`URL no es imagen directa`);
            console.log(`[AGE] ✅ ${nombre}: ${url}`);
            return { url, servicio: nombre, erroresPrevios: errores };
        } catch (e) {
            errores.push(`${nombre}: ${e.message}`);
            console.error(`[AGE] ❌ ${nombre}: ${e.message}`);
        }
    }

    throw new Error('Todos fallaron:\n' + errores.join('\n'));
}

// ---------- DESCARGAR MEDIA ----------
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
        throw new Error('downloadContentFromMessage: ' + e.message);
    }

    const mediaObj = message.imageMessage || message.videoMessage;
    if (mediaObj?.url) {
        const res = await fetch(mediaObj.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (res.ok) return Buffer.from(await res.arrayBuffer());
    }

    throw new Error('No se pudo descargar');
}

// ---------- TRADUCCIONES ----------
function traducirGenero(g) {
    const map = { 'mujer': '👩 Mujer', 'hombre': '👨 Hombre', 'male': '👨 Hombre', 'female': '👩 Mujer' };
    return map[String(g).toLowerCase()] || `👤 ${g}`;
}
function traducirExpresion(e) {
    const map = { 'ninguna': '😐 Neutral', 'none': '😐 Neutral', 'feliz': '😄 Feliz', 'happy': '😄 Feliz', 'triste': '😢 Triste', 'sad': '😢 Triste', 'sorprendido': '😮 Sorprendido', 'enojado': '😠 Enojado' };
    return map[String(e).toLowerCase()] || `🎭 ${e}`;
}
function traducirForma(f) {
    const map = { 'redonda': '🔵 Redonda', 'round': '🔵 Redonda', 'ovalada': '🥚 Ovalada', 'cuadrada': '⬜ Cuadrada', 'corazón': '💖 Corazón', 'diamante': '💎 Diamante', 'alargada': '📏 Alargada' };
    return map[String(f).toLowerCase()] || `🎨 ${f}`;
}

// ============================================================
// COMANDO
// ============================================================
export default {
    nombre: 'age',
    categoria: 'ia',
    alias: ['edad', 'detectaredad', 'ageai', 'faceai'],
    descripcion: 'Detecta edad, género, expresión y forma de cara con IA',
    uso: '.age | .age <url> | [foto] .age',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const sender = msg.key.participant || msg.key.remoteJid;
        const s = global.conns?.[0] || Object.values(global.conns || {})[0] || sock;

        let imageUrl = '';
        let metodoUsado = '';
        let servicioUpload = '';
        let erroresUpload = [];

        const argumentoTrim = String(argumento || '').trim();

        // CASO 0: URL DIRECTA
        if (argumentoTrim && /^https?:\/\//i.test(argumentoTrim)) {
            imageUrl = argumentoTrim;
            metodoUsado = 'URL directa';
        }

        // CASO 1: IMAGEN ENVIADA
        if (!imageUrl && msg.message?.imageMessage) {
            try {
                const buffer = await descargarMedia(msg.message, s);
                if (buffer?.length > 0) {
                    const result = await subirImagen(buffer);
                    imageUrl = result.url;
                    servicioUpload = result.servicio;
                    erroresUpload = result.erroresPrevios || [];
                    metodoUsado = 'imagen enviada';
                }
            } catch (e) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐀𝐆𝐄 𝐀𝐈 〕━━⬣\n' +
                    '┃\n' +
                    '┃ *ERROR: Imagen enviada*\n' +
                    '┃\n' +
                    `┃ ⚠️ ${e.message}\n` +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }
        }

        // CASO 2: IMAGEN CITADA
        if (!imageUrl && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            try {
                const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                const buffer = await descargarMedia(quotedMsg, s);
                if (buffer?.length > 0) {
                    const result = await subirImagen(buffer);
                    imageUrl = result.url;
                    servicioUpload = result.servicio;
                    erroresUpload = result.erroresPrevios || [];
                    metodoUsado = 'imagen citada';
                }
            } catch (e) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐀𝐆𝐄 𝐀𝐈 〕━━⬣\n' +
                    '┃\n' +
                    '┃ *ERROR: Imagen citada*\n' +
                    '┃\n' +
                    `┃ ⚠️ ${e.message}\n` +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }
        }

        // CASO 3: FOTO DE PERFIL
        if (!imageUrl) {
            try {
                imageUrl = await s.profilePictureUrl(sender, 'image');
                metodoUsado = 'foto de perfil';
            } catch (e) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐀𝐆𝐄 𝐀𝐈 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No tienes foto de perfil.\n' +
                    '┃\n' +
                    '┃ 📋 Opciones:\n' +
                    '┃ • Envía una foto con .age\n' +
                    '┃ • Cita una foto y usa .age\n' +
                    '┃ • Usa .age <url>\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }
        }

        // ---------- LLAMAR API ----------
        try {
            const apiUrl = `https://api.delirius.online/ia/age?image=${encodeURIComponent(imageUrl)}&language=es`;

            const res = await fetch(apiUrl);
            const text = await res.text();

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            let json;
            try { json = JSON.parse(text); } catch { throw new Error('Respuesta no es JSON'); }

            const data = json.data || json.datos;

            if (!json.status || !data) {
                const motivo = json.msg || json.message || json.error || 'Error desconocido';

                if (motivo.toLowerCase().includes('face not found')) {
                    return await responder.texto(
                        '╭━━〔 🧠 𝐀𝐆𝐄 𝐀𝐈 〕━━⬣\n' +
                        '┃\n' +
                        '┃ ❌ *No se detectó cara en la imagen*\n' +
                        '┃\n' +
                        '┃ 💡 La IA necesita una foto clara\n' +
                        '┃    de un rostro humano visible.\n' +
                        '┃\n' +
                        '┃ 📸 Intenta:\n' +
                        '┃ • Selfie con buena iluminación\n' +
                        '┃ • Cara completa y frontal\n' +
                        '┃ • Sin gafas ni mascarilla\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                    );
                }

                let diag =
                    '╭━━〔 🔍 𝐃𝐈𝐀𝐆𝐍𝐎𝐒𝐓𝐈𝐂𝐎 〕━━⬣\n' +
                    '┃\n' +
                    `┃ ❌ ${motivo}\n` +
                    '┃\n' +
                    `┃ 📸 Fuente: ${metodoUsado}\n` +
                    (servicioUpload ? `┃ 📤 Subida: ${servicioUpload}\n` : '') +
                    '┃\n' +
                    '┃ 🔗 URL imagen:\n' +
                    `┃ ${imageUrl}\n` +
                    '┃\n' +
                    '┃ 📥 Respuesta:\n' +
                    `┃ ${text.substring(0, 150)}\n` +
                    '┃\n';

                if (erroresUpload.length > 0) {
                    diag += '┃ ⚠️ Servicios que fallaron:\n';
                    erroresUpload.forEach(e => { diag += `┃ • ${e}\n`; });
                    diag += '┃\n';
                }

                diag += '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';
                return await responder.texto(diag);
            }

            // ÉXITO
            const edad = data.age || data.edad || 'N/A';
            const genero = traducirGenero(data.gender || data.genero || 'Desconocido');
            const expresion = traducirExpresion(data.expression || data.expresion || 'ninguna');
            const forma = traducirForma(data.face_shape || data.forma_cara || 'Desconocida');

            const texto =
                '╭━━〔 🧠 𝐀𝐆𝐄 𝐀𝐈 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎂 *Edad aproximada:* ' + edad + ' años\n' +
                '┃ ' + genero + '\n' +
                '┃ ' + expresion + '\n' +
                '┃ ' + forma + '\n' +
                '┃\n' +
                `┃ 📸 Fuente: ${metodoUsado}\n` +
                (servicioUpload ? `┃ 📤 Subida: ${servicioUpload}\n` : '') +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await responder.imagen({ url: imageUrl }, texto);

        } catch (error) {
            let diag =
                '╭━━〔 🔍 𝐄𝐑𝐑𝐎𝐑 𝐃𝐄 𝐀𝐏𝐈 〕━━⬣\n' +
                '┃\n' +
                `┃ ❌ ${error.message}\n` +
                '┃\n' +
                `┃ 📸 Fuente: ${metodoUsado}\n` +
                (servicioUpload ? `┃ 📤 Subida: ${servicioUpload}\n` : '') +
                '┃\n' +
                '┃ 🔗 URL imagen:\n' +
                `┃ ${imageUrl}\n` +
                '┃\n';

            if (erroresUpload.length > 0) {
                diag += '┃ ⚠️ Servicios que fallaron:\n';
                erroresUpload.forEach(e => { diag += `┃ • ${e}\n`; });
                diag += '┃\n';
            }

            diag += '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';
            await responder.texto(diag);
        }
    }
};