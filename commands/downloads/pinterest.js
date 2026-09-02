// commands/downloads/pinterest.js
// ============================================================
// COMANDO: PINTEREST
// BOT-API
//
// Busca imágenes en Pinterest y las manda como ÁLBUM (todas
// juntas en un solo mensaje). Si el álbum falla por cualquier
// motivo, cae automáticamente al envío una por una.
// Las imágenes se envían sin mostrar URLs.
// ============================================================

import axios from 'axios';
import cheerio from 'cheerio';

const TIMEOUT_API = 30000;

// Cantidad máxima de imágenes que enviará el comando.
const LIMITE_RESULTADOS = 10;

const CAPTION = 'BOT-API 💙💻';

// ============================================================
// SCRAPER PINTEREST (axios + cheerio)
// ============================================================

async function scrapePinterest(consulta) {
    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(consulta)}`;
    
    console.log(`[PINTEREST] Scrapeando: ${url}`);

    const { data } = await axios.get(url, {
        timeout: TIMEOUT_API,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    const $ = cheerio.load(data);
    const imagenes = [];

    $('img').each((i, el) => {
        const src = $(el).attr('src');
        const alt = $(el).attr('alt');
        if (src && src.includes('pinimg.com')) {
            imagenes.push({ 
                descarga: src, 
                titulo: alt || 'Imagen Pinterest' 
            });
        }
    });

    if (imagenes.length === 0) {
        throw new Error('No encontré imágenes para esa búsqueda.');
    }

    console.log(`[PINTEREST] Imágenes encontradas: ${imagenes.length}`);
    
    // Limitar resultados
    return imagenes.slice(0, LIMITE_RESULTADOS);
}

// ============================================================
// FETCH CON TIMEOUT
// ============================================================

async function fetchConTimeout(url, opciones = {}, timeout = TIMEOUT_API) {
    const controller = new AbortController();
    const temporizador = setTimeout(() => controller.abort(), timeout);

    try {
        return await fetch(url, {
            ...opciones,
            signal: controller.signal
        });
    } finally {
        clearTimeout(temporizador);
    }
}

// ============================================================
// LIMPIAR TEXTO
// ============================================================

function limpiarTexto(texto, fallback = '') {
    if (texto === null || texto === undefined) {
        return fallback;
    }
    return String(texto).replace(/\s+/g, ' ').trim();
}

// ============================================================
// BUSCAR PINTEREST - AHORA USA EL SCRAPER
// ============================================================

async function buscarPinterest(consulta) {
    console.log(`[PINTEREST] Buscando: ${consulta}`);
    
    const resultados = await scrapePinterest(consulta);
    
    console.log(`[PINTEREST] Imágenes válidas: ${resultados.length}`);
    return resultados;
}

// ============================================================
// DESCARGAR IMAGEN (sin enviarla)
// ============================================================

async function descargarImagen(url, indice) {
    const respuesta = await fetchConTimeout(
        url,
        {
            headers: {
                Accept: 'image/avif,image/webp,image/jpeg,image/png,*/*',
                'User-Agent': 'Mozilla/5.0'
            }
        },
        60000
    );

    if (!respuesta.ok) {
        throw new Error(`HTTP ${respuesta.status} al descargar imagen ${indice}`);
    }

    const tipo = respuesta.headers.get('content-type') || 'image/jpeg';
    if (!tipo.startsWith('image/')) {
        throw new Error(`La URL ${indice} no devolvió una imagen.`);
    }

    const arrayBuffer = await respuesta.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length) {
        throw new Error(`La imagen ${indice} está vacía.`);
    }

    return buffer;
}

// ============================================================
// ENVIAR IMAGEN (una por una — respaldo si falla el álbum)
// ============================================================

async function enviarImagen(sock, jid, url, msg, indice, total) {
    console.log(`[PINTEREST] Descargando imagen ${indice}/${total}`);
    const buffer = await descargarImagen(url, indice);
    console.log(`[PINTEREST] Imagen ${indice}: ${buffer.length} bytes`);

    await sock.sendMessage(jid, {
        image: buffer,
        caption: CAPTION
    }, {
        quoted: msg
    });

    console.log(`[PINTEREST] Imagen ${indice}/${total} enviada`);
}

// ============================================================
// ENVIAR COMO ÁLBUM (todas las imágenes en un solo mensaje)
// ============================================================

async function enviarComoAlbum(sock, jid, msg, resultados) {
    console.log(`[PINTEREST] Descargando ${resultados.length} imágenes en paralelo...`);

    const descargas = await Promise.allSettled(
        resultados.map((item, i) => descargarImagen(item.descarga, i + 1))
    );

    const buffers = [];
    descargas.forEach((resultado, i) => {
        if (resultado.status === 'fulfilled') {
            buffers.push(resultado.value);
        } else {
            console.error(`[PINTEREST] Falló imagen ${i + 1}:`, 
                resultado.reason?.message || resultado.reason);
        }
    });

    if (buffers.length === 0) {
        throw new Error('No pude descargar ninguna imagen.');
    }

    console.log(`[PINTEREST] Enviando álbum de ${buffers.length} imágenes...`);

    const album = buffers.map((buffer, i) => ({
        image: buffer,
        caption: i === buffers.length - 1 ? CAPTION : undefined
    }));

    await sock.sendMessage(jid, { album }, { quoted: msg });

    console.log(`[PINTEREST] Álbum enviado: ${buffers.length}/${resultados.length}`);
    return buffers.length;
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'pinterest',
    categoria: 'descargas',
    alias: ['pin', 'pinterestimg'],
    descripcion: 'Busca imágenes en Pinterest y las envía.',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const consulta = argumento?.trim();

        if (!consulta) {
            await responder.texto(
                '╭━━〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué quieres buscar.\n' +
                '┃\n' +
                '┃ 📌 Ejemplos:\n' +
                '┃ › .pinterest zhao lusi\n' +
                '┃ › .pinterest anime\n' +
                '┃ › .pinterest gatos\n' +
                '┃ › .pinterest carros 4x4\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        const jid = msg?.key?.remoteJid;
        if (!jid) return;

        console.log('================================================');
        console.log(`[PINTEREST] Consulta: ${consulta}`);

        try {
            // ------------------------------------------------
            // BUSCAR - AHORA USA EL SCRAPER
            // ------------------------------------------------

            const resultados = await buscarPinterest(consulta);

            // ------------------------------------------------
            // AVISO
            // ------------------------------------------------

            await responder.texto(
                '📌 *Pinterest*\n\n' +
                `🔎 Búsqueda: *${consulta}*\n` +
                `🖼️ Imágenes: *${resultados.length}*\n\n` +
                '⏳ Enviando imágenes...'
            );

            // ------------------------------------------------
            // ENVIAR IMÁGENES (álbum primero, respaldo si falla)
            // ------------------------------------------------

            let enviadas = 0;

            try {
                enviadas = await enviarComoAlbum(sock, jid, msg, resultados);
            } catch (errorAlbum) {
                console.error('[PINTEREST] Álbum falló, usando respaldo:', 
                    errorAlbum?.message || errorAlbum);

                for (let i = 0; i < resultados.length; i++) {
                    try {
                        await enviarImagen(sock, jid, resultados[i].descarga,
                            msg, i + 1, resultados.length);
                        enviadas++;
                    } catch (error) {
                        console.error(`[PINTEREST] Error imagen ${i + 1}:`, 
                            error?.message || error);
                    }
                }
            }

            // ------------------------------------------------
            // RESULTADO FINAL
            // ------------------------------------------------

            if (enviadas === 0) {
                throw new Error('No pude enviar ninguna imagen.');
            }

            console.log(`[PINTEREST] Finalizado: ${enviadas}/${resultados.length}`);

            await responder.texto(
                `✅ *Pinterest terminado*\n\n` +
                `🔎 Búsqueda: *${consulta}*\n` +
                `🖼️ Enviadas: *${enviadas}/${resultados.length}*\n\n` +
                `${CAPTION}`
            );

        } catch (error) {
            console.error('[PINTEREST] Error:', error?.stack || error?.message || error);

            await responder.texto(
                '╭━━〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude completar la búsqueda.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido.'}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};