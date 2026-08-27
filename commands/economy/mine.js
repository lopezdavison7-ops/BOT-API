// commands/economy/mine.js
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
    nombre: 'mine',
    categoria: 'economia',
    alias: ['minar'],
    descripcion: 'Mina recursos en la mina.',

    ejecutar: async ({ msg, responder }) => {
        try {
            const id = obtenerIdUsuario(msg);
            if (!id) return await responder.texto('❌ Error: No se pudo identificar al usuario');

            let usuario = cache.get(id) || await obtenerUsuario(id);
            usuario.dinero = usuario.dinero || 0;
            usuario.ultimoMine = usuario.ultimoMine || 0;

            const ahora = Date.now();
            const restante = COOLDOWN - (ahora - usuario.ultimoMine);
            
            if (restante > 0) {
                return await responder.texto(`⏰ Espera *${msToTime(restante)}* para minar de nuevo`);
            }

            const roll = Math.random(); // 0 a 1
            let texto = '';
            let ganancia = 0;

            const materiales = [
                { name: '💎 Diamante', min: 1, max: 3, valor: 5000 },
                { name: '💚 Esmeralda', min: 1, max: 2, valor: 7000 },
                { name: '🟡 Oro', min: 2, max: 6, valor: 2000 },
                { name: '⚪ Hierro', min: 3, max: 8, valor: 800 },
                { name: '⚫ Carbón', min: 5, max: 15, valor: 200 },
                { name: '🔮 Amatista', min: 1, max: 4, valor: 1500 }
            ];

            // 65% ÉXITO - ENCUENTRA MINERALES
            if (roll > 0.35) {
                let drop = materiales[Math.floor(Math.random() * materiales.length)];
                let cantidad = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
                ganancia = cantidad * drop.valor;
                usuario.dinero += ganancia;

                texto = `╭━━〔 ⛏️ 𝐌𝐈𝐍𝐀𝐃𝐎 𝐄𝐗𝐈𝐓𝐎𝐒𝐎 〕━━⬣
┃ Encontraste minerales!
┃ 📦 ${cantidad}x ${drop.name}
┃ 💰 Ganancia: *$${ganancia.toLocaleString()}*
┃ 💵 Saldo: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`;

            // 20% ACCIDENTE LEVE - PIERDES HERRAMIENTAS
            } else if (roll > 0.15) {
                let perdido = Math.floor(Math.random() * 300) + 200;
                usuario.dinero = Math.max(0, usuario.dinero - perdido);
                
                texto = `╭━━〔 🪨 𝐀𝐂𝐂𝐈𝐃𝐄𝐍𝐓𝐄 〕━━⬣
┃ Se te rompió el pico minando!
┃ 💸 Reparación: *$${perdido.toLocaleString()}*
┃ 💵 Saldo: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`;

            // 15% DERRUMBE - PIERDES MUCHO
            } else {
                let perdido = Math.floor(usuario.dinero * 0.4); // pierde 40%
                if (perdido < 800) perdido = 800; // mínimo 800
                usuario.dinero = Math.max(0, usuario.dinero - perdido);
                
                texto = `╭━━〔 🚨 𝐃𝐄𝐑𝐑𝐔𝐌𝐁𝐄 〕━━⬣
┃ LA MINA COLAPSÓ!!
┃ Corriste pero perdiste todo tu equipo
┃ 💸 Pérdida: *$${perdido.toLocaleString()}*
┃ 💵 Saldo restante: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`;
            }

            usuario.ultimoMine = ahora;
            cache.set(id, usuario);
            await guardarUsuario(id, usuario);
            await responder.texto(texto);

        } catch(e) {
            console.error('Error en mine:', e);
            await responder.texto('❌ Error al minar');
        }
    }
};