import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage, registerFont } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_ADOPCIONES = path.join(__dirname, '..', '..', 'database', 'adopciones.json');

// Función para leer adopciones
function leerAdopciones() {
    try {
        const data = fs.readFileSync(RUTA_ADOPCIONES, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

// Función para guardar adopción
function guardarAdopcion(adoptante, adoptado) {
    const db = leerAdopciones();
    if (!db[adoptante]) db[adoptante] = [];
    if (!db[adoptante].includes(adoptado)) {
        db[adoptante].push(adoptado);
    }
    fs.mkdirSync(path.dirname(RUTA_ADOPCIONES), { recursive: true });
    fs.writeFileSync(RUTA_ADOPCIONES, JSON.stringify(db, null, 2), 'utf8');
}

// Función auxiliar para descargar imagen (perfil o fallback)
async function obtenerImagen(sock, jid, nombre) {
    try {
        const url = await sock.profilePictureUrl(jid, 'image');
        const res = await fetch(url);
        return await loadImage(await res.arrayBuffer());
    } catch {
        // Fallback: Si no tiene foto, devolvemos null para dibujar un círculo de color
        return null;
    }
}

export default {
    nombre: 'adoptar',
    categoria: 'Diversión',
    alias: ['adopt', 'hijo', 'hija'],
    descripcion: 'Adopta a otro usuario y genera un certificado visual.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const mencion = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const adoptado = mencion[0];
        const adoptante = msg.key.participant || msg.key.remoteJid;

        if (!adoptado || adoptado === adoptante) {
            return await responder.texto(
                '╭━━〔 👶 𝐀𝐃𝐎𝐏𝐂𝐈𝐎́𝐍 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Debes mencionar a alguien para adoptar.\n' +
                '┃\n' +
                '┃ 💡 Ejemplo: .adoptar @usuario\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        const nombreAdoptante = msg.pushName || adoptante.split('@')[0];
        const nombreAdoptado = (await sock.onWhatsApp(adoptado))?.[0]?.notify || adoptado.split('@')[0];

        try {
            // Reacción de carga
            await sock.sendMessage(jid, { react: { text: '🍼', key: msg.key } });

            // 1. Intentar generar el Canvas
            const canvas = createCanvas(600, 350);
            const ctx = canvas.getContext('2d');

            // Fondo degradado (Colores del bot: oscuro a verde)
            const grad = ctx.createLinearGradient(0, 0, 600, 350);
            grad.addColorStop(0, '#05070d');
            grad.addColorStop(1, '#0f291e');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 600, 350);

            // Marco decorativo
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 4;
            ctx.strokeRect(10, 10, 580, 330);

            // Título
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🎉 ¡NUEVA ADOPCIÓN! 🎉', 300, 50);

            // Subtítulo
            ctx.fillStyle = '#4ade80';
            ctx.font = '16px Arial, sans-serif';
            ctx.fillText('Certificado oficial de BOT-API', 300, 80);

            // Función para dibujar avatar circular
            const dibujarAvatar = async (jidUsuario, x, y, nombre) => {
                const img = await obtenerImagen(sock, jidUsuario, nombre);
                
                ctx.save();
                ctx.beginPath();
                ctx.arc(x, y, 60, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();

                if (img) {
                    ctx.drawImage(img, x - 60, y - 60, 120, 120);
                } else {
                    // Fallback si no hay foto: círculo de color con inicial
                    ctx.fillStyle = '#334155';
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 40px Arial, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(nombre.charAt(0).toUpperCase(), x, y + 5);
                }
                ctx.restore();

                // Nombre debajo del avatar
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 16px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                // Recortar nombre si es muy largo
                const nombreCorto = nombre.length > 15 ? nombre.substring(0, 12) + '...' : nombre;
                ctx.fillText(nombreCorto, x, y + 75);
            };

            // Dibujar ambos avatares
            await dibujarAvatar(adoptante, 180, 180, nombreAdoptante);
            await dibujarAvatar(adoptado, 420, 180, nombreAdoptado);

            // Corazón o símbolo en el medio
            ctx.fillStyle = '#ef4444';
            ctx.font = '40px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('❤️', 300, 180);

            // Texto inferior
            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px Arial, sans-serif';
            ctx.fillText(`${nombreAdoptante} ahora es el padre/madre de ${nombreAdoptado}`, 300, 310);

            // Convertir a buffer y enviar
            const buffer = canvas.toBuffer('image/png');
            
            // Guardar en la "base de datos"
            guardarAdopcion(adoptante, adoptado);

            await sock.sendMessage(jid, {
                image: buffer,
                caption: `╭━━〔 👶 𝐀𝐃𝐎𝐏𝐂𝐈𝐎́𝐍 𝐄𝐗𝐈𝐓𝐎𝐒𝐀 〕━━⬣\n┃\n┃ 🍼 *@${adoptante.split('@')[0]}* ha adoptado a\n┃ 👶 *@${adoptado.split('@')[0]}*\n┃\n┃ ¡Bienvenido a la familia! 💚\n┃\n╰━━━━━━━━━━━━━━━━⬣`,
                mentions: [adoptante, adoptado]
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            // FALLBACK: Si Canvas falla (ej. no está instalado), envía esto
            console.error('[ADOPTAR] Error en Canvas:', error?.message);
            
            guardarAdopcion(adoptante, adoptado);
            
            await responder.texto(
                '╭━━〔 👶 𝐀𝐃𝐎𝐏𝐂𝐈𝐎́𝐍 𝐄𝐗𝐈𝐓𝐎𝐒𝐀 〕━━⬣\n' +
                '┃\n' +
                `┃ 🍼 *@${adoptante.split('@')[0]}* ha adoptado oficialmente a:\n` +
                `┃ 👶 *@${adoptado.split('@')[0]}*\n` +
                '┃\n' +
                '┃ 🎉 ¡Bienvenido a la familia!\n' +
                '┃ 💡 (Nota: La imagen no se generó, pero la adopción se guardó).\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};