// commands/ia/age.js
// ============================================================
// BOT-API — DETECTOR DE EDAD (Delirius AI)
// ============================================================
// .age → Analiza tu foto de perfil
// .age <url> → Analiza imagen por URL
// [Foto] .age → Analiza la imagen enviada
// [Citar foto] .age → Analiza la imagen citada
// ============================================================

import FormData from 'form-data';

// ---------- SUBIR IMAGEN (varios servicios con fallback) ----------
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
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = JSON.parse(text);
    if (result?.success && result.data?.display_url) {
        return result.data.display_url;
    }
    throw new Error('Respuesta inválida');
}

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
    const url = (await response.text()).trim();
    if (url.includes('catbox.moe')) return url;
    throw new Error('Respuesta inválida');
}

async function subirImagen(buffer) {
    const servicios = [
        ['Imgbb', uploadToImgbb],
        ['Catbox', uploadToCatbox]
    ];

    for (const [nombre, fn] of servicios) {
        try {
            return await fn(buffer);
        } catch (e) {
            console.error(`[AGE] ${nombre} falló:`, e.message);
        }
    }
    throw new Error('No se pudo subir la imagen');
}

// ---------- DESCARGAR IMAGEN ----------
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
        console.error('[AGE] downloadContentFromMessage:', e.message);
    }

    const mediaObj = message.imageMessage || message.videoMessage;
    if (mediaObj?.url) {
        const res = await fetch(mediaObj.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (res.ok) return Buffer.from(await res.arrayBuffer());
    }

    throw new Error('No se pudo descargar la imagen');
}

// ---------- TRADUCCIONES ----------
function traducirGenero(g) {
    const map = {
        'mujer': '👩 Mujer',
        'hombre': '👨 Hombre',
        'male': '👨 Hombre',
        'female': '👩 Mujer'
    };
    return map[String(g).toLowerCase()] || `👤 ${g}`;
}

function traducirExpresion(e) {
    const map = {
        'ninguna': '😐 Ninguna / Neutral',
        'none': '😐 Ninguna / Neutral',
        'feliz': '😄 Feliz',
        'happy': '😄 Feliz',
        'triste': '😢 Triste',
        'sad': '😢 Triste',
        'sorprendido': '😮 Sorprendido',
        'surprised': '😮 Sorprendido',
        'enojado': '😠 Enojado',
        'angry': '😠 Enojado'
    };
    return map[String(e).toLowerCase()] || `🎭 ${e}`;
}

function traducirForma(f) {
    const map = {
        'redonda': '🔵 Redonda',
        'round': '🔵 Redonda',
        'ovalada': '🥚 Ovalada',
        'oval': '🥚 Ovalada',
        'cuadrada': '⬜ Cuadrada',
        'square': '⬜ Cuadrada',
        'corazón': '💖 Corazón',
        'heart': '💖 Corazón',
        'diamante': '💎 Diamante',
        'diamond': '💎 Diamante',
        'alargada': '📏 Alargada',
        'oblong': '📏 Alargada'
    };
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
        const chatJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        const s = global.conns?.[0] || Object.values(global.conns || {})[0] || sock;

        let imageUrl = '';
        let metodoUsado = '';

        const argumentoTrim = String(argumento || '').trim();

        // ---------- CASO 0: URL DIRECTA ----------
        if (argumentoTrim && /^https?:\/\//i.test(argumentoTrim)) {
            imageUrl = argumentoTrim;
            metodoUsado = 'URL directa';
        }

        // ---------- CASO 1: IMAGEN ENVIADA CON CAPTION ----------
        if (!imageUrl && msg.message?.imageMessage) {
            try {
                const buffer = await descargarMedia(msg.message, s);
                if (buffer?.length > 0) {
                    imageUrl = await subirImagen(buffer);
                    metodoUsado = 'imagen enviada';
                }
            } catch (e) {
                return await responder.texto('❌ Error procesando la imagen enviada: ' + e.message);
            }
        }

        // ---------- CASO 2: IMAGEN CITADA ----------
        if (!imageUrl && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            try {
                const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                const buffer = await descargarMedia(quotedMsg, s);
                if (buffer?.length > 0) {
                    imageUrl = await subirImagen(buffer);
                    metodoUsado = 'imagen citada';
                }
            } catch (e) {
                return await responder.texto('❌ Error procesando la imagen citada: ' + e.message);
            }
        }

        // ---------- CASO 3: FOTO DE PERFIL ----------
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

        // ---------- LLAMAR A LA API DE DELIRIUS ----------
        try {
            const apiUrl = `https://api.delirius.online/ia/age?image=${encodeURIComponent(imageUrl)}&language=es`;

            const res = await fetch(apiUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();
            const data = json.data || json.datos;

            if (!json.status || !data) {
                throw new Error('La API no devolvió datos válidos');
            }

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
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await responder.imagen(
                { url: imageUrl },
                texto
            );

        } catch (error) {
            console.error('[AGE] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐀𝐆𝐄 𝐀𝐈 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude analizar la imagen.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido'}\n` +
                '┃\n' +
                '┃ 💡 Asegúrate de que la imagen\n' +
                '┃    tenga una cara visible.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};