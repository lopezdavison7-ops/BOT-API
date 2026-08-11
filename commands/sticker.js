import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import {
    downloadMediaMessage
} from 'baileys';

const execFileAsync =
    promisify(execFile);

// ============================================================
// CONFIGURACIÓN
// ============================================================

const MAX_GIF_SECONDS = 3;
const MAX_STICKER_SIZE = 500 * 1024;

// ============================================================
// EJECUTAR FFMPEG
// ============================================================

async function ejecutarFFmpeg(
    entrada,
    salida,
    fps,
    calidad
) {

    const filtro =
        [
            `scale=384:384:force_original_aspect_ratio=decrease`,
            `pad=384:384:(ow-iw)/2:(oh-ih)/2:color=black@0`,
            `fps=${fps}`,
            'format=yuva420p'
        ].join(',');

    await execFileAsync(
        'ffmpeg',
        [
            '-y',

            '-i',
            entrada,

            '-t',
            String(MAX_GIF_SECONDS),

            '-vf',
            filtro,

            '-an',

            '-c:v',
            'libwebp',

            '-lossless',
            '0',

            '-q:v',
            String(calidad),

            '-compression_level',
            '6',

            salida
        ],
        {
            maxBuffer:
                20 * 1024 * 1024
        }
    );
}

// ============================================================
// CREAR STICKER ANIMADO
// ============================================================

async function crearStickerAnimado(
    buffer
) {

    const carpeta =
        await fs.promises.mkdtemp(
            path.join(
                os.tmpdir(),
                'bot-api-sticker-'
            )
        );

    const entrada =
        path.join(
            carpeta,
            'entrada.mp4'
        );

    const salida =
        path.join(
            carpeta,
            'sticker.webp'
        );

    try {

        await fs.promises.writeFile(
            entrada,
            buffer
        );

        // ----------------------------------------------------
        // PRIMERA COMPRESIÓN
        // ----------------------------------------------------

        console.log(
            '[STICKER] 🎞️ Comprimiendo GIF...'
        );

        await ejecutarFFmpeg(
            entrada,
            salida,
            10,
            75
        );

        let resultado =
            await fs.promises.readFile(
                salida
            );

        console.log(
            `[STICKER] Tamaño inicial: ${resultado.length} bytes`
        );

        // ----------------------------------------------------
        // SI ES MUY PESADO, COMPRIMIR MÁS
        // ----------------------------------------------------

        if (
            resultado.length >
            MAX_STICKER_SIZE
        ) {

            console.log(
                '[STICKER] ⚠️ Sticker pesado. Comprimiendo nuevamente...'
            );

            await ejecutarFFmpeg(
                entrada,
                salida,
                8,
                60
            );

            resultado =
                await fs.promises.readFile(
                    salida
                );

            console.log(
                `[STICKER] Tamaño segunda compresión: ${resultado.length} bytes`
            );
        }

        // ----------------------------------------------------
        // ÚLTIMO INTENTO
        // ----------------------------------------------------

        if (
            resultado.length >
            MAX_STICKER_SIZE
        ) {

            console.log(
                '[STICKER] ⚠️ Todavía pesado. Aplicando compresión máxima...'
            );

            const filtroFinal =
                [
                    'scale=320:320:force_original_aspect_ratio=decrease',
                    'pad=320:320:(ow-iw)/2:(oh-ih)/2:color=black@0',
                    'fps=6',
                    'format=yuva420p'
                ].join(',');

            await execFileAsync(
                'ffmpeg',
                [
                    '-y',

                    '-i',
                    entrada,

                    '-t',
                    '2',

                    '-vf',
                    filtroFinal,

                    '-an',

                    '-c:v',
                    'libwebp',

                    '-lossless',
                    '0',

                    '-q:v',
                    '45',

                    '-compression_level',
                    '6',

                    salida
                ],
                {
                    maxBuffer:
                        20 * 1024 * 1024
                }
            );

            resultado =
                await fs.promises.readFile(
                    salida
                );

            console.log(
                `[STICKER] Tamaño final: ${resultado.length} bytes`
            );
        }

        if (
            !resultado.length
        ) {

            throw new Error(
                'El sticker animado quedó vacío.'
            );
        }

        if (
            resultado.length >
            MAX_STICKER_SIZE
        ) {

            throw new Error(
                `El GIF sigue siendo demasiado pesado (${Math.round(resultado.length / 1024)} KB).`
            );
        }

        console.log(
            `[STICKER] ✓ Sticker animado listo: ${Math.round(resultado.length / 1024)} KB`
        );

        return resultado;

    } finally {

        try {

            await fs.promises.rm(
                carpeta,
                {
                    recursive: true,
                    force: true
                }
            );

        } catch {}
    }
}

// ============================================================
// CREAR STICKER DE IMAGEN
// ============================================================

async function crearStickerImagen(
    buffer
) {

    return sharp(buffer)
        .rotate()
        .resize(
            512,
            512,
            {
                fit: 'contain',

                background: {
                    r: 0,
                    g: 0,
                    b: 0,
                    alpha: 0
                }
            }
        )
        .webp({
            quality: 90
        })
        .toBuffer();
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'sticker',

    categoria: 'Multimedia',

    alias: [
        's',
        'stiker'
    ],

    descripcion:
        'Convierte imágenes y GIFs en stickers.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        try {

            // ====================================================
            // MENSAJE CITADO
            // ====================================================

            const contexto =
                msg.message
                    ?.extendedTextMessage
                    ?.contextInfo;

            const mensajeCitado =
                contexto?.quotedMessage;

            if (!mensajeCitado) {

                await responder.texto(
                    `❌ *STICKER*\n\n` +
                    `Responde a una imagen o GIF con *.s*\n\n` +
                    `📷 Imagen → *.s*\n` +
                    `🎞️ GIF → *.s*`
                );

                return;
            }

            // ====================================================
            // CONSTRUIR MENSAJE
            // ====================================================

            const mensajeCompleto = {

                key: {

                    remoteJid:
                        msg.key.remoteJid,

                    id:
                        contexto.stanzaId,

                    participant:
                        contexto.participant
                },

                message:
                    mensajeCitado
            };

            // ====================================================
            // DETECTAR MEDIO
            // ====================================================

            const imagen =
                mensajeCitado.imageMessage;

            const video =
                mensajeCitado.videoMessage;

            const esImagen =
                !!imagen;

            const esGif =
                !!(
                    video &&
                    (
                        video.gifPlayback === true ||
                        video.mimetype === 'image/gif'
                    )
                );

            if (
                !esImagen &&
                !esGif
            ) {

                await responder.texto(
                    `❌ *STICKER*\n\n` +
                    `Ese mensaje no contiene una imagen o GIF.\n\n` +
                    `📷 Responde a una imagen\n` +
                    `🎞️ o a un GIF.`
                );

                return;
            }

            // ====================================================
            // DESCARGAR
            // ====================================================

            console.log(
                esGif
                    ? '[STICKER] 🎞️ GIF detectado.'
                    : '[STICKER] 🖼️ Imagen detectada.'
            );

            const buffer =
                await downloadMediaMessage(
                    mensajeCompleto,
                    'buffer',
                    {},
                    {
                        logger: undefined,

                        reuploadRequest:
                            sock.updateMediaMessage
                    }
                );

            if (
                !Buffer.isBuffer(buffer) ||
                buffer.length === 0
            ) {

                throw new Error(
                    'No se pudo descargar el archivo de WhatsApp.'
                );
            }

            console.log(
                `[STICKER] Archivo recibido: ${Math.round(buffer.length / 1024)} KB`
            );

            // ====================================================
            // GENERAR
            // ====================================================

            let sticker;

            if (esGif) {

                sticker =
                    await crearStickerAnimado(
                        buffer
                    );

            } else {

                sticker =
                    await crearStickerImagen(
                        buffer
                    );
            }

            // ====================================================
            // ENVIAR
            // ====================================================

            console.log(
                `[STICKER] Subiendo sticker: ${Math.round(sticker.length / 1024)} KB`
            );

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    sticker
                },
                {
                    quoted: msg
                }
            );

            console.log(
                '[STICKER] ✓ Sticker enviado correctamente.'
            );

        } catch (error) {

            console.error(
                '[COMANDO sticker] Error:',
                error
            );

            try {

                await responder.texto(
                    `❌ *STICKER*\n\n` +
                    `No se pudo crear el sticker.\n\n` +
                    `⚠️ ${error.message}`
                );

            } catch (errorTexto) {

                console.error(
                    '[COMANDO sticker] Error enviando aviso:',
                    errorTexto
                );
            }
        }
    }
};
