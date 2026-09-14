// commands/fun/ship.js
// ============================================================
// BOT-API — SHIP (Canvas local - @napi-rs/canvas)
// ============================================================
import { createCanvas, loadImage } from '@napi-rs/canvas';

// ---------- OBTENER FOTO DE PERFIL ----------
async function getProfilePic(socket, jid) {
    try {
        const url = await socket.profilePictureUrl(jid, 'image');
        const res = await fetch(url);
        if (!res.ok) return null;
        const buffer = Buffer.from(await res.arrayBuffer());
        return await loadImage(buffer);
    } catch {
        return null;
    }
}

// ---------- DIBUJAR AVATAR EN CÍRCULO ----------
function drawCircleAvatar(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    
    if (img) {
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
    } else {
        ctx.fillStyle = '#6be368';
        ctx.fill();
        // Emoji si no hay foto
        ctx.fillStyle = '#ffffff';
        ctx.font = `${size * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👤', x + size / 2, y + size / 2);
    }
    ctx.restore();

    // Borde blanco
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
}

// ---------- DIBUJAR CORAZÓN CON BEZIER ----------
function drawHeart(ctx, centerX, centerY, size, fill, stroke, lineWidth) {
    const top = centerY - size * 0.45;
    const bottom = centerY + size * 0.55;
    const lobe = size * 0.42;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - size * 0.08);
    ctx.bezierCurveTo(
        centerX - size * 0.16, centerY - size * 0.36,
        centerX - lobe, top,
        centerX - lobe, centerY - size * 0.05
    );
    ctx.bezierCurveTo(
        centerX - lobe, centerY + size * 0.28,
        centerX - size * 0.2, centerY + size * 0.42,
        centerX, bottom
    );
    ctx.bezierCurveTo(
        centerX + size * 0.2, centerY + size * 0.42,
        centerX + lobe, centerY + size * 0.28,
        centerX + lobe, centerY - size * 0.05
    );
    ctx.bezierCurveTo(
        centerX + lobe, top,
        centerX + size * 0.16, centerY - size * 0.36,
        centerX, centerY - size * 0.08
    );
    ctx.closePath();
    
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.restore();
}

// ---------- BARRA DE PROGRESO CON CORAZÓN ----------
function drawProgressBar(ctx, x, y, width, height, percent) {
    const radius = height / 2;

    // Fondo blanco
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    // Relleno rojo
    const fillWidth = Math.max(0, ((width - 20) * percent) / 100);
    if (fillWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x + 10, y + 10, fillWidth, height - 20, radius - 5);
        ctx.fillStyle = '#ff0505';
        ctx.fill();
        ctx.restore();
    }

    // Corazón en la punta
    const heartX = x + 10 + fillWidth - 10;
    drawHeart(ctx, heartX, y + height / 2 - 8, 100, '#ff1010', '#050505', 5);
}

// ---------- NIVELES DE RESPUESTA ----------
const NIVELES = [
    { min: 100, emoji: '💍', msg: '¡Ya casense y tengan hijos!' },
    { min: 90,  emoji: '✨', msg: '¡Almas gemelas!' },
    { min: 85,  emoji: '💕', msg: '¡Son el uno para el otro!' },
    { min: 70,  emoji: '😍', msg: '¡Sus miradas se cruzan!' },
    { min: 50,  emoji: '💖', msg: '¡Hay química!' },
    { min: 30,  emoji: '🤔', msg: 'Mejor quedan como amigos' },
    { min: 0,   emoji: '💀', msg: 'Cero compatibilidad, lo siento' }
];

function obtenerNivel(p) {
    for (const n of NIVELES) if (p >= n.min) return n;
    return NIVELES[NIVELES.length - 1];
}

// ============================================================
// COMANDO
// ============================================================
export default {
    nombre: 'ship',
    categoria: 'Fun',
    alias: ['pareja', 'amor', 'compatibilidad'],
    descripcion: 'Genera una tarjeta de compatibilidad entre dos usuarios',
    uso: '.ship @persona o responde a un mensaje',
    ejecutar: async ({ sock, msg, argumento }) => {
        const remoteJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0];

        const messageContext = msg.message?.extendedTextMessage?.contextInfo;
        const mentioned = messageContext?.mentionedJid || [];
        const quotedParticipant = messageContext?.participant;

        let userA = msg.key.participant || msg.key.remoteJid;
        let userB = null;

        if (mentioned.length >= 2) {
            userA = mentioned[0];
            userB = mentioned[1];
        } else if (mentioned.length === 1) {
            userB = mentioned[0];
        } else if (quotedParticipant) {
            userB = quotedParticipant;
        }

        if (!userA || !userB) {
            return await s.sendMessage(
                remoteJid,
                {
                    text:
                        '╭━━〔 💘 𝐒𝐇𝐈𝐏 〕━━⬣\n' +
                        '┃\n' +
                        '┃ ❌ No pude identificar a los usuarios\n' +
                        '┃\n' +
                        '┃ 📋 Uso:\n' +
                        '┃ • .ship @usuario\n' +
                        '┃ • Responde a un mensaje\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                },
                { quoted: msg }
            );
        }

        if (userA === userB) {
            return await s.sendMessage(
                remoteJid,
                { text: '💘 No podés hacerte ship con vos mismo, xd.' },
                { quoted: msg }
            );
        }

        // ---------- CREAR CANVAS ----------
        const width = 1024;
        const height = 740;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Fondo con gradiente
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#b542e8');
        gradient.addColorStop(1, '#8e24aa');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Cargar fotos en paralelo
        const avatarSize = 310;
        const avatarY = 85;
        const avatarX = 85;
        const [imgA, imgB] = await Promise.all([
            getProfilePic(s, userA),
            getProfilePic(s, userB)
        ]);

        // Dibujar avatares
        drawCircleAvatar(ctx, imgA, avatarX, avatarY, avatarSize);
        drawCircleAvatar(ctx, imgB, width - avatarX - avatarSize, avatarY, avatarSize);

        // Porcentaje
        const percent = Math.floor(Math.random() * 101);
        const nivel = obtenerNivel(percent);

        // Corazón central
        drawHeart(ctx, 512, 400, 180, '#ff007f', '#050505', 5);

        // Texto del porcentaje
        ctx.font = 'bold 45px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${percent}%`, 512, 420);

        // Barra de progreso
        drawProgressBar(ctx, 85, 580, 854, 78, percent);

        // Nombres debajo de los avatares
        const numA = userA.split('@')[0].split(':')[0];
        const numB = userB.split('@')[0].split(':')[0];
        
        let nombreA = msg.pushName || numA;
        let nombreB = numB;
        try {
            const contact = await s.getContact?.(userB);
            if (contact?.name) nombreB = contact.name;
        } catch {}

        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(nombreA, avatarX + avatarSize / 2, avatarY + avatarSize + 40);
        ctx.fillText(nombreB, width - avatarX - avatarSize / 2, avatarY + avatarSize + 40);

        // Convertir a buffer
        const buffer = canvas.toBuffer('image/png');

        const caption =
            `╭━━〔 💘 𝐒𝐇𝐈𝐏 〕━━⬣\n` +
            `┃\n` +
            `┃ @${numA} 💞 @${numB}\n` +
            `┃\n` +
            `┃ 📊 *Porcentaje:* ${percent}%\n` +
            `┃ ${nivel.emoji} ${nivel.msg}\n` +
            `┃\n` +
            `╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;

        await s.sendMessage(
            remoteJid,
            {
                image: buffer,
                caption,
                mentions: [userA, userB]
            },
            { quoted: msg }
        );
    }
};