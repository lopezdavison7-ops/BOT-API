// lib/minijuegos.js
// ============================================================
// REGISTRO CENTRAL DE MINIJUEGOS
// ============================================================
// Varios juegos (TTT, Trivia, Adivinanza, Preguntas Hot...)
// necesitan leer mensajes de texto libre ANTES de que se
// procesen como comando (ej: alguien manda "3" para jugar su
// casilla de TTT, o "A" para responder una trivia — sin el
// punto del bot).
//
// Antes cada juego se enganchaba a mano en index.js. Ahora basta
// con agregarlo UNA vez a la lista MANEJADORES de aquí abajo —
// handler.js ya se encarga de recorrerla en cada mensaje, así
// que no hay que tocar index.js ni handler.js de nuevo.
// ============================================================

import { manejarMensajeTTT } from './ttt.js';
import { manejarMensajeTrivia } from './trivia.js';
import { manejarMensajeAdivinanza } from './adivinanza.js';
import { manejarMensajePreguntaHot } from './preguntashot.js';
import { manejarMensajeTetris } from './tetris.js';

// Para agregar un minijuego nuevo: importa su función arriba y
// agrégala aquí con una etiqueta corta (solo para el log de
// errores). Debe devolver `true` si manejó el mensaje (y el
// llamador no debe seguir procesándolo como comando), o `false`
// si no tiene nada que ver con ese mensaje.
const MANEJADORES = [
    { etiqueta: 'TTT', fn: manejarMensajeTTT },
    { etiqueta: 'TRIVIA', fn: manejarMensajeTrivia },
    { etiqueta: 'ADIVINANZA', fn: manejarMensajeAdivinanza },
    { etiqueta: 'PREGUNTASHOT', fn: manejarMensajePreguntaHot },
    { etiqueta: 'TETRIS', fn: manejarMensajeTetris }
];

// ============================================================
// PROCESAR UN MENSAJE ENTRANTE CONTRA TODOS LOS MINIJUEGOS
// ============================================================
// Devuelve `true` en cuanto el PRIMER minijuego que lo reclame
// lo maneje (y ahí se detiene, no sigue preguntándole a los
// demás). Devuelve `false` si ninguno tenía nada que ver con
// el mensaje — el llamador debe seguir el flujo normal.
//
// Un error en un juego se registra en consola pero NUNCA tumba
// el mensaje completo ni bloquea a los demás juegos.
// ============================================================
export async function procesarMinijuegos(sock, msg) {
    for (const { etiqueta, fn } of MANEJADORES) {
        try {
            const manejado = await fn(sock, msg);
            if (manejado) return true;
        } catch (error) {
            console.error(`[${etiqueta}] Error procesando mensaje:`, error?.message || error);
        }
    }

    return false;
}
