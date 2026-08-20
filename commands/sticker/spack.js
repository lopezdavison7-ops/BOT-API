// commands/sticker/spack.js
// ============================================================
// BOT-API
// COMANDO: SPACK (MEJORADO)
// ============================================================
// Busca un pack de stickers mediante YO SOY YO API,
// filtra el pack más relevante y envía los stickers.
//
// Autor: BOT-API
// ============================================================

import sharp from 'sharp';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const API_BASE =
    'https://apiyosoyyo-ofc.onrender.com';

const API_KEY =
    process.env.YO_SOY_YO_API_KEY ||
    process.env.YT_API_KEY ||
    'yosoyyo_sk_gincmnk3';

const API_URL =
    `${API_BASE}/api/stickerpack`;

const TIMEOUT_API = 30000;

const LIMITE_STICKERS = 10;
const DELAY_ENTRE_STICKERS = 1200;

const STICKER_PACK_NAME = 'BOT-API';
const STICKER_AUTHOR = 'BOT-API';

const FOOTER =
    '╰─〔 🤖 BOT-API 〕─╯';

// ============================================================
// ESPERA
// ============================================================

function esperar(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}

// ============================================================
// FETCH CON TIMEOUT
// ============================================================

async function fetchConTimeout(
    url,
    opciones = {},
    timeout = TIMEOUT_API
) {
    const controller =
        new AbortController();

    const temporizador =
        setTimeout(
            () => controller.abort(),
            timeout
        );

    try {

        return await fetch(
            url,
            {
                ...opciones,
                signal:
                    controller.signal
            }
        );

    } finally {

        clearTimeout(
            temporizador
        );
    }
}

// ============================================================
// LIMPIAR TEXTO
// ============================================================

function limpiarTexto(
    valor,
    defecto = ''
) {

    if (
        valor === null ||
        valor === undefined
    ) {
        return defecto;
    }

    return String(valor)
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================================
// BUSCAR PACKS
// ============================================================

async function buscarPacks(
    consulta
) {

    const parametros =
        new URLSearchParams({
            q: consulta,
            apiKey: API_KEY
        });

    const endpoint =
        `${API_URL}?${parametros.toString()}`;

    console.log(
        `[SPACK] Buscando: ${consulta}`
    );

    console.log(
        `[SPACK] API: ${API_URL}`
    );

    const respuesta =
        await fetchConTimeout(
            endpoint,
            {
                headers: {
                    Accept:
                        'application/json',
                    'User-Agent':
                        'BOT-API/1.0'
                }
            }
        );

    console.log(
        `[SPACK] API HTTP: ${respuesta.status}`
    );

    if (!respuesta.ok) {

        throw new Error(
            `La API respondió HTTP ${respuesta.status}.`
        );
    }

    const datos =
        await respuesta.json();

    if (!datos?.status) {

        throw new Error(
            datos?.message ||
            'La API rechazó la búsqueda.'
        );
    }

    const resultados =
        datos?.result?.data;

    if (
        !Array.isArray(resultados)
    ) {

        throw new Error(
            'La API no devolvió una lista válida.'
        );
    }

    if (
        resultados.length === 0
    ) {

        throw new Error(
            `No encontré packs para "${consulta}".`
        );
    }

    console.log(
        `[SPACK] Packs encontrados: ${resultados.length}`
    );

    return resultados;
}

// ============================================================
// 🔥 FILTRAR EL MEJOR PACK
// ============================================================

function elegirMejorPack(
    packs,
    consulta
) {

    const palabrasClave =
        consulta
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);

    // 1. Buscar el pack con mayor coincidencia de palabras clave
    let mejorPack = null;
    let mejorPuntaje = 0;

    for (const pack of packs) {

        const nombre =
            limpiarTexto(
                pack?.name,
                ''
            ).toLowerCase();

        let puntaje = 0;

        for (const palabra of palabrasClave) {

            if (
                nombre.includes(
                    palabra
                )
            ) {

                puntaje++;
            }
        }

        // Si el nombre contiene la consulta exacta, es prioridad máxima
        if (
            nombre.includes(
                consulta.toLowerCase()
            )
        ) {

            puntaje += 10;
        }

        if (
            puntaje > mejorPuntaje
        ) {

            mejorPuntaje = puntaje;
            mejorPack = pack;
        }
    }

    // 2. Si no hay coincidencias, devolver el primero
    if (
        !mejorPack
    ) {

        return packs[0];
    }

    console.log(
        `[SPACK] Pack seleccionado: ${mejorPack?.name}`
    );

    console.log(
        `[SPACK] Puntaje: ${mejorPuntaje}`
    );

    return mejorPack;
}

// ============================================================
// DESCARGAR PÁGINA DEL PACK
// ============================================================

async function obtenerPaginaPack(
    url
) {

    console.log(
        `[SPACK] Abriendo pack: ${url}`
    );

    const respuesta =
        await fetchConTimeout(
            url,
            {
                headers: {
                    Accept:
                        'text/html,application/xhtml+xml',
                    'User-Agent':
                        'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Safari/537.36'
                }
            }
        );

    console.log(
        `[SPACK] Página HTTP: ${respuesta.status}`
    );

    if (!respuesta.ok) {

        throw new Error(
            `No pude abrir el pack. HTTP ${respuesta.status}.`
        );
    }

    return await respuesta.text();
}

// ============================================================
// EXTRAER STICKERS
// ============================================================

function extraerStickers(
    html
) {

    const encontrados =
        [];

    const regex =
        /https?:\/\/[^"'<>\\\s]+\/sticker_\d+\.(?:png|webp|jpg|jpeg)/gi;

    const coincidencias =
        html.match(regex) || [];

    for (
        const url of coincidencias
    ) {

        const limpia =
            url
                .replace(
                    /&amp;/gi,
                    '&'
                )
                .trim();

        if (
            !encontrados.includes(
                limpia
            )
        ) {

            encontrados.push(
                limpia
            );
        }

        if (
            encontrados.length >=
            LIMITE_STICKERS
        ) {
            break;
        }
    }

    console.log(
        `[SPACK] Stickers encontrados: ${encontrados.length}`
    );

    return encontrados;
}

// ============================================================
// DESCARGAR STICKER
// ============================================================

async function descargarSticker(
    url
) {

    const respuesta =
        await fetchConTimeout(
            url,
            {
                headers: {
                    Accept:
                        'image/png,image/webp,image/*',
                    'User-Agent':
                        'BOT-API/1.0'
                }
            }
        );

    if (!respuesta.ok) {

        throw new Error(
            `HTTP ${respuesta.status}`
        );
    }

    const arrayBuffer =
        await respuesta.arrayBuffer();

    const buffer =
        Buffer.from(
            arrayBuffer
        );

    if (
        buffer.length === 0
    ) {

        throw new Error(
            'La imagen llegó vacía.'
        );
    }

    console.log(
        `[SPACK] Descargado: ${buffer.length} bytes`
    );

    return buffer;
}

// ============================================================
// CONVERTIR A WEBP
// ============================================================

async function convertirAWebp(
    buffer
) {

    return await sharp(buffer)
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
            quality: 82,
            effort: 4
        })
        .toBuffer();
}

// ============================================================
// ENVIAR STICKER
// ============================================================

async function enviarSticker(
    sock,
    jid,
    buffer,
    msg
) {

    await sock.sendMessage(
        jid,
        {
            sticker: buffer,
            packname:
                STICKER_PACK_NAME,
            author:
                STICKER_AUTHOR,
            categories: [
                '🤖'
            ]
        },
        {
            quoted: msg
        }
    );
}

// ============================================================
// REACCIÓN
// ============================================================

async function reaccionar(
    sock,
    jid,
    key,
    emoji
) {

    try {

        await sock.sendMessage(
            jid,
            {
                react: {
                    text: emoji,
                    key
                }
            }
        );

    } catch {
        // No detener SPACK si falla una reacción.
    }
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'spack',

    categoria: 'Stickers',

    alias: [
        'stickerpack',
        'packs'
    ],

    descripcion:
        'Busca un pack y envía hasta 10 stickers.',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        const consulta =
            argumento?.trim();

        // ----------------------------------------------------
        // VALIDACIÓN
        // ----------------------------------------------------

        if (!consulta) {

            await responder.texto(
                '╭━━〔 🎨 𝐒𝐏𝐀𝐂𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué pack buscas.\n' +
                '┃\n' +
                '┃ 📌 Ejemplos:\n' +
                '┃ › .spack gatos\n' +
                '┃ › .spack anime\n' +
                '┃ › .spack memes\n' +
                '┃\n' +
                '┃ 🔢 Máximo: 10 stickers\n' +
                '┃\n' +
                FOOTER + '\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;
        }

        const jid =
            msg?.key?.remoteJid;

        if (!jid) {
            return;
        }

        console.log(
            '================================================'
        );

        console.log(
            `[SPACK] Consulta: ${consulta}`
        );

        await reaccionar(
            sock,
            jid,
            msg.key,
            '🔎'
        );

        try {

            // ------------------------------------------------
            // 1. BUSCAR PACK
            // ------------------------------------------------

            const packs =
                await buscarPacks(
                    consulta
                );

            // ------------------------------------------------
            // 2. ELEGIR EL MEJOR PACK
            // ------------------------------------------------

            const pack =
                elegirMejorPack(
                    packs,
                    consulta
                );

            const nombre =
                limpiarTexto(
                    pack?.name,
                    consulta
                );

            const url =
                limpiarTexto(
                    pack?.url
                );

            if (!url) {

                throw new Error(
                    'El pack no tiene una URL válida.'
                );
            }

            console.log(
                `[SPACK] Pack seleccionado: ${nombre}`
            );

            console.log(
                `[SPACK] URL: ${url}`
            );

            // ------------------------------------------------
            // 3. AVISO
            // ------------------------------------------------

            await responder.texto(
                '╭━━〔 🎨 𝐒𝐏𝐀𝐂𝐊 〕━━⬣\n' +
                '┃\n' +
                `┃ 🔎 Búsqueda: *${consulta}*\n` +
                `┃ 📦 Pack: *${nombre}*\n` +
                '┃\n' +
                '┃ ⏳ Preparando stickers...\n' +
                '┃ 🔢 Máximo: 10\n' +
                '┃\n' +
                FOOTER + '\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            // ------------------------------------------------
            // 4. ABRIR PACK
            // ------------------------------------------------

            const html =
                await obtenerPaginaPack(
                    url
                );

            // ------------------------------------------------
            // 5. EXTRAER STICKERS
            // ------------------------------------------------

            const stickers =
                extraerStickers(
                    html
                );

            if (
                stickers.length === 0
            ) {

                throw new Error(
                    'No encontré stickers dentro del pack.'
                );
            }

            console.log(
                `[SPACK] Stickers a enviar: ${stickers.length}`
            );

            // ------------------------------------------------
            // 6. ENVIAR STICKERS
            // ------------------------------------------------

            let enviados = 0;

            for (
                let i = 0;
                i < stickers.length;
                i++
            ) {

                const stickerUrl =
                    stickers[i];

                console.log(
                    `[SPACK] Descargando sticker ${i + 1}/${stickers.length}`
                );

                try {

                    const original =
                        await descargarSticker(
                            stickerUrl
                        );

                    console.log(
                        `[SPACK] Convirtiendo sticker ${i + 1} a WebP`
                    );

                    const webp =
                        await convertirAWebp(
                            original
                        );

                    console.log(
                        `[SPACK] WebP: ${webp.length} bytes`
                    );

                    await enviarSticker(
                        sock,
                        jid,
                        webp,
                        msg
                    );

                    enviados++;

                    console.log(
                        `[SPACK] Sticker ${i + 1} enviado correctamente`
                    );

                } catch (error) {

                    console.error(
                        `[SPACK] Error sticker ${i + 1}:`,
                        error?.message ||
                        error
                    );

                    // Continúa con el siguiente.
                }

                // Evita mandar los stickers demasiado rápido.
                if (
                    i <
                    stickers.length - 1
                ) {

                    await esperar(
                        DELAY_ENTRE_STICKERS
                    );
                }
            }

            // ------------------------------------------------
            // 7. RESULTADO
            // ------------------------------------------------

            if (
                enviados === 0
            ) {

                throw new Error(
                    'WhatsApp no pudo recibir ninguno de los stickers. Revisa la conexión de Termux.'
                );
            }

            await reaccionar(
                sock,
                jid,
                msg.key,
                '✅'
            );

            await responder.texto(
                '╭━━〔 🎨 𝐒𝐏𝐀𝐂𝐊 〕━━⬣\n' +
                '┃\n' +
                `┃ 📦 Pack: *${nombre}*\n` +
                `┃ ✅ Enviados: *${enviados}/${stickers.length}*\n` +
                '┃\n' +
                `┃ 🤖 ${STICKER_AUTHOR}\n` +
                '┃\n' +
                FOOTER + '\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            console.log(
                `[SPACK] Finalizado: ${enviados}/${stickers.length}`
            );

        } catch (error) {

            console.error(
                '[SPACK] Error:',
                error?.stack ||
                error?.message ||
                error
            );

            await reaccionar(
                sock,
                jid,
                msg.key,
                '❌'
            );

            await responder.texto(
                '╭━━〔 ❌ 𝐒𝐏𝐀𝐂𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude completar el pack.\n' +
                '┃\n' +
                `┃ ⚠️ ${
                    error?.message ||
                    'Error desconocido.'
                }\n` +
                '┃\n' +
                FOOTER + '\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};