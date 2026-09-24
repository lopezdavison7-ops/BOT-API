// lib/exif.js — 🏷️ Firma visible en stickers (Pack • Autor)
// ============================================================
// Usa node-webpmux (no rompe el WebP).
// Si la librería no está o falla → modo seguro (sticker normal).
// SIN sticker-pack-id → sin [ID] en la descripción.
// ============================================================

const EXIF_HEADER = Buffer.from([
    0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
]);

// Caché del módulo: undefined = no intentado, null = no disponible
let webpModule = undefined;

async function getWebp() {
    if (webpModule === undefined) {
        try {
            const mod = await import('node-webpmux');
            webpModule = mod.default || mod;
            console.log('[EXIF] ✅ node-webpmux cargado correctamente');
        } catch (e) {
            webpModule = null;
            console.log('[EXIF] ⚠️ node-webpmux NO disponible:', e.message);
        }
    }
    return webpModule;
}

/**
 * Incrusta packname/author dentro del WebP
 * @param {Buffer} buffer - Sticker WebP
 * @param {Object} metadata - { packname, author, categories }
 * @returns {Buffer} WebP con firma (o el original si falla)
 */
export async function writeExifWebp(buffer, metadata = {}) {
    const webp = await getWebp();

    // Modo seguro: sin librería → sticker normal, nunca roto
    if (!webp || !webp.Image) {
        console.log('[EXIF] ⚠️ Modo seguro: sticker sin firma visible');
        return buffer;
    }

    try {
        const img = new webp.Image();
        await img.load(buffer);

        // SIN sticker-pack-id → WhatsApp no muestra [ID]
        const json = {
            'sticker-pack-name': metadata.packname || 'BOT-API',
            'sticker-pack-publisher': metadata.author || 'BOT-API',
            'emojis': metadata.categories || ['🤖'],
            'is-avatar-sticker': 0
        };

        const exif = Buffer.concat([
            EXIF_HEADER,
            Buffer.from(JSON.stringify(json), 'utf8')
        ]);

        img.exif = exif;

        const resultado = await img.save(null);

        if (!resultado || !resultado.length) {
            throw new Error('save() devolvió buffer vacío');
        }

        console.log(`[EXIF] ✅ Firma incrustada: ${json['sticker-pack-name']} • ${json['sticker-pack-publisher']}`);
        return resultado;

    } catch (error) {
        // NUNCA romper el sticker: si falla, envía el original
        console.error('[EXIF] ⚠️ Error al incrustar, modo seguro:', error.message);
        return buffer;
    }
}