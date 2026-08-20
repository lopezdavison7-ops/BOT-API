// commands/utils/qr.js
import { llamarApi } from '../../lib/api.js';

export default {
    nombre: 'qr',
    categoria: 'utilidades',
    alias: [],
    descripcion: 'Genera un código QR. Uso: .qr <texto o link>',
    ejecutar: async ({ responder, argumento }) => {
        if (!argumento) {
            return responder.texto(
                `❌ *QR*\n\n` +
                `Manda el texto o link para el QR.\n\n` +
                `📌 Ejemplo:\n` +
                `*.qr https://mi-sitio.com*`
            );
        }

        const data = await llamarApi('/api/v1/tools/qr', { q: argumento });
        if (!data.status) return responder.texto('❌ ' + data.message);

        const caption = `
╭〔 📱 𝐂𝐎𝐃𝐈𝐆𝐎 𝐐𝐑 〕⬣
┃
┃ 📌 Contenido: ${argumento}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

        await responder.imagen(data.result.imagen_qr, caption);
    }
};