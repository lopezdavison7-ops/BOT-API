// commands/economy/mine.js
import { obtenerUsuario, guardarUsuario } from '../../database/economia.js';

const COOLDOWN = 10 * 60 * 1000; // 10 min
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

const MINERALES = [
    { nombre: '🪨 Piedra', min: 100, max: 200 },
    { nombre: '⛏️ Carbón', min: 150, max: 300 },
    { nombre: '🥈 Plata', min: 250, max: 450 },
    { nombre: '🥇 Oro', min: 400, max: 700 },
    { nombre: '💎 Diamante', min: 600, max: 1000 }
];

export default {
    nombre: 'mine',
    categoria: 'economia',
    alias: ['minar'],
    descripcion: 'Mina para ganar dinero.',

    ejecutar: async ({ msg, responder }) => {
        const id = obtenerIdUsuario(msg);
        let usuario = cache.get(id) || obtenerUsuario(id);

        const ahora = Date.now();
        const restante = COOLDOWN - (ahora - (usuario.ultimoMine || 0));
        if (restante > 0) return responder.texto(`⏰ Espera *${msToTime(restante)}* para minar de nuevo`);

        const mineral = MINERALES[Math.floor(Math.random() * MINERALES.length)];
        const ganado = Math.floor(Math.random() * (mineral.max - mineral.min + 1)) + mineral.min;

        usuario.dinero = (usuario.dinero || 0) + ganado;
        usuario.ultimoMine = ahora;
        cache.set(id, usuario);
        guardarUsuario(id, usuario).catch(() => {});

        await responder.texto(`╭━━〔 ⛏️ 𝐌𝐈𝐍𝐀 〕━━⬣
┃ Encontraste: ${mineral.nombre}
┃ 💰 Valor: *$${ganado.toLocaleString()}*
┃ 💵 Saldo: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`);
    }
};