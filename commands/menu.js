export default {
    nombre: 'menu',
    alias: ['ayuda', 'help'],
    descripcion: 'Muestra todos los comandos disponibles',
    ejecutar: async ({ responder, listaComandos, prefijo }) => {
        let texto = '🤖 *ALEX BOT*\n\n';
        for (const cmd of listaComandos) {
            texto += `*${prefijo}${cmd.nombre}* — ${cmd.descripcion}\n`;
        }
        await responder.texto(texto);
    }
};