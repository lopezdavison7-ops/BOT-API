export default {
    nombre: 'ship',
    categoria: 'Fun',
    alias: ['pareja', 'amor'],
    descripcion: 'Calcula compatibilidad entre 2 personas. Uso:.ship @persona1 @persona2',
    ejecutar: async ({ msg, argumento, responder, sock }) => {
        const chatJid = msg.key.remoteJid;
        const nombreBot = '💻 BOT-API ⚡';
        const s = sock || global.conns?.[0] || Object.values(global.conns)[0];

        const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mencionados.length < 2) {
            return responder.texto(`╭〔 ❌ ${nombreBot} 〕⬣\n┃ ACCION INCOMPATIBLE\n╰━━━━━━━━━━━━⬣\n\n┃ > Usa:.ship @persona1 @persona2`);
        }

        const porcentaje = Math.floor(Math.random() * 101);
        const [p1, p2] = mencionados;
        const n1 = p1.split("@")[0];
        const n2 = p2.split("@")[0];

        let barra = "█".repeat(porcentaje/10) + "░".repeat(10 - porcentaje/10);

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

        await s.sendMessage(chatJid, { text: mensaje, mentions: [p1, p2] }, { quoted: msg });
    }
}