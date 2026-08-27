// commands/economy/fish.js
import { obtenerUsuario, guardarUsuario } from '../../database/economia.js';

const COOLDOWN = 10 * 60 * 1000; // 10 min
const cache = new Map();
setInterval(() => cache.clear(), 5 * 60 * 1000);

const obtenerIdUsuario = (msg) => {
    const remoteJid = msg.key?.remoteJid || '';
    return remoteJid.endsWith('@g.us') ? msg.key?.participant || msg.participant || null : remoteJid || null;
};

const msToTime = (ms) => {
    let s = Math.floor(ms / 1000), m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
};

export default {
    nombre: 'fish',
    categoria: 'economia',
    alias: ['pescar'],
    descripcion: 'Pesca en el río.',

    ejecutar: async ({ msg, responder }) => {
        try {
            const id = obtenerIdUsuario(msg);
            if (!id) return await responder.texto('❌ Error: No se pudo identificar al usuario');

            let usuario = cache.get(id) || await obtenerUsuario(id);
            usuario.dinero = usuario.dinero || 0;
            usuario.ultimoFish = usuario.ultimoFish || 0;

            const ahora = Date.now();
            const restante = COOLDOWN - (ahora - usuario.ultimoFish);
            
            if (restante > 0) {
                return await responder.texto(`⏰ Espera *${msToTime(restante)}* para pescar de nuevo`);
            }

            const roll = Math.random();
            let texto = '';
            let ganancia = 0;

            const peces = [
                { name: '🦈 Tiburón', min: 1, max: 1, valor: 8000 },
                { name: '🐡 Pez Globo', min: 1, max: 2, valor: 3500 },
                { name: '🐠 Pez Tropical', min: 2, max: 5, valor: 1200 },
                { name: '🐟 Sardina', min: 3, max: 8, valor: 400 },
                { name: '🦀 Cangrejo', min: 1, max: 3, valor: 900 },
                { name: '🦞 Langosta', min: 1, max: 2, valor: 2500 },
                { name: '🪰 Bota vieja', min: 1, max: 1, valor: -100 } // basura
            ];

            // 60% PESCA BIEN
            if (roll > 0.4) {
                let drop = peces[Math.floor(Math.random() * 6)]; // sin basura
                let cantidad = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
                ganancia = cantidad * drop.valor;
                usuario.dinero += ganancia;

                texto = `╭━━〔 🎣 𝐏𝐄𝐒𝐂𝐀 𝐄𝐗𝐈𝐓𝐎𝐒𝐀 〕━━⬣
┃ Sacaste algo del río!
┃ 🐟 ${cantidad}x ${drop.name}
┃ 💰 Ganancia: *$${ganancia.toLocaleString()}*
┃ 💵 Saldo: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`;

            // 25% SOLO BASURA
            } else if (roll > 0.15) {
                let perdido = 100;
                usuario.dinero = Math.max(0, usuario.dinero - perdido);
                
                texto = `╭━━〔 🪰 𝐁𝐀𝐒𝐔𝐑𝐀 〕━━⬣
┃ Solo pescaste una bota vieja...
┃ 💸 Te cortaste y fuiste al doctor: *$${perdido}*
┃ 💵 Saldo: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`;

            // 15% SE TE ROMPE LA CAÑA
            } else {
                let perdido = Math.floor(usuario.dinero * 0.2); // pierde 20%
                if (perdido < 300) perdido = 300;
                usuario.dinero = Math.max(0, usuario.dinero - perdido);
                
                texto = `╭━━〔 🚨 𝐂𝐀𝐍̃𝐀 𝐑𝐎𝐓𝐀 〕━━⬣
┃ Un pez gigante te jaló y rompió la caña!
┃ 💸 Pérdida: *$${perdido.toLocaleString()}*
┃ 💵 Saldo restante: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`;
            }

            // IMPORTANTE: Guardar cooldown SIEMPRE aunque haya error
            usuario.ultimoFish = ahora;
            cache.set(id, usuario);
            await guardarUsuario(id, usuario);
            await responder.texto(texto);

        } catch(e) {
            console.error('Error en fish:', e);
            await responder.texto('❌ Error al pescar');
        }
    }
};