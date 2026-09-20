// commands/interaction/reacciones.js — 🎭 Reacciones anime (Delirius)
// ============================================================
// .kiss @Eve  →  𝐁𝐄𝐎 💋
//                `RHLM` 𝐪𝐮𝐢𝐞𝐫𝐞 𝐝𝐚𝐫 𝐦𝐮𝐜𝐡𝐨𝐬 𝐛𝐞𝐬𝐨𝐬 𝐚 @Eve 💋
// Fuente única: api.delirius.online/reactions/<tipo>
// ============================================================

const DELIRIUS_RX = 'https://api.delirius.online/reactions/';

// ---------- BOLD UNICODE (𝐀𝐁𝐂) ----------
function bold(texto) {
    return String(texto).replace(/[A-Za-z]/g, c => {
        const base = c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97;
        return String.fromCodePoint(base + c.charCodeAt(0));
    });
}

// ---------- CATÁLOGO (alias ES + frases + emoji) ----------
const REACCIONES = {
    kiss:      { alias: ['besar', 'beso'],        titulo: 'BESOS',         con: 'quiere dar muchos besos a',     solo: 'quiere un beso',            emoji: '💋' },
    hug:       { alias: ['abrazar', 'abrazo'],    titulo: 'ABRAZOS',       con: 'quiere abrazar fuerte a',       solo: 'quiere un abrazo',          emoji: '🤗' },
    pat:       { alias: ['acariciar', 'caricia'], titulo: 'CARICIAS',      con: 'quiere acariciar a',            solo: 'quiere una caricia',        emoji: '🥰' },
    slap:      { alias: ['bofetada', 'abofetear'],titulo: 'BOFETADAS',     con: 'quiere dar una bofetada a',     solo: 'se dio una bofetada',       emoji: '👋' },
    punch:     { alias: ['punetazo', 'golpear'],  titulo: 'GOLPES',        con: 'le dio un punetazo a',          solo: 'se golpeo solo',            emoji: '👊' },
    poke:      { alias: ['picar', 'pokear'],      titulo: 'POKE',          con: 'quiere picar a',                solo: 'se pico solo',              emoji: '👉' },
    bite:      { alias: ['morder', 'mordida'],    titulo: 'MORDIDAS',      con: 'mordio a',                      solo: 'se mordio solo',            emoji: '😬' },
    cry:       { alias: ['llorar', 'llora'],      titulo: 'LLANTO',        con: 'lloro con',                     solo: 'quiere llorar',             emoji: '😢' },
    laugh:     { alias: ['reir', 'risa'],         titulo: 'RISAS',         con: 'se rio con',                    solo: 'se rie solo',               emoji: '😂' },
    smile:     { alias: ['sonreir', 'sonrisa'],   titulo: 'SONRISAS',      con: 'le sonrio a',                   solo: 'sonrie sin razon',          emoji: '😄' },
    happy:     { alias: ['feliz', 'alegre'],      titulo: 'FELICIDAD',     con: 'esta feliz con',                solo: 'esta feliz de la vida',     emoji: '😊' },
    angry:     { alias: ['enojado', 'furioso'],   titulo: 'FURIA',         con: 'esta furioso con',              solo: 'esta que trueno',           emoji: '😡' },
    sad:       { alias: ['triste'],               titulo: 'TRISTEZA',      con: 'esta triste por',               solo: 'esta triste',               emoji: '😔' },
    blush:     { alias: ['sonrojo', 'sonrojarse'],titulo: 'SONROJO',       con: 'se sonrojo por',                solo: 'se sonrojo solit@',         emoji: '☺️' },
    shy:       { alias: ['timido'],               titulo: 'TIMIDEZ',       con: 'se puso timid@ con',            solo: 'se pone timid@',            emoji: '😳' },
    wink:      { alias: ['guino'],                titulo: 'GUINOS',        con: 'le guino el ojo a',             solo: 'guina el ojo',              emoji: '😜' },
    bleh:      { alias: ['lengua'],               titulo: 'BLEH',          con: 'le saco la lengua a',           solo: 'bleh',                      emoji: '😝' },
    pout:      { alias: ['pucheros'],             titulo: 'PUCHEROS',      con: 'le hizo pucheros a',            solo: 'hace pucheros',             emoji: '😡' },
    bored:     { alias: ['aburrido'],             titulo: 'ABURRIDO',      con: 'se aburrio con',                solo: 'esta aburrid@',             emoji: '😑' },
    scared:    { alias: ['miedo', 'asustar'],     titulo: 'MIEDO',         con: 'se asusto de',                  solo: 'se asusta solo',            emoji: '😨' },
    sleep:     { alias: ['dormir', 'sueno'],      titulo: 'A DORMIR',      con: 'se durmio junto a',             solo: 'quiere dormir',             emoji: '😴' },
    dance:     { alias: ['bailar', 'baile'],      titulo: 'BAILE',         con: 'bailo con',                     solo: 'baila solito',              emoji: '💃' },
    run:       { alias: ['correr', 'huir'],       titulo: 'CORRIENDO',     con: 'corrio hacia',                  solo: 'corre sin destino',         emoji: '🏃' },
    think:     { alias: ['pensar'],               titulo: 'PENSANDO',      con: 'esta pensando en',              solo: 'piensa profundamente',      emoji: '🤔' },
    facepalm:  { alias: ['palma'],                titulo: 'FACEPALM',      con: 'se hizo facepalm por',          solo: 'facepalm epico',            emoji: '🤦' },
    clap:      { alias: ['aplaudir', 'aplauso'],  titulo: 'APLAUSOS',      con: 'le aplaudio a',                 solo: 'aplaude solo',              emoji: '👏' },
    cuddle:    { alias: ['acurrucar', 'mimar'],   titulo: 'MIMOS',         con: 'se acurruco con',               solo: 'quiere mimitos',            emoji: '🤗' },
    love:      { alias: ['amar', 'amor'],         titulo: 'AMOR',          con: 'ama a',                         solo: 'se ama a si mism@',         emoji: '❤️' },
    lick:      { alias: ['lamer'],                titulo: 'LAMETAS',       con: 'lame a',                        solo: 'se lame el labio',          emoji: '👅' },
    kill:      { alias: ['matar'],                titulo: 'KILL',          con: 'quiere matar a',                solo: 'quiere autodestruirse',     emoji: '🔪' },
    eat:       { alias: ['comer'],                titulo: 'COMIENDO',      con: 'come frente a',                 solo: 'esta comiendo',             emoji: '🍜' },
    coffee:    { alias: ['cafe'],                 titulo: 'CAFECITO',      con: 'toma cafe pensando en',         solo: 'sorbe su cafecito',         emoji: '☕' },
    smoke:     { alias: ['fumar'],                titulo: 'HUMO',          con: 'fuma pensando en',              solo: 'fuma tranquilo',            emoji: '🚬' },
    drunk:     { alias: ['borracho'],             titulo: 'BORRACHERA',    con: 'esta borrach@ por',             solo: 'esta borrach@',             emoji: '🍺' },
    bath:      { alias: ['banar', 'bano'],        titulo: 'BANIO',         con: 'se bana junto a',               solo: 'se esta banando',           emoji: '🛁' },
    wave:      { alias: ['saludar', 'saludo'],    titulo: 'SALUDOS',       con: 'saludo a',                      solo: 'saluda al viento',          emoji: '👋' },
    highfive:  { alias: ['chocar', 'chocala'],    titulo: 'CHOCALA',       con: 'choco los cinco con',           solo: 'choca los cinco al aire',   emoji: '🙌' },
    handshake: { alias: ['apreton'],              titulo: 'TRATO HECHO',   con: 'le estrecho la mano a',         solo: 'se estrecha la mano',       emoji: '🤝' },
    thumbsup:  { alias: ['pulgar', 'like'],       titulo: 'BIEN',          con: 'le dio pulgar arriba a',        solo: 'se da pulgar arriba',       emoji: '👍' },
    tickle:    { alias: ['cosquillas'],           titulo: 'COSQUILLAS',    con: 'le hizo cosquillas a',          solo: 'quiere cosquillas',         emoji: '🖐️' },
    yeet:      { alias: ['lanzar'],               titulo: 'YEET',          con: 'lanzo por los aires a',         solo: 'se yeeteo',                 emoji: '💨' },
    bonk:      { alias: [],                       titulo: 'BONK',          con: 'le dio un BONK a',              solo: 'se bonkeo',                 emoji: '🔨' },
    kick:      { alias: ['patear', 'patada'],     titulo: 'PATADAS',       con: 'pateo a',                       solo: 'pateo el aire',             emoji: '🦵' },
    stare:     { alias: ['mirar', 'mirada'],      titulo: 'MIRAN',         con: 'miro fijamente a',              solo: 'mira perdido en la nada',   emoji: '👀' },
    smug:      { alias: ['presumido'],            titulo: 'PRESUMIDO',     con: 'miro con superioridad a',       solo: 'modo presumido activado',   emoji: '😏' },
    baka:      { alias: ['tonto', 'idiota'],      titulo: 'BAKA',          con: 'le dijo BAKA a',                solo: 'se dice baka a si mismo',   emoji: '🤡' },
    nod:       { alias: ['asentir'],              titulo: 'SI',            con: 'le dio la razon a',             solo: 'asiente solo',              emoji: '🙂' },
    nope:      { alias: ['nel'],                  titulo: 'NOPE',          con: 'le dijo que NO a',              solo: 'nope, ni de chiste',        emoji: '🙅' },
    shrug:     { alias: ['nose'],                 titulo: 'NI IDEA',       con: 'se encogio de hombros ante',    solo: 'no sabe ni le importa',     emoji: '🤷' },
    tableflip: { alias: ['mesa'],                 titulo: 'MESA VOLTEADA', con: 'volteo la mesa por',            solo: 'voltea la mesa',            emoji: '🪑' },
    confused:  { alias: ['confundido'],           titulo: 'CONFUNDIDO',    con: 'quedo confundido con',          solo: 'esta confundid@',           emoji: '😵' },
    shocked:   { alias: ['shock'],                titulo: 'SHOCK',         con: 'quedo en shock por',            solo: 'esta en shock',             emoji: '😱' },
    yawn:      { alias: ['bostezo'],              titulo: 'BOSTEZO',       con: 'bostezo junto a',               solo: 'tiene suenito',             emoji: '🥱' },
    sip:       { alias: ['beber', 'sorber'],      titulo: 'SORBOS',        con: 'sorbio su bebida junto a',      solo: 'sorbe su cafecito',         emoji: '☕' },
    feed:      { alias: ['alimentar'],            titulo: 'COMIDA',        con: 'le dio de comer a',             solo: 'quiere que le den de comer',emoji: '🍙' },
    nom:       { alias: ['nomnom'],               titulo: 'NOM NOM',       con: 'se comio a',                    solo: 'nom nom nom',               emoji: '🍽️' },
    peck:      { alias: ['besito'],               titulo: 'BESITOS',       con: 'le dio un besito a',            solo: 'quiere un besito',          emoji: '💋' },
    blowkiss:  { alias: ['besovolado'],           titulo: 'BESO VOLADO',   con: 'le mando un beso volado a',     solo: 'manda besitos al aire',     emoji: '💨' },
    handhold:  { alias: ['mano'],                 titulo: 'MANITOS',       con: 'tomo de la mano a',             solo: 'quiere agarrar una manito', emoji: '❤️' },
    carry:     { alias: ['cargar', 'upita'],      titulo: 'A UPITA',       con: 'cargo a',                       solo: 'quiere que lo carguen',     emoji: '💪' },
    kabedon:   { alias: [],                       titulo: 'KABEDON',       con: 'le hizo kabedon a',             solo: 'hizo kabedon a la pared',   emoji: '🧱' },
    lappillow: { alias: ['regazo'],               titulo: 'REGAZO',        con: 'se recosto en el regazo de',    solo: 'quiere un regazo',          emoji: '🛏️' },
    salute:    { alias: ['firmes'],               titulo: 'SALUDO MILITAR',con: 'saludo militarmente a',         solo: 'se saluda a si mismo',      emoji: '🫡' },
    spin:      { alias: ['girar'],                titulo: 'GIROS',         con: 'dio vueltas con',               solo: 'gira sin parar',            emoji: '🌀' },
    shake:     { alias: ['sacudir'],              titulo: 'SACUDIDA',      con: 'sacudio a',                     solo: 'tiembla sin control',       emoji: '🫨' },
    lurk:      { alias: ['acechar'],              titulo: 'ACECHANDO',     con: 'acecha a',                      solo: 'acecha en las sombras',     emoji: '🕵️' },
    shoot:     { alias: ['disparar'],             titulo: 'DISPAROS',      con: 'le disparo a',                  solo: 'practica tiro al blanco',   emoji: '🔫' },
    wag:       { alias: ['colita'],               titulo: 'COLITA',        con: 'meneo la colita para',          solo: 'menea la colita',           emoji: '🐶' },
    nya:       { alias: ['miau'],                 titulo: 'NYA',           con: 'le dijo nya~ a',                solo: 'nya~',                      emoji: '🐱' }
};

// ---------- MAPEO ALIAS → TIPO ----------
const MAPA = {};
for (const [tipo, d] of Object.entries(REACCIONES)) {
    MAPA[tipo] = tipo;
    for (const a of d.alias) MAPA[a] = tipo;
}
const TIPOS = Object.keys(REACCIONES);

// ---------- MENCION LIMPIA (resuelve @lid) ----------
async function datosMencion(sock, jid) {
    try {
        if (jid.endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
            const pn = await sock.signalRepository.lidMapper.getPNForLid(jid);
            if (pn) {
                const pj = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                return { token: '@' + pj.split('@')[0], jids: [pj] };
            }
        }
    } catch (e) {}
    return { token: '@' + jid.split('@')[0], jids: [jid] };
}

// ---------- PEDIR VIDEO A DELIRIUS ----------
async function pedirDelirius(tipo) {
    try {
        const res = await fetch(DELIRIUS_RX + tipo);
        if (!res.ok) return null;
        const json = await res.json();
        const status = json.status ?? json.estado ?? false;
        const d = json.data ?? json.datos;
        if (!status || !d) return null;
        return d.url || null;
    } catch (e) {
        console.error('[REACCIONES] delirius error:', e.message);
        return null;
    }
}

// ---------- EXTRAER COMANDO (acepta .kiss y . kiss) ----------
function extraerComando(msg) {
    const texto = msg.message?.extendedTextMessage?.text
               || msg.message?.conversation || '';
    const limpio = texto.trim().replace(/^\.+\s*/, '');
    return (limpio.split(/\s+/)[0] || '').toLowerCase();
}

export default {
    nombre: 'reaccion',
    categoria: 'Interacción',
    alias: [...TIPOS, ...Object.values(REACCIONES).flatMap(d => d.alias), 'reacciones', 'reaction'],
    descripcion: 'Reacciones anime en video (Delirius API): kiss, hug, slap... +60',
    uso: '.<reaccion> [@usuario]',
    ejecutar: async ({ sock, msg, responder }) => {
        try {
            const jid = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;
            const senderName = msg.pushName || sender.split('@')[0].replace(/\D/g, '');

            const invocado = extraerComando(msg);

            // ---------- AYUDA ----------
            if (invocado === 'reacciones' || invocado === 'reaction' || invocado === 'reaccion') {
                let lista = '';
                for (let i = 0; i < TIPOS.length; i += 4) {
                    lista += TIPOS.slice(i, i + 4).map(t => REACCIONES[t].emoji + ' .' + t).join('  ') + '\n';
                }
                return await responder.texto(
                    bold('REACCIONES') + ' 🎭\n' +
                    'Usa .<reaccion> [@user]\n\n' +
                    lista + '\n⚡ ' + bold('BOT-API')
                );
            }

            // ---------- DETECTAR TIPO ----------
            const tipo = MAPA[invocado] || null;
            if (!tipo) {
                return await responder.texto('❌ Reaccion no valida. Usa .reacciones para ver todas.');
            }

            const d = REACCIONES[tipo];

            // ---------- OBJETIVO ----------
            const ctx = msg.message?.extendedTextMessage?.contextInfo;
            let target = ctx?.participant || ctx?.mentionedJid?.[0] || null;
            if (target === sender) target = null;

            let caption;
            const mentions = [sender];

            if (target) {
                const t = await datosMencion(sock, target);
                mentions.push(...t.jids);
                caption = bold(d.titulo) + ' ' + d.emoji + '\n' +
                          '`' + senderName + '` ' + bold(d.con) + ' ' + t.token + ' ' + d.emoji;
            } else {
                caption = bold(d.titulo) + ' ' + d.emoji + '\n' +
                          '`' + senderName + '` ' + bold(d.solo) + ' ' + d.emoji;
            }

            // ---------- PEDIR VIDEO A DELIRIUS ----------
            const url = await pedirDelirius(tipo);

            if (!url) {
                return await responder.texto('❌ Delirius no tiene la reaccion: *' + tipo + '*');
            }

            // ---------- ENVIAR VIDEO ANIMADO ----------
            try {
                await sock.sendMessage(jid, {
                    video: { url },
                    mimetype: 'video/mp4',
                    gifPlayback: true,
                    caption,
                    mentions
                }, { quoted: msg });
            } catch (e) {
                console.error('[REACCIONES] envio error:', e.message);
                await responder.texto(caption);
            }

        } catch (error) {
            console.error('[REACCIONES] Error:', error);
            await responder.texto('❌ Error: ' + (error.message || error));
        }
    }
};