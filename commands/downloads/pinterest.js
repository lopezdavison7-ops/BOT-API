// commands/downloads/pinterest.js
// ============================================================
// COMANDO: PINTEREST
// BOT-API
//
// Busca imágenes usando el endpoint interno de Pinterest.
// Envía TODAS las imágenes encontradas como álbum.
// Si el álbum falla, envía las imágenes una por una.
// ============================================================

// ============================================================
// CONFIGURACIÓN
// ============================================================

const LIMITE_RESULTADOS = 20;
const TIMEOUT = 60000;
const CAPTION = 'BOT-API 💙💻';

// ============================================================
// FETCH CON TIMEOUT
// ============================================================

async function fetchConTimeout(
    url,
    opciones = {},
    timeout = TIMEOUT
) {
    const controller = new AbortController();

    const temporizador = setTimeout(
        () => controller.abort(),
        timeout
    );

    try {
        return await fetch(url, {
            ...opciones,
            signal: controller.signal
        });
    } finally {
        clearTimeout(temporizador);
    }
}

// ============================================================
// BUSCAR PINTEREST
// ============================================================

async function buscarPinterest(consulta) {

    const encodedQuery =
        encodeURIComponent(consulta);

    const sourceUrl =
        `/search/pins/?q=${encodedQuery}&rs=typed`;

    const data = {
        options: {
            applied_unified_filters: null,
            appliedProductFilters: '---',
            article: null,
            auto_correction_disabled: false,
            corpus: null,
            customized_rerank_type: null,
            domains: null,
            dynamicPageSizeExpGroup: 'control',
            filters: null,
            journey_depth: null,
            page_size: LIMITE_RESULTADOS,
            price_max: null,
            price_min: null,
            query_pin_sigs: null,
            query: consulta,
            redux_normalize_feed: true,
            request_params: null,
            rs: 'typed',
            scope: 'pins',
            selected_one_bar_modules: null,
            seoDrawerEnabled: false,
            source_id: null,
            source_module_id: null,
            source_url: sourceUrl,
            top_pin_id: null,
            top_pin_ids: null
        },
        context: {}
    };

    const endpoint =
        'https://id.pinterest.com/resource/BaseSearchResource/get/' +
        `?source_url=${encodeURIComponent(sourceUrl)}` +
        `&data=${encodeURIComponent(
            JSON.stringify(data)
        )}`;

    console.log(
        `[PINTEREST] Buscando: ${consulta}`
    );

    const respuesta =
        await fetchConTimeout(
            endpoint,
            {
                headers: {
                    accept:
                        'application/json, text/javascript, */*; q=0.01',

                    'accept-language':
                        'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',

                    referer:
                        'https://www.pinterest.com/',

                    'user-agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                        'Chrome/133.0.0.0 Safari/537.36',

                    'x-app-version':
                        'c056fb7',

                    'x-pinterest-appstate':
                        'active',

                    'x-pinterest-pws-handler':
                        'www/index.js',

                    'x-pinterest-source-url':
                        '/',

                    'x-requested-with':
                        'XMLHttpRequest'
                }
            }
        );

    console.log(
        `[PINTEREST] HTTP: ${respuesta.status}`
    );

    if (!respuesta.ok) {
        throw new Error(
            `Pinterest respondió HTTP ${respuesta.status}`
        );
    }

    const json =
        await respuesta.json();

    const resultados =
        json?.resource_response?.data?.results || [];

    const imagenes = [];

    for (const item of resultados) {

        if (!item?.images) {
            continue;
        }

        const image =
            item.images.orig?.url ||
            item.images['736x']?.url ||
            item.images['564x']?.url ||
            item.images['474x']?.url ||
            item.images['236x']?.url;

        if (!image) {
            continue;
        }

        imagenes.push({
            title:
                item.title ||
                item.grid_title ||
                'Pinterest Pin',

            image,

            image_small:
                item.images['236x']?.url ||
                null,

            link:
                item.id
                    ? `https://www.pinterest.com/pin/${item.id}/`
                    : null,

            desc:
                item.description ||
                null
        });

        if (
            imagenes.length >=
            LIMITE_RESULTADOS
        ) {
            break;
        }
    }

    console.log(
        `[PINTEREST] Imágenes encontradas: ${imagenes.length}`
    );

    if (!imagenes.length) {
        throw new Error(
            'No encontré imágenes para esa búsqueda.'
        );
    }

    return imagenes;
}

// ============================================================
// DESCARGAR IMAGEN
// ============================================================

async function descargarImagen(
    url,
    indice
) {

    console.log(
        `[PINTEREST] Descargando ${indice}...`
    );

    const respuesta =
        await fetchConTimeout(
            url,
            {
                headers: {
                    accept:
                        'image/avif,image/webp,image/jpeg,image/png,*/*',

                    'user-agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                        'Chrome/133.0.0.0 Safari/537.36',

                    referer:
                        'https://www.pinterest.com/'
                }
            }
        );

    if (!respuesta.ok) {
        throw new Error(
            `HTTP ${respuesta.status}`
        );
    }

    const contentType =
        respuesta.headers.get(
            'content-type'
        ) || '';

    if (
        contentType &&
        !contentType.startsWith('image/')
    ) {
        throw new Error(
            'La URL no devolvió una imagen.'
        );
    }

    const arrayBuffer =
        await respuesta.arrayBuffer();

    const buffer =
        Buffer.from(arrayBuffer);

    if (!buffer.length) {
        throw new Error(
            'La imagen está vacía.'
        );
    }

    console.log(
        `[PINTEREST] Imagen ${indice}: ${buffer.length} bytes`
    );

    return buffer;
}

// ============================================================
// DESCARGAR TODAS EN PARALELO
// ============================================================

async function descargarTodas(
    resultados
) {

    console.log(
        `[PINTEREST] Descargando ${resultados.length} imágenes...`
    );

    const descargas =
        await Promise.allSettled(
            resultados.map(
                (item, index) =>
                    descargarImagen(
                        item.image,
                        index + 1
                    )
            )
        );

    const validas = [];

    for (
        let i = 0;
        i < descargas.length;
        i++
    ) {

        const resultado =
            descargas[i];

        if (
            resultado.status ===
            'fulfilled'
        ) {

            validas.push({
                buffer:
                    resultado.value,

                original:
                    resultados[i]
            });

        } else {

            console.error(
                `[PINTEREST] Falló imagen ${i + 1}:`,
                resultado.reason?.message ||
                resultado.reason
            );
        }
    }

    return validas;
}

// ============================================================
// ENVIAR ÁLBUM
// ============================================================

async function enviarComoAlbum(
    sock,
    jid,
    msg,
    imagenes
) {

    if (!imagenes.length) {
        throw new Error(
            'No hay imágenes para enviar.'
        );
    }

    console.log(
        `[PINTEREST] Creando álbum de ${imagenes.length} imágenes...`
    );

    const album =
        imagenes.map(
            (item, index) => ({
                image:
                    item.buffer,

                caption:
                    index ===
                    imagenes.length - 1
                        ? CAPTION
                        : undefined
            })
        );

    await sock.sendMessage(
        jid,
        {
            album
        },
        {
            quoted: msg
        }
    );

    console.log(
        `[PINTEREST] Álbum enviado correctamente: ${imagenes.length}`
    );

    return imagenes.length;
}

// ============================================================
// ENVIAR UNA POR UNA
// ============================================================

async function enviarUnaPorUna(
    sock,
    jid,
    msg,
    imagenes
) {

    let enviadas = 0;

    for (
        let i = 0;
        i < imagenes.length;
        i++
    ) {

        try {

            await sock.sendMessage(
                jid,
                {
                    image:
                        imagenes[i].buffer,

                    caption:
                        i ===
                        imagenes.length - 1
                            ? CAPTION
                            : undefined
                },
                {
                    quoted: msg
                }
            );

            enviadas++;

        } catch (error) {

            console.error(
                `[PINTEREST] Error enviando imagen ${i + 1}:`,
                error?.message ||
                error
            );
        }
    }

    return enviadas;
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'pinterest',

    categoria: 'descargas',

    alias: [
        'pin',
        'pinterestimg'
    ],

    descripcion:
        'Busca imágenes en Pinterest y las envía en álbum.',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        const consulta =
            argumento?.trim();

        if (!consulta) {

            await responder.texto(
                '╭━━〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué quieres buscar.\n' +
                '┃\n' +
                '┃ 📌 Ejemplos:\n' +
                '┃ › .pinterest zhao lusi\n' +
                '┃ › .pinterest anime\n' +
                '┃ › .pinterest gatos\n' +
                '┃ › .pinterest carros 4x4\n' +
                '┃\n' +
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
            `[PINTEREST] Consulta: ${consulta}`
        );

        try {

            // ------------------------------------------------
            // BUSCAR
            // ------------------------------------------------

            const resultados =
                await buscarPinterest(
                    consulta
                );

            // ------------------------------------------------
            // AVISO
            // ------------------------------------------------

            await responder.texto(
                '📌 *Pinterest*\n\n' +
                `🔎 Búsqueda: *${consulta}*\n` +
                `🖼️ Encontradas: *${resultados.length}*\n\n` +
                '⏳ Descargando imágenes...'
            );

            // ------------------------------------------------
            // DESCARGAR TODAS
            // ------------------------------------------------

            const imagenes =
                await descargarTodas(
                    resultados
                );

            if (!imagenes.length) {
                throw new Error(
                    'No pude descargar ninguna imagen.'
                );
            }

            console.log(
                `[PINTEREST] Descargadas: ${imagenes.length}/${resultados.length}`
            );

            // ------------------------------------------------
            // ÁLBUM
            // ------------------------------------------------

            let enviadas = 0;

            try {

                enviadas =
                    await enviarComoAlbum(
                        sock,
                        jid,
                        msg,
                        imagenes
                    );

            } catch (errorAlbum) {

                console.error(
                    '[PINTEREST] El álbum falló:',
                    errorAlbum?.message ||
                    errorAlbum
                );

                // --------------------------------------------
                // RESPALDO
                // --------------------------------------------

                enviadas =
                    await enviarUnaPorUna(
                        sock,
                        jid,
                        msg,
                        imagenes
                    );
            }

            // ------------------------------------------------
            // RESULTADO
            // ------------------------------------------------

            if (!enviadas) {
                throw new Error(
                    'No pude enviar las imágenes.'
                );
            }

            console.log(
                `[PINTEREST] Finalizado: ${enviadas}/${resultados.length}`
            );

            await responder.texto(
                '✅ *Pinterest terminado*\n\n' +
                `🔎 Búsqueda: *${consulta}*\n` +
                `🖼️ Encontradas: *${resultados.length}*\n` +
                `📤 Enviadas: *${enviadas}*\n\n` +
                CAPTION
            );

        } catch (error) {

            console.error(
                '[PINTEREST] Error:',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                '╭━━〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude completar la búsqueda.\n' +
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