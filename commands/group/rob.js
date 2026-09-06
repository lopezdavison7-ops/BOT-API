export default {
    nombre: 'prueba',
    categoria: 'Admin',
    alias: ['steal', 'demotecreator'],
    descripcion: 'Quita el rol de administrador al creador del grupo',
    ejecutar: async ({ msg, responder, sock }) => {
        try {
            const jid = msg.key.remoteJid; 

            if (!jid.endsWith('@g.us')) {
                return await responder.texto('❌ Este comando solo funciona en grupos.');
            }

            const metadata = await sock.groupMetadata(jid);
            
            // Obtener el ID del bot normalizado
            const botJidRaw = sock.decodeJid ? sock.decodeJid(sock.user.id) : sock.user.id;
            // Si el ID trae algo como "12345:67@s.whatsapp.net", lo reducimos a "12345@s.whatsapp.net"
            const botJid = botJidRaw.split(':')[0].split('@')[0] + '@s.whatsapp.net';

            console.log('🛠️ ID del bot (normalizado):', botJid);
            console.log('🛠️ Participantes del grupo:', metadata.participants.map(p => p.id));

            // Buscar al bot en la lista
            const botParticipant = metadata.participants.find(p => p.id === botJid || p.id === botJidRaw);
            
            if (!botParticipant) {
                return await responder.texto('❌ El bot no está en el grupo. Revisa la consola para ver los IDs.');
            }
            
            if (botParticipant.admin !== 'admin' && botParticipant.admin !== 'superadmin') {
                return await responder.texto('❌ El bot debe ser administrador del grupo para usar este comando.');
            }

            // Verificar permisos del usuario que ejecuta el comando
            const senderJid = msg.key.participant;
            const sender = metadata.participants.find(p => p.id === senderJid || p.id === senderJid.split(':')[0] + '@s.whatsapp.net');
            
            if (!sender?.admin && senderJid !== metadata.owner) {
                return await responder.texto('❌ Solo un administrador o el owner del bot puede usar este comando.');
            }

            const creator = metadata.owner;

            if (creator === botJid || creator === botJidRaw) {
                return await responder.texto('❌ El creador de este grupo es el propio bot, no se puede degradar.');
            }

            // ACCIÓN PRINCIPAL: Quitar admin al creador
            await sock.groupParticipantsUpdate(jid, [creator], 'demote');

            await responder.texto('✅ Se ha quitado el rol de administrador al creador del grupo.');

        } catch (error) {
            console.error('[ROB] Error:', error);
            await responder.texto('❌ Error al quitar admin al creador.');
        }
    }
};