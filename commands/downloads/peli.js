import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 10 });
const KRONIX = 'https://kronix-apis.nexcodea.com';
const KEY = '0410239197314016f779ac4fcbc3797ac0e2978658a25e7a7628dc664186f914';
const HEADERS = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

if (!global.peliSessions) global.peliSessions = new Map();
if (!global.peliBusy) global.peliBusy = false;
const TTL = 5 * 60 * 1000;

async function req(url, t = 15000, signal) {
    const r = await fetch(url, { agent: AGENTE, headers: HEADERS, signal: signal || AbortSignal.timeout(t) });
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
        const r = await fetch(url, { method: 'HEAD', agent: AGENTE, signal: AbortSignal.timeout(5000) });
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
        thumbnail: `https://archive.org/services/img/${x.identifier}`,
        url: `https://archive.org/details/${x.identifier}`,
        identifier: x.identifier
    }));
}

async function buscarPeli(q) {
    try {
        const r = await buscarKronix(q);
        if (r.length) return r;
    } catch (e) {}
    try {
        return await buscarArchive(q);
    } catch (e) {
        return [];
    }
}

async function linksArchive(identifier) {
    const m = await req(`https://archive.org/metadata/${identifier}`, 20000);
    const files = (m.files || [])
        .filter(f => /\.mp4$/.test(f.name) || f.format === 'h.264')
        .sort((a, b) => (Number(b.size) || 0) - (Number(a.size) || 0));
    if (!files.length) throw new Error('Archive sin archivos');
    const f = files[0];
    return {
        calidad: f.format || 'MP4',
        size: f.size ? (Number(f.size) / 1048576).toFixed(0) + ' MB' : '',
        url: `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`
    };
}

async function linksKronix(url, signal) {
    const d = await req(`${KRONIX}/api/download/ytmp4?url=${encodeURIComponent(url)}&apikey=${KEY}`, 45000, signal);
    if (!d.status || !d.resultado?.url) throw new Error('Kronix sin link');
    return { calidad: d.resultado.calidad || '360p', size: '', url: d.resultado.url };
}

async function linksCobalt(url, signal) {
    const r = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        agent: AGENTE,
        headers: { 'Content-Type': 'application/json', 'User-Agent': HEADERS['User-Agent'] },
        body: JSON.stringify({ url, vCodec: 'h264', vQuality: '360', isAudioOnly: false }),
        signal: signal || AbortSignal.timeout(45000)
    });
    if (!r.ok) throw new Error('Cobalt HTTP ' + r.status);
    const d = await r.json();
    if (!d.url) throw new Error('Cobalt sin URL');
    return { calidad: '720p', size: '', url: d.url };
}

async function linksSiputzX(url, signal) {
    const d = await req(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`, 45000, signal);
    if (!d.status || !d.resultado?.url) throw new Error('SiputzX sin link');
    return { calidad: d.resultado.quality || '360p', size: d.resultado.size || '', url: d.resultado.url };
}

async function obtenerLink(item) {
    if (item.identifier) return await linksArchive(item.identifier);

    const ctrl = new AbortController();
    try {
        const link = await Promise.any([
            linksKronix(item.url, ctrl.signal),
            linksCobalt(item.url, ctrl.signal),
            linksSiputzX(item.url, ctrl.signal)
        ]);
        ctrl.abort();
        return link;
    } catch (e) {
        ctrl.abort();
        throw new Error('Ninguna API generó link');
    }
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

        for (const [k, v] of global.peliSessions) {
            if (Date.now() - v.t > TTL) global.peliSessions.delete(k);
        }

        if (!query) {
            return await responder.texto(
                '╭━━〔 🎬 𝐏𝐄𝐋 〕━━\n' +
                '┃\n' +
                '┃ 💡 Buscar: .peli spiderman\n' +
                '┃ 📥 Descargar: .peli 1\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (/^\d+$/.test(query)) {
            if (global.peliBusy) {
                return await responder.texto('⏳ Hay otra película en proceso ahora mismo.\n┃ Espera ~1 minuto y reintenta.');
            }

            const session = global.peliSessions.get(sender);
            if (!session) {
                return await responder.texto('❌ Sesión expirada. Busca de nuevo: *.peli spiderman*');
            }

            const item = session.resultados[parseInt(query) - 1];
            if (!item) {
                return await responder.texto('❌ Número inválido. Elige del 1 al ' + session.resultados.length);
            }

            global.peliBusy = true;

            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

            try {
                const link = await obtenerLink(item);
                const size = link.size || (await getSize(link.url));

                const caption =
                    '「🎬」 *' + item.titulo + '*\n' +
                    '◈ ' + (item.year || 'Película') + ' | ⏱️ ' + item.duracion + '\n' +
                    '◈ Calidad: ' + link.calidad + (size ? ' | 📦 ' + size : '');

                await sock.sendMessage(jid, {
                    document: { url: link.url },
                    mimetype: 'video/mp4',
                    fileName: sanear(item.titulo) + '.mp4',
                    caption
                }, { quoted: msg });

                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
                console.log(`[PELI] ✅ Enviada: ${item.titulo}`);

            } catch (e) {
                console.error('[PELI] Error:', e.message);
                await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
                await responder.texto(
                    '╭━━〔 ❌ 𝐍𝐎 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ⚠️ Ninguna API generó el link\n' +
                    '┃\n' +
                    '┃ ▶️ Ver online:\n' +
                    '┃ ' + item.url + '\n' +
                    '┃\n' +
                    '┃ 💡 Prueba con otro número\n' +
                    '┃\n' +
                    '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            } finally {
                global.peliBusy = false;
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
                '╭━━〔  𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ 🔍 *' + query + '* (' + resultados.length + ')\n' +
                '┃\n';

            resultados.forEach((p, i) => {
                cap += '┃ *' + (i + 1) + '.* ' + p.titulo + '\n';
                cap += '┃    ⏱️ ' + p.duracion + (p.year ? ' | 📅 ' + p.year : '') + '\n';
                if (i < resultados.length - 1) cap += '┃\n';
            });

            cap +=
                '┃\n' +
                '┃ 📥 .peli 1  ← para recibir\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await responder.texto(cap);

        } catch (error) {
            await responder.texto('❌ Error: ' + (error?.message || 'desconocido'));
        }
    }
};