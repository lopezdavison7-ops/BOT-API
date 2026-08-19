// commands/grupo.js
export default {
    nombre: 'grupo',
    categoria: 'Utilidades',
    alias: ['grup', 'groupinfo'],
    descripcion: 'Muestra información del grupo actual',
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
┃ 🧑‍💼 Creador: @${metadata.owner?.split('@')[0] || 'Desconocido'}
┃
┃ 📅 Creado: ${fechaCreacion}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            await responder.texto(respuesta, { mentions: [metadata.owner].filter(Boolean) });

        } catch (error) {
            console.error('[GRUPO] Error:', error);
            await responder.texto('❌ Error al obtener información del grupo.');
        }
    }
};