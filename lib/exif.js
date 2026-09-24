// lib/exif.js — 🏷️ Escribe metadatos EXIF dentro del WebP
// ============================================================
// Versión SIN dependencias externas (no necesita node-webpmux).
// Parsea el contenedor RIFF/WebP e inserta el chunk EXIF
// manualmente, activando el flag EXIF en VP8X si existe.
// ============================================================

// Header EXIF estándar de stickers de WhatsApp
const EXIF_HEADER = Buffer.from([
    0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
]);

/**
 * Incrusta packname/author en un buffer WebP (sin [ID] visible)
 * @param {Buffer} buffer - Sticker WebP
 * @param {Object} metadata - { packname, author, categories }
 * @returns {Buffer} WebP con chunk EXIF
 */
export async function writeExifWebp(buffer, metadata = {}) {
    try {
        // Validar que sea un WebP RIFF
        if (
            !buffer ||
            buffer.length < 12 ||
            buffer.toString('ascii', 0, 4) !== 'RIFF' ||
            buffer.toString('ascii', 8, 12) !== 'WEBP'
        ) {
            console.log('[EXIF] Buffer no es WebP válido, se envía sin EXIF');
            return buffer;
        }

        // Construir payload EXIF (SIN sticker-pack-id → sin [ID])
        const json = {
            'sticker-pack-name': metadata.packname || 'BOT-API',
            'sticker-pack-publisher': metadata.author || 'BOT-API',
            'emojis': metadata.categories || ['🤖'],
            'is-avatar-sticker': 0
        };

        const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
        const exifData = Buffer.concat([EXIF_HEADER, jsonBuf]);

        // Chunk EXIF: fourCC + tamaño LE + data + padding si es impar
        const pad = exifData.length % 2;
        const chunk = Buffer.alloc(8 + exifData.length + pad);
        chunk.write('EXIF', 0, 'ascii');
        chunk.writeUInt32LE(exifData.length, 4);
        exifData.copy(chunk, 8);
        if (pad) chunk.writeUInt8(0, 8 + exifData.length);

        // Copia del buffer para modificar flags de VP8X si existe
        let cuerpo = Buffer.from(buffer);

        // Si hay chunk VP8X (webp animados/alpha), activar bit EXIF (0x08)
        if (cuerpo.toString('ascii', 12, 16) === 'VP8X') {
            cuerpo[20] = cuerpo[20] | 0x08;
            console.log('[EXIF] Flag EXIF activado en VP8X');
        }

        // Payload original (después de 'WEBP') + chunk EXIF al final
        const payloadOriginal = cuerpo.slice(12);
        const nuevoPayload = Buffer.concat([payloadOriginal, chunk]);

        // Reconstruir archivo con nuevo tamaño RIFF
        const out = Buffer.alloc(12 + nuevoPayload.length);
        out.write('RIFF', 0, 'ascii');
        out.writeUInt32LE(4 + nuevoPayload.length, 4);
        out.write('WEBP', 8, 'ascii');
        nuevoPayload.copy(out, 12);

        console.log(`[EXIF] ✅ EXIF incrustado (+${chunk.length} bytes)`);
        return out;

    } catch (error) {
        console.error('[EXIF] Error escribiendo metadatos:', error.message);
        return buffer; // Si falla, envía el sticker sin EXIF
    }
}