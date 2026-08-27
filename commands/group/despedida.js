// commands/group/despedida.js
// ============================================================
// BOT-API
// COMANDO: DESPEDIDA
// Activa/desactiva las despedidas automáticas por grupo.
// ============================================================

const despedidas = global.despedidas || (global.despedidas = new Map());

export default {
    nombre: 'despedida',
    categoria: 'group',
    alias: ['bye', 'adios'],
    descripcion: 'Activa o desactiva las despedidas del grupo',

    ejecutar: async ({ responder, msg, argumento }) => {
        const jid = msg?.key?.remoteJid;
        const consulta = argumento?.trim().toLowerCase();

        if (!jid?.endsWith('@g.us')) {
            return await responder.texto(
                '❌ Este comando solo funciona en grupos.'
            );
        }

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

        if (consulta === 'on') {
            despedidas.set(jid, true);

            return await responder.texto(
                '╭━━〔 👋 DESPEDIDA 〕━━⬣\n' +
                '┃\n' +
                '┃ 🟢 Sistema activado.\n' +
                '┃ Las salidas serán anunciadas\n' +
                '┃ automáticamente.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

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

        return await responder.texto(
            '❌ Opción inválida.\n\n' +
            'Usa:\n' +
            '• .despedida on\n' +
            '• .despedida off'
        );
    }
};


// ============================================================
// MANEJADOR DE SALIDAS
// ============================================================

export async function manejarDespedida(sock, update) {
    const { id, participants, action } = update;

    if (action !== 'remove') return;
    if (!id?.endsWith('@g.us')) return;
    if (!Array.isArray(participants) || !participants.length) return;

    if (despedidas.get(id) !== true) return;

    let metadata;

    try {
        metadata = await sock.groupMetadata(id);
    } catch (error) {
        console.error(
            '[DESPEDIDA] Error obteniendo grupo:',
            error?.message || error
        );
        return;
    }

    const nombreGrupo = metadata?.subject || 'este grupo';

    for (const participante of participants) {
        try {
            const participanteJid =
                typeof participante === 'string'
                    ? participante
                    : (
                        participante?.phoneNumber ||
                        participante?.jid ||
                        participante?.id ||
                        participante?.participant ||
                        ''
                    );

            if (!participanteJid) continue;

            const numero =
                String(participanteJid)
                    .split('@')[0]
                    .split(':')[0]
                    .replace(/\D/g, '');

            const mencion = numero
                ? `@${numero}`
                : '@usuario';

            let fotoPerfil = null;

            try {
                fotoPerfil = await sock.profilePictureUrl(
                    participanteJid,
                    'image'
                );
            } catch {
                fotoPerfil = null;
            }

            const despedida =
                `╭━━━〔 👋 DESPEDIDA 〕━━━╮\n` +
                `┃\n` +
                `┃ 👤 ${mencion}\n` +
                `┃\n` +
                `┃ Ha salido del grupo.\n` +
                `┃\n` +
                `┃ 👋 ¡Hasta pronto, Quinn!\n` +
                `┃ Te deseamos lo mejor.\n` +
                `┃\n` +
                `┃ 📍 ${nombreGrupo}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                `              🤖 *BOT-API*`;

            if (fotoPerfil) {
                try {
                    const respuesta = await fetch(fotoPerfil);

                    if (respuesta.ok) {
                        const datos = await respuesta.arrayBuffer();
                        const buffer = Buffer.from(datos);

                        if (buffer.length > 0) {
                            await sock.sendMessage(id, {
                                image: buffer,
                                caption: despedida,
                                mentions: [participanteJid]
                            });

                            continue;
                        }
                    }
                } catch (error) {
                    console.error(
                        '[DESPEDIDA] Error descargando foto:',
                        error?.message || error
                    );
                }
            }

            await sock.sendMessage(id, {
                text: despedida,
                mentions: [participanteJid]
            });

        } catch (error) {
            console.error(
                '[DESPEDIDA] Error procesando salida:',
                error?.message || error
            );
        }
    }
}