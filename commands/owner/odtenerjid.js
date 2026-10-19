export default {
    nombre: 'obtenerjid',
    categoria: 'Owner',
    alias: ['getjid', 'newsletterid', 'jidcanal'],
    owner: true,
    descripcion: 'Obtiene el newsletter JID de un canal de WhatsApp.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const enlace = String(argumento || '').trim();
        
        // Extraer el código del canal del enlace
        const match = enlace.match(/channel\/([A-Za-z0-9]+)/);
        if (!match) {
            return await responder.texto(
                '❌ Formato inválido.\n\n' +
                '💡 Uso: .obtenerjid https://whatsapp.com/channel/0029Vb8eeKGG3R3kwBcZdp2Q'
            );
        }

        const codigo = match[1];
        
        try {
            // Obtener metadatos del canal
            const metadata = await sock.newsletterMetadata('invite', codigo);
            
            if (metadata && metadata.id) {
                const newsletterJid = metadata.id + '@newsletter';
                const nombre = metadata.name || 'Sin nombre';
                
                await responder.texto(
                    '✅ *Newsletter JID obtenido:*\n\n' +
                    `📌 *ID:* ${newsletterJid}\n` +
                    `📛 *Nombre:* ${nombre}\n\n` +
                    '📋 *Copia este ID y pégalo en tu menú:*\n' +
                    `\`${newsletterJid}\``
                );
            } else {
                await responder.texto('❌ No se pudo obtener el JID. Verifica que el enlace sea correcto.');
            }
        } catch (error) {
            await responder.texto(
                '❌ Error al obtener el JID:\n\n' +
                error.message + '\n\n' +
                '💡 Asegúrate de que el bot esté unido al canal.'
            );
        }
    }
};