import { createCanvas, loadImage } from '@napi-rs/canvas';

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

        // Detectar target rápido
        let target = ctx?.quotedMessage ? ctx.participant : ctx?.mentionedJid?.[0];

        if (!target) {
            return responder.texto('❌ Usa: `.ship @persona` o responde a un mensaje');
        }

        // Porcentaje y mensaje
        const porcentaje = Math.floor(Math.random() * 101);
        const mensaje = porcentaje >= 90 ? '✨ ALMA GEMELA' :
                       porcentaje >= 75 ? '💕 PERFECTOS' :
                       porcentaje >= 50 ? '💖 HAY QUÍMICA' :
                       porcentaje >= 25 ? '💭 TAL VEZ' : '💀 F EN EL CHAT';

        try {
            // Canvas rápido 800x400
            const canvas = createCanvas(800, 400);
            const ctx2d = canvas.getContext('2d');

            // Fondo gradiente rápido
            const grad = ctx2d.createLinearGradient(0, 0, 800, 400);
            grad.addColorStop(0, '#ff6b9d');
            grad.addColorStop(1, '#c44569');
            ctx2d.fillStyle = grad;
            ctx2d.fillRect(0, 0, 800, 400);

            // Fotos de perfil con timeout
            let img1, img2;
            try {
                const pp1 = await Promise.race([
                    s.profilePictureUrl(sender, 'image'),
                    new Promise((_, rej) => setTimeout(() => rej('timeout'), 2000))
                ]);
                img1 = await loadImage(pp1);
            } catch {
                // Fallback: rectángulo de color
                ctx2d.fillStyle = '#ffffff';
                ctx2d.beginPath();
                ctx2d.arc(200, 200, 100, 0, Math.PI * 2);
                ctx2d.fill();
                ctx2d.fillStyle = '#000000';
                ctx2d.font = 'bold 80px Arial';
                ctx2d.textAlign = 'center';
                ctx2d.textBaseline = 'middle';
                ctx2d.fillText('👤', 200, 200);
            }

            try {
                const pp2 = await Promise.race([
                    s.profilePictureUrl(target, 'image'),
                    new Promise((_, rej) => setTimeout(() => rej('timeout'), 2000))
                ]);
                img2 = await loadImage(pp2);
            } catch {
                ctx2d.fillStyle = '#ffffff';
                ctx2d.beginPath();
                ctx2d.arc(600, 200, 100, 0, Math.PI * 2);
                ctx2d.fill();
                ctx2d.fillStyle = '#000000';
                ctx2d.font = 'bold 80px Arial';
                ctx2d.textAlign = 'center';
                ctx2d.textBaseline = 'middle';
                ctx2d.fillText('👤', 600, 200);
            }

            // Dibujar fotos si se cargaron
            if (img1) {
                ctx2d.save();
                ctx2d.beginPath();
                ctx2d.arc(200, 200, 100, 0, Math.PI * 2);
                ctx2d.clip();
                ctx2d.drawImage(img1, 100, 100, 200, 200);
                ctx2d.restore();
            }

            if (img2) {
                ctx2d.save();
                ctx2d.beginPath();
                ctx2d.arc(600, 200, 100, 0, Math.PI * 2);
                ctx2d.clip();
                ctx2d.drawImage(img2, 500, 100, 200, 200);
                ctx2d.restore();
            }

            // Bordes blancos
            ctx2d.strokeStyle = '#ffffff';
            ctx2d.lineWidth = 6;
            ctx2d.beginPath();
            ctx2d.arc(200, 200, 100, 0, Math.PI * 2);
            ctx2d.stroke();
            ctx2d.beginPath();
            ctx2d.arc(600, 200, 100, 0, Math.PI * 2);
            ctx2d.stroke();

            // Corazón central
            ctx2d.font = 'bold 100px Arial';
            ctx2d.textAlign = 'center';
            ctx2d.textBaseline = 'middle';
            ctx2d.fillStyle = '#ffffff';
            ctx2d.fillText('💖', 400, 180);

            // Porcentaje
            ctx2d.font = 'bold 50px Arial';
            ctx2d.fillText(`${porcentaje}%`, 400, 300);

            // Mensaje
            ctx2d.font = 'bold 28px Arial';
            ctx2d.fillText(mensaje, 400, 360);

            // Convertir a buffer y enviar
            const buffer = canvas.toBuffer('image/jpeg', 80);

            const n1 = sender.split('@')[0];
            const n2 = target.split('@')[0];

            await s.sendMessage(chatJid, {
                image: buffer,
                caption: `💑 @${n1} + @${n2}\n📊 *${porcentaje}%* ${mensaje}`,
                mentions: [sender, target]
            }, { quoted: msg });

        } catch (error) {
            console.error('[SHIP]', error?.message);
            await responder.texto('❌ Error generando imagen');
        }
    }
};