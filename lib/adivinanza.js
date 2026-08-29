// lib/adivinanza.js
// ============================================================
// ADIVINANZA — motor del juego
// ============================================================
// Cada partida vive en memoria (Map por chat). El bot manda un
// acertijo y cualquiera en el chat puede responder mandando la
// palabra directo, SIN el prefijo del bot — mismo patrón que
// TTT y Trivia. El primero en acertar (comparación sin tildes
// ni mayúsculas) se gana la recompensa.
// ============================================================

import {
    modificarDinero
} from '../database/economia.js';

// chatJid -> {
//   pista, respuestas: ['...' , '...'] (acepta varias formas),
//   pistaExtra, messageKey, timeoutId, creado
// }
const partidasActivas = new Map();

const TIEMPO_LIMITE_MS = 45 * 1000; // 45 segundos para adivinar

const RECOMPENSA_MIN = 700;
const RECOMPENSA_MAX = 2000;

// ============================================================
// BANCO DE ACERTIJOS
// ============================================================
const ACERTIJOS = [
    { pista: 'Blanca por dentro, verde por fuera. Si quieres que te lo diga, espera.', pistaExtra: 'Es una fruta.', respuestas: ['pera'] },
    { pista: 'Oro parece, plata no es. El que no lo adivine, bien bruto es.', pistaExtra: '', respuestas: ['platano', 'plátano'] },
    { pista: 'Vuela sin alas, silba sin boca, y no la ves ni la tocas.', pistaExtra: 'No es un ser vivo.', respuestas: ['viento', 'el viento'] },
    { pista: 'Tiene manos y no saluda, tiene cara y no se lava.', pistaExtra: 'Está en tu pared o tu muñeca.', respuestas: ['reloj', 'el reloj'] },
    { pista: 'Cuanto más lejos, más cerca lo tienes. Cuanto más cerca, más lejos lo ves.', pistaExtra: 'Está en el cielo.', respuestas: ['horizonte', 'el horizonte'] },
    { pista: 'Todos los días paso, pero jamás regreso.', pistaExtra: 'No se puede detener.', respuestas: ['tiempo', 'el tiempo'] },
    { pista: 'En un cuarto oscuro sin ventanas ni puertas, hay un tesoro escondido.', pistaExtra: 'Está en tu cabeza.', respuestas: ['cerebro', 'el cerebro'] },
    { pista: 'Redondo como un plato, hondo como un mar, y por más que lo miran no lo pueden hallar.', pistaExtra: 'Está en el cielo de día.', respuestas: ['sol', 'el sol'] },
    { pista: 'Tengo ciudades sin casas, montañas sin árboles, mares sin agua.', pistaExtra: 'La usas para viajar.', respuestas: ['mapa', 'el mapa', 'un mapa'] },
    { pista: 'Cuanto más se seca, más se moja.', pistaExtra: 'La usas al salir de bañarte.', respuestas: ['toalla', 'la toalla'] },
    { pista: 'Vive en el mar y le teme al agua caliente.', pistaExtra: 'Es un animal marino con caparazón.', respuestas: ['cangrejo', 'el cangrejo'] },
    { pista: 'Doce hermanos son, cada uno tiene su nombre y su misión, y ninguno se repite.', pistaExtra: 'Tiene que ver con el calendario.', respuestas: ['los meses', 'meses', 'meses del año'] },
    { pista: 'Blanco fue mi nacimiento, verde mi vivir, y ahora colorado ando por presumir.', pistaExtra: 'Es una fruta pequeña y roja.', respuestas: ['cereza', 'la cereza'] },
    { pista: 'Puedo correr pero nunca camino, tengo boca pero nunca hablo.', pistaExtra: 'Está en la naturaleza y lleva agua.', respuestas: ['rio', 'río', 'el rio', 'el río'] },
    { pista: 'Si me nombras, desaparezco.', pistaExtra: 'Es un estado, no un objeto.', respuestas: ['silencio', 'el silencio'] },
    { pista: 'Entre dos paredes blancas hay una flor amarilla.', pistaExtra: 'La comes en el desayuno.', respuestas: ['huevo', 'el huevo'] },
    { pista: 'Cabeza de rana y cuerpo de nada, adivina, adivinador.', pistaExtra: 'Es un pequeño clavo con cabeza plana.', respuestas: ['tachuela', 'la tachuela'] },
    { pista: 'Blanca soy, del cielo caigo. Y aunque me pisen, no me quejo.', pistaExtra: 'Cae en climas fríos.', respuestas: ['nieve', 'la nieve'] },
    { pista: 'Todos me pisan, pero yo nunca me quejo.', pistaExtra: 'Está en el suelo de las calles.', respuestas: ['calle', 'la calle', 'suelo', 'el suelo'] },
    { pista: 'Tiene dientes y no muerde.', pistaExtra: 'La usas para peinarte.', respuestas: ['peine', 'el peine'] },
    { pista: 'Vivo entre dos hermanas, una es de día, la otra de noche.', pistaExtra: 'Está en el cielo.', respuestas: ['luna y sol', 'crepusculo', 'crepúsculo'] },
    { pista: 'Soy amarillo si me dejas madurar, y verde si me apuras.', pistaExtra: 'Es una fruta tropical.', respuestas: ['platano', 'plátano', 'banana'] },
    { pista: 'No tengo patas ni alas, pero puedo subir escaleras.', pistaExtra: 'Está siempre en el mismo lugar de la casa.', respuestas: ['alfombra'] },
    { pista: 'Cuantas más quitas, más grande se hace.', pistaExtra: 'Piensa en un hoyo.', respuestas: ['hoyo', 'un hoyo', 'agujero'] },
    { pista: 'Tengo agujas y no coso, doy la hora y no hablo.', pistaExtra: 'La ves colgada en la pared.', respuestas: ['reloj', 'el reloj'] },
    { pista: 'Me estrujas y lloro, pero no tengo ojos.', pistaExtra: 'Se usa para lavar los platos.', respuestas: ['esponja', 'la esponja'] },
    { pista: 'Soy el rey de la selva, pero no tengo corona.', pistaExtra: 'Es un felino grande y melenudo.', respuestas: ['leon', 'león', 'el leon', 'el león'] },
    { pista: 'Cuanto más grande, menos se ve.', pistaExtra: 'Piensa en la noche.', respuestas: ['oscuridad', 'la oscuridad'] },
    { pista: 'Tengo hojas y no soy árbol, tengo lomo y no soy animal.', pistaExtra: 'La lees.', respuestas: ['libro', 'el libro', 'un libro'] },
    { pista: 'De día están guardadas y de noche aparecen brillando.', pistaExtra: 'Están en el cielo nocturno.', respuestas: ['estrellas', 'las estrellas'] }
];

// ============================================================
// UTILIDADES INTERNAS
// ============================================================
function numeroAleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function acertijoAleatorio() {
    return ACERTIJOS[Math.floor(Math.random() * ACERTIJOS.length)];
}

function normalizar(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function limpiarPartida(chatJid) {
    const partida = partidasActivas.get(chatJid);
    if (partida?.timeoutId) clearTimeout(partida.timeoutId);
    partidasActivas.delete(chatJid);
}

// ============================================================
// API PÚBLICA
// ============================================================
export function hayPartidaActiva(chatJid) {
    return partidasActivas.has(chatJid);
}

export async function crearAcertijo(sock, chatJid, msg) {
    const acertijo = acertijoAleatorio();

    const texto =
        '╭〔 🧩 𝐀𝐃𝐈𝐕𝐈𝐍𝐀𝐍𝐙𝐀 〕⬣\n┃\n' +
        `┃ "${acertijo.pista}"\n┃\n` +
        `┃ ⏱️ Tienes 45 segundos.\n` +
        `┃ 📌 Responde escribiendo la palabra\n` +
        `┃     directo, SIN el punto del bot.\n` +
        '┃\n╰━━━━━━━━━━━━━━━━⬣';

    const enviado = await sock.sendMessage(
        chatJid,
        { text: texto },
        { quoted: msg }
    );

    const partida = {
        acertijo,
        messageKey: enviado.key,
        creado: Date.now(),
        timeoutId: null
    };

    // A la mitad del tiempo se manda una pista extra, si existe.
    if (acertijo.pistaExtra) {
        setTimeout(() => {
            if (!partidasActivas.has(chatJid)) return;
            sock.sendMessage(chatJid, {
                text: `💡 *Pista:* ${acertijo.pistaExtra}`
            }).catch(() => {});
        }, TIEMPO_LIMITE_MS / 2);
    }

    partida.timeoutId = setTimeout(() => {
        revelarPorTiempo(sock, chatJid);
    }, TIEMPO_LIMITE_MS);

    partidasActivas.set(chatJid, partida);
}

export function cancelarPartida(chatJid) {
    const existia = partidasActivas.has(chatJid);
    limpiarPartida(chatJid);
    return existia;
}

async function revelarPorTiempo(sock, chatJid) {
    const partida = partidasActivas.get(chatJid);
    if (!partida) return;

    limpiarPartida(chatJid);

    const respuesta = partida.acertijo.respuestas[0];

    try {
        await sock.sendMessage(chatJid, {
            text:
                '╭〔 ⏱️ 𝐀𝐃𝐈𝐕𝐈𝐍𝐀𝐍𝐙𝐀 〕⬣\n┃\n' +
                '┃ ⌛ Se acabó el tiempo, nadie adivinó.\n┃\n' +
                `┃ ✅ La respuesta era: *${respuesta}*\n┃\n` +
                '╰━━━━━━━━━━━━━━━━⬣'
        });
    } catch (error) {
        console.error('[ADIVINANZA] Error revelando respuesta:', error?.message || error);
    }
}

// ============================================================
// PROCESAR UN MENSAJE ENTRANTE
// ============================================================
// Devuelve `true` si el mensaje era una respuesta válida de
// adivinanza y ya fue manejado. Devuelve `false` si no.
// ============================================================
export async function manejarMensajeAdivinanza(sock, msg) {
    const chatJid = msg.key.remoteJid;
    if (!chatJid) return false;

    const partida = partidasActivas.get(chatJid);
    if (!partida) return false;

    const texto = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ''
    ).trim();

    if (!texto) return false;

    const remitente = msg.key.participant || msg.key.remoteJid;

    const normalizado = normalizar(texto);
    const acerto = partida.acertijo.respuestas.some(
        r => normalizar(r) === normalizado
    );

    // No coincide con ninguna respuesta válida — podría ser
    // cualquier otro mensaje del chat, se ignora sin interferir.
    if (!acerto) return false;

    limpiarPartida(chatJid);

    const recompensa = numeroAleatorio(RECOMPENSA_MIN, RECOMPENSA_MAX);
    modificarDinero(remitente, recompensa);

    const respuestaFinal = partida.acertijo.respuestas[0];

    try {
        await sock.sendMessage(chatJid, {
            text:
                '╭〔 🎉 𝐀𝐃𝐈𝐕𝐈𝐍𝐀𝐍𝐙𝐀 〕⬣\n┃\n' +
                `┃ ✅ ¡@${remitente.split('@')[0]} adivinó!\n┃\n` +
                `┃ La respuesta era: *${respuestaFinal}*\n┃\n` +
                `┃ 💰 Recompensa: +$${recompensa.toLocaleString()}\n┃\n` +
                '╰━━━━━━━━━━━━━━━━⬣',
            mentions: [remitente]
        });
    } catch (error) {
        console.error('[ADIVINANZA] Error anunciando ganador:', error?.message || error);
    }

    return true;
}
