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

// ---------- MANEJADOR CON LOGS POR WHATSAPP ----------
export async function manejarDeteccion(sock, msg) {
    const chatId = msg.key.remoteJid;
    if (!chatId || !chatId.endsWith('@g.us')) return false;

    const estado = getEstado(chatId);
    if (!estado.on) return false;

    // ¿Hay imagen?
    const m = msg.message || {};
    const img = m.imageMessage || m.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    if (!img) return false;

    // ---------- LOG 1: mensaje de progreso ----------
    let logKey = null;
    try {
        const logMsg = await sock.sendMessage(chatId, {
            text: '╭━━〔  𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ⏳ [1/4] Imagen detectada\n┃ 📥 Descargando imagen...\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        }, { quoted: msg });
        logKey = logMsg.key;
    } catch (e) {}

    const editarLog = async (texto) => {
        if (!logKey) return;
        try { await sock.sendMessage(chatId, { text: texto, edit: logKey }); } catch (e) {}
    };

    // ---------- PASO 2: descargar ----------
    let buffer = null;
    try {
        const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
        buffer = await downloadMediaMessage(msg, 'buffer', {});
    } catch (e) {
        await editarLog('╭━━〔  𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ ❌ [2/4] Error al descargar:\n┃    ' + (e.message || e) + '\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣');
        return false;
    }

    if (!buffer || buffer.length < 100) {
        await editarLog('╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ ❌ [2/4] Buffer vacío (' + (buffer?.length || 0) + ' bytes)\n┃\n╰━━〔 ⚡ 𝐁𝐓-𝐏 ⚡ 〕━━');
        return false;
    }

    await editarLog('╭━━〔  𝐃𝐓𝐂𝐎 𝐍𝐅 〕━━\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ ✅ [2/4] Descargada (' + (buffer.length / 1024).toFixed(1) + ' KB)\n┃  [3/4] Analizando con IA...\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣');

    // ---------- PASO 3: analizar ----------
    const json = await analizarImagen(buffer, img.mimetype);

    if (!json) {
        await editarLog('╭━━〔  𝐃𝐓𝐂𝐎 𝐍𝐅 〕━━\n┃\n┃ ✅ [1/4] Imagen detectada\n┃ ✅ [2/4] Descargada\n┃ ❌ [3/4] La API no respondió\n┃    (revisa key o conexión)\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣');
        return false;
    }

    // ---------- PASO 4: resultado ----------
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
        '┣━━〔  𝐃𝐓𝐀𝐋𝐋𝐄 〕━━⬣\n';

    for (const s of scores) {
        texto += '┃ ' + (s.number >= 50 ? '▰' : '▱') + ' ' + s.className + ': ' + s.string + '\n';
    }

    if (esNSFW && estado.strict) {
        texto += '┃\n┃ 🗑️ Imagen eliminada (modo estricto)\n';
    }

    texto += '┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

    await editarLog(texto);

    // Borrar imagen si es NSFW en modo estricto
    if (esNSFW && estado.strict) {
        try { await sock.sendMessage(chatId, { delete: msg.key }); } catch (e) {}
    }

    return false;
}