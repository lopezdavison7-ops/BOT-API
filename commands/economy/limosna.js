import { getDinero, addDinero } from '../../lib/economia.js'; // <- Agregué getDinero

export default {
    nombre: 'limosna',
    categoria: 'economia',
    alias: ['mendigar', 'beg'], // por si lo quieres llamar así
    descripcion: 'Pide limosna. 1 vez cada 12h.limosna',
    cooldown: 43200000, // 12 horas
    ejecutar: async ({ sock, msg, jid }) => {
        const jugador = msg.key.participant || msg.key.remoteJid;
        const premio = Math.floor(Math.random() * 91) + 10; // 10 a 100

        addDinero(jugador, premio);

        await sock.sendMessage(jid, {
            text: `🙏 *LIMOSNA RECIBIDA* 🙏\n\nAlguien te dio ${premio} 🪙 por lástima\nCartera: ${getDinero(jugador)} 🪙` // <- Ahora sí funciona
        });
    }
}