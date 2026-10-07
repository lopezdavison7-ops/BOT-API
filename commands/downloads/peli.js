import fetch from 'node-fetch';

const KRONIX = 'https://kronix-apis.nexcodea.com';
const KEY = '0410239197314016f779ac4fcbc3797ac0e2978658a25e7a7628dc664186f914';
const HEADERS = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

if (!global.peliSessions) global.peliSessions = new Map();
const TTL = 5 * 60 * 1000;

async function req(url, t = 15000) {
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(t) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
}

function fmtDur(s) {
    s = Number(s) || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
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
    return files.slice(0, 3).map(f => ({
        calidad: f.format || 'MP4',
        size: f.size ? (Number(f.size) / 1048576).toFixed(0) + ' MB' : '—',
        url: `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`
    }));
}

async function linksKronix(url) {
    const d = await req(`${KRONIX}/api/download/ytmp4?url=${encodeURIComponent(url)}&apikey=${KEY}`, 30000);
    if (!d.status || !d.resultado?.url) throw new Error('Sin link de descarga');
    return [{
        calidad: d.resultado.calidad || '360p',
        size: '—',
        url: d.resultado.url
    }];
}

export default {
    nombre: 'peli',
    categoria: 'Busqueda',
    alias: ['movie', 'film', 'pelicula', 'película'],
    descripcion: 'Busca películas completas y descarga por número',
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

            await responder.texto(' Obteniendo links de *' + item.titulo + '*...');

            let links = [];
            try {
                links = item.identifier ? await linksArchive(item.identifier) : await linksKronix(item.url);
            } catch (e) {
                console.log('[PELI] Links fallaron:', e.message);
            }

            let cap =
                '╭━━〔 🎬 𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎬 *' + item.titulo + '*\n' +
                '┃ 📅 ' + (item.year || 'N/A') + ' | ⏱️ ' + item.duracion + '\n' +
                '┃ 📡 Fuente: ' + item.fuente + '\n' +
                '┃\n';

            if (links.length) {
                cap += '┣━━〔 🔗 𝐋𝐈𝐍𝐊𝐒 𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀 〕━━⬣\n┃\n';
                links.forEach((l, i) => {
                    cap += '┃ *' + (i + 1) + '.* ' + l.calidad + ' (' + l.size + ')\n';
                    cap += '┃ ' + l.url + '\n┃\n';
                });
            }

            cap +=
                '┣━━〔 ▶️ 𝐕𝐄𝐑 𝐎𝐍𝐋𝐈𝐍𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ ' + item.url + '\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            try {
                await sock.sendMessage(jid, {
                    image: { url: item.thumbnail },
                    caption: cap
                }, { quoted: msg });
            } catch {
                await responder.texto(cap);
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
                cap += '┃    ️ ' + p.duracion + (p.year ? ' | 📅 ' + p.year : '') + ' | ' + p.fuente + '\n';
                if (i < resultados.length - 1) cap += '┃\n';
            });

            cap +=
                '┃\n' +
                '┣━━〔 📥 𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ➪ .peli 1\n' +
                '┃ ➪ .peli 2\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await responder.texto(cap);

        } catch (error) {
            console.error('[PELI] Error:', error?.message || error);
            await responder.texto('❌ Error: ' + (error?.message || 'desconocido'));
        }
    }
};