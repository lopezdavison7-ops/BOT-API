// commands/downloads/pinterest.js
// ============================================================
// COMANDO: PINTEREST - MANDA TODAS EN ÁLBUMES
// BOT-API + YO SOY YO BAILEYS
// ============================================================

const API_BASE = 'https://apiyosoyyo-ofc.onrender.com';
const API_KEY = process.env.YO_SOY_YO_API_KEY || process.env.YT_API_KEY || 'yosoyyo_sk_gincmnk3';
const API_PINTEREST = API_BASE + '/api/pinterest';
const TIMEOUT_API = 30000;
const LIMITE_RESULTADOS = 30; // Le pide 30 a la API
const CAPTION = 'BOT-API 👄😍';

// ============================================================
// FETCH CON TIMEOUT
// ============================================================
async function fetchConTimeout(url, opciones, timeout) {
    if (!opciones) opciones = {};
    if (!timeout) timeout = TIMEOUT_API;
    const controller = new AbortController();
    const temporizador = setTimeout(function() { controller.abort(); }, timeout);
    try {
        return await fetch(url, {...opciones, signal: controller.signal });
    } finally {
        clearTimeout(temporizador);
    }
}

// ============================================================
// DESCARGAR IMAGEN A BUFFER
// ============================================================
async function descargarImagen(url) {
    const respuesta = await fetchConTimeout(url, {
        headers: {
            Accept: 'image/avif,image/webp,image/jpeg,image/png,*/*',
            'User-Agent': 'Mozilla/5.0'
        }
    }, 60000);

    if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);

    const arrayBuffer = await respuesta.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

// ============================================================
// BUSCAR PINTEREST
// ============================================================
async function buscarPinterest(consulta) {
    const parametros = new URLSearchParams();
    parametros.append('q', consulta);
    parametros.append('limite', String(LIMITE_RESULTADOS));
    parametros.append('apiKey', API_KEY);

    const endpoint = API_PINTEREST + '?' + parametros.toString();
    console.log('[PINTEREST] Buscando: ' + consulta);

    const respuesta = await fetchConTimeout(endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'BOT-API/1.0' }
    });

    if (!respuesta.ok) throw new Error('La API respondió HTTP ' + respuesta.status);

    const datos = await respuesta.json();
    if (!datos ||!datos.status) throw new Error(datos?.message || 'La API rechazó la búsqueda.');

    let resultados = [];
    if (Array.isArray(datos.result)) resultados = datos.result;
    else if (Array.isArray(datos.result?.data)) resultados = datos.result.data;

    const imagenes = resultados.filter(function(item) { return item && item.descarga; });
    if (imagenes.length === 0) throw new Error('No encontré imágenes para esa búsqueda.');

    console.log('[PINTEREST] Imágenes válidas: ' + imagenes.length);
    return imagenes;
}

// ============================================================
// COMANDO
// ============================================================
export default {
    nombre: 'pinterest',
    categoria: 'descargas',
    alias: ['pin', 'pinterestimg'],
    descripcion: 'Busca imágenes en Pinterest y las envía en álbum.',
    ejecutar: async function({ sock, msg, responder, argumento }) {

        const consulta = argumento?.trim();
        if (!consulta) {
            await responder.texto(
                '╭━━〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué quieres buscar.\n' +
                '┃\n' +
                '┃ 📌 Ejemplos:\n' +
                '┃ ›.pinterest zhao lusi\n' +
                '┃ ›.pinterest anime\n' +
                '╰━━━━━━━━⬣'
            );
            return;
        }

        const jid = msg?.key?.remoteJid;
        if (!jid) return;

        try {
            await responder.texto('📌 *Pinterest*\n\n🔎 Búsqueda: *' + consulta + '*\n⏳ Descargando y creando álbumes...');

            const resultados = await buscarPinterest(consulta);

            // DESCARGAR TODAS
            const buffers = [];
            for (let i = 0; i < resultados.length; i++) {
                try {
                    const buffer = await descargarImagen(resultados[i].descarga);
                    buffers.push({ image: buffer });
                    console.log('[PINTEREST] Imagen ' + (i + 1) + '/' + resultados.length + ' lista');
                } catch (e) {
                    console.error('[PINTEREST] Error img ' + (i + 1) + ':', e.message);
                }
            }

            if (buffers.length === 0) throw new Error('No pude descargar ninguna imagen.');

            // ENVIAR EN CHUNKS DE 10
            const CHUNK_SIZE = 10;
            let albumNum = 1;
            const totalAlbums = Math.ceil(buffers.length / CHUNK_SIZE);

            for (let i = 0; i < buffers.length; i += CHUNK_SIZE) {
                const chunk = buffers.slice(i, i + CHUNK_SIZE);
                const isFirstAlbum = i === 0;
                let caption = '';

                if (isFirstAlbum) {
                    caption = '📌 *Pinterest*: ' + consulta + '\n🖼️ ' + buffers.length + ' imágenes totales\nÁlbum ' + albumNum + '/' + totalAlbums + '\n' + CAPTION;
                } else {
                    caption = 'Álbum ' + albumNum + '/' + totalAlbums;
                }

                await sock.sendMessage(jid, {
                    album: chunk,
                    caption: caption
                }, { quoted: isFirstAlbum? msg : undefined });

                albumNum++;
                await new Promise(function(r) { setTimeout(r, 2000); });
            }

            await responder.texto('✅ *Listo*\n\n🔎 Búsqueda: *' + consulta + '*\n🖼️ Enviadas: *' + buffers.length + '* en *' + totalAlbums + '* álbumes');

        } catch (error) {
            console.error('[PINTEREST] Error:', error);
            await responder.texto(
                '╭━━〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido.') + '\n' +
                '╰━━━━━━━━⬣'
            );
        }
    }
};