// commands/utils/identificar.js
import { llamarApi } from '../../lib/api.js';

export default {
    nombre: 'identificar',
    categoria: 'utilidades',
    alias: ['id'],
    descripcion: '¿Qué plataforma y tipo de contenido es un link? Uso: .identificar <link>',
    ejecutar: async ({ responder, argumento }) => {
        if (!argumento) {
            return responder.texto(
                `❌ *IDENTIFICAR*\n\n` +
                `Manda un link.\n\n` +
                `📌 Ejemplo:\n` +
                `*.identificar https://vm.tiktok.com/xxxx*`
            );
        }
        
        const data = await llamarApi('/api/v1/identify', { url: argumento });
        if (!data.status) return responder.texto('❌ ' + data.message);
        
        const respuesta = `
╭〔 🔎 𝐈𝐃𝐄𝐍𝐓𝐈𝐅𝐈𝐂𝐀𝐃𝐎𝐑 〕⬣
┃
┃ 🔗 Link: ${argumento}
┃
┃ 📱 Plataforma: ${data.result.plataforma}
┃
┃ 📂 Tipo: ${data.result.tipo}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
        
        await responder.texto(respuesta);
    }
};