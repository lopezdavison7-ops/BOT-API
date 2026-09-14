// commands/fun/ship.js
// ============================================================
// BOT-API — SHIP (Canvas local ULTRA RÁPIDO)
// ============================================================
import { createCanvas, loadImage } from '@napi-rs/canvas';

// ---------- AVATAR CON INICIALES (cuando falla la foto) ----------
function drawAvatarWithInitials(ctx, x, y, size, nombre, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Iniciales
    const initials = nombre.substring(0, 2).toUpperCase();
    ctx.font = `bold ${size * 0.4}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(initials, x + size / 2, y + size / 2);
    
    ctx.restore();
    
    // Borde blanco
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
}

// ---------- DIBUJAR AVATAR CON FOTO ----------
async function drawAvatarWithPhoto(ctx, sock, jid, x, y, size, nombre, color) {
    try {
        // Timeout de 500ms (ultra rápido)
        const url = await Promise.race([
            sock.profilePictureUrl(jid, 'image'),
            new Promise((_, reject) => setTimeout(() => reject('timeout'), 500))
        ]);
        
        if (!url) throw new Error('No URL');
        
        const res = await Promise.race([
            fetch(url),
            new Promise((_, reject) => setTimeout(() => reject('timeout'), 500))
        ]);
        
        if (!res.ok) throw new Error('Fetch failed');
        
        const buffer = Buffer.from(await res.arrayBuffer());
        const img = await loadImage(buffer);
        
        // Dibujar foto en círculo
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();
        
        // Borde blanco
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        
    } catch {
        // Si falla, dibujar avatar con iniciales
        drawAvatarWithInitials(ctx, x, y, size, nombre, color);
    }
}

// ---------- DIBUJAR CORAZÓN ----------
function drawHeart(ctx, centerX, centerY, size) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - size * 0.08);
    ctx.bezierCurveTo(
        centerX - size * 0.16, centerY - size * 0.36,
        centerX - size * 0.42, centerY - size * 0.45,
        centerX - size * 0.42, centerY - size * 0.05
    );
    ctx.bezierCurveTo(
        centerX - size * 0.42, centerY + size * 0.28,
        centerX - size * 0.2, centerY + size * 0.42,
        centerX, centerY + size * 0.55
    );
    ctx.bezierCurveTo(
        centerX + size * 0.2, centerY + size * 0.42,
        centerX + size * 0.42, centerY + size * 0.28,
        centerX + size * 0.42, centerY - size * 0.05
    );
    ctx.bezierCurveTo(
        centerX + size * 0.42, centerY - size * 0.45,
        centerX + size * 0.16, centerY - size * 0.36,
        centerX, centerY - size * 0.08
    );
    ctx.closePath();
    ctx.fillStyle = '#ff007f';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
    ctx.restore();
}

// ---------- BARRA DE PROGRESO ----------
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
    const heartX = x + 10 + fillWidth;
    drawHeart(ctx, heartX, y + height / 2, 80);
}

export default {
    nombre: 'ship',
    categoria: 'Fun',
    alias: ['pareja', 'amor', 'compatibilidad'],
    descripcion: 'Calcula compatibilidad',
    uso: '.ship @persona',
    ejecutar: async ({ sock, msg, argumento }) => {
        const remoteJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0];

        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const mentioned = ctx?.mentionedJid || [];
        const quotedParticipant = ctx?.participant;

        let userA = msg.key.participant || msg.key.remoteJid;
        let userB = quotedParticipant || mentioned[0];

        if (!userB) {
            return await s.sendMessage(
                remoteJid,
                { text: '❌ Usa: `.ship @persona` o responde a un mensaje' },
                { quoted: msg }
            );
        }

        const percent = Math.floor(Math.random() * 101);
        const mensaje = percent >= 90 ? '¡BODA!' :
                       percent >= 75 ? '¡AMOR!' :
                       percent >= 60 ? '¡QUÍMICA!' :
                       percent >= 40 ? 'TAL VEZ' :
                       percent >= 25 ? 'AMIGOS' : 'NO';

        // Canvas
        const canvas = createCanvas(800, 400);
        const c = canvas.getContext('2d');

        // Fondo gradiente
        const gradient = c.createLinearGradient(0, 0, 800, 400);
        gradient.addColorStop(0, '#b542e8');
        gradient.addColorStop(1, '#8e24aa');
        c.fillStyle = gradient;
        c.fillRect(0, 0, 800, 400);

        // Nombres
        const numA = userA.split('@')[0].split(':')[0];
        const numB = userB.split('@')[0].split(':')[0];
        const nombreA = msg.pushName || numA;
        const nombreB = numB;

        // Colores para avatares
        const colorA = '#ff6b9d';
        const colorB = '#4ecdc4';

        // Dibujar avatares en PARALELO (ultra rápido)
        await Promise.all([
            drawAvatarWithPhoto(c, s, userA, 50, 50, 200, nombreA, colorA),
            drawAvatarWithPhoto(c, s, userB, 550, 50, 200, nombreB, colorB)
        ]);

        // Corazón central
        drawHeart(c, 400, 150, 120);

        // Porcentaje
        c.font = 'bold 40px Arial';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#ffffff';
        c.fillText(`${percent}%`, 400, 150);

        // Nombres debajo
        c.font = 'bold 24px Arial';
        c.fillText(nombreA, 150, 280);
        c.fillText(nombreB, 650, 280);

        // Barra de progreso
        drawProgressBar(c, 100, 320, 600, 40, percent);

        // Mensaje
        c.font = 'bold 28px Arial';
        c.fillStyle = '#ffffff';
        c.fillText(mensaje, 400, 380);

        const buffer = canvas.toBuffer('image/png');

        await s.sendMessage(
            remoteJid,
            {
                image: buffer,
                caption: `💑 @${numA} + @${numB}\n📊 *${percent}%* ${mensaje}`,
                mentions: [userA, userB]
            },
            { quoted: msg }
        );
    }
};