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

function obtenerUsuario(msg) {
    const jid =
        msg?.key?.participant ||
        msg?.key?.remoteJid ||
        '';

    const numero = String(jid)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');

    return numero
        ? `@${numero}`
        : '@usuario';
}

function obtenerMetadatos(msg) {
    const usuario = obtenerUsuario(msg);

    return {
        packname: 'BOT-API',
        author: `POR USUARIO ${usuario}`,
        categories: ['🤖']
    };
}

async function ejecutarFFmpeg(
    entrada,
    salida,
    fps,
    calidad,
    duracion = MAX_GIF_SECONDS
) {
    const filtro = [
        'scale=384:384:force_original_aspect_ratio=decrease',
        'pad=384:384:(ow-iw)/2:(oh-ih)/2:color=black@0',
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
            String(duracion),
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
            maxBuffer: 20 * 1024 * 1024
        }
    );
}

async function crearStickerAnimado(buffer) {
    const carpeta = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'bot-api-sticker-')
    );

    const entrada = path.join(carpeta, 'entrada.mp4');
    const salida = path.join(carpeta, 'sticker.webp');

    try {
        await fs.promises.writeFile(entrada, buffer);

        await ejecutarFFmpeg(
            entrada,
            salida,
            10,
            75
        );

        let resultado =
            await fs.promises.readFile(salida);

        if (resultado.length > MAX_STICKER_SIZE) {
            await ejecutarFFmpeg(
                entrada,
                salida,
                8,
                60
            );

            resultado =
                await fs.promises.readFile(salida);
        }

        if (resultado.length > MAX_STICKER_SIZE) {
            await ejecutarFFmpeg(
                entrada,
                salida,
                6,
                45,
                2
            );

            resultado =
                await fs.promises.readFile(salida);
        }

        if (!resultado.length) {
            throw new Error(
                'El sticker animado quedó vacío.'
            );
        }

        if (resultado.length > MAX_STICKER_SIZE) {
            throw new Error(
                `El sticker pesa ${Math.round(
                    resultado.length / 1024
                )} KB.`
            );
        }

        return resultado;

    } finally {
        await fs.promises.rm(
            carpeta,
            {
                recursive: true,
                force: true
            }
        ).catch(() => {});
    }
}

async function crearStickerImagen(buffer) {
    let resultado = await sharp(buffer)
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

    if (resultado.length > MAX_STICKER_SIZE) {
        resultado = await sharp(buffer)
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
                quality: 70
            })
            .toBuffer();
    }

    if (!resultado.length) {
        throw new Error(
            'No se pudo crear el sticker.'
        );
    }

    return resultado;
}

function obtenerMensajeCitado(msg) {
    return msg?.message
        ?.extendedTextMessage
        ?.contextInfo
        ?.quotedMessage;
}

function construirMensajeCompleto(
    msg,
    mensajeCitado
) {
    return {
        key: {
            remoteJid:
                msg?.key?.remoteJid,
            fromMe: false,
            id: msg?.key?.id,
            participant:
                msg?.key?.participant
        },
        message: mensajeCitado
    };
}

function detectarTipo(mensaje) {
    if (mensaje?.imageMessage) {
        return 'imagen';
    }

    if (mensaje?.videoMessage) {
        return 'video';
    }

    if (mensaje?.documentMessage) {
        const mimetype =
            mensaje.documentMessage?.mimetype || '';

        if (mimetype.startsWith('image/')) {
            return 'imagen';
        }

        if (mimetype.startsWith('video/')) {
            return 'video';
        }
    }

    return null;
}

async function enviarSticker(
    sock,
    jid,
    buffer,
    msg,
    animado
) {
    const metadatos =
        obtenerMetadatos(msg);

    const contenido = {
        sticker: buffer,
        packname: metadatos.packname,
        author: metadatos.author,
        categories: metadatos.categories
    };

    if (animado) {
        contenido.isAnimated = true;
    }

    console.log(
        '[STICKER] Creador: BOT-API'
    );

    console.log(
        `[STICKER] ${metadatos.author}`
    );

    await sock.sendMessage(
        jid,
        contenido,
        {
            quoted: msg
        }
    );
}

export default {
    nombre: 'sticker',

    categoria: 'Multimedia',

    alias: [
        's',
        'stiker'
    ],

    descripcion:
        'Convierte imágenes y videos en stickers.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        try {
            const mensajeCitado =
                obtenerMensajeCitado(msg);

            if (!mensajeCitado) {
                await responder.texto(
                    '╭━━〔 🎨 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Responde a una imagen o video\n' +
                    '┃    usando *.s*\n' +
                    '┃\n' +
                    '┃ 📷 Imagen → sticker\n' +
                    '┃ 🎞️ Video → sticker animado\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            const jid =
                msg?.key?.remoteJid;

            if (!jid) {
                throw new Error(
                    'No se pudo obtener el chat.'
                );
            }

            const tipo =
                detectarTipo(
                    mensajeCitado
                );

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

            console.log(
                '================================================'
            );

            console.log(
                `[STICKER] Tipo: ${tipo}`
            );

            console.log(
                `[STICKER] Usuario: ${obtenerUsuario(msg)}`
            );

            const mensajeCompleto =
                construirMensajeCompleto(
                    msg,
                    mensajeCitado
                );

            console.log(
                '[STICKER] ⬇️ Descargando multimedia...'
            );

            const buffer =
                await downloadMediaMessage(
                    mensajeCompleto,
                    'buffer',
                    {},
                    {
                        logger: undefined
                    }
                );

            if (
                !buffer ||
                !Buffer.isBuffer(buffer) ||
                !buffer.length
            ) {
                throw new Error(
                    'No se pudo descargar la multimedia.'
                );
            }

            console.log(
                `[STICKER] Multimedia: ${Math.round(
                    buffer.length / 1024
                )} KB`
            );

            let sticker;
            let animado = false;

            if (tipo === 'video') {
                animado = true;

                console.log(
                    '[STICKER] 🎞️ Creando sticker animado...'
                );

                sticker =
                    await crearStickerAnimado(
                        buffer
                    );

            } else {
                console.log(
                    '[STICKER] 🖼️ Creando sticker...'
                );

                sticker =
                    await crearStickerImagen(
                        buffer
                    );
            }

            if (
                !sticker ||
                !Buffer.isBuffer(sticker) ||
                !sticker.length
            ) {
                throw new Error(
                    'El sticker generado está vacío.'
                );
            }

            console.log(
                `[STICKER] Tamaño: ${Math.round(
                    sticker.length / 1024
                )} KB`
            );

            await enviarSticker(
                sock,
                jid,
                sticker,
                msg,
                animado
            );

            console.log(
                '[STICKER] ✅ Sticker enviado correctamente.'
            );

            console.log(
                '================================================'
            );

        } catch (error) {

            console.error(
                '[STICKER] ❌ Error:',
                error?.stack ||
                error?.message ||
                error
            );

            try {
                await responder.texto(
                    '╭━━〔 ❌ 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No pude crear el sticker.\n' +
                    '┃\n' +
                    `┃ ⚠️ ${
                        error?.message ||
                        'Error desconocido.'
                    }\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            } catch {}
        }
    }
};
