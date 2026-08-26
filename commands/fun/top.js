export default {
    nombre: 'top',
    categoria: 'Fun',
    alias: ['toplocos', 'ranking'],
    descripcion: 'Crea un top 10 aleatorio con un tema. Uso:.top [tema]',
    ejecutar: async ({ msg, argumento, responder, sock }) => { // <- agregué sock
        const chatJid = msg.key.remoteJid;
        const esGrupo = chatJid.endsWith('@g.us');
        const nombreBot = '💻 BOT-API ⚡'; // <- CAMBIA ESTO

        if (!esGrupo) {
            let text = `╭〔 ❌ ${nombreBot} 〕⬣\n`;
            text += `┃ ACCION INCOMPATIBLE\n`;
            text += `╰━━━━━━━━━━━━⬣\n\n`;
            text += `┃ > Este comando solo funciona en grupos.`;
            return responder.texto(text);
        }

        // FORZAR QUE TRAIGA LOS DATOS DEL GRUPO
        let groupMetadata;
        try {
            groupMetadata = await sock.groupMetadata(chatJid);
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

        let mensaje = `╭〔 🏆 ${nombreBot} | TOP 10 FUN: ${tema.toUpperCase()} 〕⬣\n\n`;
        top10.forEach((p, i) => {
            mensaje += `┃ ${i + 1}. @${p.id.split("@")[0]}\n`;
        });
        mensaje += `\n╰━━━━━━━━━━━━⬣`;

        await responder.texto(mensaje, { mentions: top10.map(p => p.id) });
    }
};