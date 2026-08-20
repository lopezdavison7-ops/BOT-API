// commands/utils/traducir.js
import { llamarApi } from '../../lib/api.js';

export default {
    nombre: 'traducir',
    categoria: 'utilidades',
    alias: ['tr'],
    descripcion: 'Traduce texto. Uso: .traducir <texto>|<idioma>',
    ejecutar: async ({ responder, argumento }) => {
        const input = String(argumento || '').trim();
        
        if (!input.includes('|')) {
            return responder.texto(
                `❌ *TRADUCIR*\n\n` +
                `Formato: .traducir texto|idioma\n\n` +
                `📌 Ejemplo:\n` +
                `*.traducir hola amigo|en*`
            );
        }

        const data = await llamarApi('/api/v1/tools/traducir', { q: input });
        if (!data.status) return responder.texto('❌ ' + data.message);

        const respuesta = `
╭〔 🌐 𝐓𝐑𝐀𝐃𝐔𝐂𝐂𝐈𝐎𝐍 〕⬣
┃
┃ 📝 Resultado:
┃
┃ ${data.result.traduccion}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
        await responder.texto(respuesta);
    }
};