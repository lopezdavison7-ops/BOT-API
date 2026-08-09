// ============================================================
// COMANDO: CLOSE
// Cierra el grupo: solo administradores pueden escribir.
// Uso: .close
// ============================================================

import {
    esGrupo,
    verificarPermisosAdmin
} from '../lib/grupos.js';

export default {
    nombre: 'close',
    categoria: 'grupos',
    alias: ['cerrar'],

    descripcion:
        'Cierra el grupo para que solo los administradores puedan escribir. Uso: .close',

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
                'announcement'
            );

            await responder.texto(
                '🔒 *Grupo cerrado*\n\n' +
                'Solo los administradores pueden escribir.'
            );

        } catch (error) {
            console.error(
                '[CLOSE]',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                '⚠️ No se pudo cerrar el grupo.'
            );
        }
    }
};
