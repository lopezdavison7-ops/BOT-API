import { esGrupo, verificarPermisosAdmin, obtenerObjetivo } from '../lib/grupos.js';

export default {
    nombre: 'degradar',
    alias: ['demote'],
    descripcion: 'Quita la administración a alguien del grupo. Uso: .degradar @usuario',
    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;
        if (!esGrupo(chatId)) return responder.texto('Este comando solo funciona dentro de un grupo.');

        const permiso = await verificarPermisosAdmin(sock, msg, chatId);
        if (!permiso.ok) return responder.texto(permiso.motivo);

        const objetivo = obtenerObjetivo(msg, argumento);
        if (!objetivo) return responder.texto('Menciona a alguien, responde su mensaje, o pon su número. Ej: .degradar 50499999999');

        try {
            await sock.groupParticipantsUpdate(chatId, [objetivo], 'demote');
            await responder.texto(`✅ Ya no es administrador del grupo.`);
        } catch (e) {
            await responder.texto('⚠️ No se pudo quitar la administración a esa persona.');
        }
    }
};
