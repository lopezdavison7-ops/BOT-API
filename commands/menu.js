export default {
    nombre: 'menu',
    categoria: 'Utilidades',
    alias: ['ayuda', 'help'],
    descripcion: 'Muestra todos los comandos disponibles',
    ejecutar: async ({ responder, listaComandos, prefijo }) => {
        const orden = ['Grupos', 'Multimedia', 'Diversión', 'Utilidades'];
        const grupos = {};

        for (const cmd of listaComandos) {
            const cat = cmd.categoria || 'Otros';
            if (!grupos[cat]) grupos[cat] = [];
            grupos[cat].push(cmd);
        }

        let texto = '🤖 *ALEX BOT*\n';
        const categoriasFinales = [...orden.filter(c => grupos[c]), ...Object.keys(grupos).filter(c => !orden.includes(c))];

        for (const cat of categoriasFinales) {
            texto += `\n*― ${cat} ―*\n`;
            for (const cmd of grupos[cat]) {
                texto += `${prefijo}${cmd.nombre}\n`;
            }
        }

        texto += `\n_Escribe *${prefijo}<comando>* para usarlo._`;
        await responder.texto(texto);
    }
};