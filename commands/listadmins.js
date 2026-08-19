// commands/listadmins.js
export default {
    nombre: 'listadmins',
    categoria: 'Moderación',
    alias: ['admins', 'adminlist'],
    descripcion: 'Muestra la lista de administradores del grupo',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const groupId = msg.key.remoteJid;
            if (!groupId.endsWith('@g.us')) {
                await responder.texto('❌ Este comando solo funciona en grupos.');
                return;
            }

            const metadata = await sock.groupMetadata(groupId);
            const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');

            if (admins.length === 0) {
                await responder.texto('❌ Este grupo no tiene administradores.');
                return;
            }

            // Construir lista con @mención en el texto
            const lista = admins.map((p, i) => 
                `${i + 1}. @${p.id.split('@')[0]} ${p.admin === 'superadmin' ? '👑' : '🛡️'}`
            ).join('\n');

            // Sacar los JIDs para mencionarlos
            const mentions = admins.map(p => p.id);

            const respuesta = `
╭〔 🛡️ 𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐃𝐎𝐑𝐄𝐒 〕⬣
┃
┃ 📌 Grupo: ${metadata.subject}
┃
┃ 👑 Superadmin / 🛡️ Admin
┃
┃ ${lista}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            // 🔥 ENVIAR CON MENCIONES OBLIGADAS
            await sock.sendMessage(msg.key.remoteJid, {
                text: respuesta,
                mentions: mentions
            }, { quoted: msg });

        } catch (error) {
            console.error('[LISTADMINS] Error:', error);
            await responder.texto('❌ Error al obtener la lista de administradores.');
        }
    }
};