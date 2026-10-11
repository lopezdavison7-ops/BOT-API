import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 15 });
const HEADERS = { 
    'Accept': 'application/json', 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://www.facebook.com/'
};

if (!global.fbBusy) global.fbBusy = false;

function extraerUrl(texto) {
    const match = texto?.match(/https?:\/\/(www\.)?facebook\.com[^\s]+/i);
    return match ? match[0] : null;
}

function esFacebookURL(url) {
    return /facebook\.com|fb\.watch/i.test(url);
}

function sanear(t) {
    return String(t).replace(/[^\w\s.-]/g, '').trim().slice(0, 80) || 'facebook-video';
}

async function fetchJSON(url, t = 25000) {
    const r = await fetch(url, { 
        agent: AGENTE, 
        headers: HEADERS, 
        signal: AbortSignal.timeout(t) 
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
}

async function verificarMp4(url) {
    try {
        const r = await fetch(url, {
            agent: AGENTE,
            headers: { 'Range': 'bytes=0-15', 'User-Agent': HEADERS['User-Agent'] },
            signal: AbortSignal.timeout(15000)
        });
        if (!r.ok && r.status !== 206) return false;
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 8) return false;
        return buf.toString('latin1', 4, 8) === 'ftyp';
    } catch {
        return false;
    }
}

async function getSize(url) {
    try {
        const r = await fetch(url, { method: 'HEAD', agent: AGENTE, signal: AbortSignal.timeout(5000) });
        const len = Number(r.headers.get('content-length'));
        if (len > 0) return (len / 1048576).toFixed(1) + ' MB';
    } catch {}
    return '';
}

async function fbDelirius(url) {
    const apiUrl = `https://api.delirius.online/download/facebook?url=${encodeURIComponent(url)}`;
    const d = await fetchJSON(apiUrl, 30000);
    
    if (d.status !== true) {
        throw new Error('Delirius: ' + (d.message || 'Error desconocido'));
    }
    
    const list = d.list || [];
    if (!list.length) throw new Error('Delirius: sin videos');
    
    return {
        thumb: d.thumb || '',
        links: list.map(item => ({
            calidad: item.quality || 'HD',
            url: item.url
        }))
    };
}

export default {
    nombre: 'fb',
    categoria: 'Downloader',
    alias: ['facebook', 'fbdl', 'facebookdl'],
    descripcion: 'Descarga y envía videos de Facebook',
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

        if (global.fbBusy) {
            return await responder.texto('⏳ Hay otro video de Facebook en proceso.\n┃ Espera unos segundos.');
        }

        global.fbBusy = true;
        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        try {
            const { thumb, links } = await fbDelirius(url);
            
            if (!links.length) throw new Error('Sin links disponibles');

            const bestLink = links[0]; // mejor calidad primero
            const size = await getSize(bestLink.url);

            await responder.texto(
                '╭━━〔 ⏳ 𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐍𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 📹 Facebook Video\n' +
                '┃ 📊 ' + bestLink.calidad + (size ? ' | 📦 ' + size : '') + '\n' +
                '┃\n' +
                '┃ ⏳ Preparando el archivo...\n' +
                '┃    Esto puede tardar 1-3 min\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );

            const caption =
                '「📹」 *Facebook Video*\n' +
                '◈ Calidad: ' + bestLink.calidad + 
                (size ? '\n◈ Tamaño: ' + size : '') +
                '\n◈ Fuente: Delirius API';

            try {
                await sock.sendMessage(jid, {
                    document: { url: bestLink.url },
                    mimetype: 'video/mp4',
                    fileName: sanear('facebook-video') + '.mp4',
                    caption,
                    contextInfo: thumb ? { externalAdReply: { title: 'Facebook Video', body: bestLink.calidad, thumbnailUrl: thumb, mediaType: 1, renderLargerThumbnail: true } } : undefined
                }, { quoted: msg });

                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
                console.log('[FB] ✅ Video enviado');

            } catch (eEnvio) {
                console.error('[FB] Envío falló:', eEnvio.message);
                
                const fallback = 
                    '╭━━〔 ⚠️ 𝐄𝐍𝐕𝐈𝐎 𝐅𝐀𝐋𝐋𝐎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ El video es muy pesado o\n' +
                    '┃ el CDN rechazó la descarga\n' +
                    '┃\n' +
                    '┃ 🔗 Descarga manual:\n' +
                    '┃ ' + bestLink.url + '\n' +
                    '┃\n' +
                    '┃ 💡 Copia el link y pégalo\n' +
                    '┃    en tu navegador\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

                await responder.texto(fallback);
            }

        } catch (error) {
            console.error('[FB] Error:', error?.message || error);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 Verifica que:\n' +
                '┃ • El video sea público\n' +
                '┃ • La URL sea válida\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        } finally {
            global.fbBusy = false;
        }
    }
};