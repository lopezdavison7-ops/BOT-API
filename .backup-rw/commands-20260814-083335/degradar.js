import {
    esGrupo,
    verificarPermisosAdmin,
    obtenerObjetivo
} from '../lib/grupos.js';

export default {
    nombre: 'degradar',
    categoria: 'grupos',
    alias: ['demote'],
    descripcion: 'Quita la administración a alguien del grupo. Uso: .degradar @usuario',

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
        // VERIFICAR PERMISOS DEL USUARIO
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
        // OBTENER OBJETIVO
        // SOLO MENCIONADO O MENSAJE RESPONDIDO
        // ============================================================

        const objetivo = obtenerObjetivo(msg, '');

        if (!objetivo) {
            return responder.texto(
                '⚠️ Debes mencionar al usuario o responder a su mensaje.\n\n' +
                'Ejemplos:\n' +
                '• .degradar @usuario\n' +
                '• Responde al mensaje del usuario y escribe .degradar'
            );
        }

        // ============================================================
        // QUITAR ADMINISTRACIÓN
        // ============================================================

        try {
            await sock.groupParticipantsUpdate(
                chatId,
                [objetivo],
                'demote'
            );

            await responder.texto(
                '✅ Usuario degradado correctamente.'
            );

        } catch (error) {
            console.error(
                '[DEGRADAR]',
                error?.stack || error?.message || error
            );

            await responder.texto(
                '⚠️ No se pudo quitar la administración.\n\n' +
                'Puede que el usuario ya no sea administrador, ' +
                'no esté en el grupo o el bot no tenga permisos.'
            );
        }
    }
};	
