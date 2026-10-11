const CLASES = [
    { nombre: 'Guerrero', emoji: '⚔️', hp: 120, min: 12, max: 22, crit: 0.18 },
    { nombre: 'Mago', emoji: '🧙', hp: 90, min: 10, max: 30, crit: 0.25 },
    { nombre: 'Ninja', emoji: '🥷', hp: 100, min: 12, max: 26, crit: 0.30 },
    { nombre: 'Tanque', emoji: '🛡️', hp: 150, min: 8, max: 17, crit: 0.10 },
    { nombre: 'Asesino', emoji: '🗡️', hp: 95, min: 14, max: 28, crit: 0.35 },
    { nombre: 'Berserker', emoji: '🪓', hp: 110, min: 6, max: 34, crit: 0.20 },
    { nombre: 'Monje', emoji: '🥋', hp: 105, min: 11, max: 22, crit: 0.22 },
    { nombre: 'Francotirador', emoji: '🎯', hp: 95, min: 8, max: 32, crit: 0.28 },
    { nombre: 'Vampiro', emoji: '🧛', hp: 100, min: 10, max: 24, crit: 0.20 },
    { nombre: 'Hechicero', emoji: '🔮', hp: 92, min: 9, max: 29, crit: 0.27 }
];

const GOLPES = [
    'lanza un golpe seco',
    'conecta un combo brutal',
    'ataca por sorpresa',
    'suelta una patada voladora',
    'acierta un golpe crítico en la mandíbula',
    'encadena una lluvia de golpes',
    'pega con todo su poder',
    'arrincona a su rival',
    'lanza un ataque cargado',
    'encontró el punto débil'
];

const ESQUIVAS = [
    'esquivó el ataque como un rayo',
    'se agachó justo a tiempo',
    'bloqueó con los brazos',
    'desapareció y apareció detrás',
    'rodó por el suelo y lo libró'
];

const aleatorio = arr => arr[Math.floor(Math.random() * arr.length)];
const entero = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function barra(hp, maxHp) {
    const llenos = Math.max(0, Math.round((hp / maxHp) * 10));
    return '█'.repeat(llenos) + '░'.repeat(10 - llenos);
}

function crearLuchador(jid) {
    const clase = aleatorio(CLASES);
    return {
        jid,
        numero: String(jid).split('@')[0],
        clase,
        hp: clase.hp,
        maxHp: clase.hp
    };
}

function atacar(atacante, defensor) {
    const c = atacante.clase;
    if (Math.random() < 0.10) {
        return { tipo: 'esquiva', texto: esquiva(defensor, atacante) };
    }
    const critico = Math.random() < c.crit;
    let dano = entero(c.min, c.max);
    if (critico) dano = Math.round(dano * 1.8);
    dano = Math.max(1, dano);
    defensor.hp = Math.max(0, defensor.hp - dano);
    return {
        tipo: 'golpe',
        dano,
        critico,
        texto: `${c.emoji} @${atacante.numero} ${aleatorio(GOLPES)} a @${defensor.numero} *-${dano}*${critico ? ' 💥' : ''}`
    };
}

function esquiva(defensor, atacante) {
    return `💨 @${defensor.numero} ${aleatorio(ESQUIVAS)} (atacó @${atacante.numero})`;
}

export default {
    nombre: 'pelea',
    categoria: 'Fun',
    alias: ['batalla', 'combate', 'fight', 'duelo'],
    descripcion: 'Simula una pelea épica entre dos usuarios. Uso: .pelea @persona',
    uso: '.pelea @persona (o responde a su mensaje)',

    ejecutar: async ({ sock, msg, jid }) => {
        const s = sock || global.conns?.[0];
        const ctxInfo = msg.message?.extendedTextMessage?.contextInfo
            || msg.message?.imageMessage?.contextInfo
            || msg.message?.videoMessage?.contextInfo
            || msg.message?.buttonsResponseMessage?.contextInfo
            || {};

        const mentioned = ctxInfo.mentionedJid || [];
        const citado = ctxInfo.participant;
        const remitente = msg.key.participant || msg.key.senderPn || msg.key.remoteJid;

        let retador = remitente;
        let rival = citado || mentioned[0];

        if (mentioned.length >= 2) {
            retador = mentioned[0];
            rival = mentioned[1];
        }

        const ayuda = (texto) => s.sendMessage(jid, {
            text:
                '╭━━〔 🥊 𝐏𝐄𝐋𝐄𝐀 〕━━⬣\n' +
                '┃\n' +
                `┃ ${texto}\n` +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .pelea @persona\n' +
                '┃ • Responde a un mensaje\n' +
                '┃ • .pelea @persona1 @persona2\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        }, { quoted: msg });

        if (!rival) return ayuda('❌ Falta el rival');
        if (retador === rival) return ayuda('🤣 No puedes pelear contigo mismo');

        const a = crearLuchador(retador);
        const b = crearLuchador(rival);

        const ronda = [];
        ronda.push(`┃ ${a.clase.emoji} @${a.numero} · *${a.clase.nombre}*`);
        ronda.push(`┃ ${b.clase.emoji} @${b.numero} · *${b.clase.nombre}*`);
        ronda.push('┃');
        ronda.push('┃ ━━━━ ⚔️ ¡COMBATE! ⚔️ ━━━━');
        ronda.push('┃');

        let turno = 0;
        let log = [];
        while (a.hp > 0 && b.hp > 0 && turno < 14) {
            turno++;
            const r1 = atacar(a, b);
            log.push(`┃ R${turno} · ${r1.texto}`);
            if (b.hp <= 0) break;
            const r2 = atacar(b, a);
            log.push(`┃ R${turno} · ${r2.texto}`);
        }

        if (log.length > 16) {
            log = [...log.slice(0, 8), '┃ … el combate se puso intenso …', ...log.slice(-6)];
        }

        const ganador = a.hp > 0 ? a : b;
        const perdedor = ganador === a ? b : a;

        const texto =
            '╭━━〔 🥊 𝐏𝐄𝐋𝐄𝐀 〕━━⬣\n' +
            ronda.join('\n') + '\n' +
            log.join('\n') + '\n' +
            '┃\n' +
            '┃ ━━━━ 🏁 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎 ━━━━\n' +
            '┃\n' +
            `┃ 🏆 @${ganador.numero} *${ganador.clase.nombre}* gana\n` +
            `┃ ❤️ HP final: *${ganador.hp}/${ganador.maxHp}*\n` +
            `┃ ${barra(ganador.hp, ganador.maxHp)}\n` +
            '┃\n' +
            `┃ 💀 @${perdedor.numero} quedó en el suelo\n` +
            `┃ ${barra(perdedor.hp, perdedor.maxHp)}\n` +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        await s.sendMessage(jid, {
            text: texto,
            mentions: [a.jid, b.jid]
        }, { quoted: msg });
    }
};
