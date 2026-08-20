// commands/utils/ip.js
import fetch from 'node-fetch';

export default {
    nombre: 'ip',
    categoria: 'Utilidades',
    alias: ['miip', 'ipinfo'],
    descripcion: 'Muestra tu dirección IP pública',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();

            if (!data || !data.ip) {
                await responder.texto('❌ No se pudo obtener la IP.');
                return;
            }

            const respuesta = `
╭〔 🌐 𝐌𝐈 𝐈𝐏 〕⬣
┃
┃ 📡 Tu IP pública es:
┃
┃ 🔹 ${data.ip}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            await responder.texto(respuesta);

        } catch (error) {
            console.error('[IP] Error:', error);
            await responder.texto('❌ Error al obtener la IP.');
        }
    }
};