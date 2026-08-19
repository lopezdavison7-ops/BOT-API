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

            const lista = admins.map((p, i) => 
                `${i + 1}. @${p.id.split('@')[0]} ${p.admin === 'superadmin' ? '👑' : '🛡️'}`
            ).join('\n');

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
            await responder.texto(respuesta, { mentions: admins.map(p => p.id) });

        } catch (error) {
            console.error('[LISTADMINS] Error:', error);
            await responder.texto('❌ Error al obtener la lista de administradores.');
        }
    }
};