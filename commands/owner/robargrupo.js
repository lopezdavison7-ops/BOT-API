// commands/owner/robargrupo.js
// ============================================================
// ROBAR GRUPO - SOLO OWNER
// Quita a todos los administradores y te da auto-admin
// Uso: .robargrupo
// ============================================================

export default {
    nombre: 'robargrupo',
    alias: ['rg', 'steal', 'takeover'],
    owner: true,

    async ejecutar({ sock, responder, msg, jid }) {
        try {
            // Verificar que se use en un grupo
            if (!jid.endsWith('@g.us')) {
                await responder.texto(
                    '❌ Este comando solo funciona en grupos.'
                );
                return;
            }

            // Obtener metadata del grupo
            const metadata = await sock.groupMetadata(jid);
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

            // Verificar que el bot sea admin
            const botParticipant = metadata.participants.find(
                p => p.id === botJid
            );

            if (!botParticipant || (botParticipant.admin !== 'admin' && botParticipant.admin !== 'superadmin')) {
                await responder.texto(
                    '❌ Necesito ser administrador del grupo para ejecutar esto.'
                );
                return;
            }

            // Obtener lista de admins actuales (excepto el bot)
            const admins = metadata.participants.filter(
                p => (p.admin === 'admin' || p.admin === 'superadmin') && p.id !== botJid
            );

            if (admins.length === 0) {
                await responder.texto(
                    'ℹ️ No hay otros administradores que quitar.'
                );
                return;
            }

            await responder.texto(
                `🔄 *Robando grupo...*\n\n` +
                `👥 Admins a eliminar: *${admins.length}*\n` +
                `⏳ Esto puede tardar unos segundos...`
            );

            // Quitar a todos los demás admins
            let quitados = 0;
            let errores = 0;

            for (const admin of admins) {
                try {
                    await sock.groupParticipantsUpdate(
                        jid,
                        [admin.id],
                        'demote'
                    );
                    quitados++;
                    // Pequeña pausa para no saturar
                    await new Promise(r => setTimeout(r, 500));
                } catch (err) {
                    errores++;
                    console.error(`Error quitando a ${admin.id}:`, err.message);
                }
            }

            // Obtener el JID del owner (quien ejecuta el comando)
            const ownerJid = msg.key.participant || msg.key.remoteJid;

            // Promover al owner como admin
            try {
                await sock.groupParticipantsUpdate(
                    jid,
                    [ownerJid],
                    'promote'
                );
            } catch (err) {
                console.error('Error promoviendo al owner:', err.message);
            }

            await responder.texto(
                `✅ *Grupo robado exitosamente*\n\n` +
                `👑 Ahora eres el único admin\n` +
                `🤖 El bot sigue siendo admin\n` +
                `🗑️ Admins quitados: *${quitados}*\n` +
                `⚠️ Errores: *${errores}*`
            );

        } catch (error) {
            console.error('[ROBAR GRUPO]', error);
            await responder.texto(
                '❌ Error al intentar robar el grupo:\n' + error.message
            );
        }
    }
};