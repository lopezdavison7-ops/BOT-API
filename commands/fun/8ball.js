// commands/fun/8ball.js
export default {
    nombre: '8ball',
    categoria: 'Diversión',
    alias: ['bola', 'magicball'],
    descripcion: 'Responde una pregunta con la bola mágica 8ball',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const pregunta = String(argumento || '').trim();
            if (!pregunta) {
                await responder.texto(
                    `❌ *8BALL*\n\n` +
                    `Escribe una pregunta.\n\n` +
                    `📌 Ejemplo:\n` +
                    `*.8ball ¿Mañana lloverá?*\n` +
                    `*.bola ¿Ganaré la lotería?*`
                );
                return;
            }

            const respuestas = [
                // Afirmativas
                '✅ Sí, definitivamente.',
                '✅ Sin duda alguna.',
                '✅ ¡Claro que sí!',
                '✅ Es seguro.',
                '✅ Todo apunta a que sí.',
                '✅ Sin lugar a dudas.',

                // Negativas
                '❌ No, ni lo pienses.',
                '❌ No cuentes con ello.',
                '❌ Muy improbable.',
                '❌ No es tu día.',
                '❌ Mejor no preguntes eso.',
                '❌ Yo diría que no.',

                // Positivas
                '✨ Parece que sí.',
                '✨ Las estrellas dicen que sí.',
                '✨ ¡Sorpresa! Sí.',
                '✨ Tiene buena pinta.',

                // Neutrales / chistosas
                '🤔 Pregunta de nuevo más tarde.',
                '🤔 No lo sé, pregúntale a tu mamá.',
                '🤔 Me estás mareando, pregúntame después.',
                '🤔 La respuesta está en tu corazón... o en Google.',
                '😈 No confío en eso.',
                '😈 Mejor no te digo.',
                '😈 Haz lo que quieras, total nadie te mira.',
                '😈 ¿Y si mejor te tomas un café?',
                '🎱 La bola dice: probablemente.',
                '🎱 La bola está confundida, pregúntame en 5 minutos.',
                '🎱 ¡Claro que sí, y también te queremos!',
                '🎱 Respondo: sí, pero con condiciones.'
            ];

            const random = respuestas[Math.floor(Math.random() * respuestas.length)];

            const respuesta = `
╭〔 🎱 𝐁𝐎𝐋𝐀 𝐌𝐀𝐆𝐈𝐂𝐀 〕⬣
┃
┃ ❓ *${pregunta}*
┃
┃ 🎱 ${random}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            await responder.texto(respuesta);

        } catch (error) {
            console.error('[8BALL] Error:', error);
            await responder.texto('❌ Error en la bola mágica.');
        }
    }
};