// commands/utils/password.js
import { llamarApi } from '../../lib/api.js';

export default {
    nombre: 'password',
    categoria: 'utilidades',
    alias: ['clave'],
    descripcion: 'Genera una contraseña segura. Uso: .password <longitud>',
    ejecutar: async ({ responder, argumento }) => {
        const longitud = argumento?.trim() || '16';
        const data = await llamarApi('/api/v1/tools/password', { q: longitud });
        
        if (!data.status || !data.result?.password) {
            return responder.texto('❌ No se pudo generar la contraseña.');
        }

        const respuesta = `
╭〔 🔐 𝐆𝐄𝐍𝐄𝐑𝐀𝐃𝐎𝐑 𝐃𝐄 𝐂𝐋𝐀𝐕𝐄𝐒 〕⬣
┃
┃ 📏 Longitud: ${longitud} caracteres
┃
┃ 🔑 Contraseña:
┃ \`\`\`${data.result.password}\`\`\`
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
        await responder.texto(respuesta);
    }
};