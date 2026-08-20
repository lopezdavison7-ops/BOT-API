// commands/economy/stats.js
import { obtenerEstadisticas } from '../../lib/estadisticas.js';

function formatearTiempo(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return `${h}h ${m}m ${s}s`;
}

export default {
    nombre: 'stats',
    categoria: 'utilidades',
    alias: ['estadisticas'],
    descripcion: 'Estadísticas de uso del bot desde el último reinicio',
    ejecutar: async ({ responder }) => {
        const { entradas, totalUsos, segundos } = obtenerEstadisticas();
        
        let texto =
            `╭〔 📊 𝐄𝐒𝐓𝐀𝐃Í𝐒𝐓𝐈𝐂𝐀𝐒 〕⬣\n` +
            `┃\n` +
            `┃ ⏱️ Activo desde: ${formatearTiempo(segundos)}\n` +
            `┃ 📟 Comandos usados: ${totalUsos}\n` +
            `┃\n`;

        if (entradas.length === 0) {
            texto += `┃ 📭 Aún no se ha usado ningún comando.\n`;
        } else {
            texto += `┃ 🏆 Top comandos:\n`;
            entradas.slice(0, 10).forEach(([nombre, veces], i) => {
                texto += `┃ ${i + 1}. .${nombre} — ${veces} veces\n`;
            });
        }

        texto +=
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣\n\n` +
            `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`;

        await responder.texto(texto);
    }
};