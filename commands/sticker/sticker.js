// commands/sticker/sticker.js
// ============================================================
// BOT-API - COMANDO: STICKER / S / STIKER
// ============================================================
// Stickers HD con firma visible vía mensaje automático.
// Método garantizado: sticker perfecto + mensaje con firma.
// ============================================================

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { downloadMediaMessage } from 'baileys';

const execFileAsync = promisify(execFile);

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

function bold(t) {
    return String(t).replace(/[A-Za-z]/g, c =>
        String.fromCodePoint((c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97) + c.charCodeAt(0))
    );
}

// ============================================================
// METADATOS PERSONALIZADOS (.setmeta)
// ============================================================

function obtenerMetaPersonalizada(jid) {
    try {
        if (!fs.existsSync(RUTA_META)) return null;
        const db = JSON.parse(fs.readFileSync(RUTA_META, 'utf8'));
        const numero = jidANumero(jid);
        return db[numero] || null;
    } catch (e) {
        return null;
    }
}

function obtenerMetadatos(msg) {
    const jid = msg?.key?.participant || msg?.key?.remoteJid || '';
    const usuario = obtenerUsuario(msg);
    const personalizada = obtenerMetaPersonalizada(jid);

    if (personalizada?.stickerPackName && personalizada?.stickerPackAuthor) {
        console.log(`[STICKER] 🏷️ Firma personalizada: ${personalizada.stickerPackName} • ${personalizada.stickerPackAuthor}`);
        return {
            packname: personalizada.stickerPackName,
            author: personalizada.stickerPackAuthor,
            personalizado: true
        };
    }

    console.log('[STICKER] 🏷️ Firma por defecto');
    return {
        packname: 'BOT-API',
        author: `POR USUARIO ${usuario}`,
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
// CREAR STICKER (sin EXIF para evitar sticker gris)
// ============================================================

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

        let resultado = await fs.promises.readFile(salida);

        if (resultado.length > MAX_STICKER_SIZE) {
            await execFileAsync('ffmpeg', ['-y', '-i', entrada, '-t', '3', '-vf', filtro, '-an', '-c:v', 'libwebp', '-lossless', '0', '-q:v', '55', '-loop', '0', salida], { maxBuffer: 20 * 1024 * 1024 });
            resultado = await fs.promises.readFile(salida);
        }

        if (resultado.length > MAX_STICKER_SIZE) {
            await execFileAsync('ffmpeg', ['-y', '-i', entrada, '-t', '2.5', '-vf', filtro, '-an', '-c:v', 'libwebp', '-lossless', '0', '-q:v', '45', '-loop', '0', salida], { maxBuffer: 20 * 1024 * 1024 });
            resultado = await fs.promises.readFile(salida);
        }

        if (!resultado.length || resultado.length > MAX_STICKER_SIZE) {
            throw new Error(`Sticker animado: ${Math.round(resultado.length / 1024)} KB`);
        }

        return resultado;

    } finally {
        await fs.promises.rm(carpeta, { recursive: true, force: true }).catch(() => {});
    }
}

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
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 60, effort: 6 })
        .toBuffer();

    if (resultado.length > MAX_STICKER_SIZE) {
        throw new Error(`Imagen pesada: ${Math.round(resultado.length / 1024)} KB`);
    }

    return resultado;
}

// ============================================================
// ENVÍO DEL STICKER + MENSAJE CON FIRMA
// ============================================================

async function enviarSticker(sock, jid, buffer, msg, animado, metadatos) {
    // 1. Enviar sticker SIN EXIF (método que SIEMPRE funciona)
    const contenido = {
        sticker: buffer,
        mimetype: 'image/webp',
        packname: metadatos.packname,
        author: metadatos.author
    };

    if (animado) contenido.isAnimated = true;

    const stickerMsg = await sock.sendMessage(jid, contenido, { quoted: msg });

    // 2. Si tiene metadatos personalizados, enviar mensaje con firma
    if (metadatos.personalizado) {
        const usuario = obtenerUsuario(msg);
        const textoFirma = 
            '╭━━〔 🏷️ ' + bold('STICKER INFO') + ' 〕━━⬣\n' +
            '┃\n' +
            '┃ 👤 Creador: ' + usuario + '\n' +
            '┃ 📦 Pack: *' + metadatos.packname + '*\n' +
            '┃ ✍️ Autor: *' + metadatos.author + '*\n' +
            (animado ? '┃ 🎞️ Tipo: Animado\n' : '┃ 🖼️ Tipo: Imagen\n') +
            '┃\n' +
            '┃ 💡 Configura los tuyos con:\n' +
            '┃ ➪ .setmeta Pack | Autor\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        try {
            await sock.sendMessage(jid, {
                text: textoFirma,
                mentions: [msg.key.participant || msg.key.remoteJid]
            }, { quoted: stickerMsg });
        } catch (e) {
            console.error('[STICKER] Error enviando firma:', e.message);
        }
    }
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'sticker',
    categoria: 'Multimedia',
    alias: ['s', 'stiker'],
    descripcion: 'Convierte imágenes y videos en stickers HD con firma personalizada.',
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
                    '┃ 🏷️ Pon tu firma:\n' +
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

            const metadatos = obtenerMetadatos(msg);

            await enviarSticker(sock, jid, sticker, msg, animado, metadatos);

            console.log('[STICKER] ✅ Sticker + firma enviados correctamente.');
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