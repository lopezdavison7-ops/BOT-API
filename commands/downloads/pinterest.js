// commands/downloads/pinterest.js
// ============================================================
// COMANDO: PINTEREST - MANDA TODAS LAS QUE VENGA EN ÁLBUMES
// BOT-API + YO SOY YO BAILEYS
// ============================================================

const API_BASE = 'https://apiyosoyyo-ofc.onrender.com';
const API_KEY = process.env.YO_SOY_YO_API_KEY || process.env.YT_API_KEY || 'yosoyyo_sk_gincmnk3';
const API_PINTEREST = `${API_BASE}/api/pinterest`;
const TIMEOUT_API = 30000;
const LIMITE_RESULTADOS = 30;
const CAPTION = 'BOT-API 👄😍';

async function fetchConTimeout(url, opciones = {}, timeout = TIMEOUT_API) {
    const controller = new AbortController();
    const temporizador = setTimeout(() => controller.abort(), timeout);
    try {
        return await fetch(url, {...opciones, signal: controller.signal });
    } finally {
        clearTimeout(temporizador);
    }
}

async function descargarImagen(url) {
    const respuesta = await fetchConTimeout(url, {
        headers: { Accept: 'image/avif,image/webp,image/jpeg,image/png,*/*', 'User-Agent': 'Mozilla/5.0' }
    }, 60000);

    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const arrayBuffer = await respuesta.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

async function buscarPinterest(consulta) {
    const parametros = new URLSearchParams({
        q: consulta,
        limite: String(LIMITE_RESULTADOS),
        apiKey: API_KEY
    });

    const endpoint = `${API_PINTEREST}?${parametros.toString()}`; // <-- ARREGLADO
    console.log(`[PINTEREST] Buscando: ${consulta}`);

    const respuesta = await fetchConTimeout(endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'BOT-API/1.0' }
    });

    if (!respuesta.ok) throw new Error(`La API respondió HTTP ${respuesta.status}`);

    const datos = await respuesta.json();
    if (!datos?.status) throw new Error(datos?.message || 'La API rechazó la búsqueda.');

    let resultados = [];
    if (Array.isArray(datos.result)) resultados = datos.result;
    else if (Array.isArray(datos?.result?.data)) resultados = datos.result.data;

    const imagenes = resultados.filter(item => item && item.descarga);
    if (imagenes.length === 0) throw new Error('No encontré imágenes para esa búsqueda.');

    console.log(`[PINTEREST] Imágenes válidas: ${imagenes.length}`);
    return imagenes;
}

export default {
    nombre: 'pinterest',
    categoria: 'descargas',
    alias: ['pin', 'pinterestimg'],
    descripcion: 'Busca imágenes en Pinterest y las envía en álbum.',
    ejecutar: async ({ sock, msg, responder, argumento }) => {

        const consulta = argumento?.trim();
        if (!consulta) {
            await responder.texto('╭━━〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n┃\n┃ ❌ Escribe qué quieres buscar.\n╰━━━━━━━━⬣');
            return;
        }

        const jid = msg?.key?.remoteJid;
        if (!jid) return;

        try {
            await responder.texto(`📌 *Pinterest*\n\n🔎 Búsqueda: *${consulta}*\n⏳ Descargando con amor ...`);
            const resultados = await buscarPinterest(consulta);

            const buffers = [];
            for (let i = 0; i < resultados.length; i++) {
                try {
                    const buffer = await descargarImagen(resultados[i].descarga);
                    buffers.push({ image: buffer });
                    console.log(`[PINTEREST] Imagen ${i + 1}/${resultados.length} lista`);
                } catch (e) {
                    console.error(`[PINTEREST] Error img ${i + 1}:`, e.message);
                }
            }

            if (buffers.length === 0) throw new Error('No pude descargar ninguna imagen.');

            const CHUNK_SIZE = 10;
            let albumNum = 1;
            const totalAlbums = Math.ceil(buffers.length / CHUNK_SIZE);

            for (let i = 0; i < buffers.length; i += CHUNK_SIZE) {
                const chunk = buffers.slice(i, i + CHUNK_SIZE);
                const isFirstAlbum = i === 0;

                await sock.sendMessage(jid, {
                    album: chunk,
                    caption: isFirstAlbum? `📌 *Pinterest*: ${consulta}\n🖼️ ${buffers.length} imágenes\nÁlbum ${albumNum}/${totalAlbums}\n${CAPTION}` : `Álbum ${albumNum}/${totalAlbums}`
                }, { quoted: isFirstAlbum? msg : undefined });

                albumNum++;
                await new Promise(r => setTimeout(r, 2000));
            }

            await responder.texto(`✅ *Listo*\n\n🔎 Búsqueda: *${consulta}*\n🖼️ Enviadas: *${buffers.length}* en *${totalAlbums}* álbumes`);

        } catch (error) {
            console.error('[PINTEREST] Error:', error);
            await responder.texto(`╭━━〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n┃\n┃ ⚠️ ${error?.message || 'Error desconocido.'}\n╰━━━━━━━━⬣`);
        }
    }
};