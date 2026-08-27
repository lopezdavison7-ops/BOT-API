// commands/economy/crime.js
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
    nombre: 'crime',
    categoria: 'economia',
    alias: ['crimen'],
    descripcion: 'Comete un crimen.',

    ejecutar: async ({ msg, responder }) => {
        try {
            const id = obtenerIdUsuario(msg);
            if (!id) return await responder.texto('❌ Error: No se pudo identificar al usuario');

            let usuario = cache.get(id) || await obtenerUsuario(id);
            usuario.dinero = usuario.dinero || 0;
            usuario.ultimoCrime = usuario.ultimoCrime || 0;

            const ahora = Date.now();
            const restante = COOLDOWN - (ahora - usuario.ultimoCrime);
            
            if (restante > 0) {
                return await responder.texto(`⏰ Espera *${msToTime(restante)}* para delinquir de nuevo`);
            }

            const roll = Math.random(); // 0 a 1
            let texto = '';
            let cantidad = 0;

            // 60% ÉXITO
            if (roll > 0.4) {
                cantidad = Math.floor(Math.random() * 800) + 200;
                usuario.dinero += cantidad;
                texto = `╭━━〔 🥷 𝐂𝐑𝐈𝐌𝐄𝐍 𝐄𝐗𝐈𝐓𝐎𝐒𝐎 〕━━⬣
┃ El golpe salió perfecto!
┃ 💰 Robaste: *$${cantidad.toLocaleString()}*
┃ 💵 Saldo: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`;
            
            // 25% ATRAPADO CON MULTA
            } else if (roll > 0.15) {
                cantidad = Math.floor(Math.random() * 400) + 200;
                usuario.dinero = Math.max(0, usuario.dinero - cantidad);
                texto = `╭━━〔 👮 𝐀𝐓𝐑𝐀𝐏𝐀𝐃𝐎 〕━━⬣
┃ La policía te agarró in fraganti!
┃ 💸 Multa pagada: *$${cantidad.toLocaleString()}*
┃ 💵 Saldo: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`;

            // 15% PERSECUCIÓN Y PIERDE TODO
            } else {
                let perdido = Math.floor(usuario.dinero * 0.5); // pierde 50% de lo que tiene
                if (perdido < 500) perdido = 500; // mínimo 500
                usuario.dinero = Math.max(0, usuario.dinero - perdido);
                
                texto = `╭━━〔 🚨 𝐏𝐄𝐑𝐒𝐄𝐂𝐔𝐂𝐈𝐎𝐍 〕━━⬣
┃ CORRE!! La poli te está persiguiendo!
┃ Te atraparon después de una persecución
┃ 💸 Perdiste: *$${perdido.toLocaleString()}*
┃ 💵 Saldo restante: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`;
            }

            usuario.ultimoCrime = ahora;
            cache.set(id, usuario);
            await guardarUsuario(id, usuario);
            await responder.texto(texto);

        } catch(e) {
            console.error('Error en crime:', e);
            await responder.texto('❌ Error al ejecutar el crimen');
        }
    }
};