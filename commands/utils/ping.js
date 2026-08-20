// commands/utils/ping.js
export default {
    nombre: 'ping',

    categoria: 'utilidades',

    alias: [
        'p'
    ],

    descripcion:
        'Muestra la velocidad de respuesta del bot.',

    ejecutar: async ({
        responder,
        msg
    }) => {

        const inicio =
            Date.now();

        const marcaMensaje =
            msg.messageTimestamp
                ? Number(
                    msg.messageTimestamp
                ) * 1000
                : inicio;

        const latencia =
            Math.max(
                inicio - marcaMensaje,
                0
            );

        await responder.texto(
            `🏓 *Pong!*\n\n` +
            `⚡ Latencia: *${latencia}ms*`
        );
    }
};