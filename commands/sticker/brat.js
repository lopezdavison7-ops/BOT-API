// commands/sticker/brat.js
// ============================================================
// BOT-API
// COMANDO: BRAT
// ============================================================
// Genera stickers BRAT con color personalizado.
//
// Ejemplos:
// .brat hola
// .brat hola red
// .brat hola blue
// .brat hola pink
// .brat hola #ff0000
//
// Si no se especifica color, se utiliza blanco.
// ============================================================

import fetch from 'node-fetch';
import sharp from 'sharp';
import config from '../../config.js';

// ============================================================
// COLORES DISPONIBLES
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
    rosa: 'pink',
    rosado: 'pink',

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
    const color = String(valor || 'white')
        .trim()
        .toLowerCase();

    // HEX de 6 caracteres
    if (/^#[0-9a-f]{6}$/i.test(color)) {
        return color;
    }

    // HEX corto
    if (/^#[0-9a-f]{3}$/i.test(color)) {
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
        '┃ Genera un sticker BRAT.\n' +
        '┃\n' +
        '┃ 📌 Uso:\n' +
        '┃ *.brat texto color*\n' +
        '┃\n' +
        '┃ 🎨 Ejemplos:\n' +
        '┃ • *.brat hola*\n' +
        '┃ • *.brat hola red*\n' +
        '┃ • *.brat hola blue*\n' +
        '┃ • *.brat hola pink*\n' +
        '┃ • *.brat hola purple*\n' +
        '┃ • *.brat hola #ff0000*\n' +
        '┃\n' +
        '┃ Colores:\n' +
        '┃ white, black, red, blue,\n' +
        '┃ green, yellow, pink, purple,\n' +
        '┃ orange, cyan, gray\n' +
        '┃\n' +
        '╰━━━━━━━━━━━━━━━━⬣'
    );
}

// ============================================================
// DESCARGAR BRAT DESDE LA API
// ============================================================

async function descargarBrat(texto, color, apiKey) {
    const parametros = new URLSearchParams();

    parametros.set('text', texto);
    parametros.set('color', color);

    if (apiKey) {
        parametros.set('apiKey', apiKey);
    }

    const apiUrl =
        `https://apiyosoyyo-ofc.onrender.com/api/brat?${parametros.toString()}`;

    console.log(
        `[BRAT] Generando: "${texto}" | Color: ${color}`
    );

    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            Accept: 'image/png,image/*'
        }
    });

    if (!response.ok) {
        let detalle = '';

        try {
            detalle = await response.text();
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
        response.headers.get('content-type') || '';

    if (!contentType.includes('image')) {
        const respuesta = await response.text();

        throw new Error(
            `La API no devolvió una imagen: ${respuesta.slice(0, 150)}`
        );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length) {
        throw new Error(
            'La API devolvió una imagen vacía.'
        );
    }

    return buffer;
}

// ============================================================
// CONVERTIR A WEBP DE ALTA CALIDAD
// ============================================================

async function convertirASticker(buffer) {
    const TAMANO_MAXIMO = 500 * 1024;

    // Intentamos mantener la mayor calidad posible.
    const calidades = [
        100,
        95,
        90,
        85,
        80,
        75,
        70
    ];

    let resultado = null;

    for (const quality of calidades) {
        resultado = await sharp(buffer)
            .rotate()

            // Tamaño estándar de sticker de WhatsApp.
            .resize(512, 512, {
                fit: 'contain',
                background: {
                    r: 0,
                    g: 0,
                    b: 0,
                    alpha: 0
                },
                withoutEnlargement: false
            })

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

        if (resultado.length <= TAMANO_MAXIMO) {
            return resultado;
        }
    }

    // Último intento para imágenes especialmente pesadas.
    resultado = await sharp(buffer)
        .rotate()
        .resize(512, 512, {
            fit: 'contain',
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
            },
            withoutEnlargement: false
        })
        .webp({
            quality: 60,
            effort: 6
        })
        .toBuffer();

    if (resultado.length > TAMANO_MAXIMO) {
        throw new Error(
            `El sticker es demasiado pesado (${Math.round(
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

    alias: [],

    descripcion:
        'Genera stickers BRAT con color personalizado.',

    ejecutar: async ({
        msg,
        responder,
        argumento,
        sock
    }) => {
        try {
            const entrada = String(
                argumento || ''
            ).trim();

            // =================================================
            // SIN ARGUMENTOS
            // =================================================

            if (!entrada) {
                await responder.texto(
                    textoAyuda()
                );

                return;
            }

            // =================================================
            // SEPARAR TEXTO Y COLOR
            //
            // .brat hola
            // .brat hola red
            // .brat hola mundo blue
            //
            // El ÚLTIMO elemento es el color.
            // =================================================

            const partes = entrada.split(/\s+/);

            let colorSolicitado = 'white';
            let texto = entrada;

            const posibleColor =
                partes[partes.length - 1];

            const colorDetectado =
                obtenerColor(posibleColor);

            // Si la última palabra es un color,
            // la quitamos del texto.
            if (colorDetectado) {
                colorSolicitado =
                    posibleColor;

                partes.pop();

                texto = partes.join(' ').trim();
            }

            // =================================================
            // VALIDAR TEXTO
            // =================================================

            if (!texto) {
                await responder.texto(
                    textoAyuda()
                );

                return;
            }

            if (texto.length > 50) {
                await responder.texto(
                    '❌ *BRAT*\n\n' +
                    'El texto debe tener como máximo 50 caracteres.'
                );

                return;
            }

            // =================================================
            // VALIDAR COLOR
            // =================================================

            const color =
                obtenerColor(colorSolicitado);

            if (!color) {
                await responder.texto(
                    '❌ *Color no válido.*\n\n' +
                    '🎨 Usa uno de estos colores:\n' +
                    'white, black, red, blue,\n' +
                    'green, yellow, pink, purple,\n' +
                    'orange, cyan, gray\n\n' +
                    'También puedes usar HEX:\n' +
                    '*.brat hola #ff0000*'
                );

                return;
            }

            // =================================================
            // API KEY
            // =================================================

            const apiKey =
                config?.YO_SOY_YO_API_KEY ||
                config?.YT_API_KEY ||
                process.env.YO_SOY_YO_API_KEY ||
                process.env.YT_API_KEY;

            // =================================================
            // GENERAR IMAGEN
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

            // =================================================
            // CONVERTIR A STICKER
            // =================================================

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
                `[BRAT] ✅ Enviado correctamente | Color: ${color}`
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