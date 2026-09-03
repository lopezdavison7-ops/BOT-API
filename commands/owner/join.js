// commands/owner/join.js
export default {
    nombre: 'join',
    alias: ['unirse'],
    owner: true,
    
    async ejecutar({ sock, responder, args }) {
        try {
            if (!args[0]) {
                await responder.texto('❌ Usa: .join <enlace>');
                return;
            }
            
            // Extraer código del enlace
            const code = args[0].split('https://chat.whatsapp.com/')[1];
            if (!code) {
                await responder.texto('❌ Enlace inválido');
                return;
            }
            
            await sock.groupAcceptInvite(code);
            await responder.texto('✅ Bot unido al grupo');
        } catch (error) {
            await responder.texto('❌ Error: ' + error.message);
        }
    }
};