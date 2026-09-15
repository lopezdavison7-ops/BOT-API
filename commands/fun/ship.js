// commands/fun/ship.js
// ============================================================
// BOT-API — SHIP (texto con menciones)
// ============================================================

// ---------- LIMPIAR JID ----------
function limpiarJid(jid) {
    const raw = jid.split('@')[0].split(':')[0];
    return (jid.includes('@lid') || raw.length > 12) ? raw.slice(-4) : raw;
}

// ---------- NIVELES DE COMPATIBILIDAD ----------
const NIVELES = [
    {
        min: 100, emoji: '💍', titulo: '¡BODA INMEDIATA!',
        frases: [
            'El universo los unió, no hay vuelta atrás',
            'Cupido usó doble flecha con ustedes',
            'Hasta las estrellas están de acuerdo'
        ]
    },
    {
        min: 95, emoji: '✨', titulo: 'ALMAS GEMELAS',
        frases: [
            'Estaban destinados desde antes de nacer',
            'Sus almas se reconocieron al instante',
            'Esto es amor del bueno, crack'
        ]
    },
    {
        min: 90, emoji: '💕', titulo: '¡CASENSE YA!',
        frases: [
            '¿Qué esperan? El amor no dura para siempre',
            'Cupido aprobó esta unión',
            'Ya hasta les veo el vestido y el traje'
        ]
    },
    {
        min: 80, emoji: '😍', titulo: 'PAREJA PERFECTA',
        frases: [
            'Hacen match hasta en el horóscopo',
            'La química es innegable',
            'Son el dúo dinámico del amor'
        ]
    },
    {
        min: 70, emoji: '💖', titulo: 'MUCHA QUÍMICA',
        frases: [
            'Hay chispas cuando se miran',
            'El flechazo está en el aire',
            'Algo bueno puede salir de aquí'
        ]
    },
    {
        min: 60, emoji: '💗', titulo: 'HAY ALGO AHÍ',
        frases: [
            'No es casualidad que se crucen tanto',
            'Cupido está tomando apuntes',
            'Podría ser el inicio de algo bonito'
        ]
    },
    {
        min: 50, emoji: '💞', titulo: 'MITAD Y MITAD',
        frases: [
            'Ni muy muy, ni tan tan',
            'Depende de ustedes, crack',
            'El destino los pone a prueba'
        ]
    },
    {
        min: 40, emoji: '🤔', titulo: 'TAL VEZ...',
        frases: [
            'Cupido está pensando si lanzar la flecha',
            'Podría funcionar con esfuerzo',
            'El amor es paciente, ¿no?'
        ]
    },
    {
        min: 30, emoji: '😬', titulo: 'ZONA DE AMIGOS',
        frases: [
            'Mejor quédense como amigos',
            'La amistad también es amor',
            'Cupido se equivocó de flecha'
        ]
    },
    {
        min: 20, emoji: '💭', titulo: 'MEJOR AMIGOS',
        frases: [
            'Son más hermanos que pareja',
            'El amor no siempre es romántico',
            'Quédense con la amistad, es más duradera'
        ]
    },
    {
        min: 10, emoji: '💀', titulo: 'F EN EL CHAT',
        frases: [
            'Cupido se fue de vacaciones',
            'Esto no pinta bien, crack',
            'Mejor intenten con otra persona'
        ]
    },
    {
        min: 0, emoji: '⚰️', titulo: 'ENTERRADO VIVO',
        frases: [
            'Aquí no hay nada que hacer',
            'Cupido rompió la flecha',
            'Ni el destino los quiere juntos'
        ]
    }
];

function obtenerNivel(p) {
    for (const n of NIVELES) {
        if (p >= n.min) return n;
    }
    return NIVELES[NIVELES.length - 1];
}

function fraseRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ---------- BARRA DE PROGRESO ----------
function barraProgreso(percent) {
    const lleno = Math.floor(percent / 10);
    const vacio = 10 - lleno;
    return '█'.repeat(lleno) + '░'.repeat(vacio);
}

export default {
    nombre: 'ship',
    categoria: 'Fun',
    alias: ['pareja', 'amor', 'compatibilidad', 'shippear'],
    descripcion: 'Calcula la compatibilidad amorosa entre dos personas',
    uso: '.ship @persona o responde a un mensaje',
    ejecutar: async ({ sock, msg, argumento }) => {
        const remoteJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0];

        const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
        const mentioned = ctxInfo?.mentionedJid || [];
        const quotedParticipant = ctxInfo?.participant;

        let userA = msg.key.participant || msg.key.remoteJid;
        let userB = quotedParticipant || mentioned[0];

        // Si menciona a 2 personas, shipearlas entre ellas
        if (mentioned.length >= 2) {
            userA = mentioned[0];
            userB = mentioned[1];
        }

        if (!userB) {
            return await s.sendMessage(
                remoteJid,
                {
                    text:
                        '╭━━〔 💘 𝐒𝐇𝐈𝐏 〕━━⬣\n' +
                        '┃\n' +
                        '┃ ❌ Falta la otra persona\n' +
                        '┃\n' +
                        '┃ 📋 Uso:\n' +
                        '┃ • .ship @persona\n' +
                        '┃ • Responde a un mensaje\n' +
                        '┃ • .ship @persona1 @persona2\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                },
                { quoted: msg }
            );
        }

        if (userA === userB) {
            return await s.sendMessage(
                remoteJid,
                {
                    text:
                        '╭━━〔 💘 𝐒𝐇𝐈𝐏 〕━━⬣\n' +
                        '┃\n' +
                        '┃ 🤣 No puedes shipearte contigo mismo\n' +
                        '┃\n' +
                        '┃ El amor propio es importante,\n' +
                        '┃ pero mejor menciona a alguien más\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                },
                { quoted: msg }
            );
        }

        // Generar porcentaje y nivel
        const percent = Math.floor(Math.random() * 101);
        const nivel = obtenerNivel(percent);
        const frase = fraseRandom(nivel.frases);
        const barra = barraProgreso(percent);

        const n1 = limpiarJid(userA);
        const n2 = limpiarJid(userB);

        // Construir mensaje bonito
        const texto =
            '╭━━〔 💘 𝐒𝐇𝐈𝐏𝐏𝐄𝐑 〕━━⬣\n' +
            '┃\n' +
            '┃ 💑 *Pareja del día*\n' +
            '┃\n' +
            `┃ ❤️ @${n1}\n` +
            '┃      ✖\n' +
            `┃ ❤️ @${n2}\n` +
            '┃\n' +
            '┃ ━━━━━━━━━━━━━━\n' +
            '┃\n' +
            `┃ 📊 *${percent}%* ${nivel.emoji}\n` +
            `┃ ${barra}\n` +
            '┃\n' +
            `┃ ✨ *${nivel.titulo}*\n` +
            '┃\n' +
            `┃ 💬 "${frase}"\n` +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        await s.sendMessage(
            remoteJid,
            {
                text: texto,
                mentions: [userA, userB]
            },
            { quoted: msg }
        );
    }
};