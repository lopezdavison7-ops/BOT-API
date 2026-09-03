// lib/ttt.js
// ============================================================
// TRES EN RAYA (TTT) — motor del juego
// ============================================================
// Compatible con Baileys 7.
//
// CORRECCIÓN:
// WhatsApp puede entregar al jugador como @lid o como
// @s.whatsapp.net dependiendo del mensaje.
//
// Ahora TTT utiliza participantAlt cuando está disponible y
// también intenta resolver LID -> número real mediante
// resolverJidReal(), evitando que el turno se quede bloqueado.
//
// Además:
// - Se actualiza el tiempo de actividad después de cada jugada.
// - Se mantienen las partidas por chat.
// - Se edita el mismo mensaje del tablero.
// ============================================================

import {
    modificarDinero
} from '../database/economia.js';

import {
    resolverJidReal
} from './resolverJid.js';

// ============================================================
// ESTADO
// ============================================================

// chatJid -> {
//     tablero: Array(9),
//     jugadores: {
//         X: jid,
//         O: jid
//     },
//     turno: 'X' | 'O',
//     messageKey: key,
//     creado: timestamp
// }
const partidasActivas = new Map();

// ============================================================
// CONFIGURACIÓN
// ============================================================

const TIEMPO_LIMITE_MS =
    10 * 60 * 1000; // 10 minutos de inactividad

const NUMEROS_EMOJI = [
    '1️⃣',
    '2️⃣',
    '3️⃣',
    '4️⃣',
    '5️⃣',
    '6️⃣',
    '7️⃣',
    '8️⃣',
    '9️⃣'
];

const LINEAS_GANADORAS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],

    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],

    [0, 4, 8],
    [2, 4, 6]
];

const RECOMPENSA_MIN = 1000;
const RECOMPENSA_MAX = 3000;

// ============================================================
// UTILIDADES
// ============================================================

function numeroAleatorio(min, max) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;

}

// ============================================================
// NORMALIZAR JID
// ============================================================

function normalizarJid(jid) {

    if (!jid) {
        return '';
    }

    return String(jid)
        .trim()
        .toLowerCase();

}

// ============================================================
// OBTENER POSIBLES IDENTIFICADORES DEL REMITENTE
// ============================================================
//
// Baileys puede entregar:
//
// participant
// participantAlt
// remoteJid
// remoteJidAlt
//
// En grupos normalmente nos interesa participant.
// Si existe participantAlt, suele ser el PN alternativo.
//
// Se prueban todos para evitar problemas con LID.
// ============================================================

function obtenerJidsRemitente(msg) {

    const candidatos = [

        msg?.key?.participantAlt,

        msg?.key?.participant,

        msg?.key?.remoteJidAlt,

        msg?.key?.remoteJid

    ];

    return [
        ...new Set(
            candidatos
                .filter(Boolean)
                .map(normalizarJid)
        )
    ];

}

// ============================================================
// COMPARAR JUGADOR CON REMITENTE
// ============================================================

async function resolverRemitente(sock, chatJid, msg) {

    const candidatos =
        obtenerJidsRemitente(msg);

    if (!candidatos.length) {
        return [];
    }

    const resueltos = [];

    for (const jid of candidatos) {

        resueltos.push(jid);

        try {

            const real =
                await resolverJidReal(
                    sock,
                    chatJid,
                    jid
                );

            if (real) {

                resueltos.push(
                    normalizarJid(real)
                );

            }

        } catch (error) {

            console.error(
                '[TTT] Error resolviendo remitente:',
                error?.message || error
            );

        }

    }

    return [
        ...new Set(
            resueltos.filter(Boolean)
        )
    ];

}

// ============================================================
// COMPROBAR SI DOS IDENTIFICADORES SON EL MISMO USUARIO
// ============================================================

function esMismoUsuario(
    identificadores,
    jugador
) {

    const objetivo =
        normalizarJid(jugador);

    if (!objetivo) {
        return false;
    }

    return identificadores.some(
        jid => normalizarJid(jid) === objetivo
    );

}

// ============================================================
// TABLERO
// ============================================================

function formatearTablero(tablero) {

    const celda = i => {

        if (tablero[i] === 'X') {
            return '❌';
        }

        if (tablero[i] === 'O') {
            return '⭕';
        }

        return NUMEROS_EMOJI[i];

    };

    return (
        `${celda(0)} ${celda(1)} ${celda(2)}\n` +
        `${celda(3)} ${celda(4)} ${celda(5)}\n` +
        `${celda(6)} ${celda(7)} ${celda(8)}`
    );

}

// ============================================================
// GANADOR
// ============================================================

function verificarGanador(tablero) {

    for (const [a, b, c] of LINEAS_GANADORAS) {

        if (
            tablero[a] &&
            tablero[a] === tablero[b] &&
            tablero[a] === tablero[c]
        ) {

            return tablero[a];

        }

    }

    return null;

}

// ============================================================
// EMPATE
// ============================================================

function tableroLleno(tablero) {

    return tablero.every(
        celda => celda !== null
    );

}

// ============================================================
// EXPIRACIÓN
// ============================================================

function estaExpirada(partida) {

    return (
        Date.now() - partida.creado >
        TIEMPO_LIMITE_MS
    );

}

// ============================================================
// API PÚBLICA
// ============================================================

export function hayPartidaActiva(chatJid) {

    const partida =
        partidasActivas.get(chatJid);

    if (!partida) {
        return false;
    }

    if (estaExpirada(partida)) {

        partidasActivas.delete(
            chatJid
        );

        return false;

    }

    return true;

}

// ============================================================
// CREAR PARTIDA
// ============================================================

export function crearPartida(
    chatJid,
    jidX,
    jidO
) {

    partidasActivas.set(
        chatJid,
        {

            tablero:
                Array(9).fill(null),

            jugadores: {

                X: jidX,

                O: jidO

            },

            turno: 'X',

            messageKey: null,

            creado: Date.now()

        }
    );

}

// ============================================================
// GUARDAR MENSAJE DEL TABLERO
// ============================================================

export function guardarMessageKey(
    chatJid,
    messageKey
) {

    const partida =
        partidasActivas.get(chatJid);

    if (!partida) {
        return;
    }

    partida.messageKey =
        messageKey;

}

// ============================================================
// CANCELAR PARTIDA
// ============================================================

export function cancelarPartida(chatJid) {

    const existia =
        partidasActivas.has(chatJid);

    partidasActivas.delete(
        chatJid
    );

    return existia;

}

// ============================================================
// MANEJAR MENSAJE TTT
// ============================================================

export async function manejarMensajeTTT(
    sock,
    msg
) {

    const chatJid =
        msg?.key?.remoteJid;

    if (!chatJid) {
        return false;
    }

    // --------------------------------------------------------
    // BUSCAR PARTIDA
    // --------------------------------------------------------

    const partida =
        partidasActivas.get(chatJid);

    if (!partida) {
        return false;
    }

    // --------------------------------------------------------
    // COMPROBAR EXPIRACIÓN
    // --------------------------------------------------------

    if (estaExpirada(partida)) {

        partidasActivas.delete(
            chatJid
        );

        return false;

    }

    // --------------------------------------------------------
    // OBTENER TEXTO
    // --------------------------------------------------------

    const texto = (

        msg?.message?.conversation ||

        msg?.message?.extendedTextMessage?.text ||

        msg?.message?.imageMessage?.caption ||

        msg?.message?.videoMessage?.caption ||

        ''

    ).trim();

    // --------------------------------------------------------
    // SOLO ACEPTAMOS 1-9
    // --------------------------------------------------------

    if (!/^[1-9]$/.test(texto)) {
        return false;
    }

    // --------------------------------------------------------
    // RESOLVER REMITENTE
    // --------------------------------------------------------
    //
    // Aquí estaba el problema principal.
    //
    // Ahora se comprueban:
    //
    // participantAlt
    // participant
    // remoteJidAlt
    // remoteJid
    //
    // y además se intenta resolver @lid -> @s.whatsapp.net.
    // --------------------------------------------------------

    const identificadores =
        await resolverRemitente(
            sock,
            chatJid,
            msg
        );

    if (!identificadores.length) {
        return true;
    }

    // --------------------------------------------------------
    // DETERMINAR JUGADOR
    // --------------------------------------------------------

    let simboloRemitente = null;

    if (
        esMismoUsuario(
            identificadores,
            partida.jugadores.X
        )
    ) {

        simboloRemitente = 'X';

    } else if (
        esMismoUsuario(
            identificadores,
            partida.jugadores.O
        )
    ) {

        simboloRemitente = 'O';

    }

    // --------------------------------------------------------
    // NO ES JUGADOR
    // --------------------------------------------------------

    if (!simboloRemitente) {

        // Es un número de otra persona del grupo.
        // No interfiere con la partida.

        return false;

    }

    // --------------------------------------------------------
    // TABLERO TODAVÍA NO ENVIADO
    // --------------------------------------------------------

    if (!partida.messageKey) {

        return true;

    }

    // --------------------------------------------------------
    // COMPROBAR TURNO
    // --------------------------------------------------------

    if (
        simboloRemitente !==
        partida.turno
    ) {

        // Es jugador, pero no le toca.

        return true;

    }

    // --------------------------------------------------------
    // OBTENER CASILLA
    // --------------------------------------------------------

    const indice =
        Number(texto) - 1;

    // --------------------------------------------------------
    // CASILLA OCUPADA
    // --------------------------------------------------------

    if (
        partida.tablero[indice] !== null
    ) {

        return true;

    }

    // ========================================================
    // APLICAR JUGADA
    // ========================================================

    partida.tablero[indice] =
        simboloRemitente;

    // --------------------------------------------------------
    // ACTUALIZAR ACTIVIDAD
    // --------------------------------------------------------
    //
    // Antes el contador seguía desde el comienzo de la partida.
    // Ahora cada movimiento renueva los 10 minutos.
    // --------------------------------------------------------

    partida.creado =
        Date.now();

    // --------------------------------------------------------
    // COMPROBAR GANADOR
    // --------------------------------------------------------

    const ganadorSimbolo =
        verificarGanador(
            partida.tablero
        );

    // --------------------------------------------------------
    // COMPROBAR EMPATE
    // --------------------------------------------------------

    const empate =
        !ganadorSimbolo &&
        tableroLleno(
            partida.tablero
        );

    const jidX =
        partida.jugadores.X;

    const jidO =
        partida.jugadores.O;

    let encabezado = '';
    let pie = '';

    // ========================================================
    // GANADOR
    // ========================================================

    if (ganadorSimbolo) {

        const jidGanador =
            ganadorSimbolo === 'X'
                ? jidX
                : jidO;

        const recompensa =
            numeroAleatorio(
                RECOMPENSA_MIN,
                RECOMPENSA_MAX
            );

        try {

            modificarDinero(
                jidGanador,
                recompensa
            );

        } catch (error) {

            console.error(
                '[TTT] Error entregando recompensa:',
                error?.message || error
            );

        }

        encabezado =
            `🎉 *¡@${jidGanador.split('@')[0]} ha ganado!*\n\n`;

        pie =
            `\n💰 Recompensa: +$${recompensa.toLocaleString()}`;

        partidasActivas.delete(
            chatJid
        );

    }

    // ========================================================
    // EMPATE
    // ========================================================

    else if (empate) {

        encabezado =
            '🤝 *¡Empate!*\n\n';

        partidasActivas.delete(
            chatJid
        );

    }

    // ========================================================
    // SIGUIENTE TURNO
    // ========================================================

    else {

        partida.turno =
            simboloRemitente === 'X'
                ? 'O'
                : 'X';

        const jidSiguiente =
            partida.turno === 'X'
                ? jidX
                : jidO;

        encabezado =
            `⚔️ Turno de @${jidSiguiente.split('@')[0]} ` +
            `(${partida.turno === 'X' ? '❌' : '⭕'})\n\n`;

    }

    // ========================================================
    // NUEVO TABLERO
    // ========================================================

    const texto2 =
        encabezado +

        formatearTablero(
            partida.tablero
        ) +

        pie;

    // ========================================================
    // EDITAR TABLERO
    // ========================================================

    try {

        await sock.sendMessage(
            chatJid,
            {

                text: texto2,

                mentions: [
                    jidX,
                    jidO
                ]

            },
            {

                edit:
                    partida.messageKey

            }
        );

    } catch (error) {

        console.error(
            '[TTT] Error editando el tablero:',
            error?.message || error
        );

        // ----------------------------------------------------
        // FALLBACK
        // ----------------------------------------------------
        //
        // Si WhatsApp no permite editar ese mensaje, mandamos
        // uno nuevo para que la partida no quede inmóvil.
        // ----------------------------------------------------

        try {

            const enviado =
                await sock.sendMessage(
                    chatJid,
                    {

                        text: texto2,

                        mentions: [
                            jidX,
                            jidO
                        ]

                    }
                );

            if (
                enviado?.key
            ) {

                partida.messageKey =
                    enviado.key;

            }

        } catch (fallbackError) {

            console.error(
                '[TTT] Error enviando tablero de respaldo:',
                fallbackError?.message ||
                fallbackError
            );

        }

    }

    return true;

}

// ============================================================
// EXPORTAR FORMATEADOR
// ============================================================

export {
    formatearTablero
};