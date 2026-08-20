// commands/group/todos.js
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

        // ============================================================
        // VERIFICAR GRUPO
        // ============================================================

        if (!esGrupo(chatId)) {
            return responder.texto(
                '❌ Este comando solo funciona dentro de un grupo.'
            );
        }

        // ============================================================
        // VERIFICAR PERMISOS DE ADMIN
        // ============================================================

        const permiso = await verificarPermisosAdmin(
            sock,
            msg,
            chatId
        );

        if (!permiso.ok) {
            return responder.texto(permiso.motivo);
        }

        // ============================================================
        // OBTENER MIEMBROS
        // ============================================================

        try {
            const metadata =
                permiso.metadata ||
                await obtenerMetadata(sock, chatId);

            if (!metadata?.participants?.length) {
                return responder.texto(
                    '⚠️ No se pudo obtener la lista de miembros.'
                );
            }

            // ========================================================
            // CREAR MENCIONES
            // ========================================================

            const menciones = metadata.participants
                .map(participante => participante.id)
                .filter(Boolean);

            const listaTexto = menciones
                .map(jid => `@${jid.split('@')[0]}`)
                .join(' ');

            // ========================================================
            // MENSAJE
            // ========================================================

            const textoExtra = argumento?.trim();

            const encabezado = textoExtra
                ? `📢 *${textoExtra}*\n\n`
                : '📢 *Atención a todos:*\n\n';

            // ========================================================
            // ENVIAR
            // ========================================================

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