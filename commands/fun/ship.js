// commands/fun/ship.js
// ============================================================
// BOT-API — SHIP (Delirius API - SIN ESPERAS)
// ============================================================

const NIVELES = [
    { min: 100, emoji: '👑', msg: '¡BODA INMEDIATA!' },
    { min: 95,  emoji: '💍', msg: 'ALMAS GEMELAS' },
    { min: 90,  emoji: '✨', msg: 'DESTINO ESCRITO' },
    { min: 80,  emoji: '💕', msg: 'PAREJA PERFECTA' },
    { min: 70,  emoji: '😍', msg: 'MUCHA QUÍMICA' },
    { min: 60,  emoji: '💖', msg: 'HAY ALGO AHÍ' },
    { min: 50,  emoji: '💗', msg: 'PODRÍA SER...' },
    { min: 40,  emoji: '🤔', msg: 'TAL VEZ...' },
    { min: 30,  emoji: '😬', msg: 'ZONA DE AMIGOS' },
    { min: 20,  emoji: '💭', msg: 'MEJOR AMIGOS' },
    { min: 10,  emoji: '💀', msg: 'F EN EL CHAT' },
    { min: 0,   emoji: '⚰️', msg: 'ENTERRADO VIVO' }
];

const FRASES = [
    'El destino ha hablado',
    'Los astros no mienten',
    'Cupido opinó fuerte',
    'Datos 100% reales no fake',
    'Cupido está orgulloso',
    'El universo conspira',
    'Ni la NASA lo calcula mejor'
];

function obtenerNivel(p) {
    for (const n of NIVELES) if (p >= n.min) return n;
    return NIVELES[NIVELES.length - 1];
}

async function getPP(sock, jid, fallback) {
    try {
        return await Promise.race([
            sock.profilePictureUrl(jid, 'image'),
            new Promise((_, rej) => setTimeout(() => rej('timeout'), 1500))
        ]);
    } catch {
        return fallback;
    }
}

export default {
    nombre: 'ship',
    categoria: 'Fun',
    alias: ['pareja', 'amor', 'compatibilidad'],
    descripcion: 'Calcula compatibilidad',
    uso: '.ship @persona',
    ejecutar: async ({ msg, sock }) => {
        const chatJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0];
        const sender = msg.key.participant || msg.key.remoteJid;
        const ctx = msg.message?.extendedTextMessage?.contextInfo;

        const target = ctx?.quotedMessage ? ctx.participant : ctx?.mentionedJid?.[0];
        if (!target) return;

        const porcentaje = Math.floor(Math.random() * 101);
        const nivel = obtenerNivel(porcentaje);
        const frase = FRASES[Math.floor(Math.random() * FRASES.length)];

        const fallback = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';

        // Cargar fotos en PARALELO con timeout
        const [pp1, pp2] = await Promise.all([
            getPP(s, sender, fallback),
            getPP(s, target, fallback)
        ]);

        const nombre1 = msg.pushName || sender.split('@')[0];
        const nombre2 = target.split('@')[0];
        const n1 = sender.split('@')[0];
        const n2 = target.split('@')[0];

        // Construir URL inmediatamente
        const apiUrl = `https://api.delirius.online/canvas/ship?image1=${encodeURIComponent(pp1)}&image2=${encodeURIComponent(pp2)}&name1=${encodeURIComponent(nombre1)}&name2=${encodeURIComponent(nombre2)}&percentage=${porcentaje}&text=${encodeURIComponent(nivel.msg)}`;

        const caption =
            `╭━━〔 💘 𝐒𝐇𝐈𝐏𝐏𝐄𝐑 〕━━⬣\n` +
            `┃\n` +
            `┃ 💑 @${n1} + @${n2}\n` +
            `┃\n` +
            `┃ 📊 *${porcentaje}%* ${nivel.emoji} ${nivel.msg}\n` +
            `┃ 💬 "${frase}"\n` +
            `┃\n` +
            `╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;

        try {
            // Enviar directamente SIN mensajes previos
            await s.sendMessage(
                chatJid,
                { image: { url: apiUrl }, caption, mentions: [sender, target] },
                { quoted: msg }
            );
        } catch (error) {
            // Fallback texto si falla la imagen
            const barra = '█'.repeat(Math.floor(porcentaje / 10)) + '░'.repeat(10 - Math.floor(porcentaje / 10));
            await s.sendMessage(
                chatJid,
                {
                    text: `💑 @${n1} + @${n2}\n📊 *${porcentaje}%* ${barra}\n${nivel.emoji} ${nivel.msg}`,
                    mentions: [sender, target]
                },
                { quoted: msg }
            );
        }
    }
};