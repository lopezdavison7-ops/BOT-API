// commands/group/despedida.js

// ============================================================
// COMANDO: DESPEDIDA
// Activa/desactiva el sistema de despedidas por grupo.
//
// Uso:
// .despedida on
// .despedida off
// .despedida
// ============================================================

const despedidas = global.despedidas || (global.despedidas = new Map());

export default {
    nombre: 'despedida',
    categoria: 'group',
    alias: ['bye', 'goodbye'],
    descripcion: 'Activa o desactiva las despedidas del grupo',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const jid = msg?.key?.remoteJid;
        const consulta = argumento?.trim().toLowerCase();

        if (!jid?.endsWith('@g.us')) {
            return await responder.texto(
                '❌ Este comando solo funciona en grupos.'
            );
        }

        // ========================================================
        // MOSTRAR ESTADO
        // ========================================================

        if (!consulta) {
            const estado = despedidas.get(jid) === true;

            return await responder.texto(
                `╭━━〔 👋 DESPEDIDA 〕━━⬣\n` +
                `┃\n` +
                `┃ Estado: ${estado ? '🟢 ACTIVADA' : '🔴 DESACTIVADA'}\n` +
                `┃\n` +
                `┃ › .despedida on\n` +
                `┃ › .despedida off\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );
        }

        // ========================================================
        // ACTIVAR
        // ========================================================

        if (consulta === 'on') {
            despedidas.set(jid, true);

            return await responder.texto(
                '╭━━〔 👋 DESPEDIDA 〕━━⬣\n' +
                '┃\n' +
                '┃ 🟢 Sistema activado.\n' +
                '┃ Ahora enviaré una despedida\n' +
                '┃ cuando alguien salga del grupo.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        // ========================================================
        // DESACTIVAR
        // ========================================================

        if (consulta === 'off') {
            despedidas.set(jid, false);

            return await responder.texto(
                '╭━━〔 👋 DESPEDIDA 〕━━⬣\n' +
                '┃\n' +
                '┃ 🔴 Sistema desactivado.\n' +
                '┃ Ya no se enviarán despedidas.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        // ========================================================
        // OPCIÓN INVÁLIDA
        // ========================================================

        return await responder.texto(
            '❌ Opción inválida.\n\n' +
            'Usa:\n' +
            '• .despedida on\n' +
            '• .despedida off'
        );
    }
};


// ============================================================
// FUNCIÓN PARA USAR DESDE EL EVENTO group-participants.update
// ============================================================

export async function manejarDespedida(sock, update) {
    try {
        const { id: jid, participants, action } = update;

        // Solo cuando alguien sale
        if (action !== 'remove') return;

        // Verificar si está activado en este grupo
        if (despedidas.get(jid) !== true) return;

        for (const participante of participants) {
            const numero = participante.split('@')[0];

            let fotoPerfil = null;

            try {
                fotoPerfil = await sock.profilePictureUrl(
                    participante,
                    'image'
                );
            } catch {
                fotoPerfil = null;
            }

            const texto =
                `╭━━〔 👋 DESPEDIDA 〕━━⬣\n` +
                `┃\n` +
                `┃ 👤 @${numero}\n` +
                `┃ ha salido del grupo.\n` +
                `┃\n` +
                `┃ 👋 ¡Hasta pronto, Quinn!\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`;

            if (fotoPerfil) {
                try {
                    const response = await fetch(fotoPerfil);

                    if (response.ok) {
                        const buffer = Buffer.from(
                            await response.arrayBuffer()
                        );

                        await sock.sendMessage(jid, {
                            image: buffer,
                            caption: texto,
                            mentions: [participante]
                        });

                        continue;
                    }
                } catch (error) {
                    console.error(
                        '[DESPEDIDA] Error obteniendo foto:',
                        error
                    );
                }
            }

            // Si no tiene foto, manda solamente el texto
            await sock.sendMessage(jid, {
                text: texto,
                mentions: [participante]
            });
        }

    } catch (error) {
        console.error(
            '[DESPEDIDA] Error en evento:',
            error
        );
    }
}