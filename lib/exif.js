// lib/exif.js — 🏷️ Escribe metadatos EXIF dentro del WebP
// ============================================================
// Usa node-webpmux (estándar de bots, no rompe el WebP).
// SIN sticker-pack-id → la descripción sale "Pack • Autor"
// ============================================================

import webp from 'node-webpmux';

// Header EXIF estándar de stickers de WhatsApp
const EXIF_HEADER = Buffer.from([
    0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
]);

export async function writeExifWebp(buffer, metadata = {}) {
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

        const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
        const exif = Buffer.concat([EXIF_HEADER, jsonBuffer]);

        img.exif = exif;

        const resultado = await img.save(null);
        console.log(`[EXIF] ✅ EXIF incrustado (${resultado.length} bytes)`);
        return resultado;

    } catch (error) {
        console.error('[EXIF] Error:', error.message);
        return buffer; // Si falla, envía sin EXIF (sticker se ve bien)
    }
}