// commands/utils/recordatorio.js
export default {
    nombre: 'recordatorio',
    categoria: 'utilidades',
    alias: ['recordar'],
    descripcion: 'Te manda un recordatorio en X minutos. Uso: .recordatorio minutos|mensaje',
    ejecutar: async ({ sock, msg, responder, argumento }) => {
        // Separar minutos y mensaje
        const partes = String(argumento || '').split('|').map(p => p.trim());
        const minutosStr = partes[0];
        const mensaje = partes.slice(1).join('|').trim();

        const minutos = parseFloat(minutosStr);

        // Validaciones
        if (!minutosStr || isNaN(minutos) || minutos <= 0 || !mensaje) {
            return responder.texto(
                `❌ *RECORDATORIO*\n\n` +
                `Formato: .recordatorio minutos|mensaje\n\n` +
                `📌 Ejemplo:\n` +
                `*.recordatorio 10|Sacar la comida del horno*`
            );
        }

        if (minutos > 1440) {
            return responder.texto('❌ Máximo 1440 minutos (24 horas).');
        }

        // Confirmación
        const confirmacion = `
╭〔 ⏰ 𝐑𝐄𝐂𝐎𝐑𝐃𝐀𝐓𝐎𝐑𝐈𝐎 〕⬣
┃
┃ ⏱️ Tiempo: ${minutos} minuto(s)
┃
┃ 📝 Mensaje: "${mensaje}"
┃
┃ 💡 Te avisaré cuando pase el tiempo.
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
        await responder.texto(confirmacion);

        // Configurar el temporizador
        setTimeout(() => {
            const aviso = `
╭〔 ⏰ 𝐑𝐄𝐂𝐎𝐑𝐃𝐀𝐓𝐎𝐑𝐈𝐎 〕⬣
┃
┃ 📝 ${mensaje}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            sock.sendMessage(msg.key.remoteJid, { text: aviso }).catch(() => {});
        }, minutos * 60 * 1000);
    }
};