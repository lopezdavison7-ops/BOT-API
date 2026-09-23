// lib/nsfwDetect.js — 🔞 Detector NSFW con multi-hosting de imágenes
import fs from 'fs';
import path from 'path';

const RUTA = path.join(process.cwd(), 'database', 'detect.json');
const API = 'https://api.evogb.org/nsfw/detect-free';
const KEY = 'evogb-tYhNSXu6';

// ---------- ESTADO ----------
function leer() { try { return JSON.parse(fs.readFileSync(RUTA, 'utf8')); } catch { return {}; } }
function guardar(db) { fs.mkdirSync(path.dirname(RUTA), { recursive: true }); fs.writeFileSync(RUTA, JSON.stringify(db, null, 2)); }

export function getEstado(chatId) {
    const db = leer();
    return db[chatId] || { on: false, strict: false };
}

export function setEstado(chatId, on, strict) {
    const db = leer();
    db[chatId] = { on: !!on, strict: !!strict };
    guardar(db);
}

// ---------- DESCARGAR IMAGEN ----------
async function descargarImagen(sock, msg, img) {
    // Reconstruir mensaje si es quoted
    let msgParaDescargar = msg;
    if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        msgParaDescargar = {
            key: msg.key,
            message: {
                imageMessage: msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage
            }
        };
    }

    // Método 1: sock.downloadMediaMessage
    try {
        if (typeof sock.downloadMediaMessage === 'function') {
            const buf = await sock.downloadMediaMessage(msgParaDescargar);
            if (buf && buf.length > 100) return buf;
        }
    } catch (e) {}

    // Método 2: baileys import
    try {
        const baileys = await import('baileys');
        const lib = baileys.default || baileys;

        if (typeof lib.downloadMediaMessage === 'function') {
            const buf = await lib.downloadMediaMessage(msgParaDescargar);
            if (buf && buf.length > 100) return buf;
        }

        if (typeof lib.downloadContentFromMessage === 'function') {
            const stream = await lib.downloadContentFromMessage(img, 'image');
            const chunks = [];
            for await (const c of stream) chunks.push(c);
            const buf = Buffer.concat(chunks);
            if (buf.length > 100) return buf;
        }
    } catch (e) {}

    // Método 3: fetch directo (el que funciona)
    try {
        if (img.url) {
            const res = await fetch(img.url);
            if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                if (buf.length > 100) return buf;
            }
        }
    } catch (e) {}

    return null;
}

// ---------- SUBIR A HOSTINGS (5 opciones con logs) ----------
async function subirImagen(buffer, mime) {
    const tipo = mime || 'image/jpeg';

    // 1. EVOGB STORAGE (mismo proveedor de la API NSFW)
    try {
        const form = new FormData();
        form.append('file', new Blob([buffer], { type: tipo }), 'img.jpg');
        form.append('author', 'BOT-API');
        const r = await fetch('https://evogb.win/api/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(20000) });
        const j = await r.json();
        if (j.success && j.url) {
            console.log('[NSFW-UP] ✅ evogb.win:', j.url);
            return j.url;
        }
        console.log('[NSFW-UP] evogb respondió sin url:', JSON.stringify(j).slice(0, 100));
    } catch (e) {
        console.log('[NSFW-UP] evogb falló:', e.message);
    }

    // 2. CATBOX
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', new Blob([buffer], { type: tipo }), 'img.jpg');
        const r = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form, signal: AbortSignal.timeout(20000) });
        const txt = await r.text();
        if (r.ok && txt.startsWith('http')) {
            console.log('[NSFW-UP] ✅ catbox:', txt);
            return txt.trim();
        }
        console.log('[NSFW-UP] catbox respondió:', txt.slice(0, 100));
    } catch (e) {
        console.log('[NSFW-UP] catbox falló:', e.message);
    }

    // 3. TMPFILES
    try {
        const form = new FormData();
        form.append('file', new Blob([buffer], { type: tipo }), 'img.jpg');
        const r = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(20000) });
        const j = await r.json();
        if (j.data?.url) {
            // Convertir a link directo de descarga
            const url = j.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            console.log('[NSFW-UP] ✅ tmpfiles:', url);
            return url;
        }
        console.log('[NSFW-UP] tmpfiles respondió:', JSON.stringify(j).slice(0, 100));
    } catch (e) {
        console.log('[NSFW-UP] tmpfiles falló:', e.message);
    }

    // 4. UGUU
    try {
        const form = new FormData();
        form.append('files[]', new Blob([buffer], { type: tipo }), 'img.jpg');
        const r = await fetch('https://uguu.se/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(20000) });
        const j = await r.json();
        if (j.files?.[0]?.url) {
            console.log('[NSFW-UP] ✅ uguu:', j.files[0].url);
            return j.files[0].url;
        }
        console.log('[NSFW-UP] uguu respondió:', JSON.stringify(j).slice(0, 100));
    } catch (e) {
        console.log('[NSFW-UP] uguu falló:', e.message);
    }

    // 5. TELEGRAPH (último recurso)
    try {
        const form = new FormData();
        form.append('file', new Blob([buffer], { type: tipo }), 'img.jpg');
        const r = await fetch('https://telegra.ph/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(15000) });
        const j = await r.json();
        if (Array.isArray(j) && j[0]?.src) {
            const url = 'https://telegra.ph' + j[0].src;
            console.log('[NSFW-UP] ✅ telegraph:', url);
            return url;
        }
    } catch (e) {
        console.log('[NSFW-UP] telegraph falló:', e.message);
    }

    console.log('[NSFW-UP] ❌ Todos los hostings fallaron');
    return null;
}

// ---------- ANALIZAR IMAGEN ----------
export async function analizarImagen(buffer, mime) {
    console.log('[NSFW-API] Analizando imagen de', (buffer.length / 1024).toFixed(1), 'KB');

    // PASO 1: subir a un hosting
    const urlPublica = await subirImagen(buffer, mime);

    if (urlPublica) {
        // PASO 2: probar formatos con la URL
        const intentos = [
            {
                nombre: 'GET ?url=',
                fn: () => fetch(API + '?key=' + KEY + '&url=' + encodeURIComponent(urlPublica), {
                    method: 'GET',
                    signal: AbortSignal.timeout(20000)
                })
            },
            {
                nombre: 'POST JSON {url}',
                fn: () => fetch(API + '?key=' + KEY, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: urlPublica }),
                    signal: AbortSignal.timeout(20000)
                })
            },
            {
                nombre: 'POST ?url=',
                fn: () => fetch(API + '?key=' + KEY + '&url=' + encodeURIComponent(urlPublica), {
                    method: 'POST',
                    signal: AbortSignal.timeout(20000)
                })
            },
            {
                nombre: 'POST JSON {image: url}',
                fn: () => fetch(API + '?key=' + KEY, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: urlPublica }),
                    signal: AbortSignal.timeout(20000)
                })
            }
        ];

        for (const intento of intentos) {
            try {
                const res = await intento.fn();
                const texto = await res.text();
                console.log('[NSFW-API]', intento.nombre, '→ HTTP', res.status, '|', texto.slice(0, 80));

                if (res.ok) {
                    try {
                        const json = JSON.parse(texto);
                        if (json && json.status === true && json.analysis) {
                            console.log('[NSFW-API] ✅ Éxito con:', intento.nombre);
                            return json;
                        }
                    } catch (e) {}
                }
            } catch (e) {
                console.log('[NSFW-API]', intento.nombre, 'falló:', e.message);
            }
        }
    }

    // FALLBACK: multipart directo con logs de status
    for (const campo of ['image', 'file', 'img', 'foto']) {
        try {
            const form = new FormData();
            form.append(campo, new Blob([buffer], { type: mime || 'image/jpeg' }), 'imagen.jpg');
            const res = await fetch(API + '?key=' + KEY, { method: 'POST', body: form, signal: AbortSignal.timeout(20000) });
            const texto = await res.text();
            console.log('[NSFW-API] multipart "' + campo + '" → HTTP', res.status, '|', texto.slice(0, 80));

            if (res.ok) {
                try {
                    const json = JSON.parse(texto);
                    if (json && json.status === true && json.analysis) {
                        console.log('[NSFW-API] ✅ Éxito con multipart:', campo);
                        return json;
                    }
                } catch (e) {}
            }
        } catch (e) {
            console.log('[NSFW-API] multipart "' + campo + '" falló:', e.message);
        }
    }

    console.log('[NSFW-API] ❌ Ningún método funcionó');
    return null;
}

// ---------- MANEJADOR ----------
export async function manejarDeteccion(sock, msg) {
    const chatId = msg.key.remoteJid;
    if (!chatId || !chatId.endsWith('@g.us')) return false;

    const estado = getEstado(chatId);
    if (!estado.on) return false;

    const m = msg.message || {};
    const img = m.imageMessage || m.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    if (!img) return false;

    // LOG 1
    let logKey = null;
    try {
        const logMsg = await sock.sendMessage(chatId, {
            text: '╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ 📥 Descargando...\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣'
        }, { quoted: msg });
        logKey = logMsg.key;
    } catch (e) {}

    const editarLog = async (texto) => {
        if (!logKey) return;
        try { await sock.sendMessage(chatId, { text: texto, edit: logKey }); } catch (e) {}
    };

    // PASO 2: descargar
    const buffer = await descargarImagen(sock, msg, img);

    if (!buffer || buffer.length < 100) {
        await editarLog('╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ ❌ [2/4] No se pudo descargar\n┃\n━━〔 ⚡ 𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
        return false;
    }

    await editarLog('╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ ✅ [2/4] Descargada (' + (buffer.length / 1024).toFixed(1) + ' KB)\n┃ 🧠 [3/4] Subiendo y analizando...\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣');

    // PASO 3: analizar
    const json = await analizarImagen(buffer, img.mimetype);

    if (!json) {
        await editarLog('╭━━〔  𝐃𝐓𝐂𝐎 𝐍𝐅 〕━━\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ ✅ [2/4] Descargada\n┃ ❌ [3/4] La API no respondió\n┃    (usa .errores para ver detalles)\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣');
        return false;
    }

    // PASO 4: resultado
    const a = json.analysis || {};
    const esNSFW = a.is_nsfw === true;
    const scores = (json.raw_scores || []).slice(0, 5);

    let texto =
        '╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐂𝐈𝐎𝐍 𝐍𝐒𝐅𝐖 〕━━⬣\n' +
        '┃\n' +
        '┃ ✅ [1/4] Imagen detectada\n' +
        '┃ ✅ [2/4] Descargada\n' +
        '┃ ✅ [3/4] Analizada\n' +
        '┃ ✅ [4/4] Resultado:\n' +
        '┃\n' +
        (esNSFW ? '┃ 🚨 *CONTENIDO NSFW*\n' : '┃ ✅ *CONTENIDO SEGURO*\n') +
        '┃ 🏷️ Tipo: ' + (a.flag || 'N/D') + '\n' +
        '┃ 📊 Confianza: ' + (a.confidence || 'N/D') + '\n' +
        '┃\n' +
        '┣━━〔  𝐃𝐄𝐓𝐀𝐋𝐋𝐄 〕━━⬣\n';

    for (const s of scores) {
        texto += '┃ ' + (s.number >= 50 ? '▰' : '▱') + ' ' + s.className + ': ' + s.string + '\n';
    }

    if (esNSFW && estado.strict) {
        texto += '┃\n┃ 🗑️ Imagen eliminada (modo estricto)\n';
    }

    texto += '┃\n╰━━〔  𝐁𝐓-𝐏 ⚡ 〕━━⬣';

    await editarLog(texto);

    if (esNSFW && estado.strict) {
        try { await sock.sendMessage(chatId, { delete: msg.key }); } catch (e) {}
    }

    return false;
}