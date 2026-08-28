// commands/sticker/brat.js
// ============================================================
// BOT-API
// COMANDO: BRAT
// ============================================================
// Genera stickers BRAT usando la API de YO SOY YO.
//
// USO:
//
// .brat hola
// .brat hola red
// .brat hola blue
// .brat hola mundo pink
// .brat hola #ff0000
//
// El último argumento puede ser un color.
// Si no se especifica color, se utiliza blanco.
//
// IMPORTANTE:
// La API /api/brat devuelve JSON con data.url.
// Primero obtenemos ese JSON y después descargamos
// la imagen real desde data.url.
// ============================================================

import fetch from 'node-fetch';
import sharp from 'sharp';
import config from '../../config.js';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const API_BASE =
    'https://apiyosoyyo-ofc.onrender.com';

const API_ENDPOINT =
    `${API_BASE}/api/brat`;

const MAX_TEXT_LENGTH = 50;

const MAX_STICKER_SIZE =
    500 * 1024;

// ============================================================
// COLORES
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
    const color =
        String(valor || '')
            .trim()
            .toLowerCase();

    // HEX completo
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

function ayuda() {
    return (
        '╭━━〔 🟩 𝐁𝐑𝐀𝐓 〕━━⬣\n' +
        '┃\n' +
        '┃ Genera stickers BRAT.\n' +
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
// OBTENER API KEY
// ============================================================

function obtenerApiKey() {
    return (
        config?.YO_SOY_YO_API_KEY ||
        config?.YOSOYYO_API_KEY ||
        config?.YT_API_KEY ||
        process.env.YO_SOY_YO_API_KEY ||
        process.env.YOSOYYO_API_KEY ||
        process.env.YT_API_KEY ||
        ''
    );
}

// ============================================================
// GENERAR URL DE LA API
// ============================================================

function construirUrlApi(
    texto,
    color,
    apiKey
) {
    const params =
        new URLSearchParams();

    params.set(
        'text',
        texto
    );

    params.set(
        'color',
        color
    );

    if (apiKey) {
        params.set(
            'apiKey',
            apiKey
        );
    }

    return `${API_ENDPOINT}?${params.toString()}`;
}

// ============================================================
// DESCARGAR IMAGEN
// ============================================================

async function descargarImagen(url) {
    const response =
        await fetch(url, {
            method: 'GET',
            headers: {
                Accept:
                    'image/png,image/jpeg,image/webp,image/*'
            }
        });

    if (!response.ok) {
        throw new Error(
            `No se pudo descargar la imagen (${response.status}).`
        );
    }

    const contentType =
        response.headers.get(
            'content-type'
        ) || '';

    if (
        !contentType.includes('image')
    ) {
        const texto =
            await response.text();

        throw new Error(
            `La URL no devolvió una imagen: ${texto.slice(
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
            'La imagen recibida está vacía.'
        );
    }

    return buffer;
}

// ============================================================
// LLAMAR A LA API
// ============================================================

async function generarBrat(
    texto,
    color,
    apiKey
) {
    const apiUrl =
        construirUrlApi(
            texto,
            color,
            apiKey
        );

    console.log(
        `[BRAT] API → ${apiUrl}`
    );

    const response =
        await fetch(apiUrl, {
            method: 'GET',
            headers: {
                Accept:
                    'application/json,image/*'
            }
        });

    if (!response.ok) {
        let detalle = '';

        try {
            detalle =
                await response.text();
        } catch {}

        throw new Error(
            `La API respondió ${response.status}` +
            (
                detalle
                    ? `: ${detalle.slice(0, 200)}`
                    : ''
            )
        );
    }

    const contentType =
        response.headers.get(
            'content-type'
        ) || '';

    // ========================================================
    // CASO 1:
    // La API devuelve directamente una imagen.
    // ========================================================

    if (
        contentType.includes('image')
    ) {
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

    // ========================================================
    // CASO 2:
    // La API devuelve JSON.
    //
    // Ejemplo real:
    //
    // {
    //   "status": 200,
    //   "creador": "YO SOY YO",
    //   "tool": "brat_generator",
    //   "data": {
    //      "url": "/api/brat?text=...&color=white&apiKey=...",
    //      "text": "brat ",
    //      "color": "white"
    //   }
    // }
    // ========================================================

    let json;

    try {
        json =
            await response.json();
    } catch {
        throw new Error(
            'La API no devolvió un JSON válido.'
        );
    }

    console.log(
        '[BRAT] Respuesta JSON:',
        JSON.stringify(json)
    );

    if (
        json?.status &&
        Number(json.status) !== 200
    ) {
        throw new Error(
            json?.message ||
            json?.error ||
            `API status ${json.status}`
        );
    }

    const imagenUrl =
        json?.data?.url ||
        json?.url;

    if (!imagenUrl) {
        throw new Error(
            'La API respondió correctamente pero no proporcionó data.url.'
        );
    }

    // ========================================================
    // Convertir URL relativa en absoluta.
    //
    // La API devuelve:
    //
    // /api/brat?text=...&color=...
    //
    // Por eso agregamos el dominio.
    // ========================================================

    const urlFinal =
        imagenUrl.startsWith('http://') ||
        imagenUrl.startsWith('https://')
            ? imagenUrl
            : new URL(
                imagenUrl,
                API_BASE
            ).toString();

    console.log(
        `[BRAT] Imagen → ${urlFinal}`
    );

    return await descargarImagen(
        urlFinal
    );
}

// ============================================================
// CONVERTIR A WEBP
// ============================================================

async function convertirASticker(
    buffer
) {
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

    for (
        const quality of calidades
    ) {
        resultado =
            await sharp(buffer)
                .rotate()

                // 512x512 estándar para sticker.
                // contain evita deformar o recortar
                // innecesariamente la imagen.
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
                        },

                        withoutEnlargement:
                            false
                    }
                )

                .webp({
                    quality,
                    effort: 6,
                    smartSubsample: true
                })

                .toBuffer();

        console.log(
            `[BRAT] WebP calidad ${quality}: ${Math.round(
                resultado.length / 1024
            )} KB`
        );

        if (
            resultado.length <=
            MAX_STICKER_SIZE
        ) {
            return resultado;
        }
    }

    // ========================================================
    // ÚLTIMO INTENTO
    // ========================================================

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
                    },

                    withoutEnlargement:
                        false
                }
            )
            .webp({
                quality: 60,
                effort: 6
            })
            .toBuffer();

    if (
        resultado.length >
        MAX_STICKER_SIZE
    ) {
        throw new Error(
            `El sticker pesa demasiado: ${Math.round(
                resultado.length / 1024
            )} KB.`
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
        args,
        argumento,
        sock
    }) => {

        try {
            // =================================================
            // USAR args DEL HANDLER
            //
            // .brat hola red
            //
            // args:
            // ['hola', 'red']
            //
            // Esto permite separar correctamente el color.
            // =================================================

            let listaArgs;

            if (
                Array.isArray(args) &&
                args.length
            ) {
                listaArgs = [...args];
            } else {
                listaArgs =
                    String(
                        argumento || ''
                    )
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean);
            }

            // =================================================
            // SIN TEXTO
            // =================================================

            if (!listaArgs.length) {
                await responder.texto(
                    ayuda()
                );

                return;
            }

            // =================================================
            // DETECTAR COLOR
            //
            // El último argumento es color únicamente
            // cuando coincide con un color válido.
            // =================================================

            let color = 'white';

            const ultimoArgumento =
                String(
                    listaArgs[
                        listaArgs.length - 1
                    ] || ''
                ).trim();

            const colorDetectado =
                obtenerColor(
                    ultimoArgumento
                );

            if (colorDetectado) {
                color =
                    colorDetectado;

                // Quitar color del texto.
                listaArgs.pop();
            }

            // =================================================
            // TEXTO FINAL
            // =================================================

            const texto =
                listaArgs
                    .join(' ')
                    .trim();

            // =================================================
            // VALIDAR TEXTO
            // =================================================

            if (!texto) {
                await responder.texto(
                    ayuda()
                );

                return;
            }

            if (
                texto.length >
                MAX_TEXT_LENGTH
            ) {
                await responder.texto(
                    '❌ *BRAT*\n\n' +
                    `El texto puede tener máximo ${MAX_TEXT_LENGTH} caracteres.`
                );

                return;
            }

            // =================================================
            // HEX INVÁLIDO
            // =================================================

            if (
                ultimoArgumento.startsWith('#') &&
                !colorDetectado
            ) {
                await responder.texto(
                    '❌ *Color HEX no válido.*\n\n' +
                    'Ejemplo:\n' +
                    '*.brat hola #ff0000*'
                );

                return;
            }

            // =================================================
            // API KEY
            // =================================================

            const apiKey =
                obtenerApiKey();

            if (!apiKey) {
                console.warn(
                    '[BRAT] ⚠️ No se encontró API Key.'
                );
            }

            // =================================================
            // LOG
            // =================================================

            console.log(
                '================================================'
            );

            console.log(
                `[BRAT] Texto: "${texto}"`
            );

            console.log(
                `[BRAT] Color: "${color}"`
            );

            // =================================================
            // GENERAR
            // =================================================

            const imagenBuffer =
                await generarBrat(
                    texto,
                    color,
                    apiKey
                );

            console.log(
                `[BRAT] Imagen recibida: ${Math.round(
                    imagenBuffer.length / 1024
                )} KB`
            );

            // =================================================
            // CONVERTIR
            // =================================================

            const sticker =
                await convertirASticker(
                    imagenBuffer
                );

            console.log(
                `[BRAT] Sticker final: ${Math.round(
                    sticker.length / 1024
                )} KB`
            );

            // =================================================
            // ENVIAR
            // =================================================

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
                `[BRAT] ✅ Enviado correctamente`
            );

            console.log(
                `[BRAT] Texto: "${texto}" | Color: "${color}"`
            );

            console.log(
                '================================================'
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