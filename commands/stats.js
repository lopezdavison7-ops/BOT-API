import { obtenerEstadisticas } from '../lib/estadisticas.js';

function formatearTiempo(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return `${h}h ${m}m ${s}s`;
}

export default {
    nombre: 'stats',
    alias: ['estadisticas'],
    descripcion: 'Estadísticas de uso del bot desde el último reinicio',
    ejecutar: async ({ responder }) => {
        const { entradas, totalUsos, segundos } = obtenerEstadisticas();
        let texto = `📊 *ESTADÍSTICAS DEL BOT*\n\nActivo desde hace: ${formatearTiempo(segundos)}\nComandos usados en total: ${totalUsos}\n\n`;

        if (entradas.length === 0) {
            texto += '_Aún no se ha usado ningún comando._';
        } else {
            texto += '*Top comandos:*\n';
            entradas.slice(0, 10).forEach(([nombre, veces], i) => {
                texto += `${i + 1}. .${nombre} — ${veces} veces\n`;
            });
        }
        await responder.texto(texto);
    }
};