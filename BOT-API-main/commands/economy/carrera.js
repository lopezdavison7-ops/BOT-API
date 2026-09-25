import {
    obtenerUsuario,
    modificarDinero
} from '../../database/economia.js';

export default {
    nombre: 'carrera',
    categoria: 'economia',
    descripcion: 'Apuesta a un caballo. Uso:.carrera <1-5> <monto>',
    ejecutar: async ({ msg, args, responder }) => {
        const id = msg.key.participant || msg.key.remoteJid;
        const usuario = obtenerUsuario(id);

        if (!args[0] ||!args[1]) {
            return await responder.texto(
                `🏁 *CARRERA BOT-API* 🏁\n\n` +
                `1. 🐴 Trueno\n2. 🐎 Relámpago\n3. 🦄 Unicornio\n4. 🐪 Camello\n5. 🦓 Cebra\n` +
                `Uso:.carrera <numero> <monto>\n` +
                `💵 Tu saldo: $${usuario.dinero.toLocaleString()}`
            );
        }

        const eleccion = parseInt(args[0]) - 1;
        const apuesta = parseInt(args[1]);
        const caballos = ['🐴 Trueno','🐎 Relámpago','🦄 Unicornio','🐪 Camello','🦓 Cebra'];

        if (eleccion < 0 || eleccion > 4) return await responder.texto('❌ Elige del 1 al 5');
        if (apuesta < 10) return await responder.texto('❌ Apuesta mínima: $10');
        if (usuario.dinero < apuesta) return await responder.texto(`❌ No tienes $${apuesta.toLocaleString()}`);

        modificarDinero(id, -apuesta);
        const ganador = Math.floor(Math.random() * 5);

        let texto = `🏁 *CARRERA* 🏁\n\nApostaste: $${apuesta.toLocaleString()} a ${caballos[eleccion]}\n\n`;
        texto += `Ganó: ${caballos[ganador]}\n\n`;

        if (ganador === eleccion) {
            const premio = apuesta * 2;
            modificarDinero(id, premio);
            texto += `🎉 *GANASTE!* +$${premio.toLocaleString()}`;
        } else {
            texto += `💀 *PERDISTE* -$${apuesta.toLocaleString()}`;
        }

        const usuario2 = obtenerUsuario(id);
        texto += `\n💵 Saldo: $${usuario2.dinero.toLocaleString()}`;

        await responder.texto(texto);
    }
};