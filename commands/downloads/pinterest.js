// commands/downloads/pinterest.js
// ============================================================
// BOT-API
// COMANDO: PINTEREST
// ============================================================
// Busca imágenes de Pinterest usando su endpoint interno.
// No requiere cheerio ni dependencias adicionales.
// ============================================================

export default {
    nombre: 'pinterest',
    categoria: 'descargas',
    alias: ['pin', 'pinterestimg'],
    descripcion: 'Busca imágenes en Pinterest',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        try {
            const query = argumento?.trim();

            if (!query) {
                return responder.texto(
                    '╭〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                    '┃\n' +
                    '┃ Escribe algo para buscar.\n' +
                    '┃\n' +
                    '┃ Ejemplo:\n' +
                    '┃ .pinterest anime\n' +
                    '┃ .pin paisajes\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            }

            const encodedQuery = encodeURIComponent(query);

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
                    page_size: null,
                    price_max: null,
                    price_min: null,
                    query_pin_sigs: null,
                    query,
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

            const link =
                'https://id.pinterest.com/resource/BaseSearchResource/get/' +
                `?source_url=${encodeURIComponent(sourceUrl)}` +
                `&data=${encodeURIComponent(JSON.stringify(data))}`;

            const res = await fetch(link, {
                headers: {
                    accept: 'application/json, text/javascript, */*; q=0.01',
                    'accept-language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
                    referer: 'https://ar.pinterest.com/',
                    'user-agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                        'Chrome/133.0.0.0 Safari/537.36',
                    'x-app-version': 'c056fb7',
                    'x-pinterest-appstate': 'active',
                    'x-pinterest-pws-handler': 'www/index.js',
                    'x-pinterest-source-url': '/',
                    'x-requested-with': 'XMLHttpRequest'
                }
            });

            if (!res.ok) {
                throw new Error(`Pinterest respondió ${res.status}`);
            }

            const json = await res.json();

            const results =
                json?.resource_response?.data?.results ?? [];

            const pins = results
                .map((item) => {
                    if (!item?.images) return null;

                    const image =
                        item.images.orig?.url ||
                        item.images['736x']?.url ||
                        item.images['564x']?.url ||
                        item.images['474x']?.url ||
                        item.images['236x']?.url;

                    if (!image) return null;

                    return {
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
                    };
                })
                .filter(Boolean);

            if (!pins.length) {
                return responder.texto(
                    '╭〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                    '┃\n' +
                    '┃ No encontré imágenes para:\n' +
                    `┃ ${query}\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            }

            const cantidad = Math.min(pins.length, 5);

            for (let i = 0; i < cantidad; i++) {
                const pin = pins[i];

                try {
                    const response = await fetch(pin.image, {
                        headers: {
                            'user-agent':
                                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                                'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                                'Chrome/133.0.0.0 Safari/537.36',
                            referer: 'https://www.pinterest.com/'
                        }
                    });

                    if (!response.ok) continue;

                    const buffer =
                        Buffer.from(await response.arrayBuffer());

                    await responder.imagen(
                        buffer,
                        `📌 ${pin.title}\n` +
                        `🔎 ${query}` +
                        (pin.link ? `\n🔗 ${pin.link}` : '')
                    );
                } catch {
                    continue;
                }
            }

            return;

        } catch (error) {
            console.error(
                '[PINTEREST]',
                error?.message || error
            );

            return responder.texto(
                '╭〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                '┃\n' +
                '┃ Ocurrió un error al buscar las imágenes.\n' +
                '┃ Intenta nuevamente en unos segundos.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};