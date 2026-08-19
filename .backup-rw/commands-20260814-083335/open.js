// ============================================================
// COMANDO: OPEN
// Abre el grupo: todos pueden escribir.
// Uso: .open
// ============================================================

import {
    esGrupo,
    verificarPermisosAdmin
} from '../lib/grupos.js';

export default {
    nombre: 'open',
    categoria: 'grupos',
    alias: ['abrir'],

    descripcion:
        'Abre el grupo para que todos puedan escribir. Uso: .open',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {
        const chatId = msg.key.remoteJid;

        if (!esGrupo(chatId)) {
            return responder.texto(
                '❌ Este comando solo funciona dentro de un grupo.'
            );
        }

        const permiso =
            await verificarPermisosAdmin(
                sock,
                msg,
                chatId
            );

        if (!permiso.ok) {
            return responder.texto(
                permiso.motivo
            );
        }

        try {
            await sock.groupSettingUpdate(
                chatId,
                'not_announcement'
            );

            await responder.texto(
                '🔓 *Grupo abierto*\n\n' +
                'Todos pueden escribir nuevamente.'
            );

        } catch (error) {
            console.error(
                '[OPEN]',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                '⚠️ No se pudo abrir el grupo.'
            );
        }
    }
};
