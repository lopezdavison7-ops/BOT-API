export default {
    nombre: 'prueba',
    categoria: 'Admin',
    alias: ['steal', 'demotecreator'],
    descripcion: 'Quita el rol de administrador al creador del grupo',
    ejecutar: async ({ msg, responder, sock }) => {
        try {
            const jid = msg.key.remoteJid; 

            // Verificar que sea un grupo
            if (!jid.endsWith('@g.us')) {
                return await responder.texto('❌ Este comando solo funciona en grupos.');
            }

            // Obtener metadatos del grupo
            const metadata = await sock.groupMetadata(jid);
            
            // Normalizar el ID del bot (quitar sufijos como :12)
            const botJidRaw = sock.user.id.split(':')[0]; 
            const botJid = botJidRaw.split('@')[0] + '@s.whatsapp.net';
            
            // Verificar si el bot está en la lista y si es admin
            const botParticipant = metadata.participants.find(p => p.id === botJid || p.id === sock.user.id);
            
            if (!botParticipant) {
                return await responder.texto('❌ El bot no está en el grupo.');
            }
            
            // En Baileys, admin puede ser 'admin' o 'superadmin'
            if (botParticipant.admin !== 'admin' && botParticipant.admin !== 'superadmin') {
                return await responder.texto('❌ El bot debe ser administrador del grupo para usar este comando.');
            }

            // Verificar permisos del usuario que ejecuta el comando
            const senderJid = msg.key.participant;
            const sender = metadata.participants.find(p => p.id === senderJid || p.id === senderJid.split(':')[0] + '@s.whatsapp.net');
            
            if (!sender?.admin && senderJid !== metadata.owner) {
                return await responder.texto('❌ Solo un administrador o el owner del bot puede usar este comando.');
            }

            const creator = metadata.owner; // ID del creador

            // No se puede degradar al creador si el creador es el propio bot
            if (creator === botJid || creator === sock.user.id) {
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