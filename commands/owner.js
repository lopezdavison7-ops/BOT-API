// ============================================================
// COMANDO OWNER
// ============================================================

export default {
    nombre: 'owner',
    alias: ['creador', 'dueño'],
    owner: true,

    async ejecutar({ responder }) {
        await responder.texto(
            '👑 *ALEX BOT*\n\n' +
            '🔐 Comando exclusivo del Owner.\n' +
            '⚡ Sistema funcionando correctamente.'
        );
    }
};
