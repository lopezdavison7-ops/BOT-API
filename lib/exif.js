// lib/exif.js — 🏷️ Firma visible + subida compatible con baileys-beta

import fs from 'fs';
import os from 'os';
import path from 'path';

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
        const resultado = Buffer.from(crudo);

        if (!resultado || !resultado.length) throw new Error('save vacío');

        const esWebp = resultado.toString('ascii', 0, 4) === 'RIFF' &&
                       resultado.toString('ascii', 8, 12) === 'WEBP';

        if (!esWebp) throw new Error('no es WebP válido');

        console.log(`[EXIF] ✅ FIRMA INCRUSTADA: ${json['sticker-pack-name']} • ${json['sticker-pack-publisher']}`);
        return resultado;

    } catch (e) {
        console.error('[EXIF] ⚠️ Error:', e.message);
        return buffer;
    }
}

// 🔑 NUEVO: Guarda buffer con EXIF en archivo temporal y lo sube a WhatsApp
// Esto es lo que baileys-beta necesita para que el sticker NO salga gris
export async function guardarYSubirSticker(sock, buffer, metadata = {}) {
    const stickerConExif = await writeExifWebp(buffer, metadata);

    // Crear archivo temporal
    const tmpDir = os.tmpdir();
    const tmpPath = path.join(tmpDir, `sticker-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`);

    try {
        await fs.promises.writeFile(tmpPath, stickerConExif);

        // Subir con el Toolkit del fork (si existe) o método estándar
        let url;

        try {
            // Intentar con Toolkit de yo-soy-yo-baileys
            const { Toolkit } = await import('yo-soy-yo-baileys');
            url = await Toolkit.toUrl(sock, stickerConExif, 'sticker');
            console.log('[EXIF] ✅ Subido con Toolkit.toUrl:', url);
        } catch (e) {
            // Fallback: usar waUploadToServer estándar de baileys
            console.log('[EXIF] ⚠️ Toolkit no disponible, usando waUploadToServer');
            const uploadResult = await sock.waUploadToServer(stickerConExif, { mediaType: 4 });
            url = `https://mmg.whatsapp.net${uploadResult.directPath}`;
            console.log('[EXIF] ✅ Subido con waUploadToServer:', url);
        }

        return { url, path: tmpPath };

    } catch (e) {
        console.error('[EXIF] ❌ Error subiendo sticker:', e.message);
        // Si falla, devolver buffer para envío directo (puede salir gris)
        return { buffer: stickerConExif, path: null };
    }
}