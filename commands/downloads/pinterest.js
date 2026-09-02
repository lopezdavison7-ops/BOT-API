// commands/downloads/pinterest.js
// ============================================================
// COMANDO: PINTEREST
// BOT-API
//
// Busca imágenes en Pinterest usando web scraping con axios + cheerio
// y las manda como ÁLBUM (todas juntas en un solo mensaje).
// Si el álbum falla, cae al envío una por una.
// ============================================================

import axios from 'axios';
import cheerio from 'cheerio';

const TIMEOUT_API = 30000;
const LIMITE_RESULTADOS = 10;
const CAPTION = 'BOT-API 💙💻';

// ============================================================
// SCRAPER PINTEREST (axios + cheerio)
// ============================================================

async function scrapePinterest(consulta) {
    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(consulta)}`;
    
    console.log(`[PINTEREST] Scrapeando: ${url}`);

    try {
        const { data } = await axios.get(url, {
            timeout: TIMEOUT_API,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        const $ = cheerio.load(data);
        const imagenes = new Set(); // Usar Set para evitar duplicados

        // Buscar imágenes en diferentes selectores
        $('img').each((i, el) => {
            let src = $(el).attr('src');
            let alt = $(el).attr('alt') || 'Imagen Pinterest';
            
            // También buscar en data-src (para lazy loading)
            if (!src || !src.includes('pinimg.com')) {
                src = $(el).attr('data-src');
            }
            
            // Intentar obtener URL de imagen de alta calidad
            if (src && src.includes('pinimg.com')) {
                // Limpiar la URL para obtener mejor calidad
                src = src.replace(/\/\d+x\d+\//, '/originals/');
                imagenes.add(JSON.stringify({ descarga: src, titulo: alt }));
            }
        });

        // Buscar en enlaces de imágenes
        $('a[href*="/pin/"] img').each((i, el) => {
            let src = $(el).attr('src');
            if (src && src.includes('pinimg.com')) {
                src = src.replace(/\/\d+x\d+\//, '/originals/');
                const alt = $(el).attr('alt') || 'Imagen Pinterest';
                imagenes.add(JSON.stringify({ descarga: src, titulo: alt }));
            }
        });

        const resultados = Array.from(imagenes)
            .map(item => JSON.parse(item))
            .slice(0, LIMITE_RESULTADOS);

        if (resultados.length === 0) {
            throw new Error('No encontré imágenes para esa búsqueda.');
        }

        console.log(`[PINTEREST] Imágenes encontradas: ${resultados.length}`);
        return resultados;

    } catch (error) {
        console.error('[PINTEREST] Error en scrape:', error.message);
        throw new Error(`Error al scrapear Pinterest: ${error.message}`);
    }
}

// ============================================================
// DESCARGAR IMAGEN
// ============================================================

async function descargarImagen(url, indice) {
    try {
        const respuesta = await axios.get(url, {
            timeout: 60000,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/avif,image/webp,image/jpeg,image/png,*/*',
                'Referer': 'https://www.pinterest.com/'
            }
        });

        if (!respuesta.data || respuesta.data.length === 0) {
            throw new Error(`La imagen ${indice} está vacía.`);
        }

        return Buffer.from(respuesta.data);

    } catch (error) {
        console.error(`[PINTEREST] Error descargando imagen ${indice}:`, error.message);
        throw new Error(`Error al descargar imagen ${indice}: ${error.message}`);
    }
}

// ============================================================
// ENVIAR IMAGEN (una por una)
// ============================================================

async function enviarImagen(sock, jid, url, msg, indice, total) {
    console.log(`[PINTEREST] Descargando imagen ${indice}/${total}`);
    const buffer = await descargarImagen(url, indice);
    console.log(`[PINTEREST] Imagen ${indice}: ${buffer.length} bytes`);

    await sock.sendMessage(jid, {
        image: buffer,
        caption: CAPTION
    }, { quoted: msg });

    console.log(`[PINTEREST] Imagen ${indice}/${total} enviada`);
}

// ============================================================
// ENVIAR COMO ÁLBUM
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
            // Buscar imágenes
            const resultados = await scrapePinterest(consulta);

            // Aviso
            await responder.texto(
                '📌 *Pinterest*\n\n' +
                `🔎 Búsqueda: *${consulta}*\n` +
                `🖼️ Imágenes: *${resultados.length}*\n\n` +
                '⏳ Enviando imágenes...'
            );

            // Enviar imágenes (álbum primero)
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

            // Resultado final
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