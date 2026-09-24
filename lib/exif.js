// lib/exif.js — MODO SEGURO: no toca el WebP, sticker siempre perfecto
export async function writeExifWebp(buffer, metadata = {}) {
    console.log(`[EXIF] Modo seguro (sin firma): ${metadata.packname} / ${metadata.author}`);
    return buffer;
}