// lib/nsfwDetect.js — 🔞 Detector NSFW con debug completo
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
    console.log('[NSFW] Intentando descargar imagen...');
    console.log('[NSFW] img.mimetype:', img.mimetype);
    console.log('[NSFW] img.url:', img.url ? 'tiene' : 'NO tiene');
    console.log('[NSFW] img.directPath:', img.directPath ? 'tiene' : 'NO tiene');
    console.log('[NSFW] img.mediaKey:', img.mediaKey ? 'tiene' : 'NO tiene');

    // Reconstruir mensaje si es quoted
    let msgParaDescargar = msg;
    if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        console.log('[NSFW] Imagen viene en quotedMessage, reconstruyendo...');
        msgParaDescargar = {
            key: msg.key,
            message: {
                imageMessage: msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage
            }
        };
    }

    // Método 1: sock.downloadMediaMessage
    try {
        console.log('[NSFW] Método 1: sock.downloadMediaMessage');
        if (typeof sock.downloadMediaMessage === 'function') {
            const buf = await sock.downloadMediaMessage(msgParaDescargar);
            console.log('[NSFW] Método 1 OK, tamaño:', buf?.length);
            if (buf && buf.length > 100) return buf;
        } else {
            console.log('[NSFW] Método 1: función no existe');
        }
    } catch (e) {
        console.error('[NSFW] Método 1 falló:', e.message);
    }

    // Método 2: baileys import
    try {
        console.log('[NSFW] Método 2: import baileys');
        const baileys = await import('baileys');
        const lib = baileys.default || baileys;

        if (typeof lib.downloadMediaMessage === 'function') {
            console.log('[NSFW] Método 2a: baileys.downloadMediaMessage');
            const buf = await lib.downloadMediaMessage(msgParaDescargar);
            console.log('[NSFW] Método 2a OK, tamaño:', buf?.length);
            if (buf && buf.length > 100) return buf;
        }

        if (typeof lib.downloadContentFromMessage === 'function') {
            console.log('[NSFW] Método 2b: baileys.downloadContentFromMessage');
            const stream = await lib.downloadContentFromMessage(img, 'image');
            const chunks = [];
            for await (const c of stream) chunks.push(c);
            const buf = Buffer.concat(chunks);
            console.log('[NSFW] Método 2b OK, tamaño:', buf?.length);
            if (buf.length > 100) return buf;
        }
    } catch (e) {
        console.error('[NSFW] Método 2 falló:', e.message);
    }

    // Método 3: fetch directo
    try {
        console.log('[NSFW] Método 3: fetch directo');
        if (img.url) {
            const res = await fetch(img.url);
            if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                console.log('[NSFW] Método 3 OK, tamaño:', buf.length);
                if (buf.length > 100) return buf;
            }
        }
    } catch (e) {
        console.error('[NSFW] Método 3 falló:', e.message);
    }

    console.log('[NSFW] Todos los métodos fallaron');
    return null;
}

// ---------- SUBIR A TELEGRAPH ----------
async function subirTelegraph(buffer) {
    try {
        const form = new FormData();
        form.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'img.jpg');
        const r = await fetch('https://telegra.ph/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(15000) });
        const j = await r.json();
        if (Array.isArray(j) && j[0]?.src) return 'https://telegra.ph' + j[0].src;
    } catch (e) {
        console.error('[NSFW] Telegraph falló:', e.message);
    }
    return null;
}

// ---------- ANALIZAR ----------
export async function analizarImagen(buffer, mime) {
    for (const campo of ['image', 'file', 'img']) {
        try {
            const form = new FormData();
            form.append(campo, new Blob([buffer], { type: mime || 'image/jpeg' }), 'imagen.jpg');
            const res = await fetch(API + '?key=' + KEY, { method: 'POST', body: form, signal: AbortSignal.timeout(20000) });
            if (!res.ok) continue;
            const json = await res.json();
            if (json && json.status === true && json.analysis) return json;
        } catch (e) {
            console.error('[NSFW] API multipart falló:', e.message);
        }
    }

    const url = await subirTelegraph(buffer);
    if (url) {
        for (const modo of ['json', 'query']) {
            try {
                let res;
                if (modo === 'json') {
                    res = await fetch(API + '?key=' + KEY, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url }),
                        signal: AbortSignal.timeout(20000)
                    });
                } else {
                    res = await fetch(API + '?key=' + KEY + '&url=' + encodeURIComponent(url), { method: 'POST', signal: AbortSignal.timeout(20000) });
                }
                if (!res.ok) continue;
                const json = await res.json();
                if (json && json.status === true && json.analysis) return json;
            } catch (e) {
                console.error('[NSFW] API URL falló:', e.message);
            }
        }
    }
    return null;
}

// ---------- MANEJADOR ----------
export async function manejarDeteccion(sock, msg) {
    const chatId = msg.key.remoteJid;
    if (!chatId || !chatId.endsWith('@g.us')) return false;

    const estado = getEstado(chatId);
    if (!estado.on) {
        console.log('[NSFW] Detector apagado en', chatId);
        return false;
    }

    console.log('[NSFW] Detector activo en', chatId);

    const m = msg.message || {};
    const img = m.imageMessage || m.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    
    if (!img) {
        console.log('[NSFW] No hay imagen en el mensaje');
        return false;
    }

    console.log('[NSFW] Imagen detectada, iniciando descarga...');

    // LOG 1
    let logKey = null;
    try {
        const logMsg = await sock.sendMessage(chatId, {
            text: '╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ 📥 Descargando...\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        }, { quoted: msg });
        logKey = logMsg.key;
    } catch (e) {
        console.error('[NSFW] Error enviando log inicial:', e.message);
    }

    const editarLog = async (texto) => {
        if (!logKey) return;
        try { await sock.sendMessage(chatId, { text: texto, edit: logKey }); } catch (e) {}
    };

    // PASO 2: descargar
    const buffer = await descargarImagen(sock, msg, img);

    if (!buffer || buffer.length < 100) {
        await editarLog('╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ ❌ [2/4] No se pudo descargar\n┃    (usa .errores para ver detalles)\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
        return false;
    }

    await editarLog('╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ ✅ [2/4] Descargada (' + (buffer.length / 1024).toFixed(1) + ' KB)\n┃ 🧠 [3/4] Analizando...\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');

    // PASO 3: analizar
    const json = await analizarImagen(buffer, img.mimetype);

    if (!json) {
        await editarLog('╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ ✅ [2/4] Descargada\n┃ ❌ [3/4] La API no respondió\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
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
        '┣━━〔 📈 𝐃𝐄𝐓𝐀𝐋𝐋𝐄 〕━━⬣\n';

    for (const s of scores) {
        texto += '┃ ' + (s.number >= 50 ? '▰' : '▱') + ' ' + s.className + ': ' + s.string + '\n';
    }

    if (esNSFW && estado.strict) {
        texto += '┃\n┃ 🗑️ Imagen eliminada (modo estricto)\n';
    }

    texto += '┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

    await editarLog(texto);

    if (esNSFW && estado.strict) {
        try { await sock.sendMessage(chatId, { delete: msg.key }); } catch (e) {}
    }

    return false;
}