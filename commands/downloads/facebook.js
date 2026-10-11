import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 15 });
const HEADERS = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

function extraerUrl(texto) {
    const match = texto?.match(/https?:\/\/(www\.)?facebook\.com[^\s]+/i);
    return match ? match[0] : null;
}

function esFacebookURL(url) {
    return /facebook\.com|fb\.watch/i.test(url);
}

async function fetchJSON(url, t = 15000) {
    const r = await fetch(url, { agent: AGENTE, headers: HEADERS, signal: AbortSignal.timeout(t) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
}

async function fbKronix(url) {
    const d = await fetchJSON(`https://kronix-apis.nexcodea.com/api/download/facebook?url=${encodeURIComponent(url)}&apikey=0410239197314016f779ac4fcbc3797ac0e2978658a25e7a7628dc664186f914`, 20000);
    if (!d.status || !d.resultado?.url) throw new Error('Kronix sin link');
    return [{ calidad: d.resultado.calidad || 'HD', url: d.resultado.url }];
}

async function fbSiputzX(url) {
    const d = await fetchJSON(`https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`, 20000);
    if (!d.status || !d.resultado) throw new Error('SiputzX sin datos');
    const videos = d.resultado;
    if (!Array.isArray(videos) || !videos.length) throw new Error('SiputzX sin videos');
    return videos.map(v => ({ calidad: v.quality || 'HD', url: v.url }));
}

async function fbCaliph(url) {
    const d = await fetchJSON(`https://api.caliph.biz.id/api/fbdown?url=${encodeURIComponent(url)}&apikey=caliphkey`, 20000);
    if (!d.status || !d.resultado) throw new Error('Caliph sin datos');
    const r = d.resultado;
    const links = [];
    if (r.hd) links.push({ calidad: 'HD', url: r.hd });
    if (r.sd) links.push({ calidad: 'SD', url: r.sd });
    if (!links.length) throw new Error('Caliph sin videos');
    return links;
}

async function fbCobalt(url) {
    const r = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        agent: AGENTE,
        headers: { 'Content-Type': 'application/json', ...HEADERS },
        body: JSON.stringify({ url, vCodec: 'h264', vQuality: '720' }),
        signal: AbortSignal.timeout(20000)
    });
    if (!r.ok) throw new Error('Cobalt HTTP ' + r.status);
    const d = await r.json();
    if (!d.url) throw new Error('Cobalt sin URL');
    return [{ calidad: 'HD', url: d.url }];
}

async function fbY2Mate(url) {
    const d = await fetchJSON(`https://dlt-10376168668b6475d0d7.el.run/api/convert?url=${encodeURIComponent(url)}`, 20000);
    if (!d.url) throw new Error('Y2Mate sin URL');
    return [{ calidad: d.quality || 'HD', url: d.url }];
}

async function obtenerLinks(url) {
    const apis = [
        { nombre: 'Kronix', fn: fbKronix },
        { nombre: 'SiputzX', fn: fbSiputzX },
        { nombre: 'Caliph', fn: fbCaliph },
        { nombre: 'Cobalt', fn: fbCobalt },
        { nombre: 'Y2Mate', fn: fbY2Mate }
    ];

    const errores = [];
    for (const api of apis) {
        try {
            console.log(`[FB] Intentando ${api.nombre}...`);
            const links = await api.fn(url);
            if (links.length) {
                console.log(`[FB] ✅ ${api.nombre} funcionó`);
                return { links, fuente: api.nombre };
            }
        } catch (e) {
            console.log(`[FB] ❌ ${api.nombre}: ${e.message}`);
            errores.push(`${api.nombre}: ${e.message}`);
        }
    }
    throw new Error('Todas fallaron: ' + errores.slice(0, 3).join(' | '));
}

export default {
    nombre: 'fb',
    categoria: 'Downloader',
    alias: ['facebook', 'fbdl', 'facebookdl'],
    descripcion: 'Descarga videos de Facebook',
    uso: '.fb <url>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const texto = String(argumento || '').trim();
        const url = extraerUrl(texto) || texto;

        if (!url || !esFacebookURL(url)) {
            return await responder.texto(
                '╭━━〔 📹 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ URL inválida\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ .fb https://facebook.com/share/v/xxx\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        try {
            const result = await obtenerLinks(url);
            const { links, fuente } = result;

            if (links.length === 1) {
                await sock.sendMessage(jid, {
                    video: { url: links[0].url },
                    mimetype: 'video/mp4',
                    caption: '「📹」 Video de Facebook\n◈ Calidad: ' + links[0].calidad + '\n◈ Fuente: ' + fuente
                }, { quoted: msg });
            } else {
                let cap =
                    '╭━━〔 📹 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📊 ' + links.length + ' calidades disponibles\n' +
                    '┃ 📡 Fuente: ' + fuente + '\n' +
                    '┃\n' +
                    '┣━━〔 🔗 𝐋𝐈𝐍𝐊𝐒 〕━━⬣\n' +
                    '┃\n';

                links.forEach((link, i) => {
                    cap += '┃ *' + (i + 1) + '.* ' + link.calidad + '\n';
                    cap += '┃ ' + link.url + '\n┃\n';
                });

                cap += '┃ 💡 Responde con el número\n┃    para descargar\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

                await sock.sendMessage(jid, { text: cap }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error('[FB] Error:', error?.message || error);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 Verifica que el video\n' +
                '┃    sea público\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};