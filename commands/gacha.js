import { llamarApi } from '../lib/api.js';

// Tabla de rareza (probabilidades suman 100)
const RAREZAS = [
    { nombre: '⚪ Común', peso: 55 },
    { nombre: '🔵 Raro', peso: 28 },
    { nombre: '🟣 Épico', peso: 13 },
    { nombre: '🟡 Legendario', peso: 4 }
];

const CATEGORIAS = ['waifu', 'neko', 'shinobu', 'megumin', 'cuddle', 'smile', 'wave', 'happy'];

function tirarRareza() {
    const total = RAREZAS.reduce((s, r) => s + r.peso, 0);
    let n = Math.random() * total;
    for (const r of RAREZAS) {
        if (n < r.peso) return r.nombre;
        n -= r.peso;
    }
    return RAREZAS[0].nombre;
}

export default {
    nombre: 'gacha',
    alias: ['tirada', 'roll'],
    descripcion: 'Haz una tirada gacha y gana una imagen con rareza random',
    ejecutar: async ({ responder }) => {
        const categoria = CATEGORIAS[Math.floor(Math.random() * CATEGORIAS.length)];
        const data = await llamarApi('/api/v1/anime/imagen', { q: categoria });
        if (!data.status) return responder.texto('❌ ' + data.message);

        const rareza = tirarRareza();
        await responder.imagen(
            data.result.imagen_url,
            `🎰 *TIRADA GACHA*\n\nRareza: ${rareza}\nCategoría: ${categoria}`
        );
    }
};