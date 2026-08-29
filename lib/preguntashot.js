// lib/preguntashot.js
// ============================================================
// PREGUNTAS HOT — motor del juego
// ============================================================
// El bot le manda una pregunta atrevida/picante a alguien
// (quien usó el comando, o la persona mencionada). Cuando esa
// persona manda su siguiente mensaje en el chat (SIN el prefijo
// del bot, cualquier texto cuenta como "su respuesta"), el bot
// reacciona con un mensaje tipo asustado/en shock — mismo patrón
// de listener que TTT / Trivia / Adivinanza.
//
// Si la persona no contesta en el tiempo límite, la sesión se
// cierra sola y no pasa nada (no llena el chat de avisos).
// ============================================================

// chatJid -> { objetivo, pregunta, timeoutId, creado }
const sesionesActivas = new Map();

const TIEMPO_LIMITE_MS = 2 * 60 * 1000; // 2 minutos para responder

// ============================================================
// BANCO DE PREGUNTAS HOT
// (atrevidas/picantes pero sin nada explícito, para cualquier
// grupo — el chiste es la reacción exagerada del bot, no el
// contenido de la pregunta en sí)
// ============================================================
const PREGUNTAS = [
    '¿A quién de este chat te ligarías sin pensarlo dos veces?',
    '¿Alguna vez le escribiste "te extraño" a un ex a las 2am?',
    '¿Quién de aquí crees que besa mejor?',
    '¿Alguna vez te gustó el/la mejor amigo(a) de tu pareja?',
    '¿Le has mandado una foto tuya a alguien y te arrepentiste?',
    '¿Cuál es la peor excusa que has usado para salir con alguien a escondidas?',
    '¿Has stalkeado el perfil de tu crush más de 10 veces en un día?',
    '¿Alguna vez fingiste que no viste un mensaje para no responder?',
    '¿A quién de este grupo invitarías a una cita ahora mismo?',
    '¿Cuál es la cosa más atrevida que has hecho por alguien que te gusta?',
    '¿Le has sido infiel a alguien, aunque sea "solo un beso"?',
    '¿Cuál es tu tipo ideal de alguien en este chat?',
    '¿Alguna vez soñaste con alguien de este grupo?',
    '¿Le mentiste a tu pareja sobre dónde estabas alguna vez?',
    '¿Cuál es el chat más picante que has tenido con alguien?',
    '¿Te ha gustado alguien prohibido (comprometido, mayor, etc.)?',
    '¿Cuál es la señal que usas para saber que alguien te tira indirecta?',
    '¿Alguna vez te hiciste pasar por soltero(a) sin serlo?',
    '¿Qué harías si tu crush te escribe ahorita mismo?',
    '¿Cuál ha sido tu cita más incómoda?',
    '¿A quién eliminarías de tus contactos si tu pareja los viera?',
    '¿Cuál es tu emoji favorito para coquetear?',
    '¿Alguna vez te enamoraste por chat sin conocer a la persona en persona?',
    '¿Qué es lo más atrevido que le has dicho a alguien por mensaje?',
    '¿Cuál es tu mayor red flag en el amor?'
];

// ============================================================
// REACCIONES "ASUSTADAS" DEL BOT
// ============================================================
const REACCIONES = [
    '😱 *¡OH DIOS!* No esperaba esa respuesta...',
    '🙈 *¡AY NO!* Eso no me lo esperaba de ti...',
    '😰 *¡AUXILIO!* Creo que dijiste demasiado...',
    '😳 *¡WOW!* Eso fue... inesperado.',
    '🫣 *¡NO PUEDE SER!* Necesito sentarme un momento.',
    '😨 *¡DIOS MÍO!* Esto se puso intenso rápido.',
    '👀 *¡AJÁ!* Con que esas tenemos...',
    '😵 *¡QUÉ FUERTE!* Eso no me lo vi venir.',
    '🥶 *¡SE ME CONGELÓ EL ALMA!* Vaya respuesta.',
    '😬 *¡UY!* Eso va a quedar guardado en mi memoria...',
    '🫨 *¡ESTO ES DEMASIADO PARA MÍ!*',
    '🙀 *¡SANTO CIELO!* No sé ni qué decir.',
    '😅 *¡JAJAJA NO MANCHES!* Qué sincero(a).',
    '🤭 *¡ESO NO SE DICE ASÍ NOMÁS!*',
    '😖 *¡ALGUIEN LLAME A UN TESTIGO!* Esto pasó de verdad.'
];

// ============================================================
// UTILIDADES INTERNAS
// ============================================================
function preguntaAleatoria() {
    return PREGUNTAS[Math.floor(Math.random() * PREGUNTAS.length)];
}

function reaccionAleatoria() {
    return REACCIONES[Math.floor(Math.random() * REACCIONES.length)];
}

function limpiarSesion(chatJid) {
    const sesion = sesionesActivas.get(chatJid);
    if (sesion?.timeoutId) clearTimeout(sesion.timeoutId);
    sesionesActivas.delete(chatJid);
}

// ============================================================
// API PÚBLICA
// ============================================================
export function haySesionActiva(chatJid) {
    return sesionesActivas.has(chatJid);
}

export async function iniciarPreguntaHot(sock, chatJid, msg, objetivo) {
    const pregunta = preguntaAleatoria();

    const texto =
        '╭〔 🔥 𝐏𝐑𝐄𝐆𝐔𝐍𝐓𝐀𝐒 𝐇𝐎𝐓 〕⬣\n' +
        '┃\n' +
        `┃ 👤 Le toca a @${objetivo.split('@')[0]}\n` +
        '┃\n' +
        `┃ ❓ ${pregunta}\n` +
        '┃\n' +
        '┃ ⏱️ Responde antes de 2 minutos.\n' +
        '┃\n' +
        '╰━━━━━━━━━━━━━━━━⬣';

    await sock.sendMessage(
        chatJid,
        { text: texto, mentions: [objetivo] },
        { quoted: msg }
    );

    limpiarSesion(chatJid);

    const sesion = {
        objetivo,
        pregunta,
        creado: Date.now(),
        timeoutId: null
    };

    sesion.timeoutId = setTimeout(() => {
        sesionesActivas.delete(chatJid);
    }, TIEMPO_LIMITE_MS);

    sesionesActivas.set(chatJid, sesion);
}

export function cancelarPreguntaHot(chatJid) {
    const existia = sesionesActivas.has(chatJid);
    limpiarSesion(chatJid);
    return existia;
}

// ============================================================
// PROCESAR UN MENSAJE ENTRANTE
// ============================================================
// Devuelve `true` si el mensaje era la respuesta de la persona
// a la que le tocaba y ya fue manejado (el llamador NO debe
// seguirlo procesando como comando normal). Devuelve `false`
// si no tiene nada que ver con Preguntas Hot.
// ============================================================
export async function manejarMensajePreguntaHot(sock, msg) {
    const chatJid = msg.key.remoteJid;
    if (!chatJid) return false;

    const sesion = sesionesActivas.get(chatJid);
    if (!sesion) return false;

    const texto = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ''
    ).trim();

    // Mensajes vacíos (stickers, imágenes sin texto, etc.) no
    // cuentan como respuesta.
    if (!texto) return false;

    const remitente = msg.key.participant || msg.key.remoteJid;

    // Solo la persona a la que le tocaba puede "responder". Si
    // habla cualquier otro, se ignora sin interferir (podría ser
    // cualquier otra conversación del chat).
    if (remitente !== sesion.objetivo) return false;

    limpiarSesion(chatJid);

    try {
        await sock.sendMessage(
            chatJid,
            { text: reaccionAleatoria() },
            { quoted: msg }
        );
    } catch (error) {
        console.error('[PREGUNTASHOT] Error mandando reacción:', error?.message || error);
    }

    return true;
}
