export default {
    nombre: 'top',
    categoria: 'Fun',
    alias: ['toplocos', 'ranking'],
    descripcion: 'Crea un top 10 aleatorio con un tema. Uso:.top [tema]',
    ejecutar: async ({ msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const esGrupo = chatJid.endsWith('@g.us');
        const nombreBot = '💻BOT-API⚡'; // <- CAMBIA ESTO POR EL NOMBRE DE TU BOT

        if (!esGrupo) {
            let text = `╭〔 ❌ ${nombreBot} 〕⬣\n`;
            text += `┃ ACCION INCOMPATIBLE\n`;
            text += `╰━━━━━━━━━━━━⬣\n\n`;
            text += `┃ > Este comando solo funciona en grupos.`;
            return responder.texto(text);
        }

        const groupMetadata = msg.groupMetadata;
        if (!groupMetadata) return responder.texto('❌ No pude obtener datos del grupo');

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