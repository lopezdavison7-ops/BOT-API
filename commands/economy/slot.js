// commands/economy/slot.js
import { obtenerUsuario, guardarUsuario } from '../../database/economia.js';

const COOLDOWN = 0; // sin cooldown
const cache = new Map();
setInterval(() => cache.clear(), 5 * 60 * 1000);

const obtenerIdUsuario = (msg) => {
    const remoteJid = msg.key?.remoteJid || '';
    return remoteJid.endsWith('@g.us')? msg.key?.participant || msg.participant || null : remoteJid || null;
};

export default {
    nombre: 'slot',
    categoria: 'economia',
    alias: ['casino'],
    descripcion: 'Juega al casino.',

    ejecutar: async ({ msg, args, responder }) => {
        const id = obtenerIdUsuario(msg);
        if (!id) return responder.texto(`❌ Error al identificar usuario`);

        let usuario = cache.get(id) || obtenerUsuario(id);
        const apuesta = parseInt(args[0]);

        if (!apuesta) return responder.texto(`💸 Uso: *.slot <cantidad>*`);
        if (usuario.dinero < apuesta) return responder.texto(`❌ No tienes suficientes coins`);
        if (apuesta < 100) return responder.texto(`❌ Apuesta mínima: *$100*`);

        const emojis = ['💎','🍀','7️⃣','⭐','🍒','🔔'];
        const r = [0,1,2].map(() => emojis[Math.floor(Math.random() * emojis.length)]);

        let ganancia = 0;
        if (r[0] === r[1] && r[1] === r[2]) ganancia = apuesta * 5; // Jackpot
        else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) ganancia = apuesta * 2;

        usuario.dinero = usuario.dinero - apuesta + ganancia;
        cache.set(id, usuario);
        guardarUsuario(id, usuario).catch(() => {});

        await responder.texto(`╭━━〔 🎰 𝐒𝐋𝐎𝐓 〕━━⬣
┃ ${r.join(' | ')}
┃ Apuesta: *$${apuesta.toLocaleString()}*
┃ ${ganancia > 0? `💰 Ganaste: *$${ganancia.toLocaleString()}*` : `💸 Perdiste: *$${apuesta.toLocaleString()}*`}
┃ 💵 Saldo: *$${usuario.dinero.toLocaleString()}*
╰━━━━━━━━⬣`);
    }
};