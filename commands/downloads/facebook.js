import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 15 });
const HEADERS = { 
    'Accept': 'application/json', 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://www.facebook.com/'
};

function extraerUrl(texto) {
    const match = texto?.match(/https?:\/\/(www\.)?facebook\.com[^\s]+/i);
    return match ? match[0] : null;
}

function esFacebookURL(url) {
    return /facebook\.com|fb\.watch/i.test(url);
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

async function fbDelirius(url) {
    const apiUrl = `https://api.delirius.online/download/facebook?url=${encodeURIComponent(url)}`;
    const d = await fetchJSON(apiUrl, 30000);
    
    if (d.status !== true) {
        throw new Error('Delirius: ' + (d.message || 'Error desconocido'));
    }
    
    // Delirius devuelve list[] con múltiples calidades
    const list = d.list || [];
    
    if (!list.length) {
        throw new Error('Delirius: no se encontraron videos');
    }
    
    return list.map(item => ({
        calidad: item.quality || 'HD',
        url: item.url
    }));
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
            const links = await fbDelirius(url);
            
            if (links.length === 1) {
                // Solo una calidad disponible
                const link = links[0];
                let caption = 
                    '╭━━〔 📹 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ✅ Video listo para descargar\n' +
                    '┃\n' +
                    '┃ 📊 Calidad › *' + link.calidad + '*\n' +
                    '┃ 📡 Fuente › Delirius API\n' +
                    '┃\n' +
                    '┃ 🔗 Link de descarga:\n' +
                    '┃ ' + link.url + '\n' +
                    '┃\n' +
                    '┃ 💡 Copia el link y pégalo en\n' +
                    '┃    tu navegador\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

                await sock.sendMessage(jid, { text: caption }, { quoted: msg });
                
            } else {
                // Múltiples calidades disponibles
                let cap =
                    '╭━━〔 📹 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📊 ' + links.length + ' calidades disponibles\n' +
                    '┃ 📡 Fuente: Delirius API\n' +
                    '┃\n' +
                    '┣━━〔 🔗 𝐋𝐈𝐍𝐊𝐒 〕━━⬣\n' +
                    '┃\n';

                links.forEach((link, i) => {
                    cap += '┃ *' + (i + 1) + '.* ' + link.calidad + '\n';
                    cap += '┃ ' + link.url + '\n┃\n';
                });

                cap += '┃ 💡 Copia el link de la calidad\n┃    que prefieras\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

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
                '┃ 💡 Verifica que:\n' +
                '┃ • El video sea público\n' +
                '┃ • La URL sea válida\n' +
                '┃ • Sea de Facebook\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};