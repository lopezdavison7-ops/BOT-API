export default {
    nombre: 'ship',
    categoria: 'Fun',
    alias: ['pareja', 'amor'],
    descripcion: 'Calcula compatibilidad. Uso:.ship @persona o responde a un mensaje',
    ejecutar: async ({ msg, argumento, responder, sock }) => {
        const chatJid = msg.key.remoteJid;
        const nombreBot = '💻 BOT-API ⚡';
        const s = sock || global.conns?.[0] || Object.values(global.conns)[0];
        const sender = msg.key.participant || msg.key.remoteJid; // tu id

        let target = null;

        // CASO 1: Respondiendo a un mensaje
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
            target = msg.message.extendedTextMessage.contextInfo.participant;
        }
        // CASO 2: Mencionando a alguien
        else {
            const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mencionados.length > 0) {
                target = mencionados[0];
            }
        }

        if (!target) {
            return responder.texto(`╭〔 ❌ ${nombreBot} 〕⬣\n┃ ACCION INCOMPATIBLE\n╰━━━━━━━━━━━━⬣\n\n┃ > Usa:.ship @persona\n┃ > O responde al mensaje de alguien`);
        }

        const porcentaje = Math.floor(Math.random() * 101);
        const n1 = sender.split("@")[0];
        const n2 = target.split("@")[0];
        let barra = "█".repeat(Math.floor(porcentaje/10)) + "░".repeat(10 - Math.floor(porcentaje/10));

        let mensaje = `╭〔 💘 𝐒𝐇𝐈𝐏𝐏𝐄𝐑 〕⬣\n`;
        mensaje += `┃\n`;
        mensaje += `┃ 💑 @${n1} + @${n2}\n`;
        mensaje += `┃\n`;
        mensaje += `┃ 📊 Compatibilidad: ${porcentaje}%\n`;
        mensaje += `┃ ${barra}\n`;
        mensaje += `┃\n`;
        mensaje += `┃ ${porcentaje > 80? '✨ Alma gemela detectada' : porcentaje > 50? '💕 Hay química' : '💀 F en el chat'}\n`;
        mensaje += `╰━━━━━━━━⬣\n\n`;
        mensaje += `╰〔 ⚡ ${nombreBot} 〕⬣`;

        await s.sendMessage(chatJid, { text: mensaje, mentions: [sender, target] }, { quoted: msg });
    }
}