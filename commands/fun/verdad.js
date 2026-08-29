// commands/fun/verdad.js
// ============================================================
// COMANDO: VERDAD
// Suelta una pregunta random de "verdad" (estilo verdad o reto,
// pero solo la parte de verdad) para que la responda quien usó
// el comando, o la persona mencionada.
// Uso: .verdad
// Uso: .verdad @alguien
// ============================================================

const PREGUNTAS = [
    '¿Cuál es la mentira más grande que le has dicho a tus papás?',
    '¿A quién de este chat stalkeaste en redes sociales?',
    '¿Cuál es tu mayor miedo que casi nadie conoce?',
    '¿Alguna vez te hiciste el enfermo para no ir a trabajar o estudiar?',
    '¿Cuál es la app que más usas para perder el tiempo?',
    '¿Qué es lo más vergonzoso que te ha pasado en público?',
    '¿A quién le tienes más envidia (sana) en tu vida?',
    '¿Cuál es tu ex que más extrañas?',
    '¿Cuál es el secreto que jamás le contarías a tu pareja?',
    '¿Alguna vez leíste el chat privado de alguien sin permiso?',
    '¿Cuál es la comida que dices que odias pero en realidad te gusta?',
    '¿Qué es lo más raro que has buscado en Google?',
    '¿Alguna vez fingiste que te gustaba un regalo que odiabas?',
    '¿Cuál es tu peor hábito que nadie sabe?',
    '¿A quién de este grupo eliminarías si tuvieras que elegir a uno?',
    '¿Cuál es la excusa más tonta que has usado para cancelar un plan?',
    '¿Alguna vez le copiaste la tarea o examen a alguien?',
    '¿Cuál es tu red social donde stalkeas más?',
    '¿Cuál es tu mayor arrepentimiento hasta hoy?',
    '¿Alguna vez te enamoraste de la pareja de un amigo?',
    '¿Qué es lo más caro que le has robado a alguien (aunque sea sin querer)?',
    '¿Cuál es el chisme más grande que sabes de alguien en este chat?',
    '¿Alguna vez inventaste una historia para llamar la atención?',
    '¿Cuál es tu mayor inseguridad física?',
    '¿A quién le has mentido diciéndole "te quiero" sin sentirlo?',
    '¿Cuál es la peor calificación que has sacado en tu vida?',
    '¿Alguna vez te hiciste pasar por otra persona en internet?',
    '¿Cuál es tu talento oculto que casi nadie conoce?',
    '¿Cuál es la mentira piadosa que más repites?',
    '¿Qué es lo primero que revisas cuando entras al celular de alguien?'
];

export default {
    nombre: 'verdad',

    categoria: 'Diversión',

    alias: [
        'preguntaverdad'
    ],

    descripcion:
        'Suelta una pregunta random de "verdad". Uso: .verdad o .verdad @alguien',

    ejecutar: async ({
        sock,
        msg,
        jid
    }) => {

        const remitente =
            msg.key.participant ||
            msg.key.remoteJid;

        const mencionado =
            msg.message?.extendedTextMessage
                ?.contextInfo
                ?.mentionedJid?.[0];

        const objetivo =
            mencionado || remitente;

        const pregunta =
            PREGUNTAS[
                Math.floor(Math.random() * PREGUNTAS.length)
            ];

        const texto =
            '╭〔 🎭 𝐕𝐄𝐑𝐃𝐀𝐃 〕⬣\n' +
            '┃\n' +
            `┃ 👤 Le toca a @${objetivo.split('@')[0]}\n` +
            '┃\n' +
            `┃ ❓ ${pregunta}\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣';

        await sock.sendMessage(
            jid,
            {
                text: texto,
                mentions: [objetivo]
            },
            {
                quoted: msg
            }
        );
    }
};
