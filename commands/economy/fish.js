// commands/economy/fish.js
import { obtenerUsuario, guardarUsuario } from '../../database/economia.js';

const COOLDOWN = 5 * 60 * 1000; // 5 min
const cache = new Map();
setInterval(() => cache.clear(), 5 * 60 * 1000);

const obtenerIdUsuario = (msg) => {
    const remoteJid = msg.key?.remoteJid || '';
    return remoteJid.endsWith('@g.us')? msg.key?.participant || msg.participant || null : remoteJid || null;
};

const msToTime = (ms) => {
    let s = Math.floor(ms / 1000), m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
};

const PECES = [
    { nombre: '🐟 Sardina', min: 80, max: 150 },
    { nombre: '🐠 Pez Tropical', min: 120, max: 250 },
    { nombre: '🦐 Camarón', min: 150, max: 300 },
    { nombre: '🐡 Pez Globo', min: 200, max: 400 },
    { nombre: '🦈 Tiburón', min: 350, max: 600 }
];

export default {
    nombre: 'fish',
    categoria: 'economia',
    alias: ['pescar'],
    descripcion: 'Pesca para ganar dinero.',

    ejecutar: async ({ msg, responder }) => {
        const id = obtenerIdUsuario(msg);
        let usuario = cache.get(id) || obtenerUsuario(id);

        const ahora = Date.now();
        const restante = COOLDOWN - (ahora - (usuario.ultimoFish || 0));
        if (restante > 0) return responder.texto(`⏰ Espera *${msToTime(restante)}* para pescar de nuevo`);

        const pez = PECES[Math.floor(Math.random() * PECES.length)];
        const ganado = Math.floor(Math.random() * (pez.max - pez.min + 1)) + pez.min;

        usuario.dinero = (usuario.dinero || 0) + ganado;
        usuario.ultimoFish = ahora;
        cache.set(id, usuario);
        guardarUsuario(id, usuario).catch(() => {});

        await responder.texto(`╭━━〔 🎣 𝐏𝐄𝐒𝐂𝐀 〕━━⬣
┃ Atrapaste: ${pez.nombre}
┃ 💰 Vendiste por: *$${ganado.toLocaleString()}*
┃ 💵 Saldo: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`);
    }
};