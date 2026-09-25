

import { manejarMensajeTTT } from './ttt.js';
import { manejarMensajeTrivia } from './trivia.js';
import { manejarMensajeAdivinanza } from './adivinanza.js';
import { manejarMensajePreguntaHot } from './preguntashot.js';
import { manejarMensajeTetris } from './tetris.js';

import {
    agregarXP
} from './niveles.js';

const MANEJADORES = [
    {
        etiqueta: 'TTT',
        fn: manejarMensajeTTT
    },

    {
        etiqueta: 'TRIVIA',
        fn: manejarMensajeTrivia
    },

    {
        etiqueta: 'ADIVINANZA',
        fn: manejarMensajeAdivinanza
    },

    {
        etiqueta: 'PREGUNTASHOT',
        fn: manejarMensajePreguntaHot
    },

    {
        etiqueta: 'TETRIS',
        fn: manejarMensajeTetris
    }
];

function obtenerJidJugador(msg) {

    if (!msg?.key) {
        return null;
    }

    if (
        msg.key.remoteJid?.endsWith(
            '@g.us'
        )
    ) {

        const participantAlt =
            msg.key.participantAlt;

        if (
            participantAlt &&
            participantAlt.endsWith(
                '@s.whatsapp.net'
            )
        ) {

            return participantAlt;
        }

        const participant =
            msg.key.participant;

        if (
            participant
        ) {

            return participant;
        }

        return null;
    }

    return (
        msg.key.remoteJid ||
        null
    );
}

function obtenerChatJid(msg) {

    return (
        msg?.key?.remoteJid ||
        null
    );
}

function obtenerNombreJugador(msg, jid) {

    const pushName =
        msg?.pushName;

    if (
        pushName &&
        String(pushName).trim()
    ) {

        return String(
            pushName
        ).trim();
    }

    if (jid) {

        const numero =
            String(jid)
                .split('@')[0]
                .replace(
                    /[^0-9]/g,
                    ''
                );

        if (numero) {
            return `+${numero}`;
        }
    }

    return 'Jugador';
}

function obtenerMentionJid(msg, jid) {

    if (
        msg?.key?.remoteJid?.endsWith('@g.us')
    ) {

        const participantAlt =
            msg?.key?.participantAlt;

        if (
            participantAlt &&
            participantAlt.endsWith(
                '@s.whatsapp.net'
            )
        ) {

            return participantAlt;
        }

        if (
            msg?.key?.participant &&
            msg.key.participant.endsWith(
                '@s.whatsapp.net'
            )
        ) {

            return msg.key.participant;
        }

        return null;
    }

    if (
        jid?.endsWith(
            '@s.whatsapp.net'
        )
    ) {

        return jid;
    }

    return null;
}

async function darXPPorJuego(
    sock,
    msg,
    juego
) {

    try {

        const jugador =
            obtenerJidJugador(
                msg
            );

        const chat =
            obtenerChatJid(
                msg
            );

        if (!jugador) {
            return;
        }

        if (
            msg?.key?.fromMe
        ) {

            return;
        }

        const cantidadXP = 10;

        let resultado;

        try {

            resultado =
                agregarXP(
                    chat,
                    jugador,
                    cantidadXP
                );

        } catch {

            resultado =
                agregarXP(
                    jugador,
                    cantidadXP
                );
        }

        if (
            !resultado?.subio
        ) {

            return;
        }

        const nombre =
            obtenerNombreJugador(
                msg,
                jugador
            );

        const mentionJid =
            obtenerMentionJid(
                msg,
                jugador
            );

        let textoJugador;

        const mentions = [];

        if (
            mentionJid
        ) {

            const numero =
                mentionJid
                    .split('@')[0];

            textoJugador =
                `@${numero}`;

            mentions.push(
                mentionJid
            );

        } else {

            textoJugador =
                nombre;
        }

        const texto = `
╭━━〔 🎉 *LEVEL UP* 〕━━⬣
┃
┃ 👤 ${textoJugador}
┃ ⭐ ¡subió al *nivel ${resultado.nivel}*!
┃ ✨ XP: *${resultado.xp}*
┃ 🎮 Juego: *${juego}*
┃
┃ 🚀 ¡Sigue jugando!
┃
╰━━━━━━━━━━━━━━━━⬣
`;

        await sock.sendMessage(
            chat,
            {
                text: texto,
                mentions
            },
            {
                quoted: msg
            }
        );

        console.log(
            `[NIVELES] ${nombre} subió al nivel ${resultado.nivel} jugando ${juego}`
        );

    } catch (error) {

        console.error(
            '[NIVELES] Error dando XP por juego:',
            error?.message ||
            error
        );
    }
}

export async function procesarMinijuegos(
    sock,
    msg
) {

    for (
        const {
            etiqueta,
            fn
        } of MANEJADORES
    ) {

        try {

            const manejado =
                await fn(
                    sock,
                    msg
                );

            if (
                manejado
            ) {

                await darXPPorJuego(
                    sock,
                    msg,
                    etiqueta
                );

                return true;
            }

        } catch (error) {

            console.error(
                `[${etiqueta}] Error procesando mensaje:`,
                error?.message ||
                error
            );
        }
    }

    return false;
}