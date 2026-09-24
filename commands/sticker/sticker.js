// commands/sticker/sticker.js
// ============================================================
// BOT-API
// COMANDO: STICKER / S / STIKER
// ============================================================
// Stickers HD con firma visible (Pack • Autor).
// Compatible con baileys-beta: sube el sticker a WhatsApp
// primero y lo envía como { url } para evitar el "gris".
// ============================================================

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { downloadMediaMessage } from 'baileys';
import { writeExifWebp } from '../../lib/exif.js';

const execFileAsync = promisify(execFile);

// ============================================================
// CONFIGURACIÓN
// ============================================================

const MAX_GIF_SECONDS = 3;
const MAX_STICKER_SIZE = 500 * 1024;
const RUTA_META = path.join(process.cwd(), 'database', 'stickerMeta.json');

const STATIC_QUALITIES = [100, 95, 90, 85, 80, 75, 70];

// ============================================================
// UTILIDADES
// ============================================================

function jidANumero(jid) {
    return String(jid || '').split('@')[0].replace(/\D/g, '');
}

function obtenerUsuario(msg) {
    const jid = msg?.key?.participant || msg?.key?.remoteJid || '';
    const numero = jidANumero(jid);
    return numero ? `@${numero}` : '@usuario';
}

// ============================================================
// METADATOS PERSONALIZADOS (.setmeta)
// ============================================================

function obtenerMetaPersonalizada(jid) {
    try {
        if (!fs.existsSync(RUTA_META)) return null;
        const db = JSON.parse(fs.readFileSync(RUTA_META, 'utf8'));
        const numero = jidANumero(jid);
        const user = db[numero] || null;
        if (!user) return null;
        return {
            packname: user.stickerPackName || null,
            author: user.stickerPackAuthor || null
        };
    } catch (e) {
        return null;
    }
}

function obtenerMetadatos(msg) {
    const jid = msg?.key?.participant || msg?.key?.remoteJid || '';
    const usuario = obtenerUsuario(msg);

    const personalizada = obtenerMetaPersonalizada(jid);

    if (personalizada && personalizada.packname && personalizada.author) {
        console.log(`[STICKER] 🏷️ EXIF personalizado: ${personalizada.packname} / ${personalizada.author}`);
        return {
            packname: personalizada.packname,
            author: personalizada.author,
            categories: ['🤖'],
            personalizado: true
        };
    }

    console.log('[STICKER] 🏷️ EXIF por defecto');
    return {
        packname: 'BOT-API',
        author: `POR USUARIO ${usuario}`,
        categories: ['🤖'],
        personalizado: false
    };
}

function obtenerMensajeCitado(msg) {
    return msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
}

function construirMensajeCompleto(msg, mensajeCitado) {
    return {
        key: {
            remoteJid: msg?.key?.remoteJid,
            fromMe: false,
            id: msg?.key?.id,
            participant: msg?.key?.participant
        },
        message: mensajeCitado
    };
}

function detectarTipo(mensaje) {
    if (mensaje?.imageMessage) return 'imagen';
    if (mensaje?.videoMessage) return 'video';

    if (mensaje?.documentMessage) {
        const mimetype = mensaje.documentMessage?.mimetype || '';
        if (mimetype.startsWith('image/')) return 'imagen';
        if (mimetype.startsWith('video/')) return 'video';
    }

    return null;
}

// ============================================================
// FFMPEG - STICKER ANIMADO
// ============================================================

async function ejecutarFFmpeg(entrada, salida, fps, calidad, duracion = MAX_GIF_SECONDS) {
    const filtro = [
        'scale=512:512:force_original_aspect_ratio=decrease',
        'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0',
        `fps=${fps}`,
        'format=yuva420p'
    ].join(',');

    await execFileAsync(
        'ffmpeg',
        [
            '-y',
            '-i', entrada,
            '-t', String(duracion),
            '-vf', filtro,
            '-an',
            '-c:v', 'libwebp',
            '-lossless', '0',
            '-q:v', String(calidad),
            '-compression_level', '6',
            '-loop', '0',
            salida
        ],
        { maxBuffer: 20 * 1024 * 1024 }
    );
}

async function crearStickerAnimado(buffer) {
    const carpeta = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bot-api-sticker-'));
    const entrada = path.join(carpeta, 'entrada.mp4');
    const salida = path.join(carpeta, 'sticker.webp');

    try {
        await fs.promises.writeFile(entrada, buffer);

        await ejecutarFFmpeg(entrada, salida, 15, 65);
        let resultado = await fs.promises.readFile(salida);

        if (resultado.length > MAX_STICKER_SIZE) {
            await ejecutarFFmpeg(entrada, salida, 12, 60);
            resultado = await fs.promises.readFile(salida);
        }

        if (resultado.length > MAX_STICKER_SIZE) {
            await ejecutarFFmpeg(entrada, salida, 10, 55);
            resultado = await fs.promises.readFile(salida);
        }

        if (resultado.length > MAX_STICKER_SIZE) {
            await ejecutarFFmpeg(entrada, salida, 8, 45, 2.5);
            resultado = await fs.promises.readFile(salida);
        }

        if (!resultado.length) throw new Error('El sticker animado quedó vacío.');

        if (resultado.length > MAX_STICKER_SIZE) {
            throw new Error(`El sticker animado pesa ${Math.round(resultado.length / 1024)} KB.`);
        }

        return resultado;

    } finally {
        await fs.promises.rm(carpeta, { recursive: true, force: true }).catch(() => {});
    }
}

// ============================================================
// STICKER DE IMAGEN - ALTA CALIDAD
// ============================================================

async function crearStickerImagen(buffer) {
    let resultado = null;

    for (const quality of STATIC_QUALITIES) {
        resultado = await sharp(buffer)
            .rotate()
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 },
                withoutEnlargement: false
            })
            .webp({ quality, effort: 6, smartSubsample: true })
            .toBuffer();

        console.log(`[STICKER] Calidad ${quality}: ${Math.round(resultado.length / 1024)} KB`);

        if (resultado.length <= MAX_STICKER_SIZE) return resultado;
    }

    if (!resultado || !resultado.length) throw new Error('No se pudo crear el sticker.');

    resultado = await sharp(buffer)
        .rotate()
        .resize(512, 512, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality: 60, effort: 6 })
        .toBuffer();

    if (resultado.length > MAX_STICKER_SIZE) {
        throw new Error(`La imagen es demasiado pesada (${Math.round(resultado.length / 1024)} KB).`);
    }

    return resultado;
}

// ============================================================
// 🔑 SUBIR STICKER A WHATSAPP (método baileys-beta)
// ============================================================

async function subirStickerAWhatsApp(sock, bufferConExif) {
    // Intento 1: con Toolkit de yo-soy-yo-baileys (fork)
    try {
        const mod = await import('yo-soy-yo-baileys');
        const Toolkit = mod.Toolkit || mod.default?.Toolkit;
        if (Toolkit && typeof Toolkit.toUrl === 'function') {
            const url = await Toolkit.toUrl(sock, bufferConExif, 'sticker');
            console.log('[STICKER] ✅ Subido con Toolkit.toUrl');
            return { url };
        }
    } catch (e) {
        console.log('[STICKER] Toolkit no disponible:', e.message);
    }

    // Intento 2: con waUploadToServer (método estándar baileys)
    try {
        if (typeof sock.waUploadToServer === 'function') {
            const uploadResult = await sock.waUploadToServer(bufferConExif, { 
                mediaType: 4, // sticker
                quality: 1 
            });
            if (uploadResult?.directPath) {
                const url = 'https://mmg.whatsapp.net' + uploadResult.directPath;
                console.log('[STICKER] ✅ Subido con waUploadToServer');
                return { url, uploadResult };
            }
        }
    } catch (e) {
        console.log('[STICKER] waUploadToServer falló:', e.message);
    }

    // Intento 3: guardar en archivo y pasar { url: path } (baileys-beta soporta)
    try {
        const tmpDir = os.tmpdir();
        const tmpPath = path.join(tmpDir, `sticker-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`);
        await fs.promises.writeFile(tmpPath, bufferConExif);
        console.log('[STICKER] ⚠️ Guardado en archivo temporal:', tmpPath);
        return { url: tmpPath, tmpPath };
    } catch (e) {
        console.log('[STICKER] Archivo temporal falló:', e.message);
    }

    return null;
}

// ============================================================
// ENVÍO DEL STICKER (compatible con baileys-beta)
// ============================================================

async function enviarSticker(sock, jid, buffer, msg, animado) {
    const metadatos = obtenerMetadatos(msg);

    // 1. Incrustar firma EXIF dentro del WebP
    const stickerConExif = await writeExifWebp(buffer, metadatos);

    const stickerFinal = Buffer.isBuffer(stickerConExif)
        ? stickerConExif
        : Buffer.from(stickerConExif);

    console.log(`[STICKER] 🏷️ Preparando: ${metadatos.packname} • ${metadatos.author} | ${stickerFinal.length} bytes`);

    // 2. 🔑 SUBIR primero (método baileys-beta)
    const subida = await subirStickerAWhatsApp(sock, stickerFinal);

    const contenido = {
        packname: metadatos.packname,
        author: metadatos.author,
        categories: metadatos.categories
    };

    if (animado) contenido.isAnimated = true;

    if (subida && subida.url) {
        // ✅ MÉTODO CORRECTO: pasar como { url }
        contenido.sticker = { url: subida.url };
        console.log('[STICKER] ✅ Enviando como URL (método baileys-beta)');
    } else {
        // Fallback: enviar buffer directo (puede salir gris pero funciona)
        contenido.sticker = stickerFinal;
        contenido.mimetype = 'image/webp';
        console.log('[STICKER] ⚠️ Enviando como buffer (fallback)');
    }

    await sock.sendMessage(jid, contenido, { quoted: msg });

    // Limpiar archivo temporal si existe
    if (subida?.tmpPath) {
        try {
            setTimeout(() => fs.promises.unlink(subida.tmpPath).catch(() => {}), 5000);
        } catch (e) {}
    }
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'sticker',
    categoria: 'Multimedia',
    alias: ['s', 'stiker'],
    descripcion: 'Convierte imágenes y videos en stickers HD con tu firma visible (pack y autor).',
    uso: '.s (responde a imagen/video) | .setmeta Pack | Autor',

    ejecutar: async ({ sock, msg, responder }) => {
        try {
            const mensajeCitado = obtenerMensajeCitado(msg);

            if (!mensajeCitado) {
                await responder.texto(
                    '╭━━〔 🎨 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Responde a una imagen o video\n' +
                    '┃    usando *.s*\n' +
                    '┃\n' +
                    '┃ 📷 Imagen → sticker HD\n' +
                    '┃ 🎞️ Video → sticker animado\n' +
                    '┃\n' +
                    '┃ 🏷️ Pon tu firma en los stickers:\n' +
                    '┃ ➪ *.setmeta Pack | Autor*\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
                return;
            }

            const jid = msg?.key?.remoteJid;
            if (!jid) throw new Error('No se pudo obtener el chat.');

            const tipo = detectarTipo(mensajeCitado);

            if (!tipo) {
                await responder.texto(
                    '╭━━〔 ❌ 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 〕━━⬣\n' +
                    '┃\n' +
                    '┃ Responde a una imagen o video\n' +
                    '┃ válido usando *.s*\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
                return;
            }

            console.log('================================================');
            console.log(`[STICKER] Tipo: ${tipo}`);
            console.log(`[STICKER] Usuario: ${obtenerUsuario(msg)}`);

            const mensajeCompleto = construirMensajeCompleto(msg, mensajeCitado);

            console.log('[STICKER] ⬇️ Descargando multimedia...');

            const buffer = await downloadMediaMessage(mensajeCompleto, 'buffer', {}, { logger: undefined });

            if (!buffer || !Buffer.isBuffer(buffer) || !buffer.length) {
                throw new Error('No se pudo descargar la multimedia.');
            }

            console.log(`[STICKER] Multimedia: ${Math.round(buffer.length / 1024)} KB`);

            let sticker;
            let animado = false;

            if (tipo === 'video') {
                animado = true;
                console.log('[STICKER] 🎞️ Creando sticker animado HD...');
                sticker = await crearStickerAnimado(buffer);
            } else {
                console.log('[STICKER] 🖼️ Creando sticker HD...');
                sticker = await crearStickerImagen(buffer);
            }

            if (!sticker || !Buffer.isBuffer(sticker) || !sticker.length) {
                throw new Error('El sticker generado está vacío.');
            }

            console.log(`[STICKER] Tamaño final: ${Math.round(sticker.length / 1024)} KB`);

            await enviarSticker(sock, jid, sticker, msg, animado);

            console.log('[STICKER] ✅ Sticker enviado correctamente.');
            console.log('================================================');

        } catch (error) {
            console.error('[STICKER] ❌ Error:', error?.stack || error?.message || error);

            try {
                await responder.texto(
                    '╭━━〔 ❌ 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No pude crear el sticker.\n' +
                    '┃\n' +
                    `┃ ⚠️ ${error?.message || 'Error desconocido.'}\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            } catch {}
        }
    }
};