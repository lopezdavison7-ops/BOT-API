

const API = 'https://api.delirius.online/download/mediafire?url=';
const MAX_BYTES = 390 * 1024 * 1024;

function fmtSize(bytes) {
    const b = Number(bytes) || 0;
    if (b >= 1048576) return (b / 1048576).toFixed(2) + ' MB';
    if (b >= 1024) return (b / 1024).toFixed(2) + ' KB';
    return b + ' B';
}

function parseSize(sizeStr) {
    if (typeof sizeStr === 'number') return sizeStr;
    const str = String(sizeStr).toLowerCase().trim();
    const match = str.match(/([\d.]+)\s*(gb|mb|kb|b)?/);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = match[2] || 'b';
    if (unit === 'gb') return num * 1024 * 1024 * 1024;
    if (unit === 'mb') return num * 1024 * 1024;
    if (unit === 'kb') return num * 1024;
    return num;
}

async function obtenerLinkDirecto(pageUrl) {
    const res = await fetch(pageUrl, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });
    const html = await res.text();

    let m = html.match(/id="downloadButton"[^>]*href="([^"]+)"/);
    if (!m) m = html.match(/aria-label="Download file"[^>]*href="([^"]+)"/);
    if (!m) m = html.match(/href="(https?:\/\/download\d*\.mediafire\.com[^"]+)"/);
    if (!m) m = html.match(/href="(https?:\/\/[a-z0-9-]+\.mediafire\.com\/[^"]+\/[^"]+)"/);

    return m ? m[1].replace(/&amp;/g, '&') : null;
}

async function descargarYEnviar(sock, msg, jid, item, responder) {
    const nombre = item.filename || item['nombre de archivo'] || 'archivo';
    const mime = item.mime || 'application/octet-stream';
    const tamaño = parseSize(item.size || item.tamaño || 0);

    if (tamaño > MAX_BYTES) {
        return await responder.texto(
            '⚠️ El archivo pesa *' + fmtSize(tamaño) + '* (más de 150 MB).\n' +
            '🔗 Descárgalo manual:\n' + item.link
        );
    }

    let linkDirecto = item.link;
    if (linkDirecto && linkDirecto.includes('download') && linkDirecto.includes('mediafire.com')) {

    } else {

        linkDirecto = await obtenerLinkDirecto(item.link);
        if (!linkDirecto) {
            return await responder.texto('❌ No se pudo obtener el link directo.\n🔗 Página: ' + item.link);
        }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);

    let buffer;
    try {
        const res = await fetch(linkDirecto, { signal: controller.signal });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        buffer = Buffer.from(await res.arrayBuffer());
    } finally {
        clearTimeout(timer);
    }

    if (!buffer || buffer.length === 0) {
        return await responder.texto('❌ El archivo vino vacío.');
    }

    const caption = '📦 *' + nombre + '*\n📊 ' + fmtSize(buffer.length);

    if (mime.startsWith('image/')) {
        await sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
    } else if (mime.startsWith('video/')) {
        await sock.sendMessage(jid, { video: buffer, caption }, { quoted: msg });
    } else if (mime.startsWith('audio/')) {
        await sock.sendMessage(jid, { audio: buffer, mimetype: mime, ptt: false }, { quoted: msg });
    } else {
        await sock.sendMessage(jid, {
            document: buffer,
            mimetype: mime || 'application/octet-stream',
            fileName: nombre,
            caption
        }, { quoted: msg });
    }
}

export default {
    nombre: 'mediafire',
    categoria: 'Descargas',
    alias: ['mf', 'mfdl', 'mediafiredl'],
    descripcion: 'Descarga archivos o carpetas de MediaFire',
    uso: '.mf <url> · .mf <número>',
    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const q = String(argumento || '').trim();

        if (!q) {
            return await responder.texto(
                '╭━━〔 📦 𝐌𝐄𝐃𝐈𝐀𝐅𝐈𝐑𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta la URL\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .mf https://mediafire.com/folder/...\n' +
                '┃ • .mf https://mediafire.com/file/...\n' +
                '┃ • .mf 3 (elegir de la lista)\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (/^\d+$/.test(q)) {
            const mapa = global.mfMap?.[jid];
            const item = mapa?.[Number(q)];
            if (!item) {
                return await responder.texto('❌ Ese número no existe.\nPrimero usa: .mf <url de carpeta>');
            }
            await responder.texto('⏳ Descargando *' + (item.filename || item['nombre de archivo'] || 'archivo') + '*...');
            try {
                await descargarYEnviar(sock, msg, jid, item, responder);
            } catch (e) {
                await responder.texto('❌ Error: ' + (e?.message || 'Intenta de nuevo'));
            }
            return;
        }

        if (!/mediafire\.com/i.test(q)) {
            return await responder.texto('❌ La URL debe ser de MediaFire');
        }

        try {
            const res = await fetch(API + encodeURIComponent(q));
            const json = await res.json();

            if (Array.isArray(json.data) && json.data.length > 0) {
                const datos = json.data;

                if (datos.length > 1) {
                    global.mfMap = global.mfMap || {};
                    global.mfMap[jid] = {};

                    let txt = '╭━━〔 📦 𝐂𝐀𝐑𝐏𝐄𝐓𝐀 〕━━⬣\n┃\n┃ 🗂️ ' + datos.length + ' archivos\n┃\n';

                    datos.forEach((item, i) => {
                        global.mfMap[jid][i + 1] = item;
                        const nombre = item.filename || item['nombre de archivo'] || 'archivo';
                        const icono = (item.mime || '').startsWith('image/') ? '🖼️' :
                                      (item.mime || '').startsWith('video/') ? '🎬' :
                                      (item.mime || '').startsWith('audio/') ? '🎵' : '📄';
                        txt += '┃ *' + (i + 1) + '.* ' + icono + ' ' + String(nombre).slice(0, 40) + '\n';
                        txt += '┃     ' + (item.size || item.tamaño || '?') + '\n┃\n';
                    });

                    txt += '┃ 📥 Descarga: .mf <número>\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';
                    return await responder.texto(txt);
                } else {
                    await responder.texto('⏳ Descargando *' + (datos[0].filename || datos[0]['nombre de archivo'] || 'archivo') + '*...');
                    await descargarYEnviar(sock, msg, jid, datos[0], responder);
                    return;
                }
            }

            if (json.data && typeof json.data === 'object' && !Array.isArray(json.data)) {
                if (json.data.link) {
                    await responder.texto('⏳ Descargando *' + (json.data.filename || json.data['nombre de archivo'] || 'archivo') + '*...');
                    await descargarYEnviar(sock, msg, jid, json.data, responder);
                    return;
                }
            }

            return await responder.texto(
                '❌ No se encontraron archivos.\n\n' +
                '📡 Respuesta de la API:\n```\n' + JSON.stringify(json, null, 2).substring(0, 500) + '\n```'
            );

        } catch (error) {
            console.error('[MF] Error:', error?.message || error);
            await responder.texto('❌ Error: ' + (error?.message || 'Intenta de nuevo'));
        }
    }
};