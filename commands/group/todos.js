
import {
    esGrupo,
    verificarPermisosAdmin,
    obtenerMetadata
} from '../../lib/grupos.js';

export default {
    nombre: 'todos',
    categoria: 'grupos',
    alias: ['everyone', 'tagall'],

    descripcion:
        'Menciona a todos los miembros del grupo. Uso: .todos [mensaje]',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;

        if (!esGrupo(chatId)) {
            return responder.texto(
                '❌ Este comando solo funciona dentro de un grupo.'
            );
        }

        const permiso = await verificarPermisosAdmin(
            sock,
            msg,
            chatId
        );

        if (!permiso.ok) {
            return responder.texto(permiso.motivo);
        }

        try {
            const metadata =
                permiso.metadata ||
                await obtenerMetadata(sock, chatId);

            if (!metadata?.participants?.length) {
                return responder.texto(
                    '⚠️ No se pudo obtener la lista de miembros.'
                );
            }

            const menciones = metadata.participants
                .map(participante => participante.id)
                .filter(Boolean);

            const listaTexto = menciones
                .map(jid => `@${jid.split('@')[0]}`)
                .join(' ');

            const textoExtra = argumento?.trim();

            const encabezado = textoExtra
                ? `📢 *${textoExtra}*\n\n`
                : '📢 *Atención a todos:*\n\n';

            await sock.sendMessage(
                chatId,
                {
                    text: encabezado + listaTexto,
                    mentions: menciones
                },
                {
                    quoted: msg
                }
            );

            console.log(
                `[TODOS] ${menciones.length} miembros mencionados en ${chatId}`
            );

        } catch (error) {
            console.error(
                '[TODOS]',
                error?.stack || error?.message || error
            );

            await responder.texto(
                '⚠️ No se pudo mencionar a todos los miembros.'
            );
        }
    }
};