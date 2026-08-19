// ============================================================
// COMANDO: ANIME FRASE
// Obtiene una frase aleatoria de anime desde Alex API.
// Uso: .animefrase
// Alias: .frase
// ============================================================

import { llamarApi } from '../lib/api.js';

export default {
    nombre: 'animefrase',
    categoria: 'Diversión',
    alias: ['frase'],

    descripcion: 'Muestra una frase random de anime.',

    ejecutar: async ({ responder }) => {
        try {
            const data = await llamarApi(
                '/api/v1/anime/frase'
            );

            if (!data?.status) {
                return responder.texto(
                    `❌ ${data?.message || 'La API no devolvió una frase.'}`
                );
            }

            const resultado = data.result;

            if (!resultado?.frase) {
                return responder.texto(
                    '❌ La API respondió, pero no encontró una frase.'
                );
            }

            const frase = resultado.frase;
            const personaje = resultado.personaje || 'Desconocido';
            const anime = resultado.anime || 'Anime';

            await responder.texto(
                `💬 *Frase de anime*\n\n` +
                `"${frase}"\n\n` +
                `👤 *${personaje}*\n` +
                `🎬 *${anime}*`
            );

        } catch (error) {
            console.error(
                '[COMANDO animefrase]',
                error
            );

            await responder.texto(
                '❌ No pude obtener una frase de anime.\n\n' +
                '⚠️ La API puede estar temporalmente fuera de servicio.'
            );
        }
    }
};
