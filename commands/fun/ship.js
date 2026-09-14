// commands/fun/ship.js
// ============================================================
// BOT-API — SHIP (Delirius Canvas API - ULTRA RÁPIDO)
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
    'Resultado científicamente random',
    'El amor es ciego... y el bot también',
    'Datos 100% reales no fake',
    'Cupido está orgulloso',
    'El universo conspira',
    'Ni la NASA lo calcula mejor'
];

function obtenerNivel(porcentaje) {
    for (const n of NIVELES) {
        if (porcentaje >= n.min) return n;
    }
    return NIVELES[NIVELES.length - 1];
}

export default {
    nombre: 'ship',
    categoria: 'Fun',
    alias: ['pareja', 'amor', 'compatibilidad'],
    descripcion: 'Calcula compatibilidad con imagen canvas',
    uso: '.ship @persona o responde a un mensaje',
    ejecutar: async ({ msg, argumento, responder, sock }) => {
        const chatJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0] || Object.values(global.conns)[0];
        const sender = msg.key.participant || msg.key.remoteJid;
        const ctx = msg.message?.extendedTextMessage?.contextInfo;

        // Detectar target
        let target = null;
        if (ctx?.quotedMessage) {
            target = ctx.participant;
        } else if (ctx?.mentionedJid?.length > 0) {
            target = ctx.mentionedJid[0];
        }

        if (!target) {
            return responder.texto(
                '╭━━〔 💘 𝐒𝐇𝐈𝐏 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta la otra persona\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .ship @persona\n' +
                '┃ • Responde a un mensaje\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            // Obtener fotos de perfil
            let pp1 = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';
            let pp2 = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';

            try { pp1 = await s.profilePictureUrl(sender, 'image'); } catch {}
            try { pp2 = await s.profilePictureUrl(target, 'image'); } catch {}

            // Obtener nombres
            const nombre1 = msg.pushName || sender.split('@')[0];
            let nombre2 = target.split('@')[0];
            try {
                const contact = await s.getContact?.(target);
                if (contact?.name) nombre2 = contact.name;
            } catch {}

            // Generar porcentaje
            const porcentaje = Math.floor(Math.random() * 101);
            const nivel = obtenerNivel(porcentaje);
            const frase = FRASES[Math.floor(Math.random() * FRASES.length)];

            // Construir URL de la API
            const apiUrl = `https://api.delirius.online/canvas/ship?` +
                `image1=${encodeURIComponent(pp1)}` +
                `&image2=${encodeURIComponent(pp2)}` +
                `&name1=${encodeURIComponent(nombre1)}` +
                `&name2=${encodeURIComponent(nombre2)}` +
                `&percentage=${porcentaje}` +
                `&text=${encodeURIComponent(nivel.msg)}`;

            const n1 = sender.split('@')[0];
            const n2 = target.split('@')[0];

            const caption =
                `╭━━〔 💘 𝐒𝐇𝐈𝐏𝐏𝐄𝐑 〕━━⬣\n` +
                `┃\n` +
                `┃ 💑 @${n1} + @${n2}\n` +
                `┃\n` +
                `┃ 📊 *${porcentaje}%* ${nivel.emoji} ${nivel.msg}\n` +
                `┃ 💬 "${frase}"\n` +
                `┃\n` +
                `╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;

            await s.sendMessage(
                chatJid,
                { image: { url: apiUrl }, caption, mentions: [sender, target] },
                { quoted: msg }
            );

        } catch (error) {
            console.error('[SHIP] Error:', error?.message || error);
            
            // Fallback: texto simple
            const porcentaje = Math.floor(Math.random() * 101);
            const nivel = obtenerNivel(porcentaje);
            const n1 = sender.split('@')[0];
            const n2 = target.split('@')[0];
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