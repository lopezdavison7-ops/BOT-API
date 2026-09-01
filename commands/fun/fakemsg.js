
export default {
    nombre: 'fakemsg',
    categoria: 'Diversión',
    alias: ['fake', 'msgfake', 'destroy'],
    descripcion: 'Simula mensaje falso en WhatsApp',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const args = String(argumento || '').trim().split(' ');
            
            if (args.length < 2 || !args[0].startsWith('@')) {
                await responder.texto(
                    `❌ *FAKE MSG DESTROY*\n\n` +
                    `📌 *Formato:*\n` +
                    `*.fakemsg @numero mensaje*\n\n` +
                    `📌 *Ejemplo:*\n` +
                    `*.fakemsg @5163322441896 Ps no xd*`
                );
                return;
            }

            const numero = args[0].replace('@', '').trim();
            const mensajeFalso = args.slice(1).join(' ');

            // ==========================================
            // SIMULAR ENVÍO (SOLO TEXTO)
            // ==========================================
            
            await responder.texto(
                `📨 *MENSAJE FALSO INYECTADO*\n\n` +
                `👤 *De:* @${numero}\n` +
                `💬 *Mensaje:* "${mensajeFalso}"\n\n` +
                `⚠️ *Este mensaje NO existe en los servidores.*\n` +
                `🔄 *Si intentas responder, WhatsApp se congelará.*\n\n` +
                `📱 *Para verlo en WhatsApp:*\n` +
                `• Abre el chat de @${numero}\n` +
                `• Escribe: ${mensajeFalso}\n` +
                `• No lo envíes, solo simula que es de él\n` +
                `• Al responder, se congelará`
            );

        } catch (error) {
            console.error('[FAKEMSG] Error:', error);
            await responder.texto(`❌ *Error: ${error.message}*`);
        }
    }
};