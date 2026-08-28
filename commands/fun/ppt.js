// commands/fun/ppt.js
import {
    obtenerUsuario,
    modificarDinero,
    guardarUsuario
} from '../../database/economia.js';

const OPCIONES = ['piedra', 'papel', 'tijera'];
const EMOJI = { piedra: '🪨', papel: '📄', tijera: '✂️' };

function decidirGanador(jugador, bot) {
    if (jugador === bot) return 'empate';
    const gana = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };
    return gana[jugador] === bot ? 'jugador' : 'bot';
}

export default {
    nombre: 'ppt',
    categoria: 'Diversión',
    alias: ['piedrapapeltijera'],
    descripcion: 'Piedra, papel o tijera contra el bot. ¡Ganas o pierdes 100 monedas!',
    ejecutar: async ({ msg, responder, argumento }) => {
        const id = msg.key.participant || msg.key.remoteJid;
        const jugador = argumento.toLowerCase().trim();

        if (!OPCIONES.includes(jugador)) {
            return responder.texto(
                `❌ *PPT*\n\n` +
                `Elige una opción válida:\n` +
                `• *.ppt piedra*\n` +
                `• *.ppt papel*\n` +
                `• *.ppt tijera*\n\n` +
                `💰 Apuesta: 100 monedas por ronda.`
            );
        }

        // Obtener datos del usuario
        const usuario = obtenerUsuario(id);
        const saldo = Number(usuario.dinero || 0);

        // Verificar que tenga al menos 100 monedas
        if (saldo < 100) {
            return responder.texto(
                `❌ *SALDO INSUFICIENTE*\n\n` +
                `💰 Necesitas al menos *100 monedas* para jugar.\n` +
                `💵 Tu saldo: *$${saldo.toLocaleString()}*`
            );
        }

        const bot = OPCIONES[Math.floor(Math.random() * OPCIONES.length)];
        const resultado = decidirGanador(jugador, bot);

        let mensaje = '';
        let dineroCambio = 0;

        if (resultado === 'empate') {
            mensaje = '🤝 ¡Empate! Nadie pierde ni gana.';
            dineroCambio = 0;
        } else if (resultado === 'jugador') {
            mensaje = '🎉 ¡Ganaste! +100 monedas.';
            dineroCambio = 100;
            modificarDinero(id, 100);
        } else {
            mensaje = '🤖 ¡Gana el bot! -100 monedas.';
            dineroCambio = -100;
            modificarDinero(id, -100);
        }

        // Guardamos el cambio (por si acaso)
        guardarUsuario(id, usuario);

        const respuesta = `
╭〔 🎮 𝐏𝐈𝐄𝐃𝐑𝐀, 𝐏𝐀𝐏𝐄𝐋, 𝐓𝐈𝐉𝐄𝐑𝐀 〕⬣
┃
┃ ${EMOJI[jugador]} *TÚ* vs *BOT* ${EMOJI[bot]}
┃
┃ 🧾 Elegiste: *${jugador}*
┃ 🤖 El bot eligió: *${bot}*
┃
┃ 📊 Resultado: ${mensaje}
┃
┃ 💰 Nuevo saldo: *$${(saldo + dineroCambio).toLocaleString()}*
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

        await responder.texto(respuesta);
    }
};