// lib/exif.js — 🏷️ Firma visible en stickers (Pack • Autor)
// FIX: convierte el resultado de webpmux a Buffer real,
// porque Baileys corrompe la media si recibe Uint8Array.

const EXIF_HEADER = Buffer.from([
    0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00
]);

let webpModule = undefined;

async function getWebp() {
    if (webpModule === undefined) {
        try {
            const mod = await import('node-webpmux');
            webpModule = mod.default || mod;
            console.log('[EXIF] ✅ node-webpmux cargado');
        } catch (e) {
            webpModule = null;
            console.log('[EXIF] ❌ node-webpmux NO disponible:', e.message);
        }
    }
    return webpModule;
}

export async function writeExifWebp(buffer, metadata = {}) {
    const webp = await getWebp();

    if (!webp || !webp.Image) {
        console.log('[EXIF] ⚠️ Modo seguro: sin firma visible');
        return buffer;
    }

    try {
        const img = new webp.Image();
        await img.load(buffer);

        const json = {
            'sticker-pack-name': metadata.packname || 'BOT-API',
            'sticker-pack-publisher': metadata.author || 'BOT-API',
            'emojis': metadata.categories || ['🤖'],
            'is-avatar-sticker': 0
        };

        img.exif = Buffer.concat([
            EXIF_HEADER,
            Buffer.from(JSON.stringify(json), 'utf8')
        ]);

        const crudo = await img.save(null);

        // 🔑 EL FIX: garantizar Buffer real de Node
        const resultado = Buffer.from(crudo);

        if (!resultado || !resultado.length) throw new Error('save vacío');

        // Verificación: debe seguir siendo WebP válido
        const esWebp = resultado.toString('ascii', 0, 4) === 'RIFF' &&
                       resultado.toString('ascii', 8, 12) === 'WEBP';

        if (!esWebp) throw new Error('el resultado no es WebP válido');

        console.log(`[EXIF] ✅ FIRMA INCRUSTADA: ${json['sticker-pack-name']} • ${json['sticker-pack-publisher']} | Buffer: ${Buffer.isBuffer(resultado)} | ${resultado.length} bytes`);
        return resultado;

    } catch (e) {
        console.error('[EXIF] ⚠️ Error, modo seguro:', e.message);
        return buffer;
    }
}