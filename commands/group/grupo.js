// commands/group/grupo.js
export default {
    nombre: 'grupo',
    categoria: 'Utilidades',
    alias: ['grup', 'groupinfo'],
    descripcion: 'Muestra información del grupo actual con menciones',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const groupId = msg.key.remoteJid;
            if (!groupId.endsWith('@g.us')) {
                await responder.texto('❌ Este comando solo funciona en grupos.');
                return;
            }

            const metadata = await sock.groupMetadata(groupId);
            const fechaCreacion = new Date(metadata.creation * 1000).toLocaleDateString();
            const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
            const total = metadata.participants.length;

            // 🔥 OBTENER EL CREADOR Y PREPARAR LA MENCIÓN
            let creadorNombre = 'Desconocido';
            let creadorMention = null;

            if (metadata.owner) {
                creadorNombre = `@${metadata.owner.split('@')[0]}`;
                creadorMention = metadata.owner;
            }

            // Construir el mensaje
            const respuesta = `
╭〔 📊 𝐈𝐍𝐅𝐎 𝐆𝐑𝐔𝐏𝐎 〕⬣
┃
┃ 📌 Nombre: ${metadata.subject}
┃
┃ 📝 Descripción: ${metadata.desc || 'Sin descripción'}
┃
┃ 👥 Miembros: ${total}
┃
┃ 🛡️ Administradores: ${admins.length}
┃
┃ 🧑‍💼 Creador: ${creadorNombre}
┃
┃ 📅 Creado: ${fechaCreacion}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            // 🔥 ENVIAR CON sock.sendMessage Y LA MENCIÓN FORZADA
            const mentionsList = creadorMention ? [creadorMention] : [];

            await sock.sendMessage(groupId, {
                text: respuesta,
                mentions: mentionsList
            }, { quoted: msg });

        } catch (error) {
            console.error('[GRUPO] Error:', error);
            await responder.texto('❌ Error al obtener información del grupo.');
        }
    }
};