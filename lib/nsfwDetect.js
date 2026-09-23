// lib/nsfwDetect.js — 🔞 Detector NSFW con logs en WhatsApp
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

// ---------- DESCARGAR IMAGEN (usa baileys sin scope) ----------
async function descargarImagen(sock, msg, img) {
    // Método 1: método del socket (el más confiable)
    try {
        if (typeof sock.downloadMediaMessage === 'function') {
            const buf = await sock.downloadMediaMessage(msg);
            if (buf && buf.length) return buf;
        }
    } catch (e) {
        console.error('[NSFW] Método 1 falló:', e.message);
    }

    // Método 2: importar baileys (el nombre de tu package.json)
    try {
        const baileys = await import('baileys');
        const lib = baileys.default || baileys;
        
        if (typeof lib.downloadMediaMessage === 'function') {
            const buf = await lib.downloadMediaMessage(msg);
            if (buf && buf.length) return buf;
        }
        
        if (typeof lib.downloadContentFromMessage === 'function') {
            const stream = await lib.downloadContentFromMessage(img, 'image');
            const chunks = [];
            for await (const c of stream) chunks.push(c);
            const buf = Buffer.concat(chunks);
            if (buf.length) return buf;
        }
    } catch (e) {
        console.error('[NSFW] Método 2 falló:', e.message);
    }

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
    } catch (e) {}
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
        } catch (e) {}
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
            } catch (e) {}
        }
    }
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
            text: '╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ 📥 Descargando imagen...\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
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
        await editarLog('╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ ❌ [2/4] No se pudo descargar\n┃    (revisa la consola)\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
        return false;
    }

    await editarLog('╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ ✅ [2/4] Descargada (' + (buffer.length / 1024).toFixed(1) + ' KB)\n┃ 🧠 [3/4] Analizando con IA...\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');

    // PASO 3: analizar
    const json = await analizarImagen(buffer, img.mimetype);

    if (!json) {
        await editarLog('╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ ✅ [2/4] Descargada\n┃ ❌ [3/4] La API no respondió\n┃    (revisa key o conexión)\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
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
        (esNSFW
            ? '┃ 🚨 *CONTENIDO NSFW*\n'
            : '┃ ✅ *CONTENIDO SEGURO*\n') +
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