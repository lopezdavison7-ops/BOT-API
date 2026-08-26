export default {
    nombre: 'leave',
    categoria: 'owner',
    alias: ['salir', 'sal'],
    owner: true,
    descripcion: '🚪 Saca al bot del grupo',

    ejecutar: async ({ m, conn, argumento, responder }) => {
        let chat = m.key.remoteJid;
        
        // Si pone un ID: .leave 120363...@g.us
        if(argumento) chat = argumento;

        if(!chat.endsWith('@g.us')) {
            return await responder.texto('❌ Pon el ID del grupo. Ej: .leave 120363...@g.us')
        }

        const nombreGrupo = await conn.getName(chat).catch(() => chat)

        await responder.texto(`👋 Saliendo de: *${nombreGrupo}*`)
        
        setTimeout(async () => {
            await conn.groupLeave(chat).catch(() => 
                responder.texto('❌ No pude salir. ¿No estoy en ese grupo?')
            )
        }, 1000)
    },
};