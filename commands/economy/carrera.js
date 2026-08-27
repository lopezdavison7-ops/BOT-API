import { getDinero, addDinero, quitarDinero } from '../../lib/economia.js';

export default {
    nombre: 'carrera',
    categoria: 'economia',
    alias: ['carrera'],
    descripcion: 'Apuesta al caballo 1-6.carreraapuesta 100 3',
    ejecutar: async ({ sock, msg, argumento, jid }) => {
        const s = global.conns?.[0] || Object.values(global.conns)[0]; // tu conexion
        const jugador = msg.key.participant || msg.key.remoteJid;
        const [monto, caballo] = argumento.split(' ');
        const apuesta = parseInt(monto);
        const num = parseInt(caballo);

        if (isNaN(apuesta) || apuesta < 10)
            return await s.sendMessage(jid, { text: '❌ Usa:.carreraapuesta 100 3\nMinimo 10 🪙' });

        if (num < 1 || num > 6)
            return await s.sendMessage(jid, { text: '❌ Elige un caballo del 1 al 6' });

        if (getDinero(jugador) < apuesta)
            return await s.sendMessage(jid, { text: `❌ No tienes ${apuesta} 🪙` });

        quitarDinero(jugador, apuesta);

        // Animacion de carrera
        await s.sendMessage(jid, {
            text: `🏇 CARRERA INICIADA 🏇\nApostaste ${apuesta} 🪙 al caballo #${num}\n\n🐴1 🐴2 🐴3 🐴4 🐴5 🐴6\nCorriendo...`,
            mentions: [jugador]
        });

        await new Promise(r => setTimeout(r, 2000)); // espera 2 seg

        const ganador = Math.floor(Math.random()*6) + 1;
        const premio = ganador === num? apuesta * 5 : 0;

        if(premio > 0) {
            addDinero(jugador, premio);
            await s.sendMessage(jid, {
                text: `🏁 RESULTADO 🏁\nGanó el caballo #${ganador}!\n\n🎉 GANASTE! +${premio} 🪙\nx5 tu apuesta\nCartera: ${getDinero(jugador)} 🪙`,
                mentions: [jugador]
            });
        } else {
            await s.sendMessage(jid, {
                text: `🏁 RESULTADO 🏁\nGanó el caballo #${ganador}!\n\n💀 PERDISTE ${apuesta} 🪙\nCartera: ${getDinero(jugador)} 🪙`,
                mentions: [jugador]
            });
        }
    }
}