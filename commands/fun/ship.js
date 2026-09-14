import { createCanvas, loadImage } from '@napi-rs/canvas';

// ---------- NIVELES DE RESPUESTA (12 niveles) ----------
const NIVELES = [
    { min: 100, emoji: '👑', msg: '¡BODA INMEDIATA!', color: '#ffd700' },
    { min: 95,  emoji: '💍', msg: 'ALMAS GEMELAS', color: '#ff69b4' },
    { min: 90,  emoji: '✨', msg: 'DESTINO ESCRITO', color: '#ff69b4' },
    { min: 80,  emoji: '💕', msg: 'PAREJA PERFECTA', color: '#ff6b9d' },
    { min: 70,  emoji: '😍', msg: 'MUCHA QUÍMICA', color: '#ff6b9d' },
    { min: 60,  emoji: '💖', msg: 'HAY ALGO AHÍ', color: '#ff85a2' },
    { min: 50,  emoji: '💗', msg: 'PODRÍA SER...', color: '#ff85a2' },
    { min: 40,  emoji: '🤔', msg: 'TAL VEZ...', color: '#ffa502' },
    { min: 30,  emoji: '😬', msg: 'ZONA DE AMIGOS', color: '#ffa502' },
    { min: 20,  emoji: '💭', msg: 'MEJOR AMIGOS', color: '#95a5a6' },
    { min: 10,  emoji: '💀', msg: 'F EN EL CHAT', color: '#95a5a6' },
    { min: 0,   emoji: '⚰️', msg: 'ENTERRADO VIVO', color: '#636e72' }
];

// ---------- FRASES EXTRA RANDOM ----------
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

// ---------- Cargar foto con timeout (rápido) ----------
async function cargarFoto(s, jid) {
    try {
        const url = await Promise.race([
            s.profilePictureUrl(jid, 'image'),
            new Promise((_, rej) => setTimeout(() => rej('timeout'), 1500))
        ]);
        return await Promise.race([
            loadImage(url),
            new Promise((_, rej) => setTimeout(() => rej('timeout'), 2000))
        ]);
    } catch {
        return null;
    }
}

export default {
    nombre: 'ship',
    categoria: 'Fun',
    alias: ['pareja', 'amor', 'compatibilidad'],
    descripcion: 'Calcula compatibilidad con imagen canvas',
    uso: '.ship @persona',
    ejecutar: async ({ msg, argumento, responder, sock }) => {
        const chatJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0];
        const sender = msg.key.participant || msg.key.remoteJid;
        const ctx = msg.message?.extendedTextMessage?.contextInfo;

        const target = ctx?.quotedMessage ? ctx.participant : ctx?.mentionedJid?.[0];

        if (!target) {
            return responder.texto('❌ Usa: `.ship @persona` o responde a un mensaje');
        }

        const porcentaje = Math.floor(Math.random() * 101);
        const nivel = obtenerNivel(porcentaje);
        const frase = FRASES[Math.floor(Math.random() * FRASES.length)];

        try {
            // ⚡ DESCARGA EN PARALELO (2x más rápido)
            const [img1, img2] = await Promise.all([
                cargarFoto(s, sender),
                cargarFoto(s, target)
            ]);

            // Canvas optimizado
            const canvas = createCanvas(800, 400);
            const c = canvas.getContext('2d');

            // Fondo gradiente
            const grad = c.createLinearGradient(0, 0, 800, 400);
            grad.addColorStop(0, '#ff6b9d');
            grad.addColorStop(0.5, '#c44569');
            grad.addColorStop(1, '#8e2657');
            c.fillStyle = grad;
            c.fillRect(0, 0, 800, 400);

            // Corazones decorativos de fondo (rápido)
            c.globalAlpha = 0.15;
            c.font = '30px Arial';
            for (let i = 0; i < 10; i++) {
                c.fillText('💕', Math.random() * 750, Math.random() * 380);
            }
            c.globalAlpha = 1;

            // ---------- FOTO 1 ----------
            if (img1) {
                c.save();
                c.beginPath();
                c.arc(200, 200, 100, 0, Math.PI * 2);
                c.clip();
                c.drawImage(img1, 100, 100, 200, 200);
                c.restore();
            } else {
                c.fillStyle = '#ffffff';
                c.beginPath();
                c.arc(200, 200, 100, 0, Math.PI * 2);
                c.fill();
                c.font = '80px Arial';
                c.textAlign = 'center';
                c.textBaseline = 'middle';
                c.fillText('👤', 200, 200);
            }

            // ---------- FOTO 2 ----------
            if (img2) {
                c.save();
                c.beginPath();
                c.arc(600, 200, 100, 0, Math.PI * 2);
                c.clip();
                c.drawImage(img2, 500, 100, 200, 200);
                c.restore();
            } else {
                c.fillStyle = '#ffffff';
                c.beginPath();
                c.arc(600, 200, 100, 0, Math.PI * 2);
                c.fill();
                c.font = '80px Arial';
                c.textAlign = 'center';
                c.textBaseline = 'middle';
                c.fillText('👤', 600, 200);
            }

            // Bordes blancos
            c.strokeStyle = '#ffffff';
            c.lineWidth = 6;
            c.beginPath(); c.arc(200, 200, 100, 0, Math.PI * 2); c.stroke();
            c.beginPath(); c.arc(600, 200, 100, 0, Math.PI * 2); c.stroke();

            // Corazón central
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.font = '90px Arial';
            c.fillText('💖', 400, 170);

            // Porcentaje con color según nivel
            c.font = 'bold 55px Arial';
            c.fillStyle = nivel.color;
            c.fillText(`${porcentaje}%`, 400, 290);

            // Mensaje del nivel
            c.font = 'bold 30px Arial';
            c.fillStyle = '#ffffff';
            c.fillText(`${nivel.emoji} ${nivel.msg}`, 400, 350);

            // Barra de progreso debajo del corazón
            const barraAncho = 160;
            const barraX = 400 - barraAncho / 2;
            c.fillStyle = 'rgba(255,255,255,0.3)';
            c.fillRect(barraX, 235, barraAncho, 12);
            c.fillStyle = nivel.color;
            c.fillRect(barraX, 235, (barraAncho * porcentaje) / 100, 12);

            // JPEG calidad 70 (más rápido que 80)
            const buffer = canvas.toBuffer('image/jpeg', 70);

            const n1 = sender.split('@')[0];
            const n2 = target.split('@')[0];

            await s.sendMessage(chatJid, {
                image: buffer,
                caption:
                    `╭━━〔 💘 𝐒𝐇𝐈𝐏𝐏𝐄𝐑 〕━━⬣\n` +
                    `┃\n` +
                    `┃ 💑 @${n1} + @${n2}\n` +
                    `┃\n` +
                    `┃ 📊 *${porcentaje}%* ${nivel.emoji} ${nivel.msg}\n` +
                    `┃ 💬 "${frase}"\n` +
                    `┃\n` +
                    `╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`,
                mentions: [sender, target]
            }, { quoted: msg });

        } catch (error) {
            console.error('[SHIP]', error?.message);
            // Fallback texto rápido
            const n1 = sender.split('@')[0];
            const n2 = target.split('@')[0];
            const barra = '█'.repeat(Math.floor(porcentaje / 10)) + '░'.repeat(10 - Math.floor(porcentaje / 10));
            await s.sendMessage(chatJid, {
                text: `💑 @${n1} + @${n2}\n📊 *${porcentaje}%* ${barra}\n${nivel.emoji} ${nivel.msg}`,
                mentions: [sender, target]
            }, { quoted: msg });
        }
    }
};