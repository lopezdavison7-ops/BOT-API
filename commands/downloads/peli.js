import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 15 });
const KRONIX = 'https://kronix-apis.nexcodea.com';
const KEY = '0410239197314016f779ac4fcbc3797ac0e2978658a25e7a7628dc664186f914';
const HEADERS = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

if (!global.peliSessions) global.peliSessions = new Map();
const TTL = 5 * 60 * 1000;

async function req(url, t = 15000) {
    const r = await fetch(url, { agent: AGENTE, headers: HEADERS, signal: AbortSignal.timeout(t) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
}

function fmtDur(s) {
    s = Number(s) || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
}

function sanear(t) {
    return String(t).replace(/[^\w\s.-]/g, '').trim().slice(0, 80) || 'pelicula';
}

async function getSize(url) {
    try {
        const r = await fetch(url, { method: 'HEAD', agent: AGENTE, signal: AbortSignal.timeout(10000) });
        const len = Number(r.headers.get('content-length'));
        if (len > 0) return (len / 1048576).toFixed(0) + ' MB';
    } catch {}
    return '';
}

async function buscarKronix(q) {
    const d = await req(`${KRONIX}/api/busqueda/youtube?query=${encodeURIComponent(q + ' pelicula completa')}&apikey=${KEY}`);
    if (!d.status || !Array.isArray(d.resultado)) throw new Error('Kronix sin datos');
    return d.resultado
        .filter(v => v.type === 'video' && (v.seconds || 0) >= 2400)
        .slice(0, 8)
        .map(v => ({
            fuente: 'YouTube',
            titulo: v.title,
            year: v.ago || '',
            duracion: v.duration?.timestamp || v.timestamp || fmtDur(v.seconds),
            seconds: v.seconds || 0,
            thumbnail: v.thumbnail || v.image || '',
            url: v.url
        }));
}

async function buscarArchive(q) {
    const d = await req(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}+AND+mediatype:(movies)&fl[]=identifier&fl[]=title&fl[]=year&rows=8&output=json`);
    const docs = d?.response?.docs || [];
    return docs.map(x => ({
        fuente: 'Archive.org',
        titulo: Array.isArray(x.title) ? x.title[0] : x.title,
        year: x.year || '',
        duracion: '—',
        seconds: 0,
        thumbnail: `https://archive.org/services/img/${x.identifier}`,
        url: `https://archive.org/details/${x.identifier}`,
        identifier: x.identifier
    }));
}

async function buscarPeli(q) {
    try {
        const r = await buscarKronix(q);
        if (r.length) return r;
    } catch (e) {
        console.log('[PELI] Kronix falló:', e.message);
    }
    try {
        return await buscarArchive(q);
    } catch (e) {
        console.log('[PELI] Archive falló:', e.message);
        return [];
    }
}

async function linksArchive(identifier) {
    const m = await req(`https://archive.org/metadata/${identifier}`, 20000);
    const files = (m.files || [])
        .filter(f => /\.mp4$/.test(f.name) || f.format === 'h.264')
        .sort((a, b) => (Number(b.size) || 0) - (Number(a.size) || 0));
    if (!files.length) return [];
    return files.slice(0, 1).map(f => ({
        calidad: f.format || 'MP4',
        size: f.size ? (Number(f.size) / 1048576).toFixed(0) + ' MB' : '',
        url: `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`
    }));
}

async function linksKronix(url) {
    const d = await req(`${KRONIX}/api/download/ytmp4?url=${encodeURIComponent(url)}&apikey=${KEY}`, 45000);
    if (!d.status || !d.resultado?.url) throw new Error('Kronix: sin link');
    return [{ calidad: d.resultado.calidad || '360p', size: '', url: d.resultado.url }];
}

async function linksSiputzX(url) {
    const d = await req(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`, 45000);
    if (!d.status || !d.resultado?.url) throw new Error('SiputzX: sin link');
    return [{ calidad: d.resultado.quality || '360p', size: d.resultado.size || '', url: d.resultado.url }];
}

async function linksCobalt(url) {
    const r = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        agent: AGENTE,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': HEADERS['User-Agent']
        },
        body: JSON.stringify({
            url: url,
            vCodec: 'h264',
            vQuality: '720',
            aFormat: 'mp3',
            isAudioOnly: false
        }),
        signal: AbortSignal.timeout(45000)
    });
    if (!r.ok) throw new Error('Cobalt: HTTP ' + r.status);
    const d = await r.json();
    if (!d.url) throw new Error('Cobalt: sin URL');
    return [{ calidad: d.quality || '720p', size: '', url: d.url }];
}

async function linksY2Mate(url) {
    const d = await req(`https://dlt-10376168668b6475d0d7.el.run/api/convert?url=${encodeURIComponent(url)}`, 45000);
    if (!d.url) throw new Error('Y2Mate: sin URL');
    return [{ calidad: d.quality || '720p', size: d.size || '', url: d.url }];
}

async function linksSaveFrom(url) {
    const d = await req(`https://sfrom.net/api/getVideo?url=${encodeURIComponent(url)}`, 45000);
    if (!d.url) throw new Error('SaveFrom: sin URL');
    return [{ calidad: d.quality || '720p', size: '', url: d.url }];
}

async function linksVidPUB(url) {
    const d = await req(`https://vidpub.net/api/convert?url=${encodeURIComponent(url)}`, 45000);
    if (!d.url) throw new Error('VidPUB: sin URL');
    return [{ calidad: d.quality || '720p', size: '', url: d.url }];
}

async function obtenerLink(item) {
    if (item.identifier) {
        const l = await linksArchive(item.identifier);
        if (l.length) return l[0];
        throw new Error('Archive sin archivos');
    }

    const apis = [
        { nombre: 'Kronix', fn: linksKronix },
        { nombre: 'Cobalt', fn: linksCobalt },
        { nombre: 'SiputzX', fn: linksSiputzX },
        { nombre: 'Y2Mate', fn: linksY2Mate },
        { nombre: 'SaveFrom', fn: linksSaveFrom },
        { nombre: 'VidPUB', fn: linksVidPUB }
    ];

    const errores = [];
    for (const api of apis) {
        try {
            console.log(`[PELI] Intentando ${api.nombre}...`);
            const l = await api.fn(item.url);
            if (l.length) {
                console.log(`[PELI] ✅ ${api.nombre} funcionó`);
                return l[0];
            }
        } catch (e) {
            console.log(`[PELI] ❌ ${api.nombre}: ${e.message}`);
            errores.push(`${api.nombre}: ${e.message}`);
        }
    }
    throw new Error('Todas fallaron: ' + errores.slice(0, 3).join(' | '));
}

export default {
    nombre: 'peli',
    categoria: 'Busqueda',
    alias: ['movie', 'film', 'pelicula', 'película'],
    descripcion: 'Busca películas completas y las envía como MP4',
    uso: '.peli <nombre> | .peli <número>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const query = String(argumento || '').trim();
        const sender = msg.key.participant || msg.key.remoteJid;

        if (!query) {
            return await responder.texto(
                '╭━━〔 🎬 𝐏𝐄𝐋𝐈 〕━━⬣\n' +
                '┃\n' +
                '┃ 💡 Buscar:\n' +
                '┃ ➪ .peli spiderman\n' +
                '┃ ➪ .peli john wick 4\n' +
                '┃\n' +
                '┃ 📥 Descargar:\n' +
                '┃ ➪ .peli 1\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (/^\d+$/.test(query)) {
            const num = parseInt(query);
            const session = global.peliSessions.get(sender);

            if (!session || Date.now() - session.t > TTL) {
                return await responder.texto('❌ Sesión expirada. Busca de nuevo: *.peli spiderman*');
            }

            const item = session.resultados[num - 1];
            if (!item) {
                return await responder.texto('❌ Número inválido. Elige del 1 al ' + session.resultados.length);
            }

            await responder.texto(
                '╭━━〔 ⏳ 𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐍𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎬 *' + item.titulo + '*\n' +
                '┃ ⏱️ ' + item.duracion + '\n' +
                '┃\n' +
                '┃ ⏳ Buscando link de descarga...\n' +
                '┃    Probando 6 APIs diferentes\n' +
                '┃    Puede tardar 1-3 minutos 🙏\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );

            let link;
            try {
                link = await obtenerLink(item);
            } catch (e) {
                console.error('[PELI] Sin link:', e.message);
                return await responder.texto(
                    '╭━━〔 ❌ 𝐍𝐎 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ⚠️ Ninguna API pudo generar\n' +
                    '┃    el link de descarga\n' +
                    '┃\n' +
                    '┃ 💡 Puede ser por:\n' +
                    '┃ • Video muy largo (+2h)\n' +
                    '┃ • Copyright estricto\n' +
                    '┃ • APIs caídas temporalmente\n' +
                    '┃\n' +
                    '┃ ▶️ Ver online:\n' +
                    '┃ ' + item.url + '\n' +
                    '┃\n' +
                    '┃ 💡 Prueba con otra película\n' +
                    '┃    de la lista\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const size = link.size || (await getSize(link.url));

            const caption =
                '「🎬」 *' + item.titulo + '*\n' +
                '◈ ' + (item.year || 'Película') + ' | ⏱️ ' + item.duracion + '\n' +
                '◈ Calidad: ' + link.calidad + (size ? ' | 📦 ' + size : '');

            try {
                await sock.sendMessage(jid, {
                    document: { url: link.url },
                    mimetype: 'video/mp4',
                    fileName: sanear(item.titulo) + '.mp4',
                    caption
                }, { quoted: msg });

                console.log(`[PELI] ✅ Película enviada: ${item.titulo}`);
            } catch (e) {
                console.error('[PELI] Envío falló:', e.message);
                await responder.texto(
                    '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 𝐄𝐍𝐕𝐈𝐎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ⚠️ El archivo es muy pesado\n' +
                    '┃    o el CDN falló\n' +
                    '┃\n' +
                    '┃ 🔗 Descarga manual:\n' +
                    '┃ ' + link.url + '\n' +
                    '┃\n' +
                    '┃ ▶️ Ver online:\n' +
                    '┃ ' + item.url + '\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            return;
        }

        await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } });

        try {
            const resultados = await buscarPeli(query);

            if (!resultados.length) {
                return await responder.texto('❌ No encontré esa película. Prueba en inglés o con otro título.');
            }

            global.peliSessions.set(sender, { resultados, t: Date.now() });

            let cap =
                '╭━━〔 🎬 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ 🔍 *' + query + '*\n' +
                '┃ 📊 ' + resultados.length + ' encontradas\n' +
                '┃\n';

            resultados.forEach((p, i) => {
                cap += '┃ *' + (i + 1) + '.* ' + p.titulo + '\n';
                cap += '┃    ⏱️ ' + p.duracion + (p.year ? ' | 📅 ' + p.year : '') + '\n';
                if (i < resultados.length - 1) cap += '┃\n';
            });

            cap +=
                '┃\n' +
                '┣━━〔 📥 𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ Recibir una: .peli <número>\n' +
                '┃ Ejemplo: .peli 1\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await responder.texto(cap);

        } catch (error) {
            console.error('[PELI] Error:', error?.message || error);
            await responder.texto('❌ Error: ' + (error?.message || 'desconocido'));
        }
    }
};