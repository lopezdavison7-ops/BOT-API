// lib/nsfwDetect.js — 🔞 Detector NSFW por chat
import fs from 'fs';
import path from 'path';

const RUTA = path.join(process.cwd(), 'database', 'detect.json');
const API = 'https://api.evogb.org/nsfw/detect-free';
const KEY = 'evogb-tYhNSXu6';

// ---------- ESTADO POR CHAT ----------
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

// ---------- ANALIZAR IMAGEN ----------
export async function analizarImagen(buffer, mime) {
    // Intento 1: multipart con varios nombres de campo
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

    // Intento 2: subir a telegraph y mandar la URL
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

    // ¿El mensaje trae imagen?
    const m = msg.message || {};
    const img = m.imageMessage || m.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    if (!img) return false;

    // Descargar la imagen
    let buffer = null;
    try {
        const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
        buffer = await downloadMediaMessage(msg, 'buffer', {});
    } catch (e) { return false; }
    if (!buffer || buffer.length < 100) return false;

    // Analizar
    const json = await analizarImagen(buffer, img.mimetype);
    if (!json) return false;

    const a = json.analysis || {};
    const esNSFW = a.is_nsfw === true;
    const scores = (json.raw_scores || []).slice(0, 5);

    let texto =
        '╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐂𝐈𝐎𝐍 𝐍𝐒𝐅𝐖 〕━━⬣\n' +
        '┃\n' +
        (esNSFW
            ? '┃ 🚨 Resultado: *CONTENIDO NSFW*\n'
            : '┃ ✅ Resultado: *CONTENIDO SEGURO*\n') +
        '┃ 🏷️ Tipo: ' + (a.flag || 'N/D') + '\n' +
        '┃ 📊 Confianza: ' + (a.confidence || 'N/D') + '\n' +
        '┃ 🤖 Modelo: ' + (json.config?.model_selected || 'model-v2') + '\n' +
        '┃\n' +
        '┣━━〔 📈 𝐃𝐄𝐓𝐀𝐋𝐋𝐄 〕━━⬣\n';

    for (const s of scores) {
        texto += '┃ ' + (s.number >= 50 ? '▰' : '▱') + ' ' + s.className + ': ' + s.string + '\n';
    }

    if (esNSFW && estado.strict) {
        texto += '┃\n┃ 🗑️ Mensaje eliminado (modo estricto)\n';
    }

    texto += '┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

    try {
        await sock.sendMessage(chatId, { text: texto }, { quoted: msg });
    } catch (e) {}

    // Modo estricto: borrar la imagen NSFW
    if (esNSFW && estado.strict) {
        try { await sock.sendMessage(chatId, { delete: msg.key }); } catch (e) {}
    }

    return false;
}