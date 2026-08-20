// commands/downloads/animememe.js
// ============================================================
// COMANDO: ANIME MEME
// Obtiene un meme aleatorio de anime desde Alex API.
// Uso: .animememe
// Alias: .meme
// ============================================================

import { llamarApi } from '../../lib/api.js';

export default {
    nombre: 'animememe',
    categoria: 'Diversión',
    alias: ['meme'],

    descripcion: 'Muestra un meme random de anime.',

    ejecutar: async ({ responder }) => {
        try {
            const data = await llamarApi(
                '/api/v1/anime/meme'
            );

            if (!data?.status) {
                return responder.texto(
                    `❌ ${data?.message || 'La API no devolvió un meme.'}`
                );
            }

            const resultado = data.result;

            if (!resultado?.imagen_url) {
                return responder.texto(
                    '❌ La API respondió, pero no encontró la imagen del meme.'
                );
            }

            const titulo =
                resultado.titulo ||
                '😂 Meme de anime';

            const caption = `
╭〔 😂 𝐀𝐍𝐈𝐌𝐄 𝐌𝐄𝐌𝐄 〕⬣
┃
┃ 📌 ${titulo}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            await responder.imagen(
                resultado.imagen_url,
                caption
            );

        } catch (error) {
            console.error(
                '[COMANDO animememe]',
                error
            );

            await responder.texto(
                '❌ No pude obtener el meme de anime.\n\n' +
                '⚠️ La API puede estar temporalmente fuera de servicio.'
            );
        }
    }
};