

export default {
    nombre: 'robargrupo',
    alias: ['rg', 'steal', 'takeover'],
    owner: true,

    async ejecutar({ sock, responder, msg, jid }) {
        try {

            if (!jid.endsWith('@g.us')) {
                await responder.texto('❌ Este comando solo funciona en grupos.');
                return;
            }

            const metadata = await sock.groupMetadata(jid);

            const botId = sock.user.id.split(':')[0];
            const botNumber = botId.split('@')[0];

            let botParticipant = metadata.participants.find(p => {
                const pNumber = p.id.split('@')[0];
                return pNumber === botNumber || p.id === botId || p.id === botId + '@lid';
            });

            if (!botParticipant) {

                botParticipant = metadata.participants.find(p => p.admin === 'superadmin');

                if (!botParticipant) {

                    const allAdmins = metadata.participants.filter(p => p.admin);

                    botParticipant = allAdmins.find(p => p.id.includes('@lid') || p.id.includes('@s.whatsapp.net'));
                }
            }

            const isBotAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');

            if (!isBotAdmin) {

                const participantesInfo = metadata.participants
                    .filter(p => p.admin)
                    .map(p => {
                        const number = p.id.split('@')[0];
                        return `${number} (${p.admin}) - ID: ${p.id}`;
                    })
                    .join('\n');

                await responder.texto(
                    '❌ Necesito ser administrador del grupo para ejecutar esto.\n\n' +
                    `🔍 Debug:\n` +
                    `- Número del bot (config): ${botNumber}\n` +
                    `- ID del bot: ${botId}\n` +
                    `- Bot encontrado en grupo: ${botParticipant ? botParticipant.id : 'No'}\n` +
                    `- Participantes admins:\n${participantesInfo}`
                );
                return;
            }

            const admins = metadata.participants.filter(p => {
                const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
                const isBot = p.id === botParticipant.id ||
                             p.id.split('@')[0] === botNumber ||
                             p.id === botId;
                return isAdmin && !isBot;
            });

            if (admins.length === 0) {
                await responder.texto('ℹ️ No hay otros administradores que quitar.');
                return;
            }

            await responder.texto(
                `🔄 *Robando grupo...*\n\n` +
                `👥 Admins a eliminar: *${admins.length}*\n` +
                `⏳ Esto puede tardar unos segundos...`
            );

            let quitados = 0;
            let errores = 0;

            for (const admin of admins) {
                try {
                    await sock.groupParticipantsUpdate(jid, [admin.id], 'demote');
                    quitados++;
                    await new Promise(r => setTimeout(r, 500));
                } catch (err) {
                    errores++;
                    console.error(`Error quitando a ${admin.id}:`, err.message);
                }
            }

            const ownerJid = msg.key.participant || msg.key.remoteJid;
            try {
                const ownerParticipant = metadata.participants.find(p => p.id === ownerJid);
                if (!ownerParticipant || !ownerParticipant.admin) {
                    await sock.groupParticipantsUpdate(jid, [ownerJid], 'promote');
                }
            } catch (err) {
                console.error('Error promoviendo al owner:', err.message);
            }

            await responder.texto(
                `✅ *Grupo robado exitosamente*\n\n` +
                `👑 Ahora eres el único admin\n` +
                `🤖 El bot sigue siendo admin (${botParticipant.id.split('@')[0]})\n` +
                `🗑️ Admins quitados: *${quitados}*\n` +
                `⚠️ Errores: *${errores}*`
            );

        } catch (error) {
            console.error('[ROBAR GRUPO]', error);
            await responder.texto('❌ Error al intentar robar el grupo:\n' + error.message);
        }
    }
};