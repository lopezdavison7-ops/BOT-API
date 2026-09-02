// commands/downloads/pinterest.js
// ============================================================
// BOT-API
// COMANDO: PINTEREST
// ============================================================
// Busca Pins públicos de Pinterest y descarga sus imágenes.
// No depende de config.js ni de una API externa.
// Compatible con el cargador automático de commands.
// ============================================================

const PINTEREST_BASE = 'https://www.pinterest.com';
const LIMITE_RESULTADOS = 8;
const TIMEOUT = 30000;

function limpiarTexto(texto) {
return String(texto || '')
.replace(/\s+/g, ' ')
.trim();
}

async function fetchTimeout(url, opciones = {}, timeout = TIMEOUT) {
const controller = new AbortController();

const timer = setTimeout(() => {
    controller.abort();
}, timeout);

try {
    return await fetch(url, {
        ...opciones,
        signal: controller.signal
    });
} finally {
    clearTimeout(timer);
}

}

function extraerImagenes(html) {
const imagenes = new Set();

// URLs directas de imágenes que aparecen en los datos
const patrones = [
    /https?:\\?\/\\?\/i\.pinimg\.com\\?\/[^"'\\\s<>]+/gi,
    /https?:\/\/i\.pinimg\.com\/[^"'\\\s<>]+/gi
];

for (const regex of patrones) {
    const encontrados = html.match(regex) || [];

    for (let url of encontrados) {
        url = url
            .replace(/\\u002F/g, '/')
            .replace(/\\\//g, '/')
            .replace(/&amp;/g, '&')
            .replace(/["'\\]+$/g, '');

        if (!url.includes('pinimg.com')) continue;

        // Preferir original/1200x/736x antes que miniaturas
        url = url
            .replace('/236x/', '/originals/')
            .replace('/474x/', '/originals/')
            .replace('/564x/', '/originals/')
            .replace('/736x/', '/originals/')
            .replace('/600x/', '/originals/')
            .replace('/750x/', '/originals/')
            .replace('/1200x/', '/originals/');

        imagenes.add(url);
    }
}

return [...imagenes].slice(0, LIMITE_RESULTADOS);

}

async function buscarPinterest(consulta) {
const url =
"${PINTEREST_BASE}/search/pins/?q=${encodeURIComponent(consulta)}";

const respuesta = await fetchTimeout(url, {
    headers: {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
        'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language':
            'es-ES,es;q=0.9,en;q=0.8',
        'Referer':
            'https://www.pinterest.com/'
    }
});

if (!respuesta.ok) {
    throw new Error(`Pinterest respondió HTTP ${respuesta.status}`);
}

const html = await respuesta.text();
const imagenes = extraerImagenes(html);

if (!imagenes.length) {
    throw new Error(
        'Pinterest no devolvió imágenes públicas para esa búsqueda.'
    );
}

return imagenes;

}

async function descargarImagen(url) {
const respuesta = await fetchTimeout(
url,
{
headers: {
'User-Agent':
'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
'Accept':
'image/avif,image/webp,image/apng,image/svg+xml,image/,/*;q=0.8',
'Referer':
'https://www.pinterest.com/'
}
},
60000
);

if (!respuesta.ok) {
    throw new Error(`HTTP ${respuesta.status}`);
}

const tipo =
    respuesta.headers.get('content-type') || '';

if (!tipo.startsWith('image/')) {
    throw new Error('La respuesta no es una imagen');
}

const datos = await respuesta.arrayBuffer();
const buffer = Buffer.from(datos);

if (!buffer.length) {
    throw new Error('Imagen vacía');
}

return buffer;

}

async function enviarResultados(sock, jid, msg, urls) {
let enviadas = 0;

for (let i = 0; i < urls.length; i++) {
    try {
        const buffer = await descargarImagen(urls[i]);

        await sock.sendMessage(
            jid,
            {
                image: buffer,
                caption:
                    i === 0
                        ? `📌 *Pinterest*\n🖼️ Resultado ${i + 1}/${urls.length}`
                        : `🖼️ Resultado ${i + 1}/${urls.length}`
            },
            {
                quoted: msg
            }
        );

        enviadas++;
    } catch (error) {
        console.error(
            `[PINTEREST] Error imagen ${i + 1}:`,
            error.message
        );
    }
}

return enviadas;

}

export default {
nombre: 'pinterest',

categoria: 'Descargas',

alias: [
    'pin',
    'pinterestimg'
],

descripcion:
    'Busca y descarga imágenes públicas de Pinterest.',

ejecutar: async ({
    sock,
    msg,
    responder,
    argumento
}) => {
    const consulta = limpiarTexto(argumento);

    if (!consulta) {
        await responder.texto(
            '╭〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
            '┃\n' +
            '┃ ❌ Escribe algo para buscar.\n' +
            '┃\n' +
            '┃ 📌 Ejemplos:\n' +
            '┃ › .pinterest anime\n' +
            '┃ › .pinterest carros\n' +
            '┃ › .pinterest gatos\n' +
            '┃ › .pin fondos de pantalla\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
        return;
    }

    const jid = msg?.key?.remoteJid;

    if (!jid) return;

    try {
        await responder.texto(
            '╭〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
            '┃\n' +
            `┃ 🔎 Buscando: *${consulta}*\n` +
            '┃ ⏳ Espera un momento...\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );

        console.log(
            `[PINTEREST] Buscando: ${consulta}`
        );

        const urls = await buscarPinterest(consulta);

        console.log(
            `[PINTEREST] Encontradas: ${urls.length}`
        );

        const enviadas =
            await enviarResultados(
                sock,
                jid,
                msg,
                urls
            );

        if (!enviadas) {
            throw new Error(
                'Pinterest encontró imágenes, pero ninguna pudo descargarse.'
            );
        }

        await responder.texto(
            '╭〔 ✅ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
            '┃\n' +
            `┃ 🔎 Búsqueda: *${consulta}*\n` +
            `┃ 🖼️ Enviadas: *${enviadas}/${urls.length}*\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );

    } catch (error) {
        console.error(
            '[PINTEREST] Error:',
            error.stack || error.message
        );

        await responder.texto(
            '╭〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
            '┃\n' +
            '┃ No pude completar la búsqueda.\n' +
            `┃ ⚠️ ${error.message || 'Error desconocido.'}\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
}

};