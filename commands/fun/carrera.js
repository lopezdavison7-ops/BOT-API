import { getDinero, quitarDinero, addDinero } from '../../lib/economia.js';

export default {
    nombre: 'carrera',
    categoria: 'fun',
    alias: ['race', 'caballos'],
    descripcion: 'Apuesta a un caballo y gana el doble.carrera <numero> <monto>',
    ejecutar: async ({ sock, msg, jid, args }) => {
        const jugador = msg.key.participant || msg.key.remoteJid;

        const caballos = [
            { nombre: '🐴 Trueno', num: 1 },
            { nombre: '🐎 Relámpago', num: 2 },
            { nombre: '🦄 Unicornio', num: 3 },
            { nombre: '🐪 Camello', num: 4 },
            { nombre: '🦓 Cebra', num: 5 }
        ];
        const meta = 10;

        // SI NO PONE ARGUMENTOS = MOSTRAR INFO
        if (!args[0] ||!args[1]) {
            let info = `🏁 *CARRERA CON APUESTAS* 🏁\n\n`;
            caballos.forEach(c => info += `${c.num}. ${c.nombre}\n`);
            info += `\nUso:.carrera <numero> <monto>\n`;
            info += `Ej:.carrera 2 100\n`;
            info += `Si gana tu caballo x2 tu apuesta\n`;
            info += `Tienes: ${getDinero(jugador)} 🪙`;
            return await sock.sendMessage(jid, { text: info });
        }

        const eleccion = parseInt(args[0]);
        const apuesta = parseInt(args[1]);

        // VALIDACIONES
        if (eleccion < 1 || eleccion > 5)
            return await sock.sendMessage(jid, { text: '❌ Elige del 1 al 5' });
        if (isNaN(apuesta) || apuesta < 10)
            return await sock.sendMessage(jid, { text: '❌ Apuesta mínima: 10 🪙' });
        if (getDinero(jugador) < apuesta)
            return await sock.sendMessage(jid, { text: `❌ No tienes ${apuesta} 🪙\nTienes: ${getDinero(jugador)} 🪙` });

        quitarDinero(jugador, apuesta);

        const posiciones = [0, 0, 0, 0, 0];
        let carreraTerminada = false;
        let ganadorIndex = -1;

        // Mensaje inicial
        let texto = `🏁 *CARRERA INICIADA* 🏁\n\n`;
        texto += `Apostaste: ${apuesta} 🪙 a ${caballos[eleccion-1].nombre}\n\n`;
        caballos.forEach((c, i) => {
            texto += `${c.nombre} ${'▫️'.repeat(meta)}\n`;
        });

        const carreraMsg = await sock.sendMessage(jid, { text: texto });

        await new Promise(r => setTimeout(r, 2000));

        // Loop de la carrera
        const intervalo = setInterval(async () => {
            if (carreraTerminada) {
                clearInterval(intervalo);
                return;
            }

            const caballo = Math.floor(Math.random() * caballos.length);
            posiciones[caballo]++;

            if (posiciones[caballo] >= meta) {
                carreraTerminada = true;
                ganadorIndex = caballo;
                clearInterval(intervalo);

                // PAGAR SI GANA
                if (ganadorIndex + 1 === eleccion) {
                    const premio = apuesta * 2;
                    addDinero(jugador, premio);
                }
            }

            // Armar tablero
            let tablero = `🏁 *CARRERA EN VIVO* 🏁\n\n`;
            tablero += `Tu apuesta: ${apuesta} 🪙 a ${caballos[eleccion-1].nombre}\n\n`;
            caballos.forEach((c, i) => {
                tablero += `${c.nombre} ${'🟩'.repeat(posiciones[i])}${'▫️'.repeat(meta - posiciones[i])}\n`;
            });

            if (carreraTerminada) {
                if (ganadorIndex + 1 === eleccion) {
                    tablero += `\n🎉 *GANASTE!* ${caballos[ganadorIndex].nombre} ganó\n`;
                    tablero += `+${apuesta * 2} 🪙 | Cartera: ${getDinero(jugador)} 🪙`;
                } else {
                    tablero += `\n💀 *PERDISTE* Ganó ${caballos[ganadorIndex].nombre}\n`;
                    tablero += `-${apuesta} 🪙 | Cartera: ${getDinero(jugador)} 🪙`;
                }
            } else {
                tablero += `\nCorriendo...`;
            }

            await sock.sendMessage(jid, {
                text: tablero,
                edit: carreraMsg.key
            });

        }, 700);
    }
}