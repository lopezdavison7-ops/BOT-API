// commands/download/tiktoksearch.js
// ============================================================
// BOT-API
// COMANDO: TIKTOK SEARCH
// ============================================================
// Busca videos de TikTok directamente desde TikTok.
//
// USO:
// .tiktoksearch motos
// .tiktoksearch nicaragua
// .tiktoksearch futbol
//
// Devuelve los primeros resultados encontrados.
// ============================================================

import { chromium } from 'playwright';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const MAX_RESULTADOS = 10;
const TIMEOUT = 45000;

// ============================================================
// ESCAPAR TEXTO
// ============================================================

function limpiarTexto(texto) {
    return String(texto || '')
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================================
// SCRAPER
// ============================================================

async function buscarTikTok(query) {
    let browser = null;
    let page = null;

    try {
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        page = await browser.newPage({
            viewport: {
                width: 1366,
                height: 768
            },

            locale: 'es-ES',

            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                'Chrome/139.0.0.0 Safari/537.36'
        });

        const url =
            `https://www.tiktok.com/search?q=${encodeURIComponent(query)}`;

        console.log(
            `[TIKTOK SEARCH] Buscando: ${query}`
        );

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: TIMEOUT
        });

        await page.waitForTimeout(5000);

        // ====================================================
        // CARGAR MÁS RESULTADOS
        // ====================================================

        for (let i = 0; i < 4; i++) {
            await page.mouse.wheel(0, 1800);
            await page.waitForTimeout(1000);
        }

        // ====================================================
        // EXTRAER VIDEOS
        // ====================================================

        const resultados =
            await page.evaluate(() => {

                const encontrados = [];
                const vistos = new Set();

                const enlaces =
                    document.querySelectorAll(
                        'a[href*="/video/"]'
                    );

                for (const enlace of enlaces) {

                    const url = enlace.href;

                    if (!url || vistos.has(url)) {
                        continue;
                    }

                    vistos.add(url);

                    const contenedor =
                        enlace.closest(
                            '[data-e2e]'
                        ) ||
                        enlace.parentElement?.parentElement ||
                        enlace;

                    const imagen =
                        contenedor?.querySelector('img');

                    const texto =
                        contenedor?.innerText || '';

                    encontrados.push({
                        url,
                        texto,
                        thumbnail:
                            imagen?.src ||
                            imagen?.getAttribute('src') ||
                            ''
                    });
                }

                return encontrados;
            });

        // ====================================================
        // PROCESAR RESULTADOS
        // ====================================================

        const salida = [];

        for (
            const resultado
            of resultados.slice(0, MAX_RESULTADOS)
        ) {

            const texto =
                limpiarTexto(
                    resultado.texto
                );

            const lineas =
                texto
                    .split('\n')
                    .map(limpiarTexto)
                    .filter(Boolean);

            let usuario = '';

            const lineaUsuario =
                lineas.find(
                    linea =>
                        linea.startsWith('@')
                );

            if (lineaUsuario) {
                usuario =
                    lineaUsuario.replace(
                        /^@/,
                        ''
                    );
            }

            let descripcion = '';

            const posiblesDescripciones =
                lineas.filter(linea => {
                    if (!linea) return false;

                    if (
                        linea.startsWith('@')
                    ) {
                        return false;
                    }

                    if (
                        /^[\d.,]+[KMB]?$/i.test(
                            linea
                        )
                    ) {
                        return false;
                    }

                    return true;
                });

            if (
                posiblesDescripciones.length
            ) {
                descripcion =
                    posiblesDescripciones
                        .slice(-2)
                        .join(' ');
            }

            const videoId =
                resultado.url.match(
                    /\/video\/(\d+)/
                )?.[1] || '';

            salida.push({
                id: videoId || null,
                url: resultado.url,
                username: usuario || null,
                description:
                    descripcion || null,
                thumbnail:
                    resultado.thumbnail || null
            });
        }

        return salida;

    } finally {

        if (page) {
            await page.close().catch(() => {});
        }

        if (browser) {
            await browser.close().catch(() => {});
        }
    }
}

// ============================================================
// CREAR MENSAJE
// ============================================================

function crearMensaje(
    query,
    resultados
) {
    let mensaje =
        '╭━━〔 🔎 𝐓𝐈𝐊𝐓𝐎𝐊 𝐒𝐄𝐀𝐑𝐂𝐇 〕━━⬣\n' +
        '┃\n' +
        `┃ 🔍 Búsqueda: ${query}\n` +
        `┃ 📊 Resultados: ${resultados.length}\n` +
        '┃\n';

    resultados.forEach(
        (resultado, index) => {

            mensaje +=
                `┃ ${index + 1}. `;

            if (resultado.username) {
                mensaje +=
                    `@${resultado.username}\n`;
            } else {
                mensaje +=
                    'TikTok\n';
            }

            if (resultado.description) {
                mensaje +=
                    `┃ 📝 ${resultado.description.slice(0, 100)}\n`;
            }

            mensaje +=
                `┃ 🔗 ${resultado.url}\n` +
                '┃\n';
        }
    );

    mensaje +=
        '╰━━━━━━━━━━━━━━━━⬣';

    return mensaje;
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'tiktoksearch',

    categoria: 'Descargas',

    alias: [
        'ttsearch',
        'tsearch'
    ],

    descripcion:
        'Busca videos de TikTok por texto.',

    ejecutar: async ({
        msg,
        responder,
        args,
        argumento
    }) => {

        try {

            // =================================================
            // OBTENER BÚSQUEDA
            // =================================================

            let query = '';

            if (
                Array.isArray(args) &&
                args.length
            ) {
                query =
                    args
                        .join(' ')
                        .trim();
            } else {
                query =
                    String(
                        argumento || ''
                    ).trim();
            }

            // =================================================
            // SIN BÚSQUEDA
            // =================================================

            if (!query) {

                await responder.texto(
                    '╭━━〔 🔎 𝐓𝐈𝐊𝐓𝐎𝐊 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Escribe algo para buscar.\n' +
                    '┃\n' +
                    '┃ 📌 Ejemplos:\n' +
                    '┃ • *.tiktoksearch motos*\n' +
                    '┃ • *.tiktoksearch Nicaragua*\n' +
                    '┃ • *.tiktoksearch futbol*\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // =================================================
            // LÍMITE
            // =================================================

            if (query.length > 100) {

                await responder.texto(
                    '❌ La búsqueda es demasiado larga.\n' +
                    'Máximo: 100 caracteres.'
                );

                return;
            }

            // =================================================
            // AVISO
            // =================================================

            await responder.texto(
                '🔎 *Buscando en TikTok...*\n\n' +
                `🔍 ${query}\n\n` +
                '⏳ Espera un momento...'
            );

            // =================================================
            // SCRAPEAR
            // =================================================

            const resultados =
                await buscarTikTok(
                    query
                );

            console.log(
                `[TIKTOK SEARCH] Encontrados: ${resultados.length}`
            );

            // =================================================
            // SIN RESULTADOS
            // =================================================

            if (!resultados.length) {

                await responder.texto(
                    '╭━━〔 🔎 𝐓𝐈𝐊𝐓𝐎𝐊 〕━━⬣\n' +
                    '┃\n' +
                    `┃ No encontré resultados para:\n` +
                    `┃ "${query}"\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // =================================================
            // ENVIAR RESULTADOS
            // =================================================

            await responder.texto(
                crearMensaje(
                    query,
                    resultados
                )
            );

        } catch (error) {

            console.error(
                '[TIKTOK SEARCH] ❌',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                '╭━━〔 ❌ 𝐓𝐈𝐊𝐓𝐎𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ No se pudo realizar la búsqueda.\n' +
                '┃\n' +
                `┃ ⚠️ ${
                    error?.message ||
                    'Error desconocido.'
                }\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};