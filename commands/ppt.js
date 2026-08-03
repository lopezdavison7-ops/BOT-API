const OPCIONES = ['piedra', 'papel', 'tijera'];
const EMOJI = { piedra: '🪨', papel: '📄', tijera: '✂️' };

function decidirGanador(jugador, bot) {
    if (jugador === bot) return 'empate';
    const gana = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };
    return gana[jugador] === bot ? 'jugador' : 'bot';
}

export default {
    nombre: 'ppt',
    alias: ['piedrapapeltijera'],
    descripcion: 'Piedra, papel o tijera contra el bot. Uso: .ppt piedra/papel/tijera',
    ejecutar: async ({ responder, argumento }) => {
        const jugador = argumento.toLowerCase().trim();
        if (!OPCIONES.includes(jugador)) {
            return responder.texto('Elige una opción válida: .ppt piedra, .ppt papel o .ppt tijera');
        }
        const bot = OPCIONES[Math.floor(Math.random() * OPCIONES.length)];
        const resultado = decidirGanador(jugador, bot);

        let texto = `${EMOJI[jugador]} *TÚ* vs *BOT* ${EMOJI[bot]}\n\nElegiste: ${jugador}\nEl bot eligió: ${bot}\n\n`;
        if (resultado === 'empate') texto += '🤝 ¡Empate!';
        else if (resultado === 'jugador') texto += '🎉 ¡Ganaste!';
        else texto += '🤖 ¡Gana el bot!';

        await responder.texto(texto);
    }
};