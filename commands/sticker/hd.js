// commands/sticker/hd.js
// ============================================================
// COMANDO: HD
// Aumenta la resolución de una imagen citada (upscale) usando
// la API de Lempi. Uso: responde a una imagen con .hd <2 a 4>
// Ejemplo: .hd 2  |  .hd 4  (si no pones nada, usa 2 por defecto)
//
// La API se documenta solo con multiplier + apikey por query,
// así que la imagen se manda por POST multipart (campo "image",
// con "file" como respaldo automático si la API rechaza el
// primer nombre de campo). La respuesta puede venir como imagen
// binaria directa o como JSON con la URL del resultado — este
// comando maneja ambos casos.
// ============================================================

import { downloadMediaMessage } from 'baileys';
import config from '../../config.js';

const API_URL = 'https://api.lempi.lat/tools/upscaler';

const MULTIPLIER_MIN = 2;
const MULTIPLIER_MAX = 4;
const MULTIPLIER_DEFAULT = 2;

// ============================================================
// SACAR EL MENSAJE CITADO (imagen)
// ============================================================
function obtenerMensajeCitado(msg) {
    return msg?.message
        ?.extendedTextMessage
        ?.contextInfo
        ?.quotedMessage;
}

function construirMensajeCompleto(msg, mensajeCitado) {
    return {
        key: {
            remoteJid: msg?.key?.remoteJid,
            fromMe: false,
            id: msg?.key?.id,
            participant: msg?.key?.participant
        },
        message: mensajeCitado
    };
}

function esImagen(mensaje) {
    if (mensaje?.imageMessage) return true;

    if (mensaje?.documentMessage) {
        const mimetype = mensaje.documentMessage?.mimetype || '';
        if (mimetype.startsWith('image/')) return true;
    }

    return false;
}

function parsearMultiplicador(argumento) {
    const numero = parseInt(argumento, 10);

    if (!Number.isFinite(numero)) return MULTIPLIER_DEFAULT;

    if (numero < MULTIPLIER_MIN) return MULTIPLIER_MIN;
    if (numero > MULTIPLIER_MAX) return MULTIPLIER_MAX;

    return numero;
}

// ============================================================
// BUSCAR CUALQUIER URL DENTRO DE UN OBJETO (recursivo)
// ============================================================
// La API puede llamar al campo de distintas formas (image_url,
// output, link, hd, enhanced...). En vez de adivinar cada
// nombre posible, se recorre todo el JSON y se toma el primer
// valor que sea un string con pinta de URL de imagen.
// ============================================================
function buscarUrlEnObjeto(objeto, profundidad = 0) {
    if (!objeto || profundidad > 4) return null;

    if (typeof objeto === 'string') {
        return /^https?:\/\/\S+$/i.test(objeto) ? objeto : null;
    }

    if (Array.isArray(objeto)) {
        for (const item of objeto) {
            const encontrado = buscarUrlEnObjeto(item, profundidad + 1);
            if (encontrado) return encontrado;
        }
        return null;
    }

    if (typeof objeto === 'object') {
        for (const valor of Object.values(objeto)) {
            const encontrado = buscarUrlEnObjeto(valor, profundidad + 1);
            if (encontrado) return encontrado;
        }
    }

    return null;
}

// ============================================================
// LLAMAR A LA API (intenta el campo "image", y si falla "file")
// ============================================================
async function llamarUpscaler(buffer, multiplier, apiKey) {
    const url =
        `${API_URL}?multiplier=${multiplier}&apikey=${encodeURIComponent(apiKey)}`;

    const camposAIntentar = ['image', 'file'];
    let ultimoError = null;

    for (const campo of camposAIntentar) {
        try {
            const formData = new FormData();
            formData.append(
                campo,
                new Blob([buffer]),
                'imagen.jpg'
            );

            const respuesta = await fetch(url, {
                method: 'POST',
                body: formData
            });

            if (!respuesta.ok) {
                ultimoError = `HTTP ${respuesta.status} (campo "${campo}")`;
                continue;
            }

            const contentType = respuesta.headers.get('content-type') || '';

            // Caso 1: la API devuelve la imagen ya procesada, directo.
            if (contentType.startsWith('image/')) {
                const arrayBuffer = await respuesta.arrayBuffer();
                return { buffer: Buffer.from(arrayBuffer) };
            }

            // Caso 2: la API devuelve JSON con la URL del resultado.
            const data = await respuesta.json();

            if (data?.status === false) {
                ultimoError = data?.message || `Respuesta inválida (campo "${campo}")`;
                continue;
            }

            // Primero se intenta con los nombres más comunes...
            const urlResultado =
                data?.resultado?.url ||
                data?.result?.url ||
                data?.data?.url ||
                data?.url ||
                // ...y si no, se busca CUALQUIER URL dentro de todo
                // el JSON, sin importar cómo se llame el campo.
                buscarUrlEnObjeto(data);

            if (urlResultado) {
                return { url: urlResultado };
            }

            // No se encontró ninguna URL: se deja constancia de la
            // respuesta completa en la consola del servidor para
            // poder ajustar el nombre del campo si hace falta.
            console.error(
                `[HD] Respuesta sin URL reconocible (campo "${campo}"):`,
                JSON.stringify(data)
            );

            ultimoError = `La API respondió sin imagen ni URL (campo "${campo}")`;

        } catch (error) {
            ultimoError = error?.message || String(error);
        }
    }

    throw new Error(ultimoError || 'No se pudo procesar la imagen.');
}

export default {
    nombre: 'hd',

    categoria: 'Multimedia',

    alias: [
        'upscale',
        'mejorarimagen'
    ],

    descripcion:
        'Aumenta la resolución de una imagen citada. Uso: .hd <2 a 4> respondiendo una imagen.',

    ejecutar: async ({
        sock,
        msg,
        jid,
        argumento,
        responder
    }) => {

        try {
            const mensajeCitado = obtenerMensajeCitado(msg);

            if (!mensajeCitado || !esImagen(mensajeCitado)) {
                await responder.texto(
                    '╭〔 🔍 𝐇𝐃 〕⬣\n' +
                    '┃\n' +
                    '┃ ❌ Responde a una imagen usando\n' +
                    '┃    *.hd* (número del 2 al 4).\n' +
                    '┃\n' +
                    '┃ 📌 Ejemplo: .hd 2\n' +
                    '┃ 📌 Ejemplo: .hd 4\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
                return;
            }

            const multiplier = parsearMultiplicador(argumento);
            const chatJid = jid || msg.key.remoteJid;

            const apiKey = config.LEMPI_API_KEY?.trim();

            if (!apiKey) {
                await responder.texto(
                    '❌ *Error de configuración*\n\n' +
                    'No se encontró `LEMPI_API_KEY` en `config.js`.'
                );
                return;
            }

            await responder.texto(
                `🔍 Mejorando imagen (x${multiplier})... esto puede tardar unos segundos.`
            );

            const mensajeCompleto = construirMensajeCompleto(msg, mensajeCitado);

            const buffer = await downloadMediaMessage(
                mensajeCompleto,
                'buffer',
                {},
                { logger: undefined }
            );

            if (!buffer || !Buffer.isBuffer(buffer) || !buffer.length) {
                throw new Error('No se pudo descargar la imagen.');
            }

            const resultado = await llamarUpscaler(buffer, multiplier, apiKey);

            const contenido = resultado.buffer
                ? { image: resultado.buffer }
                : { image: { url: resultado.url } };

            contenido.caption =
                `✅ *Imagen mejorada* (x${multiplier})`;

            await sock.sendMessage(
                chatJid,
                contenido,
                { quoted: msg }
            );

        } catch (error) {
            console.error('[HD] Error:', error?.message || error);

            await responder.texto(
                '╭〔 ❌ 𝐇𝐃 〕⬣\n' +
                '┃\n' +
                '┃ No pude mejorar la imagen.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido.'}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};
