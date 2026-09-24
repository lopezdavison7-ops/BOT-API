// commands/sticker/sticker.js
// ============================================================
// BOT-API - COMANDO: STICKER / S / STIKER
// ============================================================
// .s        → sticker HD garantizado + mensaje con firma
// .s exif   → MODO PRUEBA: WebP vía ffmpeg + EXIF nativo
//             (si funciona, verás "Pack • Autor" bajo el sticker)
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

function bold(t) {
    return String(t).replace(/[A-Za-z]/g, c =>
        String.fromCodePoint((c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97) + c.charCodeAt(0))
    );
}

// Detectar extensión por magic bytes (para ffmpeg)
function detectarExtension(buffer) {
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'jpg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
    if (buffer.toString('ascii', 0, 4) === 'RIFF') return 'webp';
    if (buffer.toString('ascii', 0, 3) === 'GIF') return 'gif';
    return 'jpg';
}

// ============================================================
// METADATOS (.setmeta)
// ============================================================

function obtenerMetaPersonalizada(jid) {
    try {
        if (!fs.existsSync(RUTA_META)) return null;
        const db = JSON.parse(fs.readFileSync(RUTA_META, 'utf8'));
        return db[jidANumero(jid)] || null;
    } catch (e) {
        return null;
    }
}

function obtenerMetadatos(msg) {
    const jid = msg?.key?.participant || msg?.key?.remoteJid || '';
    const usuario = obtenerUsuario(msg);
    const p = obtenerMetaPersonalizada(jid);

    if (p?.stickerPackName && p?.stickerPackAuthor) {
        return { packname: p.stickerPackName, author: p.stickerPackAuthor, personalizado: true };
    }
    return { packname: 'BOT-API', author: `POR USUARIO ${usuario}`, personalizado: false };
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
        const mt = mensaje.documentMessage?.mimetype || '';
        if (mt.startsWith('image/')) return 'imagen';
        if (mt.startsWith('video/')) return 'video';
    }
    return null;
}

// ============================================================
// CREAR STICKER - SHARP (método garantizado)
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

        if (resultado.length <= MAX_STICKER_SIZE) return resultado;
    }

    if (!resultado?.length) throw new Error('No se pudo crear el sticker.');
    return resultado;
}

// ============================================================
// CREAR STICKER - FFMPEG (modo exif: flujo de bots con firma)
// ============================================================

async function crearStickerImagenFfmpeg(buffer) {
    const carpeta = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bot-api-exif-'));
    const ext = detectarExtension(buffer);
    const entrada = path.join(carpeta, `entrada.${ext}`);
    const salida = path.join(carpeta, 'sticker.webp');

    try {
        await fs.promises.writeFile(entrada, buffer);

        const filtro = 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0';

        await execFileAsync('ffmpeg', [
            '-y', '-i', entrada,
            '-vf', filtro,
            '-c:v', 'libwebp',
            '-lossless', '0',
            '-q:v', '75',
            '-compression_level', '6',
            salida
        ], { maxBuffer: 20 * 1024 * 1024 });

        const resultado = await fs.promises.readFile(salida);
        if (!resultado.length) throw new Error('ffmpeg generó sticker vacío');
        console.log(`[STICKER] ffmpeg webp: ${Math.round(resultado.length / 1024)} KB`);
        return resultado;

    } finally {
        await fs.promises.rm(carpeta, { recursive: true, force: true }).catch(() => {});
    }
}

async function crearStickerAnimado(buffer) {
    const carpeta = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bot-api-sticker-'));
    const entrada = path.join(carpeta, 'entrada.mp4');
    const salida = path.join(carpeta, 'sticker.webp');

    try {
        await fs.promises.writeFile(entrada, buffer);

        const filtro = [
            'scale=512:512:force_original_aspect_ratio=decrease',
            'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0',
            'fps=15',
            'format=yuva420p'
        ].join(',');

        await execFileAsync('ffmpeg', [
            '-y', '-i', entrada, '-t', '3',
            '-vf', filtro, '-an',
            '-c:v', 'libwebp', '-lossless', '0',
            '-q:v', '65', '-compression_level', '6',
            '-loop', '0', salida
        ], { maxBuffer: 20 * 1024 * 1024 });

        const resultado = await fs.promises.readFile(salida);
        if (!resultado.length || resultado.length > MAX_STICKER_SIZE) {
            throw new Error(`Sticker animado: ${Math.round(resultado.length / 1024)} KB`);
        }
        return resultado;

    } finally {
        await fs.promises.rm(carpeta, { recursive: true, force: true }).catch(() => {});
    }
}

// ============================================================
// ENVÍOS
// ============================================================

// Modo normal: sticker perfecto + mensaje con firma
async function enviarStickerNormal(sock, jid, buffer, msg, animado, metadatos) {
    const contenido = {
        sticker: buffer,
        mimetype: 'image/webp',
        packname: metadatos.packname,
        author: metadatos.author
    };
    if (animado) contenido.isAnimated = true;

    const stickerMsg = await sock.sendMessage(jid, contenido, { quoted: msg });

    if (metadatos.personalizado) {
        const textoFirma =
            '╭━━〔 🏷️ ' + bold('STICKER INFO') + ' 〕━━⬣\n' +
            '┃\n' +
            '┃ 👤 Creador: ' + obtenerUsuario(msg) + '\n' +
            '┃ 📦 Pack: *' + metadatos.packname + '*\n' +
            '┃ ✍️ Autor: *' + metadatos.author + '*\n' +
            (animado ? '┃ 🎞️ Tipo: Animado\n' : '┃ 🖼️ Tipo: Imagen\n') +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        try {
            await sock.sendMessage(jid, {
                text: textoFirma,
                mentions: [msg.key.participant || msg.key.remoteJid]
            }, { quoted: stickerMsg });
        } catch (e) {}
    }
}

// Modo exif: WebP ffmpeg + EXIF nativo, SIN packname en el mensaje
async function enviarStickerExif(sock, jid, buffer, msg, animado, metadatos) {
    const conExif = await writeExifWebp(buffer, metadatos);
    const final = Buffer.isBuffer(conExif) ? conExif : Buffer.from(conExif);

    console.log(`[STICKER-EXIF] Enviando ${final.length} bytes SIN packname en mensaje`);

    // Solo el buffer con EXIF, nada más
    await sock.sendMessage(jid, { sticker: final }, { quoted: msg });
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'sticker',
    categoria: 'Multimedia',
    alias: ['s', 'stiker'],
    descripcion: 'Stickers HD. .s = normal con firma en mensaje. .s exif = prueba firma nativa.',
    uso: '.s | .s exif (responde a imagen/video)',

    ejecutar: async ({ sock, msg, argumento, responder }) => {
        try {
            const modoExif = /exif|nativa|firma/i.test(String(argumento || '').toLowerCase());

            const mensajeCitado = obtenerMensajeCitado(msg);

            if (!mensajeCitado) {
                await responder.texto(
                    '╭━━〔 🎨 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Responde a una imagen o video\n' +
                    '┃\n' +
                    '┃ 📷 .s → sticker HD + firma\n' +
                    '┃ 🧪 .s exif → prueba firma nativa\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
                return;
            }

            const jid = msg?.key?.remoteJid;
            if (!jid) throw new Error('No se pudo obtener el chat.');

            const tipo = detectarTipo(mensajeCitado);
            if (!tipo) {
                await responder.texto('❌ Responde a una imagen o video válido.');
                return;
            }

            console.log('================================================');
            console.log(`[STICKER] Tipo: ${tipo} | Modo: ${modoExif ? 'EXIF' : 'NORMAL'}`);

            const mensajeCompleto = construirMensajeCompleto(msg, mensajeCitado);
            const buffer = await downloadMediaMessage(mensajeCompleto, 'buffer', {}, { logger: undefined });

            if (!buffer?.length) throw new Error('No se pudo descargar la multimedia.');

            let sticker;
            let animado = false;

            if (tipo === 'video') {
                animado = true;
                sticker = await crearStickerAnimado(buffer);
            } else if (modoExif) {
                sticker = await crearStickerImagenFfmpeg(buffer);
            } else {
                sticker = await crearStickerImagen(buffer);
            }

            if (!sticker?.length) throw new Error('Sticker vacío.');

            const metadatos = obtenerMetadatos(msg);

            if (modoExif) {
                await enviarStickerExif(sock, jid, sticker, msg, animado, metadatos);
            } else {
                await enviarStickerNormal(sock, jid, sticker, msg, animado, metadatos);
            }

            console.log('[STICKER] ✅ Enviado correctamente.');
            console.log('================================================');

        } catch (error) {
            console.error('[STICKER] ❌ Error:', error?.stack || error?.message || error);
            try {
                await responder.texto('❌ No pude crear el sticker: ' + (error?.message || 'error'));
            } catch {}
        }
    }
};