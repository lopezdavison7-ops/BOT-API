// commands/interaction/prenar.js — 🤰 Reacción "preñar" (broma)
// ============================================================
// .preñar @user  → X preñó a Y (con gif)
// .preg          → se preñó a sí mismo (modo solitario)
// ============================================================
// Cadena de fuentes: nekos.best → Delirius → equivalente nekos
// ============================================================

const NEKOS = 'https://nekos.best/api/v2/';
const DELIRIUS = 'https://api.delirius.online/anime/';

// Si nekos y Delirius no tienen "preg", usar equivalentes cariñosos
const FALLBACK = ['cuddle', 'peck', 'kiss', 'hug'];

// ---------- DATOS RANDOM DE LA BROMA ----------
const NOMBRES_BEBE = [
    'Brayan Emmanuel', 'Xóchitl Guadalupe', 'Kevin Neimar',
    'Ashley Nicole', 'Benito Jr.', 'María Fernanda II',
    'Dylan Matías', 'Kimberly Yamileth'
];
const ANTOJOS = [
    'mangos con chile 🥭🌶️', 'pickles con crema 🥒',
    'tacos a las 3am 🌮', 'fresas con crema 🍓',
    'mariscos crudos 🦐', 'chocolate con cebolla 🍫🧅',
    'papitas con refresco de tamarindo 🍟'
];
const FINAL_FRASES = [
    '💍 ¡Que se casen de una vez!',
    '💀 La ciencia no lo explica',
    '🍼 Ya le compré sus pañales',
    '😳 El grupo será testigo del parto',
    '🎉 ¡Felicidades a los padres!'
];

const al = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------- MENCION LIMPIA (resuelve @lid como tu reaccion.js) ----------
async function datosMencion(sock, jid) {
    try {
        if (jid.endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
            const pn = await sock.signalRepository.lidMapper.getPNForLid(jid);
            if (pn) {
                const pj = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                return { token: '@' + pj.split('@')[0], jids: [pj] };
            }
        }
    } catch (e) { /* sin mapeo */ }
    return { token: '@' + jid.split('@')[0], jids: [jid] };
}

// ---------- FUENTES DE GIF ----------
async function pedirNekos(tipo) {
    try {
        const res = await fetch(NEKOS + tipo);
        if (!res.ok) return null;
        const json = await res.json();
        return json?.results?.[0]?.url || null;
    } catch { return null; }
}

async function pedirDelirius(tipo) {
    try {
        const res = await fetch(DELIRIUS + tipo);
        if (!res.ok) return null;
        const json = await res.json();
        const d = json.data ?? json.datos;
        if (typeof d === 'string') return d;
        return d?.url || d?.gif || d?.image || d?.img || null;
    } catch { return null; }
}

// Cadena: nekos → Delirius → equivalentes
async function obtenerGif(tipo) {
    let url = await pedirNekos(tipo);
    if (url) return url;

    url = await pedirDelirius(tipo);
    if (url) return url;

    for (const alt of FALLBACK) {
        url = await pedirNekos(alt);
        if (url) return url;
    }
    return null;
}

// ---------- DESCARGAR BUFFER ----------
async function descargar(url) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return Buffer.from(await res.arrayBuffer());
}

export default {
    nombre: 'preñar',
    categoria: 'Interacción',
    alias: ['preg', 'prenar', 'embarazar'],
    descripcion: 'Preña a alguien (broma) con gif anime',
    uso: '.preñar @user | .preg',
    ejecutar: async ({ sock, msg, responder }) => {
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        // ---------- DETECTAR OBJETIVO ----------
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        let target = ctx?.participant || ctx?.mentionedJid?.[0] || null;

        const yo = await datosMencion(sock, sender);
        const mentions = [...yo.jids];
        let lineaPrincipal;

        if (target && target !== sender) {
            const t = await datosMencion(sock, target);
            mentions.push(...t.jids);
            lineaPrincipal = `┃ 😏 ${yo.token} preñó a ${t.token}\n`;
        } else {
            // .preg solito → se preñó a sí mismo
            lineaPrincipal = `┃ 😳 ${yo.token} se preñó a sí mism@\n┃  Modo solitario: ACTIVADO\n`;
        }

        // ---------- ARMAR CAPTION ----------
        const caption =
            '╭━━〔 🤰 𝐏𝐑𝐄𝐍𝐑 〕━━⬣\n' +
            '┃\n' +
            lineaPrincipal +
            '┃\n' +
            '┃ 🍼 Bebé en camino: *' + al(NOMBRES_BEBE) + '*\n' +
            '┃ 🍽️ Antojo actual: ' + al(ANTOJOS) + '\n' +
            '┃ 📅 Nace en: ' + (Math.floor(Math.random() * 9) + 1) + ' meses\n' +
            '┃\n' +
            '┃ ' + al(FINAL_FRASES) + '\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐓-𝐏 ⚡ 〕━━⬣';

        // ---------- OBTENER GIF ----------
        const gifUrl = await obtenerGif('preg');

        // Sin gif → solo texto (nunca falla)
        if (!gifUrl) {
            return await sock.sendMessage(
                jid,
                { text: caption, mentions },
                { quoted: msg }
            );
        }

        // ---------- ENVIAR: video gif → sticker → imagen → texto ----------
        try {
            const buf = await descargar(gifUrl);
            await sock.sendMessage(
                jid,
                { video: buf, mimetype: 'video/mp4', gifPlayback: true, caption, mentions },
                { quoted: msg }
            );
            return;
        } catch (e) {
            console.error('[PRENAR] video falló:', e.message);
        }

        try {
            const { Sticker } = await import('wa-sticker-formatter');
            const sticker = new Sticker(gifUrl, {
                pack: 'BOT-API ⚡',
                author: '🤰',
                type: 'animated',
                quality: 80
            });
            const bufSt = await sticker.toBuffer();
            await sock.sendMessage(jid, { sticker: bufSt }, { quoted: msg });
            await sock.sendMessage(jid, { text: caption, mentions }, { quoted: msg });
            return;
        } catch (e) {
            console.error('[PRENAR] sticker falló:', e.message);
        }

        try {
            await sock.sendMessage(
                jid,
                { image: { url: gifUrl }, caption, mentions },
                { quoted: msg }
            );
            return;
        } catch (e) {
            console.error('[PRENAR] imagen falló:', e.message);
        }

        await sock.sendMessage(jid, { text: caption, mentions }, { quoted: msg });
    }
};