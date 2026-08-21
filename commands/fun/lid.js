// commands/fun/lid.js
export default {
    nombre: 'lid',
    categoria: 'Diversión',
    alias: ['lo inocente de'],
    descripcion: 'Muestra cómo detecta el bot tu número',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const remoteJid = msg.key?.remoteJid || '';
            const participant = msg.key?.participant || msg.key?.senderPn || '';
            
            const numeroRemitente = (participant || remoteJid)
                .split('@')[0]
                .split(':')[0]
                .replace(/\D/g, '');
            
            const esGrupo = remoteJid.endsWith('@g.us');
            const esPrivado = remoteJid.endsWith('@s.whatsapp.net');
            
            let tipoChat = 'Desconocido';
            if (esGrupo) tipoChat = 'Grupo';
            if (esPrivado) tipoChat = 'Chat Privado';
            
            const estadoNumero = numeroRemitente 
                ? `@${numeroRemitente}` 
                : 'No detectado';
            
            const esBot = numeroRemitente === sock.user?.id?.split(':')[0]?.split('@')[0];
            
            let estado = '✅ Activo';
            if (esBot) estado = '🤖 Soy yo (el bot)';
            
            const respuesta = `
╭〔 🔍 𝐋𝐈𝐃 - 𝐃𝐄𝐓𝐄𝐂𝐂𝐈𝐎́𝐍 〕⬣
┃
┃ 📱 𝐍𝐔𝐌𝐄𝐑𝐎 › ${estadoNumero}
┃ 💬 𝐓𝐈𝐏𝐎 𝐃𝐄 𝐂𝐇𝐀𝐓 › ${tipoChat}
┃ 🟢 𝐄𝐒𝐓𝐀𝐃𝐎 › ${estado}
┃ 🆔 𝐉𝐈𝐃 › ${remoteJid}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`;
            
            await responder.texto(respuesta);

        } catch (error) {
            console.error('[LID] Error:', error);
            await responder.texto('❌ Error al ejecutar el comando lid.');
        }
    }
};
