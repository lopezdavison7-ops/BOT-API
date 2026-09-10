// ============================================================
// BOT-API
// COMANDO: R34 (v2 con fallbacks y logs)
// ============================================================
import fetch from 'node-fetch';

const STELLAR_URL = 'https://api.stellarwa.xyz';
const STELLAR_KEY = 'proyectsV2';
const R34_DIRECTO = 'https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=25&tags=';

function obtenerTipo(msg) {
    const texto =
        msg?.message?.conversation ||
        msg?.message?.extendedTextMessage?.text ||
        msg?.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
        '';
    if (!texto) return 'r34';
    const partes = texto.trim().split(/\s+/);
    return (partes[0]?.replace(/^[.!/]/, '').toLowerCase()) || 'r34';
}

// Normaliza URLs (rule34 a veces manda "//img..." sin protocolo)
function normalizarUrl(u) {
    if (typeof u !== 'string' || !u) return null;
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('http')) return u;
    return null;
}

function extraerMedia(json, camposExtra) {
    const listas = [
        Array.isArray(json) ? json : null,
        json?.result, json?.data, json?.posts, json?.images
    ];
    const lista = listas.find(l => Array.isArray(l) && l.length);
    if (!lista) return [];
    const urls = [];
    for (const item of lista) {
        const campos = ['file_url', 'sample_url', 'url', 'jpeg_url', ...(camposExtra || [])];
        for (const c of campos) {
            const u = normalizarUrl(item?.[c] || item?.image?.[c] || item?.video?.[c]);
            if (u) { urls.push(u); break; }
        }
    }
    return [...new Set(urls)];
}

// ---------- FUENTE 1: stellarwa (patrón /nsfw/search/<fuente>) ----------
async function buscarStellar(tag) {
    const rutas = [
        '/nsfw/search/rule34?query=',
        '/api/rule34?search=',
        '/rule34?search=',
        '/api/nsfw/rule34?q='
    ];
    for (const ruta of rutas) {
        try {
            const res = await fetch(STELLAR_URL + ruta + encodeURIComponent(tag) + '&apikey=' + STELLAR_KEY, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
            });
            console.log('[R34] stellar', ruta, '→', res.status);
            if (!res.ok) continue;
            const media = extraerMedia(await res.json());
            if (media.length) return media;
        } catch (e) { console.log('[R34] stellar', ruta, 'falló:', e.message); }
    }
    return [];
}

// ---------- FUENTE 2: rule34.xxx directo ----------
async function buscarDirecto(tag) {
    try {
        const res = await fetch(R34_DIRECTO + encodeURIComponent(tag), {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'application/json' }
        });
        console.log('[R34] rule34.xxx →', res.status);
        if (!res.ok) return [];
        const texto = await res.text();
        let json = [];
        try { json = JSON.parse(texto); } catch (e) { json = []; }
        return extraerMedia(json);
    } catch (e) {
        console.log('[R34] rule34.xxx falló:', e.message);
        return [];
    }
}

// ---------- FUENTES 3 y 4: boorus sin API key ----------
async function buscarBooru(host, tag) {
    try {
        const res = await fetch('https://' + host + '/post.json?limit=20&tags=' + encodeURIComponent(tag), {
            headers: { 'User-Agent': 'Mozilla/5.0 (BOT-API bot)', 'Accept': 'application/json' }
        });
        console.log('[R34]', host, '→', res.status);
        if (!res.ok) return [];
        return extraerMedia(await res.json());
    } catch (e) {
        console.log('[R34]', host, 'falló:', e.message);
        return [];
    }
}

// ============================================================
// COMANDO PRINCIPAL
// ============================================================
export default {
    nombre: 'r34',
    categoria: 'NSFW',
    alias: ['r34vid', 'rule34', 'rule34vid', 'rule', 'rulevid'],
    descripcion: 'Busca imágenes/videos Rule34 por tags',
    uso: '.r34 <tags> · .r34vid <tags>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const tipo = obtenerTipo(msg);
        const modoVideo = /vid$/.test(tipo);
        const tag = String(argumento || '').trim().replace(/\s+/g, '_');

        if (!tag) {
            return await responder.texto(
                '╭━━〔 🔞 𝐑𝐔𝐋𝐄 𝟒 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Debes especificar tags\n' +
                '┃\n' +
                '┃ Ejemplos:\n' +
                '┃  • .r34 hatsune_miku\n' +
                '┃  • .r34vid neko\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            let media = await buscarStellar(tag);
            if (!media.length) media = await buscarDirecto(tag);
            if (!media.length) media = await buscarBooru('yande.re', tag);
            if (!media.length) media = await buscarBooru('konachan.com', tag);

            if (!media.length) {
                return await responder.texto(
                    '╭━━〔 🔞 𝐑𝐔𝐋𝐄 𝟒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Sin resultados para:\n' +
                    '┃ *' + tag + '*\n' +
                    '┃\n' +
                    '┃ Intenta con otros tags o\n' +
                    '┃ revisa: pm2 logs\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            let filtered = modoVideo
                ? media.filter(u => /\.mp4$/i.test(u))
                : media.filter(u => /\.(jpe?g|png|gif)$/i.test(u));
            if (!filtered.length) filtered = media;

            const url = filtered[Math.floor(Math.random() * filtered.length)];
            const esVideo = /\.mp4$/i.test(url);

            const caption =
                '╭━━〔 🔞 𝐑𝐔𝐋𝐄 𝟑 〕━━⬣\n' +
                '┃\n' +
                '┃ 🏷️ Tags › *' + tag + '*\n' +
                '┃ 🎲 Resultados › ' + filtered.length + '\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            const content = esVideo
                ? { video: { url }, caption }
                : { image: { url }, caption };

            await sock.sendMessage(msg.key.remoteJid, content, { quoted: msg });

        } catch (error) {
            console.error('[R34] Error:', error?.stack || error?.message || error);
            await responder.texto(
                '╭━━〔 ️ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falló la búsqueda Rule34\n' +
                '┃ Intenta de nuevo\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};