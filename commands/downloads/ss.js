
import 'dotenv/config';
import axios from 'axios';
import config from '../../config.js';

const API_URL =
    'https://api-yosoyyo-api-ofc.onrender.com/api/ssweb?url=https://google.com&apiKey=yosoyyo_sk_p7i2ekmm';

export default {
    nombre: 'ss',

    categoria: 'utilidades',

    alias: [
        'screenshot',
        'ssweb'
    ],

    descripcion:
        'Toma una captura de una página web. Uso: .ss <url>',

    ejecutar: async ({
        responder,
        argumento
    }) => {

        const apiKey =
            config.YOSOYYO_API_KEY?.trim() ||
            process.env.YOSOYYO_API_KEY?.trim();

        if (!apiKey) {

            console.error(
                '[SS] ❌ No se encontró YOSOYYO_API_KEY en .env'
            );

            return responder.texto(
                '❌ *Error de configuración*\n\n' +
                'No se encontró `YOSOYYO_API_KEY` en el archivo `.env`.'
            );
        }

        console.log(
            `[SS] 🔑 API Key cargada desde .env (${apiKey.length} caracteres)`
        );

        const targetUrl =
            argumento?.trim();

        if (!targetUrl) {

            return responder.texto(
                '📸 *CAPTURA WEB*\n\n' +
                'Uso:\n' +
                '*.ss https://google.com*'
            );
        }

        let url;

        try {

            url =
                new URL(targetUrl);

        } catch {

            return responder.texto(
                '❌ La URL no es válida.\n\n' +
                'Ejemplo:\n' +
                '*.ss https://google.com*'
            );
        }

        if (
            url.protocol !== 'http:' &&
            url.protocol !== 'https:'
        ) {

            return responder.texto(
                '❌ Solo se permiten URLs HTTP o HTTPS.'
            );
        }

        try {

            console.log(
                `[SS] 📸 Capturando: ${url.href}`
            );

            const response =
                await axios.get(
                    API_URL,
                    {
                        params: {
                            url: url.href,
                            apiKey
                        },

                        responseType:
                            'arraybuffer',

                        timeout:
                            120000,

                        maxContentLength:
                            20 * 1024 * 1024,

                        maxBodyLength:
                            20 * 1024 * 1024,

                        validateStatus:
                            () => true
                    }
                );

            const contentType =
                response.headers?.[
                    'content-type'
                ] || '';

            console.log(
                '[SS] HTTP:',
                response.status
            );

            console.log(
                '[SS] Content-Type:',
                contentType
            );

            if (
                response.status < 200 ||
                response.status >= 300
            ) {

                let mensaje =
                    `❌ La API respondió con HTTP ${response.status}.`;

                try {

                    const texto =
                        Buffer
                            .from(response.data)
                            .toString('utf8');

                    const datos =
                        JSON.parse(texto);

                    if (datos?.message) {
                        mensaje +=
                            `\n\n📡 ${datos.message}`;
                    }

                } catch {

                }

                console.error(
                    '[SS] Error API:',
                    mensaje
                );

                return responder.texto(
                    mensaje
                );
            }

            if (
                !contentType
                    .toLowerCase()
                    .startsWith('image/')
            ) {

                let mensaje =
                    '❌ La API no devolvió una imagen válida.';

                try {

                    const texto =
                        Buffer
                            .from(response.data)
                            .toString('utf8');

                    console.error(
                        '[SS] Respuesta de API:',
                        texto
                    );

                    const datos =
                        JSON.parse(texto);

                    if (datos?.message) {
                        mensaje +=
                            `\n\n📡 ${datos.message}`;
                    }

                } catch {

                }

                return responder.texto(
                    mensaje
                );
            }

            const buffer =
                Buffer.from(
                    response.data
                );

            if (!buffer.length) {

                return responder.texto(
                    '❌ La captura llegó vacía.'
                );
            }

            console.log(
                `[SS] 📦 Imagen recibida: ${buffer.length} bytes`
            );

            const caption = `
╭〔 📸 𝐂𝐀𝐏𝐓𝐔𝐑𝐀 𝐖𝐄𝐁 〕⬣
┃
┃ 🌐 ${url.href}
┃
┃ ⚡ Generada por YOSOYYO
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            await responder.imagen(
                buffer,
                caption
            );

            console.log(
                '[SS] ✅ Captura enviada correctamente.'
            );

        } catch (error) {

            console.error(
                '[SS] ❌ Error:',
                error?.response?.status || '',
                error?.message || error
            );

            if (
                error?.code === 'ECONNABORTED' ||
                error?.code === 'ETIMEDOUT'
            ) {

                return responder.texto(
                    '⏱️ La API tardó demasiado en generar la captura.'
                );
            }

            return responder.texto(
                '❌ No se pudo obtener la captura web.'
            );
        }
    }
};