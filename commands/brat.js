import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

// ============================================================
// CONFIGURACIÓN
// ============================================================

const FONT =
    '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans-Bold.ttf';

// ============================================================
// DIVIDIR TEXTO
// ============================================================

function dividirTexto(texto) {

    const palabras =
        texto.trim().split(/\s+/);

    const lineas = [];

    let linea = '';

    for (const palabra of palabras) {

        const prueba =
            linea
                ? `${linea} ${palabra}`
                : palabra;

        if (prueba.length <= 14) {

            linea = prueba;

        } else {

            if (linea) {
                lineas.push(linea);
            }

            linea = palabra;
        }
    }

    if (linea) {
        lineas.push(linea);
    }

    return lineas;
}

// ============================================================
// ESCAPAR RUTA PARA FFMPEG
// ============================================================

function escaparRuta(ruta) {

    return String(ruta)
        .replace(/\\/g, '\\\\')
        .replace(/:/g, '\\:');
}

// ============================================================
// CREAR STICKER
// ============================================================

async function crearSticker(texto) {

    const carpeta =
        await fs.mkdtemp(
            path.join(
                os.tmpdir(),
                'brat-'
            )
        );

    const archivoTexto =
        path.join(
            carpeta,
            'texto.txt'
        );

    const salida =
        path.join(
            carpeta,
            'sticker.webp'
        );

    try {

        // ----------------------------------------------------
        // COMPROBAR FUENTE
        // ----------------------------------------------------

        await fs.access(FONT);

        // ----------------------------------------------------
        // PREPARAR TEXTO
        // ----------------------------------------------------

        const lineas =
            dividirTexto(texto);

        const textoFinal =
            lineas.join('\n');

        await fs.writeFile(
            archivoTexto,
            textoFinal,
            'utf8'
        );

        // ----------------------------------------------------
        // TAMAÑO DEL TEXTO
        // ----------------------------------------------------

        let tamaño = 82;

        if (lineas.length >= 3) {
            tamaño = 64;
        }

        if (lineas.length >= 5) {
            tamaño = 52;
        }

        // ----------------------------------------------------
        // RUTAS
        // ----------------------------------------------------

        const fuenteFFmpeg =
            escaparRuta(FONT);

        const textoFFmpeg =
            escaparRuta(archivoTexto);

        // ----------------------------------------------------
        // FILTRO FFMPEG
        // IMPORTANTE: drawtext=
        // ----------------------------------------------------

        const filtro =
            `drawtext=` +
            `fontfile=${fuenteFFmpeg}:` +
            `textfile=${textoFFmpeg}:` +
            `fontcolor=black:` +
            `fontsize=${tamaño}:` +
            `x=(w-text_w)/2:` +
            `y=(h-text_h)/2:` +
            `line_spacing=8:` +
            `borderw=0`;

        console.log(
            '[BRAT] Ejecutando FFmpeg...'
        );

        console.log(
            `[BRAT] Fuente: ${FONT}`
        );

        // ----------------------------------------------------
        // GENERAR WEBP
        // ----------------------------------------------------

        await execFileAsync(
            'ffmpeg',
            [
                '-y',

                '-f',
                'lavfi',

                '-i',
                'color=c=white:s=512x512',

                '-vf',
                filtro,

                '-frames:v',
                '1',

                '-c:v',
                'libwebp',

                '-lossless',
                '1',

                salida
            ],
            {
                maxBuffer:
                    10 * 1024 * 1024
            }
        );

        // ----------------------------------------------------
        // LEER RESULTADO
        // ----------------------------------------------------

        const buffer =
            await fs.readFile(
                salida
            );

        if (
            !Buffer.isBuffer(buffer) ||
            buffer.length === 0
        ) {

            throw new Error(
                'FFmpeg generó un sticker vacío.'
            );
        }

        console.log(
            `[BRAT] Sticker generado: ${buffer.length} bytes`
        );

        return buffer;

    } finally {

        // ----------------------------------------------------
        // LIMPIAR TEMPORALES
        // ----------------------------------------------------

        try {

            await fs.rm(
                carpeta,
                {
                    recursive: true,
                    force: true
                }
            );

        } catch {
            // Ignorar error de limpieza.
        }
    }
}

// ============================================================
// COMANDO BRAT
// ============================================================

export default {

    nombre: 'brat',

    categoria: 'Multimedia',

    alias: [],

    descripcion:
        'Crea un sticker BRAT con texto.',

    ejecutar: async ({
        msg,
        responder,
        argumento,
        sock
    }) => {

        try {

            const texto =
                String(argumento || '')
                    .trim();

            if (!texto) {

                await responder.texto(
                    `❌ *BRAT*\n\n` +
                    `Escribe un texto.\n\n` +
                    `📌 Ejemplo:\n` +
                    `*.brat hola*`
                );

                return;
            }

            console.log(
                `[BRAT] Generando: ${texto}`
            );

            // ------------------------------------------------
            // GENERAR
            // ------------------------------------------------

            const sticker =
                await crearSticker(texto);

            // ------------------------------------------------
            // ENVIAR
            // ------------------------------------------------

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
                '[BRAT] ✓ Sticker enviado correctamente.'
            );

        } catch (error) {

            console.error(
                '[BRAT] Error:',
                error
            );

            try {

                await responder.texto(
                    `❌ *BRAT*\n\n` +
                    `No se pudo crear el sticker.\n\n` +
                    `🍀 Inténtalo nuevamente.`
                );

            } catch (errorTexto) {

                console.error(
                    '[BRAT] Error enviando aviso:',
                    errorTexto
                );
            }
        }
    }
};
