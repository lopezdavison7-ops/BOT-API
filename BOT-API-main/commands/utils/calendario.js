

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

function diasEnMes(mes, año) {
    return new Date(año, mes, 0).getDate();
}

function primerDiaSemana(mes, año) {

    const dia = new Date(año, mes - 1, 1).getDay();
    return dia === 0 ? 6 : dia - 1;
}

function generarCalendario(mes, año, diaHoy, mesHoy, añoHoy) {
    const dias = diasEnMes(mes, año);
    const primerDia = primerDiaSemana(mes, año);

    let lineas = [];

    lineas.push('┃ ' + DIAS_SEMANA.join('  ') + ' ┃');
    lineas.push('┃ ' + '─'.repeat(20) + ' ┃');

    let semana = [];

    for (let i = 0; i < primerDia; i++) {
        semana.push('  ');
    }

    for (let dia = 1; dia <= dias; dia++) {
        const esHoy = (dia === diaHoy && mes === mesHoy && año === añoHoy);
        const diaStr = esHoy ? `*${dia.toString().padStart(2, '0')}*` : dia.toString().padStart(2, ' ');
        semana.push(diaStr);

        if (semana.length === 7) {
            lineas.push('┃ ' + semana.join('  ') + ' ┃');
            semana = [];
        }
    }

    if (semana.length > 0) {
        while (semana.length < 7) {
            semana.push('  ');
        }
        lineas.push('┃ ' + semana.join('  ') + ' ┃');
    }

    return lineas;
}

export default {
    nombre: 'calendario',
    categoria: 'Utils',
    alias: ['calendar', 'cal', 'mes'],
    descripcion: 'Muestra el calendario del mes con el día actual destacado',
    uso: '.calendario [mes] [año]',
    ejecutar: async ({ argumento, responder }) => {
        const ahora = new Date();
        const diaHoy = ahora.getDate();
        const mesHoy = ahora.getMonth() + 1;
        const añoHoy = ahora.getFullYear();

        const args = String(argumento || '').trim().split(/\s+/).filter(Boolean);

        let mes = mesHoy;
        let año = añoHoy;

        if (args[0]) {
            const numMes = parseInt(args[0]);
            if (numMes >= 1 && numMes <= 12) {
                mes = numMes;
            }
        }

        if (args[1]) {
            const numAño = parseInt(args[1]);
            if (numAño >= 1900 && numAño <= 2100) {
                año = numAño;
            }
        }

        const nombreMes = MESES[mes - 1];
        const dias = diasEnMes(mes, año);
        const calendario = generarCalendario(mes, año, diaHoy, mesHoy, añoHoy);

        const esMesActual = (mes === mesHoy && año === añoHoy);

        const txt =
            '╭━━〔 📅 𝐂𝐀𝐋𝐄𝐍𝐃𝐀𝐑𝐈𝐎 〕━━⬣\n' +
            '┃\n' +
            '┃ 📆 *' + nombreMes + ' ' + año + '*\n' +
            (esMesActual ? '┃ 🎯 Hoy: ' + diaHoy + ' de ' + nombreMes + '\n' : '') +
            '┃\n' +
            calendario.join('\n') + '\n' +
            '┃\n' +
            '┃ 📊 Total días: ' + dias + '\n' +
            '┃\n' +
            '┃ 💡 Usa: .calendario [mes] [año]\n' +
            '┃ Ej: .calendario 12 2025\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        await responder.texto(txt);
    }
};