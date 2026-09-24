// lib/exif.js — 🏷️ Escribe metadatos EXIF dentro del WebP
// ============================================================
// WhatsApp lee el packname/author desde el chunk EXIF del
// archivo WebP. Aquí NO incluimos sticker-pack-id para que
// la descripción salga limpia: "Pack • Autor" (sin [ID]).
// ============================================================

import webp from 'node-webpmux';

// Header EXIF estándar de stickers de WhatsApp
const EXIF_HEADER = Buffer.from([
    0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
]);

/**
 * Incrusta packname/author en un buffer WebP (SIN ID visible)
 * @param {Buffer} buffer - Sticker WebP
 * @param {Object} metadata - { packname, author, categories }
 * @returns {Buffer} WebP con EXIF
 */
export async function writeExifWebp(buffer, metadata = {}) {
    try {
        const img = new webp.Image();
        await img.load(buffer);

        // ⚠️ SIN sticker-pack-id → WhatsApp no muestra [ID]
        const json = {
            'sticker-pack-name': metadata.packname || 'BOT-API',
            'sticker-pack-publisher': metadata.author || 'BOT-API',
            'emojis': metadata.categories || ['🤖'],
            'is-avatar-sticker': 0
        };

        const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
        const exif = Buffer.concat([EXIF_HEADER, jsonBuffer]);

        img.exif = exif;

        return await img.save(null);
    } catch (error) {
        console.error('[EXIF] Error escribiendo metadatos:', error.message);
        return buffer;
    }
}