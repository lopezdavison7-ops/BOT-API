export default {
    nombre: 'xd',
    categoria: 'Admin',
    alias: ['steal', 'demotecreator'],
    descripcion: 'Quita el rol de administrador al creador del grupo',
    ejecutar: async ({ msg, responder, sock }) => {
        try {
            const jid = msg.key.remoteJid; 
            const botJid = sock.user.id;

            // Obtener metadatos del grupo
            const metadata = await sock.groupMetadata(jid);
            const creator = metadata.owner; // ID del creador

            // Verificar que el bot sea admin para poder ejecutar la acción
            const botParticipant = metadata.participants.find(p => p.id === botJid);
            if (!botParticipant?.admin) {
                return await responder.texto('❌ El bot debe ser administrador del grupo para usar este comando.');
            }

            // Verificar permisos del usuario que ejecuta el comando
            const senderJid = msg.key.participant;
            const sender = metadata.participants.find(p => p.id === senderJid);
            if (!sender?.admin && senderJid !== metadata.owner) {
                return await responder.texto('❌ Solo un administrador o el owner del bot puede usar este comando.');
            }

            // No se puede degradar al creador si el creador es el propio bot
            if (creator === botJid) {
                return await responder.texto('❌ El creador de este grupo es el propio bot, no se puede degradar.');
            }

            // ACCIÓN PRINCIPAL: Quitar admin al creador
            await sock.groupParticipantsUpdate(jid, [creator], 'demote');

            // Opcional: Promover al bot (para que quede como admin)
            await sock.groupParticipantsUpdate(jid, [botJid], 'promote');

            await responder.texto('✅ Se ha quitado el rol de administrador al creador del grupo. ¡El bot ahora tiene el control!');

        } catch (error) {
            console.error('[ROB] Error:', error);
            await responder.texto('❌ Error al quitar admin al creador.');
        }
    }
};