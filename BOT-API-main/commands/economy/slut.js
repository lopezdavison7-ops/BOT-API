

import { obtenerUsuario, modificarDinero, guardarUsuario } from '../../database/economia.js';

const ESCENARIOS = [
    {
        lugar: '🍸 Bar de mala muerte',
        proteccion: 'Se puso perfume caro y se peinó 3 veces',
        eventos: [
            { texto: 'Ligó con la bartender y le invitó 5 tragos', dinero: -1500, xp: 50 },
            { texto: 'Se besó con alguien en la pista y perdió la cartera', dinero: -2500, xp: 30 },
            { texto: 'Consiguió número nuevo pero gastó en uber', dinero: -800, xp: 40 },
            { texto: 'Le robaron el celular bailando reggaetón', dinero: -3000, xp: 20 },
            { texto: 'Terminó en el after pagando la ronda', dinero: -2000, xp: 60 }
        ]
    },
    {
        lugar: '🌃 Callejón oscuro a las 3am',
        proteccion: 'Caminaba con "confianza" (o sea, borrach@)',
        eventos: [
            { texto: 'Te robaron en el callejón oscuro', dinero: -2000, xp: 38 },
            { texto: 'Apareció tu ex y te cobró lo que le debías', dinero: -1800, xp: 25 },
            { texto: 'Un taxi te cobró el triple por "la ruta larga"', dinero: -1200, xp: 30 },
            { texto: 'Encontraste 500 pesos en el suelo (suerte)', dinero: 500, xp: 15 },
            { texto: 'Te asaltaron pero te dieron un beso antes', dinero: -2500, xp: 45 }
        ]
    },
    {
        lugar: '🏨 Hotel de paso',
        proteccion: 'Llevaba condón... en la otra chamarra',
        eventos: [
            { texto: 'Pagó la habitación y el desayuno continental', dinero: -3500, xp: 70 },
            { texto: 'Le salió más caro el uber que la noche misma', dinero: -1800, xp: 40 },
            { texto: 'Se fue temprano y solo gastó en la entrada', dinero: -500, xp: 20 },
            { texto: 'Le cobraron "daños" a la habitación', dinero: -4000, xp: 55 },
            { texto: 'Terminó pagando la cuenta de ambos', dinero: -2800, xp: 65 }
        ]
    },
    {
        lugar: '🎉 Fiesta en casa de alguien',
        proteccion: 'Llegó con una botella de $200 y se fue sin ella',
        eventos: [
            { texto: 'Aportó para la cooperacha y se quedó sin nada', dinero: -1000, xp: 35 },
            { texto: 'Se ligueó al dueñ@ de la casa y ganó puntos', dinero: 800, xp: 50 },
            { texto: 'Rompió un vaso y tuvo que pagarlo', dinero: -600, xp: 20 },
            { texto: 'Encontró dinero en el baño (milagro)', dinero: 1200, xp: 25 },
            { texto: 'Terminó pagando el uber de todos', dinero: -2200, xp: 45 }
        ]
    },
    {
        lugar: '💃 Antro fresa',
        proteccion: 'Se puso la ropa más cara que tenía',
        eventos: [
            { texto: 'Pagó cover + 3 bebidas + propina al valet', dinero: -3200, xp: 55 },
            { texto: 'Le invitaron tragos toda la noche (suertud@)', dinero: 1500, xp: 40 },
            { texto: 'Perdió la tarjeta y tuvo que pagar en efectivo', dinero: -4500, xp: 60 },
            { texto: 'Ligó con alguien rico que pagó todo', dinero: 2500, xp: 70 },
            { texto: 'Se fue antes del cierre y ahorró', dinero: -800, xp: 30 }
        ]
    },
    {
        lugar: '🚗 Uber compartido a las 4am',
        proteccion: 'Compartió uber con 3 desconocidos (qué podía salir mal)',
        eventos: [
            { texto: 'Le robaron los audífonos mientras dormía', dinero: -1800, xp: 25 },
            { texto: 'Hizo amig@s nuev@s y le invitaron tacos', dinero: 300, xp: 35 },
            { texto: 'El uber dio vuelta larga y cobró de más', dinero: -900, xp: 20 },
            { texto: 'Se bajó en la dirección equivocada', dinero: -1500, xp: 30 },
            { texto: 'Terminó en otra ciudad pagando regreso', dinero: -3500, xp: 50 }
        ]
    },
    {
        lugar: '🍕 Pizzería 24 horas',
        proteccion: 'Fue por "un refrigerio" con alguien que conoció hace 5 min',
        eventos: [
            { texto: 'Pagó la pizza familiar + refresco + propina', dinero: -700, xp: 25 },
            { texto: 'Le invitaron la cena (ganó)', dinero: 500, xp: 30 },
            { texto: 'Pidió de más y no pudo terminarla', dinero: -400, xp: 15 },
            { texto: 'Se quedó dormid@ y le robaron la mochila', dinero: -2500, xp: 35 },
            { texto: 'Terminó pagando la cuenta de 4 personas', dinero: -1800, xp: 40 }
        ]
    }
];

function getConsejo(porcentaje, dineroPerdido) {
    if (dineroPerdido > 3000) return '💀 Te recomiendo no salir un rato, estás en banca rota';
    if (dineroPerdido > 1500) return '😅 La próxima vez lleva menos dinero... o más cordura';
    if (dineroPerdido > 500) return '🙂 No estuvo tan mal, pudiste perder más';
    if (dineroPerdido > 0) return '😏 Saliste bien librad@ para lo que pudo pasar';
    return '🤑 Hasta ganaste dinero, ¿eres prostitut@ o qué?';
}

function getReputacion(porcentaje) {
    if (porcentaje === 0) return '👼 "No sale nunca, es un/una sant@"';
    if (porcentaje <= 20) return '🙂 "Es tranquilit@, no da problema"';
    if (porcentaje <= 40) return '😏 "Sale de vez en cuando pero se controla"';
    if (porcentaje <= 60) return '😈 "Le gusta la fiesta, cuidado"';
    if (porcentaje <= 80) return '🔥 "Está en todas las fiestas, es conocid@"';
    if (porcentaje <= 95) return '💅 "Es leyenda de los antros"';
    return '👑 "Si no está en la fiesta, la fiesta no existe"';
}

function getBarra(porcentaje) {
    const total = 10;
    const llenos = Math.round(porcentaje / 10);
    const vacios = total - llenos;
    return '▰'.repeat(llenos) + '▱'.repeat(vacios);
}

export default {
    nombre: 'slut',
    categoria: 'economy',
    alias: ['slutmeter', 'puta', 'noche', 'salir'],
    descripcion: 'Aventura nocturna con dinero, XP y mucha historia',
    uso: '.slut',
    ejecutar: async ({ sock, msg, responder }) => {
        const chatJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const s = sock || global.conns?.[0];

        const usuario = obtenerUsuario(sender);
        const saldoAnterior = usuario.dinero || 0;

        const escenario = ESCENARIOS[Math.floor(Math.random() * ESCENARIOS.length)];
        const evento = escenario.eventos[Math.floor(Math.random() * escenario.eventos.length)];

        const seed = sender.split('@')[0];
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash;
        }
        const porcentaje = Math.abs(hash % 101);

        const dineroCambio = evento.dinero;
        const xpGanado = evento.xp;

        usuario.dinero = Math.max(0, (usuario.dinero || 0) + dineroCambio);
        usuario.xp = (usuario.xp || 0) + xpGanado;
        guardarUsuario(sender, usuario);

        const saldoNuevo = usuario.dinero;
        const dineroPerdido = Math.abs(dineroCambio);

        const emojiEstado = dineroCambio < 0 ? '💔' : '🎉';
        const tituloEstado = dineroCambio < 0 ? '𝐌𝐀𝐋𝐀 𝐒𝐔𝐄𝐑𝐓𝐄' : '𝐁𝐔𝐄𝐍𝐀 𝐒𝐔𝐄𝐑𝐓𝐄';
        const subtitulo = dineroCambio < 0 ? '𝐍𝐎𝐂𝐇𝐄 𝐓𝐄𝐑𝐑𝐈𝐁𝐋𝐄' : '𝐍𝐎𝐂𝐇𝐄 𝐄𝐏𝐈𝐂𝐀';

        const texto =
            '╭〔 ' + emojiEstado + ' ' + tituloEstado + ' 〕⬣\n' +
            '┃ ' + (dineroCambio < 0 ? '🤕' : '🥳') + ' ' + subtitulo + '\n' +
            '╰━━━━━━━━━━━━⬣\n' +
            '┃\n' +
            '┃ 👋 Hola *@' + sender.split('@')[0] + '*\n' +
            '┃\n' +
            '┃ 📍 *Lugar:* ' + escenario.lugar + '\n' +
            '┃\n' +
            '┃ 🛡️ *Protección usada:*\n' +
            '┃ ' + escenario.proteccion + '\n' +
            '┃\n' +
            '┣━━━━━━━━━━━━━━━━\n' +
            '┃\n' +
            '┃ 📖 *Lo que pasó:*\n' +
            '┃ ' + evento.texto + '\n' +
            '┃\n' +
            '┣━━━━━━━━━━━━━━━━\n' +
            '┃\n' +
            '┃ 💵 *Dinero:* ' + (dineroCambio < 0 ? '-' : '+') + '₡' + dineroPerdido.toLocaleString() + '\n' +
            '┃ ✨ *XP ganado:* +' + xpGanado + '\n' +
            '┃ 📊 *Porcentaje slut:* ' + porcentaje + '%\n' +
            '┃ ' + getBarra(porcentaje) + '\n' +
            '┃\n' +
            '┣━━━━━━━━━━━━━━━━\n' +
            '┃\n' +
            '┃ 💰 *Saldo anterior:* ₡' + saldoAnterior.toLocaleString() + '\n' +
            '┃ 💵 *Saldo actual:* ₡' + saldoNuevo.toLocaleString() + '\n' +
            '┃\n' +
            '┣━━━━━━━━━━━━━━━━\n' +
            '┃\n' +
            '┃ 👥 *Reputación:*\n' +
            '┃ ' + getReputacion(porcentaje) + '\n' +
            '┃\n' +
            '┃ 💡 *Consejo:*\n' +
            '┃ ' + getConsejo(porcentaje, dineroPerdido) + '\n' +
            '┃\n' +
            '╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕⬣';

        await sock.sendMessage(
            chatJid,
            { text: texto, mentions: [sender] },
            { quoted: msg }
        );
    }
};