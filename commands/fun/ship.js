// commands/fun/ship.js
import { createCanvas, loadImage } from '@napi-rs/canvas';

// ---------- LIMPIAR JID: LID → número legible ----------
function limpiarJid(jid) {
    const raw = jid.split('@')[0].split(':')[0];
    
    // Si es LID (número muy largo, 13+ dígitos), mostrar solo últimos 4
    if (jid.includes('@lid') || raw.length > 12) {
        return raw.slice(-4);
    }
    // Si es número normal, mostrarlo completo
    return raw;
}

// ---------- OBTENER NOMBRE REAL (todos los métodos) ----------
async function obtenerNombre(sock, jid, pushName, remoteJid) {
    // 1. pushName del mensaje (el más confiable)
    if (pushName && pushName.length > 0 && !/^\d+$/.test(pushName)) {
        return pushName;
    }
    
    // 2. Buscar en metadata del grupo
    try {
        if (remoteJid?.endsWith('@g.us')) {
            const metadata = await sock.groupMetadata(remoteJid);
            const p = metadata.participants.find(x => x.id === jid);
            if (p?.pushName) return p.pushName;
            if (p?.notify) return p.notify;
        }
    } catch {}
    
    // 3. onWhatsApp (devuelve el nombre real registrado)
    try {
        const numero = jid.split('@')[0].split(':')[0];
        const result = await sock.onWhatsApp(numero);
        if (result?.[0]?.pushName) return result[0].pushName;
        if (result?.[0]?.name) return result[0].name;
    } catch {}
    
    // 4. sock.getName
    try {
        if (typeof sock.getName === 'function') {
            const n = await sock.getName(jid);
            if (n && n !== jid && !/^\d+$/.test(n)) return n;
        }
    } catch {}
    
    // 5. Fallback: número limpio (últimos 4 dígitos si es LID)
    return limpiarJid(jid);
}

// ---------- AVATAR CON INICIALES ----------
function drawAvatarWithInitials(ctx, x, y, size, nombre, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    const initials = String(nombre).substring(0, 2).toUpperCase();
    ctx.font = `bold ${size * 0.4}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(initials, x + size / 2, y + size / 2);
    ctx.restore();
    
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
}

// ---------- AVATAR CON FOTO ----------
async function drawAvatarWithPhoto(ctx, sock, jid, x, y, size, nombre, color) {
    try {
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
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();
        
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        
    } catch {
        drawAvatarWithInitials(ctx, x, y, size, nombre, color);
    }
}

// ---------- CORAZÓN ----------
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
    
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    
    const fillWidth = Math.max(0, ((width - 20) * percent) / 100);
    if (fillWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x + 10, y + 10, fillWidth, height - 20, radius - 5);
        ctx.fillStyle = '#ff0505';
        ctx.fill();
        ctx.restore();
    }
    
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

        const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
        const mentioned = ctxInfo?.mentionedJid || [];
        const quotedParticipant = ctxInfo?.participant;

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

        // Fondo
        const gradient = c.createLinearGradient(0, 0, 800, 400);
        gradient.addColorStop(0, '#b542e8');
        gradient.addColorStop(1, '#8e24aa');
        c.fillStyle = gradient;
        c.fillRect(0, 0, 800, 400);

        // ---------- OBTENER NOMBRES (5 métodos en cascada) ----------
        const [nombreA, nombreB] = await Promise.all([
            obtenerNombre(s, userA, msg.pushName, remoteJid),
            obtenerNombre(s, userB, null, remoteJid)
        ]);

        const colorA = '#ff6b9d';
        const colorB = '#4ecdc4';

        // Dibujar avatares en paralelo
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

        // Nombres (truncar solo si son muy largos)
        const maxLen = 14;
        const dispA = String(nombreA).length > maxLen 
            ? String(nombreA).substring(0, maxLen) + '...' 
            : String(nombreA);
        const dispB = String(nombreB).length > maxLen 
            ? String(nombreB).substring(0, maxLen) + '...' 
            : String(nombreB);
        
        c.font = 'bold 24px Arial';
        c.fillText(dispA, 150, 280);
        c.fillText(dispB, 650, 280);

        // Barra de progreso
        drawProgressBar(c, 100, 320, 600, 40, percent);

        // Mensaje
        c.font = 'bold 28px Arial';
        c.fillStyle = '#ffffff';
        c.fillText(mensaje, 400, 380);

        const buffer = canvas.toBuffer('image/png');
        const n1 = limpiarJid(userA);
        const n2 = limpiarJid(userB);

        await s.sendMessage(
            remoteJid,
            {
                image: buffer,
                caption: `💑 @${n1} + @${n2}\n📊 *${percent}%* ${mensaje}`,
                mentions: [userA, userB]
            },
            { quoted: msg }
        );
    }
};