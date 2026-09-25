

import { obtenerUsuario, guardarUsuario } from '../../database/economia.js';

const COOLDOWN_RULETA = 2 * 60 * 1000;

const ROJOS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const NEGROS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
const VERDE = [0];

function parsearApuesta(input) {
    const apuesta = input.toLowerCase().trim();

    if (['red', 'rojo', 'r'].includes(apuesta)) return { tipo: 'color', valor: 'rojo' };
    if (['black', 'negro', 'n'].includes(apuesta)) return { tipo: 'color', valor: 'negro' };
    if (['green', 'verde', 'g'].includes(apuesta)) return { tipo: 'color', valor: 'verde' };

    if (['par', 'even', 'p'].includes(apuesta)) return { tipo: 'paridad', valor: 'par' };
    if (['impar', 'odd', 'i'].includes(apuesta)) return { tipo: 'paridad', valor: 'impar' };

    if (['1-18', 'bajo', 'low'].includes(apuesta)) return { tipo: 'rango', valor: '1-18' };
    if (['19-36', 'alto', 'high'].includes(apuesta)) return { tipo: 'rango', valor: '19-36' };

    const num = parseInt(apuesta);
    if (!isNaN(num) && num >= 0 && num <= 36) {
        return { tipo: 'numero', valor: num };
    }

    return null;
}

function calcularMultiplicador(tipoApuesta) {
    switch (tipoApuesta.tipo) {
        case 'color':
            return tipoApuesta.valor === 'verde' ? 35 : 2;
        case 'numero':
            return 35;
        case 'paridad':
        case 'rango':
            return 2;
        default:
            return 2;
    }
}

function verificarGanancia(numeroRuleta, tipoApuesta) {
    switch (tipoApuesta.tipo) {
        case 'color':
            if (tipoApuesta.valor === 'rojo') return ROJOS.includes(numeroRuleta);
            if (tipoApuesta.valor === 'negro') return NEGROS.includes(numeroRuleta);
            if (tipoApuesta.valor === 'verde') return VERDE.includes(numeroRuleta);
            return false;

        case 'numero':
            return numeroRuleta === tipoApuesta.valor;

        case 'paridad':
            if (tipoApuesta.valor === 'par') return numeroRuleta % 2 === 0 && numeroRuleta !== 0;
            if (tipoApuesta.valor === 'impar') return numeroRuleta % 2 !== 0;
            return false;

        case 'rango':
            if (tipoApuesta.valor === '1-18') return numeroRuleta >= 1 && numeroRuleta <= 18;
            if (tipoApuesta.valor === '19-36') return numeroRuleta >= 19 && numeroRuleta <= 36;
            return false;

        default:
            return false;
    }
}

function fmtTiempo(ms) {
    const minutos = Math.ceil(ms / 60000);
    return `${minutos}m`;
}

export default {
    nombre: 'roulette',
    categoria: 'economy',
    alias: ['rt', 'ruleta', 'roulette', 'casino'],
    descripcion: 'Apuesta en la ruleta (colores, números, par/impar)',
    uso: '.rt <cantidad> <apuesta>',
    ejecutar: async ({ sock, msg, args, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        const cantidad = parseInt(args[0]);
        const apuestaInput = args.slice(1).join(' ');

        if (isNaN(cantidad) || cantidad <= 0) {
            return await responder.texto(
                '╭━━〔 🎰 𝐑𝐔𝐋𝐄𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Cantidad inválida\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .rt 100 red\n' +
                '┃ • .rt 500 17\n' +
                '┃ • .rt 1000 par\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (!apuestaInput) {
            return await responder.texto(
                '╭━━〔 🎰 𝐑𝐔𝐋𝐄𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta la apuesta\n' +
                '┃\n' +
                '┃ 📋 Puedes apostar a:\n' +
                '┃ 🎨 Colores: red, black, green\n' +
                '┃ 🔢 Números: 0-36\n' +
                '┃ ⚖️ Paridad: par, impar\n' +
                '┃ 📊 Rangos: 1-18, 19-36\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ • .rt 100 black\n' +
                '┃ • .rt 500 17\n' +
                '┃ • .rt 1000 par\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const tipoApuesta = parsearApuesta(apuestaInput);

        if (!tipoApuesta) {
            return await responder.texto(
                '╭━━〔 🎰 𝐑𝐔𝐋𝐄𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Apuesta inválida\n' +
                '┃\n' +
                '┃ 📋 Opciones válidas:\n' +
                '┃ • red / black / green\n' +
                '┃ • 0-36\n' +
                '┃ • par / impar\n' +
                '┃ • 1-18 / 19-36\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (cantidad < 100) {
            return await responder.texto(
                '╭━━〔 🎰 𝐑𝐔𝐋𝐄𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Apuesta mínima: ₡100\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const usuario = obtenerUsuario(sender);
        const saldo = usuario.dinero || 0;

        if (saldo < cantidad) {
            return await responder.texto(
                '╭━━〔 🎰 𝐑𝐔𝐋𝐄𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Saldo insuficiente\n' +
                '┃\n' +
                '┃ 💰 Tu saldo: ₡' + saldo.toLocaleString() + '\n' +
                '┃ 💵 Apuestas: ₡' + cantidad.toLocaleString() + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const ahora = Date.now();
        const ultimaRuleta = usuario.ultimaRuleta || 0;
        const tiempoTranscurrido = ahora - ultimaRuleta;

        if (tiempoTranscurrido < COOLDOWN_RULETA) {
            const restante = COOLDOWN_RULETA - tiempoTranscurrido;
            return await responder.texto(
                '╭━━〔 ⏳ 𝐑𝐔𝐋𝐄𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Cooldown activo\n' +
                '┃\n' +
                '┃ ⏱️ Puedes jugar de nuevo en:\n' +
                '┃    *' + fmtTiempo(restante) + '*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        usuario.ultimaRuleta = ahora;

        const numeroRuleta = Math.floor(Math.random() * 37);
        const multiplicador = calcularMultiplicador(tipoApuesta);
        const gano = verificarGanancia(numeroRuleta, tipoApuesta);

        let colorNumero = 'verde';
        if (ROJOS.includes(numeroRuleta)) colorNumero = 'rojo';
        else if (NEGROS.includes(numeroRuleta)) colorNumero = 'negro';

        const emojiColor = colorNumero === 'rojo' ? '🔴' : colorNumero === 'negro' ? '⚫' : '🟢';

        let ganancia = 0;
        if (gano) {
            ganancia = cantidad * multiplicador;
            usuario.dinero += ganancia;
        } else {
            usuario.dinero -= cantidad;
        }

        guardarUsuario(sender, usuario);

        const nuevoSaldo = usuario.dinero;

        let apuestaTexto = '';
        switch (tipoApuesta.tipo) {
            case 'color':
                apuestaTexto = tipoApuesta.valor.toUpperCase();
                break;
            case 'numero':
                apuestaTexto = 'Número ' + tipoApuesta.valor;
                break;
            case 'paridad':
                apuestaTexto = tipoApuesta.valor.toUpperCase();
                break;
            case 'rango':
                apuestaTexto = tipoApuesta.valor;
                break;
        }

        const texto =
            '╭━━〔 🎰 𝐑𝐔𝐋𝐄𝐓𝐀 〕━━⬣\n' +
            '┃\n' +
            (gano ? '┃ 🎉 *¡GANASTE!*\n' : '┃ 💔 *Perdiste*\n') +
            '┃\n' +
            '┃ ' + emojiColor + ' *Número: ' + numeroRuleta + '*\n' +
            '┃ 🎯 Apuesta: ' + apuestaTexto + '\n' +
            '┃ 💵 Apuesta: ₡' + cantidad.toLocaleString() + '\n' +
            '┃\n' +
            '┣━━━━━━━━━━━━━━━━\n' +
            '┃\n' +
            (gano
                ? '┃ 💰 *Ganancia:* +₡' + ganancia.toLocaleString() + '\n' +
                  '┃ 📈 Multiplicador: x' + multiplicador + '\n'
                : '┃ 💸 *Perdido:* -₡' + cantidad.toLocaleString() + '\n') +
            '┃\n' +
            '┣━━━━━━━━━━━━━━━━\n' +
            '┃\n' +
            '┃ 💵 Saldo anterior: ₡' + (gano ? saldo - cantidad : saldo + cantidad).toLocaleString() + '\n' +
            '┃ 💰 Saldo actual: ₡' + nuevoSaldo.toLocaleString() + '\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        await responder.texto(texto);
    }
};