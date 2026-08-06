import { esGrupo, verificarPermisosAdmin, obtenerObjetivo } from '../lib/grupos.js';

export default {
    nombre: 'promover',
    categoria: 'grupos',
    alias: ['promote', 'admin'],
    descripcion: 'Hace administrador a alguien del grupo. Uso: .promover @usuario',
    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;
        if (!esGrupo(chatId)) return responder.texto('Este comando solo funciona dentro de un grupo.');

        const permiso = await verificarPermisosAdmin(sock, msg, chatId);
        if (!permiso.ok) return responder.texto(permiso.motivo);

        const objetivo = obtenerObjetivo(msg, argumento);
        if (!objetivo) return responder.texto('Menciona a alguien, responde su mensaje, o pon su número. Ej: .promover 50499999999');

        try {
            await sock.groupParticipantsUpdate(chatId, [objetivo], 'promote');
            await responder.texto(`✅ Ahora es administrador del grupo.`);
        } catch (e) {
            await responder.texto('⚠️ No se pudo promover a esa persona.');
        }
    }
};
