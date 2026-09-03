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
                await responder.texto('❌ Este comando solo funciona en grupos.');
                return;
            }

            // Obtener metadata del grupo
            const metadata = await sock.groupMetadata(jid);
            
            // OBTENER EL ID REAL DEL BOT EN EL GRUPO
            // Buscar al bot por su ID completo en los participantes
            const botId = sock.user.id.split(':')[0]; // 50576641902@s.whatsapp.net
            const botNumber = botId.split('@')[0]; // 50576641902
            
            // Buscar al bot en participantes (comparando con @lid y @s.whatsapp.net)
            let botParticipant = metadata.participants.find(p => {
                const pNumber = p.id.split('@')[0];
                return pNumber === botNumber || p.id === botId || p.id === botId + '@lid';
            });

            // Si no encuentra al bot, es porque el bot tiene otro número en el grupo
            // En tu caso, el bot aparece como 2599176675473 (superadmin)
            // Vamos a buscar al bot por su nombre o por ser el que responde
            if (!botParticipant) {
                // Buscar al superadmin (el bot es superadmin)
                botParticipant = metadata.participants.find(p => p.admin === 'superadmin');
                
                // Si hay más de un superadmin, buscar por el número que coincida
                if (!botParticipant) {
                    // Último recurso: buscar cualquier admin que no sea el owner
                    const allAdmins = metadata.participants.filter(p => p.admin);
                    // El bot generalmente es el primer admin o el que tiene el ID más largo
                    botParticipant = allAdmins.find(p => p.id.includes('@lid') || p.id.includes('@s.whatsapp.net'));
                }
            }

            // Verificar si el bot es admin
            const isBotAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');

            if (!isBotAdmin) {
                // Debug con toda la información
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

            // Obtener lista de admins actuales (excepto el bot)
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

            // Quitar a todos los demás admins
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

            // Promover al owner (el que ejecutó el comando)
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