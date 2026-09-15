// commands/sticker/spack.js
// ============================================================
// COMANDO: SPACK (Sticker Pack)
// BOT-API
//
// Busca un paquete de stickers y lo envía COMPLETO.
// Intenta enviarlo como ÁLBUM (igual que pinterest.js).
// Si el álbum falla, manda todos los stickers en bloque.
// ============================================================

import sharp from 'sharp';

const TIMEOUT = 60000;
const MAX_STICKERS = 20;
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/133.0.0.0 Safari/537.36';

// ============================================================
// FETCH CON TIMEOUT
// ============================================================

async function fetchConTimeout(url, opciones = {}, timeout = TIMEOUT) {
    const controller = new AbortController();
    const temporizador = setTimeout(() => controller.abort(), timeout);
    try {
        return await fetch(url, {
            ...opciones,
            signal: controller.signal,
            headers: {
                'user-agent': UA,
                accept: 'text/html,image/webp,image/png,*/*',
                ...opciones.headers
            }
        });
    } finally {
        clearTimeout(temporizador);
    }
}

// ============================================================
// BUSCAR PACKS (getstickerpack.com)
// ============================================================

async function buscarPacks(consulta) {
    const url =
        'https://getstickerpack.com/stickers?query=' +
        encodeURIComponent(consulta);

    const res = await fetchConTimeout(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} buscando packs`);

    const html = await res.text();
    const slugs = new Set();
    const regex = /href="(?:https?:\/\/getstickerpack\.com)?\/stickers\/([a-z0-9-]+)"/gi;

    let m;
    while ((m = regex.exec(html)) !== null) {
        slugs.add(m[1]);
    }

    const packs = [...slugs].map(
        (slug) => `https://getstickerpack.com/stickers/${slug}`
    );

    if (!packs.length) {
        throw new Error('No encontré paquetes de stickers.');
    }

    return packs;
}

// ============================================================
// SACAR STICKERS DEL PACK
// ============================================================

async function obtenerStickers(packUrl) {
    const res = await fetchConTimeout(packUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} abriendo el pack`);

    const html = await res.text();
    const urls = new Set();
    const regex = /src="(https:\/\/[^"\s]+?getstickerpack\.com\/[^"\s]+?\.(?:webp|png))"/gi;

    let m;
    while ((m = regex.exec(html)) !== null) {
        urls.add(m[1]);
    }

    const stickers = [...urls].slice(0, MAX_STICKERS);

    if (!stickers.length) {
        throw new Error('El pack no tiene stickers visibles.');
    }

    return stickers;
}

// ============================================================
// DESCARGAR + CONVERTIR A WEBP
// ============================================================

async function descargarSticker(url) {
    const res = await fetchConTimeout(url, {
        headers: { referer: 'https://getstickerpack.com/' }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) throw new Error('Sticker vacío');

    // Convertir a webp 512x512 (formato sticker de WhatsApp)
    return await sharp(buffer)
        .resize(512, 512, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality: 90 })
        .toBuffer();
}

// ============================================================
// DESCARGAR TODOS EN PARALELO (igual que pinterest)
// ============================================================

async function descargarTodos(urls) {
    const resultados = await Promise.allSettled(
        urls.map((u) => descargarSticker(u))
    );

    const validos = [];

    resultados.forEach((r, i) => {
        if (r.status === 'fulfilled') {
            validos.push(r.value);
        } else {
            console.error(
                `[SPACK] Falló sticker ${i + 1}:`,
                r.reason?.message || r.reason
            );
        }
    });

    return validos;
}

// ============================================================
// ENVIAR COMO ÁLBUM (EL TRUCO DE PINTEREST)
// ============================================================

async function enviarComoAlbum(sock, jid, msg, stickers) {
    if (!stickers.length) throw new Error('No hay stickers.');

    console.log(`[SPACK] Creando álbum de ${stickers.length} stickers...`);

    const album = stickers.map((buffer) => ({
        sticker: buffer
    }));

    await sock.sendMessage(jid, { album }, { quoted: msg });

    console.log(`[SPACK] Álbum enviado: ${stickers.length}`);
    return stickers.length;
}

// ============================================================
// RESPALDO: ENVIAR EN BLOQUE (sin esperas)
// ============================================================

async function enviarEnBloque(sock, jid, msg, stickers) {
    let enviadas = 0;

    for (const buffer of stickers) {
        try {
            await sock.sendMessage(jid, { sticker: buffer }, { quoted: msg });
            enviadas++;
        } catch (error) {
            console.error('[SPACK] Error enviando sticker:', error?.message || error);
        }
    }

    return enviadas;
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'spack',
    categoria: 'Stickers',
    alias: ['stickerpack', 'packsticker', 'sp'],
    descripcion: 'Descarga un paquete de stickers completo y lo envía en álbum.',
    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const consulta = String(argumento || '').trim();
        const jid = msg?.key?.remoteJid;

        if (!jid) return;

        if (!consulta) {
            return await responder.texto(
                '╭━━〔 🎨 𝐏𝐂 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué pack buscar.\n' +
                '┃\n' +
                '┃ 📌 Ejemplos:\n' +
                '┃ › .spack anime\n' +
                '┃ › .spack gatos\n' +
                '┃ › .spack https://getstickerpack.com/stickers/xxx\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━'
            );
        }

        try {
            // ------------------------------------------------
            // PACK: URL directa o búsqueda
            // ------------------------------------------------
            let packUrl = consulta;

            if (!/^https?:\/\//i.test(consulta)) {
                await responder.texto(`🔎 Buscando packs de: *${consulta}*...`);
                const packs = await buscarPacks(consulta);
                packUrl = packs[0];
            }

            // ------------------------------------------------
            // STICKERS DEL PACK
            // ------------------------------------------------
            const urls = await obtenerStickers(packUrl);

            await responder.texto(
                '🎨 *Sticker Pack*\n\n' +
                `🔗 Pack: ${packUrl}\n` +
                `🖼️ Stickers: *${urls.length}*\n\n` +
                '⏳ Descargando y convirtiendo...'
            );

            // ------------------------------------------------
            // DESCARGAR TODOS EN PARALELO
            // ------------------------------------------------
            const stickers = await descargarTodos(urls);

            if (!stickers.length) {
                throw new Error('No pude descargar ningún sticker.');
            }

            // ------------------------------------------------
            // ÁLBUM (con respaldo en bloque)
            // ------------------------------------------------
            let enviadas = 0;

            try {
                enviadas = await enviarComoAlbum(sock, jid, msg, stickers);
            } catch (errorAlbum) {
                console.error('[SPACK] El álbum falló:', errorAlbum?.message || errorAlbum);
                enviadas = await enviarEnBloque(sock, jid, msg, stickers);
            }

            if (!enviadas) {
                throw new Error('No pude enviar los stickers.');
            }

            // ------------------------------------------------
            // RESULTADO
            // ------------------------------------------------
            await responder.texto(
                '✅ *Pack terminado*\n\n' +
                `🖼️ Stickers: *${urls.length}*\n` +
                `📤 Enviados: *${enviadas}*\n\n` +
                'BOT-API 💙💻'
            );

        } catch (error) {
            console.error('[SPACK] Error:', error?.stack || error?.message || error);

            await responder.texto(
                '╭━━〔 ❌ 𝐒𝐏𝐂 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude completar el pack.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido.'}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};