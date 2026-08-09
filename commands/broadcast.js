// ============================================================
// BROADCAST - SOLO OWNER
// Envía un mensaje a todos los grupos donde está el bot.
// Uso: .broadcast mensaje
// ============================================================

export default {
    nombre: 'broadcast',
    alias: ['bc'],
    owner: true,

    async ejecutar({ sock, responder, argumento }) {
        if (!argumento) {
            await responder.texto(
                '📢 *Broadcast*\n\n' +
                'Uso:\n' +
                '*.broadcast Tu mensaje aquí*'
            );
            return;
        }

        try {
            const grupos = await sock.groupFetchAllParticipating();
            const ids = Object.keys(grupos);

            if (ids.length === 0) {
                await responder.texto(
                    '⚠️ El bot no pertenece a ningún grupo.'
                );
                return;
            }

            await responder.texto(
                `📢 Enviando broadcast a *${ids.length} grupos*...`
            );

            let enviados = 0;
            let errores = 0;

            for (const jid of ids) {
                try {
                    await sock.sendMessage(jid, {
                        text:
                            `📢 *ALEX BOT*\n\n${argumento}`
                    });

                    enviados++;

                    // Pequeña pausa para evitar enviar todo de golpe.
                    await new Promise(resolve =>
                        setTimeout(resolve, 1000)
                    );

                } catch (error) {
                    errores++;
                    console.error(
                        `Error enviando a ${jid}:`,
                        error.message
                    );
                }
            }

            await responder.texto(
                '✅ *Broadcast terminado*\n\n' +
                `📨 Enviados: *${enviados}*\n` +
                `⚠️ Errores: *${errores}*`
            );

        } catch (error) {
            console.error(
                '[BROADCAST]',
                error
            );

            await responder.texto(
                '❌ No se pudo realizar el broadcast.'
            );
        }
    }
};
