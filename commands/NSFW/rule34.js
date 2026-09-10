// ============================================================
// BOT-API
// COMANDO: R34
// ============================================================
// Búsqueda de Rule34 por tags usando api.stellarwa.xyz
// con fallback directo a api.rule34.xxx
//
// Ejemplos:
// .r34 hatsune_miku
// .r34vid nekot
// ============================================================
import fetch from 'node-fetch';

const STELLAR_URL = 'https://api.stellarwa.xyz';
const STELLAR_KEY = 'proyectsV2';
const R34_DIRECTO = 'https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&tags=';

// ============================================================
// OBTENER COMANDO REAL (misma lógica que nsfw.js)
// ============================================================
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

// ============================================================
// EXTRACTOR DE MEDIA (acepta cualquier formato de respuesta)
// ============================================================
function extraerMedia(json) {
    const listas = [
        Array.isArray(json) ? json : null,
        json?.result, json?.data, json?.posts, json?.images
    ];
    const lista = listas.find(l => Array.isArray(l) && l.length);
    if (!lista) return [];
    const urls = [];
    for (const item of lista) {
        const u = item?.file_url || item?.sample_url || item?.url || item?.image?.url || item?.video?.url;
        if (typeof u === 'string' && u.startsWith('http')) urls.push(u);
    }
    return [...new Set(urls)];
}

// ============================================================
// BÚSQUEDAS
// ============================================================
async function buscarStellar(tag) {
    const rutas = [
        '/api/rule34?search=', '/rule34?search=', '/api/nsfw/rule34?q='
    ];
    for (const ruta of rutas) {
        try {
            const res = await fetch(STELLAR_URL + ruta + encodeURIComponent(tag) + '&apikey=' + STELLAR_KEY, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
            });
            if (!res.ok) continue;
            const media = extraerMedia(await res.json());
            if (media.length) return media;
        } catch (e) { continue; }
    }
    return [];
}

async function buscarDirecto(tag) {
    try {
        const res = await fetch(R34_DIRECTO + encodeURIComponent(tag), {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
        });
        if (!res.ok) return [];
        return extraerMedia(await res.json());
    } catch (e) { return []; }
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
                '╭━━〔 🔞 𝐑𝐔𝐋𝐄 𝟑𝟒 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Debes especificar tags\n' +
                '┃\n' +
                '┃ Ejemplos:\n' +
                '┃  • .r34 hatsune_miku\n' +
                '┃  • .r34vid neko\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐈  〕━━'
            );
        }

        try {
            let media = await buscarStellar(tag);
            if (!media.length) media = await buscarDirecto(tag);

            if (!media.length) {
                return await responder.texto(
                    '╭━━〔 🔞 𝐔𝐄 𝟒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Sin resultados para:\n' +
                    '┃ *' + tag + '*\n' +
                    '┃\n' +
                    '┃ Intenta con otros tags\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━'
                );
            }

            let filtered = modoVideo
                ? media.filter(u => /\.mp4$/i.test(u))
                : media.filter(u => /\.(jpe?g|png|gif)$/i.test(u));
            if (!filtered.length) filtered = media;

            const url = filtered[Math.floor(Math.random() * filtered.length)];
            const esVideo = /\.mp4$/i.test(url);

            const caption =
                '╭━━〔 🔞 𝐑𝐔𝐋𝐄 𝟑𝟒 〕━━⬣\n' +
                '┃\n' +
                '┃ 🏷️ Tags › *' + tag + '*\n' +
                '┃ 🎲 Resultados › ' + filtered.length + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            const content = esVideo
                ? { video: { url }, caption }
                : { image: { url }, caption };

            await sock.sendMessage(msg.key.remoteJid, content, { quoted: msg });

        } catch (error) {
            console.error('[R34] Error:', error?.stack || error?.message || error);
            await responder.texto(
                '╭━━〔 ⚠️ 𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falló la búsqueda Rule34\n' +
                '┃ Intenta de nuevo\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈  〕━━⬣'
            );
        }
    }
};