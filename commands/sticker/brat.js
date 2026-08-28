// commands/sticker/brat.js
// ============================================================
// BOT-API
// COMANDO: BRAT
// ============================================================
// Genera stickers BRAT con color seleccionable.
// Ejemplos:
// .brat hola
// .brat hola mundo|red
// .brat hola|blue
// .brat hola|#ff0000
// ============================================================

import fetch from 'node-fetch';
import sharp from 'sharp';
import config from '../../config.js';

// ============================================================
// COLORES PERMITIDOS
// ============================================================

const COLORES = {
    white: 'white',
    blanco: 'white',

    black: 'black',
    negro: 'black',

    red: 'red',
    rojo: 'red',

    blue: 'blue',
    azul: 'blue',

    green: 'green',
    verde: 'green',

    yellow: 'yellow',
    amarillo: 'yellow',

    pink: 'pink',
    rosado: 'pink',
    rosa: 'pink',

    purple: 'purple',
    morado: 'purple',
    violeta: 'purple',

    orange: 'orange',
    naranja: 'orange',

    cyan: 'cyan',
    celeste: 'cyan',

    gray: 'gray',
    grey: 'gray',
    gris: 'gray'
};

// ============================================================
// OBTENER COLOR
// ============================================================

function obtenerColor(valor) {
    const color = String(
        valor || 'white'
    )
        .trim()
        .toLowerCase();

    // Permite HEX:
    // #ffffff
    // #ff0000
    // #123abc
    if (/^#[0-9a-f]{6}$/i.test(color)) {
        return color;
    }

    if (
        /^#[0-9a-f]{3}$/i.test(color)
    ) {
        return color;
    }

    return COLORES[color] || null;
}

// ============================================================
// AYUDA
// ============================================================

function textoAyuda() {
    return (
        '╭━━〔 🟩 𝐁𝐑𝐀𝐓 〕━━⬣\n' +
        '┃\n' +
        '┃ Escribe el texto y opcionalmente\n' +
        '┃ el color separado por |.\n' +
        '┃\n' +
        '┃ 📌 Ejemplos:\n' +
        '┃ • *.brat hola*\n' +
        '┃ • *.brat hola|red*\n' +
        '┃ • *.brat hola|blue*\n' +
        '┃ • *.brat hola|pink*\n' +
        '┃ • *.brat hola|#ff0000*\n' +
        '┃\n' +
        '┃ 🎨 Colores:\n' +
        '┃ white, black, red, blue,\n' +
        '┃ green, yellow, pink, purple,\n' +
        '┃ orange, cyan, gray\n' +
        '┃\n' +
        '╰━━━━━━━━━━━━━━━━⬣'
    );
}

// ============================================================
// DESCARGAR IMAGEN DE LA API
// ============================================================

async function descargarBrat(
    texto,
    color,
    apiKey
) {
    const parametros =
        new URLSearchParams({
            text: texto,
            color: color
        });

    if (apiKey) {
        parametros.set(
            'apiKey',
            apiKey
        );
    }

    const apiUrl =
        `https://apiyosoyyo-ofc.onrender.com/api/brat?${parametros.toString()}`;

    console.log(
        `[BRAT] Solicitando sticker. Color: ${color}`
    );

    const response =
        await fetch(apiUrl, {
            method: 'GET',
            headers: {
                Accept: 'image/png,image/*'
            }
        });

    if (!response.ok) {
        let detalle = '';

        try {
            detalle =
                await response.text();
        } catch {}

        throw new Error(
            `La API respondió con ${response.status}` +
            (
                detalle
                    ? `: ${detalle.slice(0, 150)}`
                    : ''
            )
        );
    }

    const contentType =
        response.headers.get(
            'content-type'
        ) || '';

    if (
        !contentType.includes('image')
    ) {
        const respuesta =
            await response.text();

        throw new Error(
            `La API no devolvió una imagen: ${respuesta.slice(
                0,
                150
            )}`
        );
    }

    const arrayBuffer =
        await response.arrayBuffer();

    const buffer =
        Buffer.from(arrayBuffer);

    if (!buffer.length) {
        throw new Error(
            'La API devolvió una imagen vacía.'
        );
    }

    return buffer;
}

// ============================================================
// OPTIMIZAR STICKER
// ============================================================

async function convertirASticker(
    buffer
) {
    // Intentamos máxima calidad primero.
    const calidades = [
        100,
        95,
        90,
        85,
        80,
        75,
        70
    ];

    let resultado;

    for (
        const quality of calidades
    ) {
        resultado =
            await sharp(buffer)
                .rotate()

                // No usamos "cover" porque puede
                // recortar partes del BRAT.
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
                    quality,
                    effort: 6,
                    smartSubsample: true
                })

                .toBuffer();

        console.log(
            `[BRAT] Calidad ${quality}: ${Math.round(
                resultado.length / 1024
            )} KB`
        );

        if (
            resultado.length <=
            500 * 1024
        ) {
            return resultado;
        }
    }

    if (!resultado) {
        throw new Error(
            'No se pudo convertir el BRAT a WebP.'
        );
    }

    // Último intento.
    resultado =
        await sharp(buffer)
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
                quality: 60,
                effort: 6
            })
            .toBuffer();

    if (
        resultado.length >
        500 * 1024
    ) {
        throw new Error(
            `El sticker sigue siendo demasiado pesado (${Math.round(
                resultado.length / 1024
            )} KB).`
        );
    }

    return resultado;
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'brat',

    categoria: 'Multimedia',

    alias: [
        'bratwhite'
    ],

    descripcion:
        'Genera stickers BRAT con color personalizado.',

    ejecutar: async ({
        msg,
        responder,
        argumento,
        sock
    }) => {

        try {
            const entrada =
                String(
                    argumento || ''
                ).trim();

            if (!entrada) {
                await responder.texto(
                    textoAyuda()
                );

                return;
            }

            // =================================================
            // SEPARAR TEXTO Y COLOR
            // Formato:
            // texto|color
            // =================================================

            let texto = entrada;
            let colorSolicitado = 'white';

            if (
                entrada.includes('|')
            ) {
                const partes =
                    entrada.split('|');

                texto =
                    partes
                        .shift()
                        ?.trim() || '';

                colorSolicitado =
                    partes
                        .join('|')
                        .trim() ||
                    'white';
            }

            // =================================================
            // VALIDAR TEXTO
            // =================================================

            if (
                !texto ||
                texto.length > 50
            ) {
                await responder.texto(
                    '❌ *BRAT*\n\n' +
                    'El texto debe tener entre 1 y 50 caracteres.\n\n' +
                    '📌 Ejemplo:\n' +
                    '*.brat hola mundo|red*'
                );

                return;
            }

            // =================================================
            // VALIDAR COLOR
            // =================================================

            const color =
                obtenerColor(
                    colorSolicitado
                );

            if (!color) {
                await responder.texto(
                    '❌ *Color no válido.*\n\n' +
                    '🎨 Colores disponibles:\n' +
                    'white, black, red, blue,\n' +
                    'green, yellow, pink, purple,\n' +
                    'orange, cyan, gray\n\n' +
                    'También puedes usar HEX:\n' +
                    '*.brat hola|#ff0000*'
                );

                return;
            }

            // =================================================
            // API KEY
            // =================================================

            const apiKey =
                config.YO_SOY_YO_API_KEY ||
                config.YT_API_KEY ||
                process.env.YO_SOY_YO_API_KEY ||
                process.env.YT_API_KEY;

            // =================================================
            // GENERAR
            // =================================================

            const pngBuffer =
                await descargarBrat(
                    texto,
                    color,
                    apiKey
                );

            console.log(
                `[BRAT] Imagen recibida: ${Math.round(
                    pngBuffer.length / 1024
                )} KB`
            );

            const webpBuffer =
                await convertirASticker(
                    pngBuffer
                );

            console.log(
                `[BRAT] Sticker final: ${Math.round(
                    webpBuffer.length / 1024
                )} KB`
            );

            // =================================================
            // ENVIAR
            // =================================================

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    sticker: webpBuffer
                },
                {
                    quoted: msg
                }
            );

            console.log(
                `[BRAT] ✓ Sticker enviado. Color: ${color}`
            );

        } catch (error) {

            console.error(
                '[BRAT] ❌ Error:',
                error?.stack ||
                error?.message ||
                error
            );

            try {
                await responder.texto(
                    '╭━━〔 ❌ 𝐁𝐑𝐀𝐓 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No se pudo generar el sticker.\n' +
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