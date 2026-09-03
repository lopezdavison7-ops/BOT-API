// lib/minijuegos.js
// ============================================================
// REGISTRO CENTRAL DE MINIJUEGOS
// ============================================================
// TTT, Trivia, Adivinanza, Preguntas Hot y Tetris.
//
// IMPORTANTE:
// El sistema de niveles SOLO entrega XP cuando un minijuego
// realmente maneja el mensaje.
//
// Un mensaje normal del grupo NO entrega XP.
// ============================================================

import { manejarMensajeTTT } from './ttt.js';
import { manejarMensajeTrivia } from './trivia.js';
import { manejarMensajeAdivinanza } from './adivinanza.js';
import { manejarMensajePreguntaHot } from './preguntashot.js';
import { manejarMensajeTetris } from './tetris.js';

import {
    agregarXP
} from './niveles.js';

// ============================================================
// MINIJUEGOS
// ============================================================

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

// ============================================================
// OBTENER JID DEL JUGADOR
// ============================================================

function obtenerJidJugador(msg) {

    if (!msg?.key) {
        return null;
    }

    // --------------------------------------------------------
    // GRUPOS
    // --------------------------------------------------------

    if (
        msg.key.remoteJid?.endsWith(
            '@g.us'
        )
    ) {

        // Baileys 7 puede proporcionar
        // participantAlt con el PN real.

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

    // --------------------------------------------------------
    // CHAT PRIVADO
    // --------------------------------------------------------

    return (
        msg.key.remoteJid ||
        null
    );
}

// ============================================================
// OBTENER CHAT
// ============================================================

function obtenerChatJid(msg) {

    return (
        msg?.key?.remoteJid ||
        null
    );
}

// ============================================================
// NOMBRE DEL JUGADOR
// ============================================================

function obtenerNombreJugador(msg, jid) {

    // --------------------------------------------------------
    // Nombre de WhatsApp disponible en el mensaje.
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // Si no hay nombre, usar número.
    // --------------------------------------------------------

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

// ============================================================
// JID PARA MENCIÓN
// ============================================================

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

        // Si participant ya es PN.
        if (
            msg?.key?.participant &&
            msg.key.participant.endsWith(
                '@s.whatsapp.net'
            )
        ) {

            return msg.key.participant;
        }

        // Si solamente tenemos LID,
        // no forzamos una mención falsa.
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

// ============================================================
// DAR XP POR JUGAR
// ============================================================

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

        // ----------------------------------------------------
        // No dar XP al propio bot.
        // ----------------------------------------------------

        if (
            msg?.key?.fromMe
        ) {

            return;
        }

        // ----------------------------------------------------
        // Cantidad de XP.
        // ----------------------------------------------------

        const cantidadXP = 10;

        // ----------------------------------------------------
        // Intentar utilizar el sistema nuevo
        // por chat + jugador.
        //
        // Si tu niveles.js actual todavía utiliza
        // la versión antigua, se mantiene compatible.
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // Si no subió de nivel, no enviar mensaje.
        // ----------------------------------------------------

        if (
            !resultado?.subio
        ) {

            return;
        }

        // ----------------------------------------------------
        // Nombre del jugador.
        // ----------------------------------------------------

        const nombre =
            obtenerNombreJugador(
                msg,
                jugador
            );

        // ----------------------------------------------------
        // Intentar mención real.
        // ----------------------------------------------------

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

            // ------------------------------------------------
            // Si no se puede mencionar, mostramos el nombre.
            // ------------------------------------------------

            textoJugador =
                nombre;
        }

        // ----------------------------------------------------
        // MENSAJE LEVEL UP
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // ENVIAR
        // ----------------------------------------------------

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

// ============================================================
// PROCESAR MINIJUEGOS
// ============================================================

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

            // ------------------------------------------------
            // SOLO AQUÍ SE ENTREGA XP.
            //
            // Si el juego devuelve true significa que el
            // mensaje pertenecía realmente a una partida.
            // ------------------------------------------------

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