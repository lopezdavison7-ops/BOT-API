// commands/fun/ship.js
// ============================================================
// BOT-API — SHIP con Canvas (@napi-rs/canvas)
// ============================================================
import { createCanvas, loadImage } from '@napi-rs/canvas';

export default {
    nombre: 'ship',
    categoria: 'Fun',
    alias: ['pareja', 'amor', 'compatibilidad'],
    descripcion: 'Calcula compatibilidad con imagen generada',
    uso: '.ship @persona o responde a un mensaje',
    ejecutar: async ({ msg, argumento, responder, sock }) => {
        const chatJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0] || Object.values(global.conns)[0];
        const sender = msg.key.participant || msg.key.remoteJid;

        let target = null;

        // Detectar target
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
            target = msg.message.extendedTextMessage.contextInfo.participant;
        } else {
            const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mencionados.length > 0) {
                target = mencionados[0];
            }
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

        await responder.texto('⏳ Generando imagen de compatibilidad...');

        try {
            // Obtener fotos de perfil
            let pp1 = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg'; // fallback
            let pp2 = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';

            try {
                pp1 = await s.profilePictureUrl(sender, 'image');
            } catch (e) { /* usar fallback */ }

            try {
                pp2 = await s.profilePictureUrl(target, 'image');
            } catch (e) { /* usar fallback */ }

            // Cargar imágenes
            const img1 = await loadImage(pp1);
            const img2 = await loadImage(pp2);

            // Crear canvas
            const canvas = createCanvas(800, 400);
            const ctx = canvas.getContext('2d');

            // Fondo con gradiente
            const gradient = ctx.createLinearGradient(0, 0, 800, 400);
            gradient.addColorStop(0, '#ff6b9d');
            gradient.addColorStop(0.5, '#c44569');
            gradient.addColorStop(1, '#ff6b9d');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 800, 400);

            // Patrón de corazones de fondo
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * 800;
                const y = Math.random() * 400;
                const size = Math.random() * 20 + 10;
                ctx.font = `${size}px Arial`;
                ctx.fillText('💕', x, y);
            }

            // Dibujar foto 1 (círculo)
            ctx.save();
            ctx.beginPath();
            ctx.arc(200, 200, 100, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img1, 100, 100, 200, 200);
            ctx.restore();

            // Borde blanco foto 1
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(200, 200, 100, 0, Math.PI * 2);
            ctx.stroke();

            // Dibujar foto 2 (círculo)
            ctx.save();
            ctx.beginPath();
            ctx.arc(600, 200, 100, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img2, 500, 100, 200, 200);
            ctx.restore();

            // Borde blanco foto 2
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(600, 200, 100, 0, Math.PI * 2);
            ctx.stroke();

            // Porcentaje
            const porcentaje = Math.floor(Math.random() * 101);

            // Corazón grande en el centro
            ctx.font = 'bold 120px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('💖', 400, 180);

            // Texto del porcentaje
            ctx.font = 'bold 60px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            ctx.fillText(`${porcentaje}%`, 400, 320);
            ctx.shadowBlur = 0;

            // Mensaje según porcentaje
            let mensaje = '';
            let emoji = '';
            if (porcentaje >= 90) {
                mensaje = '✨ ALMA GEMELA';
                emoji = '💍';
            } else if (porcentaje >= 75) {
                mensaje = '💕 PERFECTOS JUNTOS';
                emoji = '💑';
            } else if (porcentaje >= 50) {
                mensaje = '💖 HAY QUÍMICA';
                emoji = '💞';
            } else if (porcentaje >= 25) {
                mensaje = '💭 TAL VEZ...';
                emoji = '🤔';
            } else {
                mensaje = '💀 F EN EL CHAT';
                emoji = '❌';
            }

            // Texto del mensaje
            ctx.font = 'bold 30px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 8;
            ctx.fillText(mensaje, 400, 380);
            ctx.shadowBlur = 0;

            // Convertir canvas a buffer
            const buffer = canvas.toBuffer('image/png');

            // Obtener nombres
            const n1 = sender.split('@')[0];
            const n2 = target.split('@')[0];

            const caption =
                '╭━━〔 💘 𝐒𝐇𝐈𝐏𝐏𝐄𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ 💑 @' + n1 + ' + @' + n2 + '\n' +
                '┃\n' +
                '┃ 📊 Compatibilidad: *' + porcentaje + '%*\n' +
                '┃ ' + emoji + ' ' + mensaje + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await s.sendMessage(
                chatJid,
                { image: buffer, caption, mentions: [sender, target] },
                { quoted: msg }
            );

        } catch (error) {
            console.error('[SHIP] Error:', error?.message || error);
            
            // Fallback: mensaje de texto si falla el canvas
            const porcentaje = Math.floor(Math.random() * 101);
            const n1 = sender.split('@')[0];
            const n2 = target.split('@')[0];
            const barra = '█'.repeat(Math.floor(porcentaje / 10)) + '░'.repeat(10 - Math.floor(porcentaje / 10));

            const mensaje =
                '╭━━〔 💘 𝐒𝐇𝐈𝐏𝐏𝐄𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ 💑 @' + n1 + ' + @' + n2 + '\n' +
                '┃\n' +
                '┃ 📊 Compatibilidad: *' + porcentaje + '%*\n' +
                '┃ ' + barra + '\n' +
                '┃\n' +
                '┃ ' + (porcentaje > 80 ? '✨ Alma gemela detectada' : porcentaje > 50 ? '💕 Hay química' : '💀 F en el chat') + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await s.sendMessage(
                chatJid,
                { text: mensaje, mentions: [sender, target] },
                { quoted: msg }
            );
        }
    }
};