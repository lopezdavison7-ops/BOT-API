
import path from 'path';
import { obtenerStore } from '../../lib/jsonStore.js';
import { fmtTiempo } from '../../lib/helpers.js';

const COOLDOWNS = {
    daily:   24 * 60 * 60 * 1000,
    weekly:   7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
    crime:    2 * 60 * 60 * 1000,
    slut:     2 * 60 * 60 * 1000,
    adventure: 60 * 60 * 1000,
    hunt:     60 * 60 * 1000,
    fish:     30 * 60 * 1000,
    mine:     30 * 60 * 1000,
    limosna:  60 * 60 * 1000,
    rob:      60 * 60 * 1000,
    hackear:  2 * 60 * 60 * 1000,
    masmorra: 12 * 60 * 60 * 1000
};

const CAMPOS = {
    daily:     ['ultimoDaily', 'lastDaily', 'dailyUltimo', 'cooldownDaily'],
    weekly:    ['ultimoWeekly', 'lastWeekly', 'weeklyUltimo', 'cooldownWeekly'],
    monthly:   ['ultimoMonthly', 'lastMonthly', 'monthlyUltimo', 'cooldownMonthly'],
    crime:     ['ultimoCrime', 'lastCrime', 'crimeUltimo', 'cooldownCrime'],
    slut:      ['ultimoSlut', 'lastSlut', 'slutUltimo', 'cooldownSlut'],
    adventure: ['ultimoAdventure', 'lastAdventure', 'adventureUltimo'],
    hunt:      ['ultimoHunt', 'lastHunt', 'huntUltimo'],
    fish:      ['ultimoFish', 'lastFish', 'fishUltimo'],
    mine:      ['ultimoMine', 'lastMine', 'mineUltimo'],
    limosna:   ['ultimoLimosna', 'lastLimosna', 'limosnaUltimo'],
    rob:       ['ultimoRob', 'lastRob', 'robUltimo'],
    hackear:   ['ultimoHackear', 'lastHackear', 'hackearUltimo'],
    masmorra:  ['ultimoMasmorra', 'lastMasmorra', 'masmorraUltimo']
};

const RUTA_ECO = path.join(process.cwd(), 'database', 'economia.json');

function leerUsuario(jid) {
    try {
        const db = obtenerStore(RUTA_ECO, {});
        return db[jid] || db.users?.[jid] || db.usuarios?.[jid] || null;
    } catch { return null; }
}

function estado(cmd, usuario) {
    const cd = COOLDOWNS[cmd];
    if (!cd) return '✅ Disponible';
    if (!usuario) return '✅ Disponible';

    const campos = CAMPOS[cmd] || [];
    let ultimo = null;
    for (const c of campos) {
        if (typeof usuario[c] === 'number') { ultimo = usuario[c]; break; }
    }
    if (ultimo === null) return '✅ Disponible';

    const restante = cd - (Date.now() - ultimo);
    if (restante <= 0) return '✅ Disponible';
    return '⏳ _' + fmtTiempo(restante) + '_';
}

function bold(t) {
    const map = {
        'A':'𝐀','B':'𝐁','C':'𝐂','D':'𝐃','E':'𝐄','F':'𝐅','G':'𝐆','H':'𝐇','I':'𝐈','J':'𝐉','K':'𝐊','L':'𝐋','M':'𝐌','N':'𝐍','O':'𝐎','P':'𝐏','Q':'𝐐','R':'𝐑','S':'𝐒','T':'𝐓','U':'𝐔','V':'𝐕','W':'𝐖','X':'𝐗','Y':'𝐘','Z':'𝐙',
        'a':'𝐚','b':'𝐛','c':'𝐜','d':'𝐝','e':'𝐞','f':'𝐟','g':'𝐠','h':'𝐡','i':'𝐢','j':'𝐣','k':'𝐤','l':'𝐥','m':'𝐦','n':'𝐧','o':'𝐨','p':'𝐩','q':'𝐪','r':'𝐫','s':'𝐬','t':'𝐭','u':'𝐮','v':'𝐯','w':'𝐰','x':'𝐱','y':'𝐲','z':'𝐳',
        'Á':'𝐀','É':'𝐄','Í':'𝐈','Ó':'𝐎','Ú':'𝐔','á':'𝐚','é':'𝐞','í':'𝐢','ó':'𝐨','ú':'𝐮','Ñ':'𝐍','ñ':'𝐧'
    };
    return String(t).replace(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/g, c => map[c] || c);
}

export default {
    nombre: 'einfo',
    categoria: 'economía',
    alias: ['economia', 'economy', 'sistema'],
    descripcion: 'Info del sistema económico con cooldowns en vivo',
    uso: '.einfo',
    ejecutar: async ({ msg, responder }) => {
        const jid = msg.key.participant || msg.key.remoteJid;
        const usuario = leerUsuario(jid);

        const texto =
            '╭〔 ₡ ' + bold('SISTEMA ECONÓMICO') + ' 〕⬣\n' +
            '┃ ℹ️ ' + bold('INFORMACIÓN') + '\n' +
            '╰━━━━━━━━━━━━⬣\n' +
            '\n' +
            '┃ Bienvenido al sistema de *BOT-Coins* (₡).\n' +
            '┃ Gana, ahorra y gestiona tu fortuna.\n' +
            '\n' +
            '┣━━〔 ️ ' + bold('CÓMO GANAR') + ' 〕━━⬣\n' +
            '\n' +
            '┃ ➪ *.daily:* ' + estado('daily', usuario) + '\n' +
            '┃ ➪ *.weekly:* ' + estado('weekly', usuario) + '\n' +
            '┃ ➪ *.monthly:* ' + estado('monthly', usuario) + '\n' +
            '┃ ➪ *.crime:* ' + estado('crime', usuario) + '\n' +
            '┃ ➪ *.slut:* ' + estado('slut', usuario) + '\n' +
            '┃ ➪ *.adventure:* ' + estado('adventure', usuario) + '\n' +
            '┃ ➪ *.hunt / .fish / .mine:* ' + estado('hunt', usuario) + '\n' +
            '┃ ➪ *.limosna:* ' + estado('limosna', usuario) + '\n' +
            '┃ ➪ *.bal:* Consulta tu saldo.\n' +
            '┃ ➪ *.dep / .with:* Mueve fondos al banco.\n' +
            '\n' +
            '┣━━〔 🎮 ' + bold('JUEGOS') + ' 〕━━⬣\n' +
            '\n' +
            '┃ ➪ *.slots:* Apuesta en tragamonedas.\n' +
            '┃ ➪ *.roulette:* Ruleta de colores.\n' +
            '┃ ➪ *.cf:* Cara o cruz.\n' +
            '┃ ➪ *.carrera:* Carrera de caballos.\n' +
            '┃ ➪ *.masmorra:* ' + estado('masmorra', usuario) + '\n' +
            '\n' +
            '┣━━〔 ️ ' + bold('RIESGOSAS') + ' 〕━━⬣\n' +
            '\n' +
            '┃ ➪ *.rob:* ' + estado('rob', usuario) + '\n' +
            '┃ ➪ *.hackear:* ' + estado('hackear', usuario) + '\n' +
            '\n' +
            '┣━━〔  ' + bold('TIENDA') + ' 〕━━⬣\n' +
            '\n' +
            '┃ ➪ *.shop:* Ver items disponibles.\n' +
            '┃ ➪ *.sell:* Vende tus items.\n' +
            '┃ ➪ *.inventario:* Revisa tus cosas.\n' +
            '\n' +
            '╰━━〔 ⚡ ' + bold('BOT-API') + ' 〕━━⬣';

        await responder.texto(texto);
    }
};