// commands/descargas/mediafire.js
// ============================================================
// BOT-API — MEDIAFIRE DOWNLOADER (carpetas + archivos)
// ============================================================

const API = 'https://api.delirius.online/download/mediafire?url=';
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB límite

function fmtSize(bytes) {
    const b = Number(bytes) || 0;
    if (b >= 1048576) return (b / 1048576).toFixed(2) + ' MB';
    if (b >= 1024) return (b / 1024).toFixed(2) + ' KB';
    return b + ' B';
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
    const nombre = item['nombre de archivo'] || item.filename || 'archivo';
    const mime = item.mime || 'application/octet-stream';
    const tamaño = Number(item.tamaño) || 0;

    if (tamaño > MAX_BYTES) {
        return await responder.texto(
            '⚠️ El archivo pesa *' + fmtSize(tamaño) + '* (más de 100 MB).\n' +
            '🔗 Descárgalo manual:\n' + item.link
        );
    }

    const directo = await obtenerLinkDirecto(item.link);
    if (!directo) {
        return await responder.texto('❌ No se pudo obtener el link directo.\n🔗 Página: ' + item.link);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);

    let buffer;
    try {
        const res = await fetch(directo, { signal: controller.signal });
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
            mimetype: mime,
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

        // NÚMERO → descargar de la lista
        if (/^\d+$/.test(q)) {
            const mapa = global.mfMap?.[jid];
            const item = mapa?.[Number(q)];
            if (!item) {
                return await responder.texto('❌ Ese número no existe.\nPrimero usa: .mf <url de carpeta>');
            }
            await responder.texto('⏳ Descargando *' + (item['nombre de archivo'] || item.filename || 'archivo') + '*...');
            try {
                await descargarYEnviar(sock, msg, jid, item, responder);
            } catch (e) {
                await responder.texto('❌ Error: ' + (e?.message || 'Intenta de nuevo'));
            }
            return;
        }

        // URL → consultar API
        if (!/mediafire\.com/i.test(q)) {
            return await responder.texto('❌ La URL debe ser de MediaFire');
        }

        try {
            const res = await fetch(API + encodeURIComponent(q));
            const json = await res.json();

            // ---------- CASO 1: CARPETA (array en datos) ----------
            if (Array.isArray(json.datos) && json.datos.length > 0) {
                const datos = json.datos;

                if (datos.length > 1) {
                    global.mfMap = global.mfMap || {};
                    global.mfMap[jid] = {};

                    let txt = '╭━━〔 📦 𝐂𝐀𝐑𝐏𝐄𝐓𝐀 〕━━⬣\n┃\n┃ 🗂️ ' + datos.length + ' archivos\n┃\n';

                    datos.forEach((item, i) => {
                        global.mfMap[jid][i + 1] = item;
                        const nombre = item['nombre de archivo'] || item.filename || 'archivo';
                        const icono = (item.mime || '').startsWith('image/') ? '🖼️' :
                                      (item.mime || '').startsWith('video/') ? '🎬' :
                                      (item.mime || '').startsWith('audio/') ? '🎵' : '📄';
                        txt += '┃ *' + (i + 1) + '.* ' + icono + ' ' + String(nombre).slice(0, 40) + '\n';
                        txt += '┃     ' + fmtSize(item.tamaño) + '\n┃\n';
                    });

                    txt += '┃ 📥 Descarga: .mf <número>\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';
                    return await responder.texto(txt);
                } else {
                    // Un solo archivo en el array
                    await responder.texto('⏳ Descargando *' + (datos[0]['nombre de archivo'] || datos[0].filename || 'archivo') + '*...');
                    await descargarYEnviar(sock, msg, jid, datos[0], responder);
                    return;
                }
            }

            // ---------- CASO 2: ARCHIVO INDIVIDUAL (objeto en datos) ----------
            if (json.datos && typeof json.datos === 'object' && !Array.isArray(json.datos)) {
                if (json.datos.link) {
                    await responder.texto('⏳ Descargando *' + (json.datos['nombre de archivo'] || json.datos.filename || 'archivo') + '*...');
                    await descargarYEnviar(sock, msg, jid, json.datos, responder);
                    return;
                }
            }

            // ---------- CASO 3: Datos en la raíz ----------
            if (json.link || json['nombre de archivo'] || json.filename) {
                await responder.texto('⏳ Descargando *' + (json['nombre de archivo'] || json.filename || 'archivo') + '*...');
                await descargarYEnviar(sock, msg, jid, json, responder);
                return;
            }

            // ---------- Fallback: mostrar JSON para debug ----------
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