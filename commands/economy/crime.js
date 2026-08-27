// commands/economy/crime.js
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

export default {
    nombre: 'crime',
    categoria: 'economia',
    alias: ['crimen'],
    descripcion: 'Comete un crimen.',

    ejecutar: async ({ msg, responder }) => {
        const id = obtenerIdUsuario(msg);
        let usuario = cache.get(id) || obtenerUsuario(id);

        const ahora = Date.now();
        const restante = COOLDOWN - (ahora - (usuario.ultimoCrime || 0));
        if (restante > 0) return responder.texto(`⏰ Espera *${msToTime(restante)}* para delinquir de nuevo`);

        const success = Math.random() > 0.4; // 60% ganar
        let cantidad = 0;

        if (success) {
            cantidad = Math.floor(Math.random() * 800) + 200;
            usuario.dinero = (usuario.dinero || 0) + cantidad;
            var texto = `╭━━〔 🥷 𝐂𝐑𝐈𝐌𝐄𝐍 〕━━⬣
┃ Salió bien el golpe!
┃ 💰 Robaste: *$${cantidad.toLocaleString()}*
┃ 💵 Saldo: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`;
        } else {
            cantidad = Math.floor(Math.random() * 300) + 100;
            usuario.dinero = Math.max(0, (usuario.dinero || 0) - cantidad);
            var texto = `╭━━〔 👮 𝐀𝐓𝐑𝐀𝐏𝐀𝐃𝐎 〕━━⬣
┃ La poli te agarró!
┃ 💸 Multa: *$${cantidad.toLocaleString()}*
┃ 💵 Saldo: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`;
        }

        usuario.ultimoCrime = ahora;
        cache.set(id, usuario);
        guardarUsuario(id, usuario).catch(() => {});
        await responder.texto(texto);
    }
};