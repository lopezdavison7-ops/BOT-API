// ============================================================
// BOT-API
// COMANDO: R34 (completo: fuentes + álbum)
// ============================================================
import fetch from 'node-fetch';

const STELLAR_URL = 'https://api.stellarwa.xyz';
const STELLAR_KEY = 'proyectsV2';
const R34_DIRECTO = 'https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=25&tags=';

// ---------- HELPERS ----------
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

function normalizarUrl(u) {
    if (typeof u !== 'string' || !u) return null;
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('http')) return u;
    return null;
}

function extraerMedia(json) {
    const listas = [
        Array.isArray(json) ? json : null,
        json?.result, json?.data, json?.posts, json?.images
    ];
    const lista = listas.find(l => Array.isArray(l) && l.length);
    if (!lista) return [];
    const urls = [];
    for (const item of lista) {
        const campos = ['file_url', 'sample_url', 'url', 'jpeg_url'];
        for (const c of campos) {
            const u = normalizarUrl(item?.[c] || item?.image?.[c] || item?.video?.[c]);
            if (u) { urls.push(u); break; }
        }
    }
    return [...new Set(urls)];
}

// ---------- FUENTES ----------
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

// ---------- COMANDO ----------
export default {
    nombre: 'r34',
    categoria: 'NSFW',
    alias: ['r34vid', 'rule34', 'rule34vid', 'rule', 'rulevid'],
    descripcion: 'Busca Rule34 por tags y lo manda en álbum',
    uso: '.r34 <tags> [cantidad] · .r34vid <tags>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const tipo = obtenerTipo(msg);
        const modoVideo = /vid$/.test(tipo);

        const tokens = String(argumento || '').trim().split(/\s+/).filter(Boolean);
        let cant = 4;
        if (tokens.length && /^\d+$/.test(tokens[tokens.length - 1])) {
            cant = Math.max(1, Math.min(10, parseInt(tokens.pop(), 10)));
        }
        const tag = tokens.join('_');

        if (!tag) {
            return await responder.texto(
                '╭━━〔  𝐑𝐔𝐋𝐄 𝟑𝟒 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Debes especificar tags\n' +
                '┃\n' +
                '┃ Ejemplos:\n' +
                '┃  • .r34 hatsune_miku\n' +
                '┃  • .r34 hatsune_miku 6\n' +
                '┃  • .r34vid neko\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
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
                    '┃ Intenta con otros tags\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐓-𝐏 ⚡ 〕━━'
                );
            }

            let filtered = modoVideo
                ? media.filter(u => /\.mp4$/i.test(u))
                : media.filter(u => /\.(jpe?g|png|gif)$/i.test(u));
            if (!filtered.length) filtered = media;

            const seleccion = filtered
                .sort(() => Math.random() - 0.5)
                .slice(0, modoVideo ? Math.min(cant, 2) : cant);

            const caption =
                '╭━━〔 🔞 𝐑𝐔𝐋𝐄 𝟒 〕━━⬣\n' +
                '┃\n' +
                '┃ 🏷️ Tags › *' + tag + '*\n' +
                '┃ 📚 Álbum › ' + seleccion.length + ' archivos\n' +
                '┃ 🎲 Pool › ' + filtered.length + ' resultados\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣';

            if (typeof sock.sendAlbum === 'function') {
                const album = seleccion.map((u, i) => {
                    const item = /\.mp4$/i.test(u)
                        ? { video: { url: u } }
                        : { image: { url: u } };
                    if (i === 0) item.caption = caption;
                    return item;
                });
                await sock.sendAlbum(msg.key.remoteJid, album, { quoted: msg });
            } else {
                for (let i = 0; i < seleccion.length; i++) {
                    const u = seleccion[i];
                    const content = /\.mp4$/i.test(u)
                        ? { video: { url: u } }
                        : { image: { url: u } };
                    if (i === 0) content.caption = caption;
                    await sock.sendMessage(msg.key.remoteJid, content, i === 0 ? { quoted: msg } : {});
                }
            }

        } catch (error) {
            console.error('[R34] Error:', error?.stack || error?.message || error);
            await responder.texto(
                '╭━━〔 ⚠️ 𝐑𝐎 〕━━\n' +
                '┃\n' +
                '┃ ❌ Falló la búsqueda Rule34\n' +
                '┃ Intenta de nuevo\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣'
            );
        }
    }
};