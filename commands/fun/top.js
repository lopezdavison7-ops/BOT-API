export default {
    nombre: 'top',
    categoria: 'Fun',
    alias: ['toplocos', 'ranking'],
    descripcion: 'Crea un top 10 aleatorio con un tema. Uso:.top [tema]',
    ejecutar: async ({ msg, argumento, responder, sock }) => {
        const chatJid = msg.key.remoteJid;
        const esGrupo = chatJid.endsWith('@g.us');
        const nombreBot = '💻 BOT-API ⚡';
        const s = sock || global.conns?.[0] || Object.values(global.conns)[0]; // <- por si acaso

        if (!esGrupo) {
            let text = `╭〔 ❌ ${nombreBot} 〕⬣\n`;
            text += `┃ ACCION INCOMPATIBLE\n`;
            text += `╰━━━━━━━━━━━━⬣\n\n`;
            text += `┃ > Este comando solo funciona en grupos.`;
            return responder.texto(text);
        }

        let groupMetadata;
        try {
            groupMetadata = await s.groupMetadata(chatJid);
        } catch {
            return responder.texto('❌ No pude obtener datos del grupo. Reinicia el bot');
        }

        const participantesValidos = (groupMetadata.participants || []).filter(p => p && p.id);

        if (participantesValidos.length < 2) {
            return responder.texto('❌ Se necesitan mínimo 2 personas en el grupo');
        }

        const tema = argumento || "los más locos";
        const top10 = participantesValidos
.sort(() => Math.random() - 0.5)
.slice(0, 10);

        let mensaje = `╭〔 🏆 𝐓𝐎𝐏 𝟏𝟎 𝐅𝐔𝐍: ${tema.toUpperCase()} 〕⬣\n`;
        mensaje += `┃\n`;
        top10.forEach((p, i) => {
            const numero = p.id.split("@")[0];
            mensaje += `┃ ${i + 1}. @${numero}\n`;
        });
        mensaje += `┃\n`;
        mensaje += `╰━━━━━━━━⬣\n\n`;
        mensaje += `╰〔 ⚡ ${nombreBot} 〕⬣`;

        const mentions = top10.map(p => p.id);

        // USAR sendMessage DIRECTO PARA QUE TAGUEE
        await s.sendMessage(chatJid, { text: mensaje, mentions }, { quoted: msg });
    }
};