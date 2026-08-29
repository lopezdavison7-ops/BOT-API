// commands/fun/trivia.js
import {
    hayPartidaActiva,
    crearPregunta,
    puedeUsarTrivia,
    tiempoRestanteTrivia,
    registrarUsoTrivia,
    formatearTiempoRestante
} from '../../lib/trivia.js';

export default {
    nombre: 'trivia',

    categoria: 'Diversión',

    alias: [
        'preguntados'
    ],

    descripcion:
        'Inicia una pregunta de trivia. Responde con A, B, C o D. Uso: cada 3 horas.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        const chatJid =
            msg.key.remoteJid;

        const remitente =
            msg.key.participant ||
            msg.key.remoteJid;

        if (hayPartidaActiva(chatJid)) {

            await responder.texto(
                '╭〔 ⚠️ 𝐓𝐑𝐈𝐕𝐈𝐀 〕⬣\n' +
                '┃\n' +
                '┃ Ya hay una pregunta activa\n' +
                '┃ en este chat.\n' +
                '┃\n' +
                '┃ 📌 Cancélala con *.triviacancelar*\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        if (!puedeUsarTrivia(remitente)) {

            const restante =
                formatearTiempoRestante(
                    tiempoRestanteTrivia(remitente)
                );

            await responder.texto(
                '╭〔 ⏳ 𝐓𝐑𝐈𝐕𝐈𝐀 〕⬣\n' +
                '┃\n' +
                '┃ Ya usaste tu trivia por ahora.\n' +
                '┃\n' +
                `┃ ⏱️ Puedes iniciar otra en: *${restante}*\n` +
                '┃\n' +
                '┃ 📌 Límite: una trivia cada 3 horas\n' +
                '┃     por persona (responder no tiene\n' +
                '┃     límite, solo iniciar).\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        registrarUsoTrivia(remitente);

        await crearPregunta(sock, chatJid, msg);
    }
};
