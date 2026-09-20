// commands/interaction/reaccion.js — 🎭 Reacciones anime GIF
// ============================================================
// SIN IMPORTS EXTERNOS — usa el fetch global de Node
// (el mismo que usan tus comandos que SÍ funcionan)
// ============================================================

const NEKOS = 'https://nekos.best/api/v2/';
const DELIRIUS = 'https://api.delirius.online/anime/';

const HEADERS = {
    'User-Agent': 'BOT-API/2.0',
    'Accept': 'application/json'
};

// ---------- BOLD UNICODE (𝐀𝐁𝐂) ----------
function bold(texto) {
    return String(texto).replace(/[A-Za-z]/g, c => {
        const base = c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97;
        return String.fromCodePoint(base + c.charCodeAt(0));
    });
}

// ---------- CATÁLOGO: 60 GIFS ----------
const REACCIONES = {
    kiss:      { alias: ['besar', 'beso'],         con: 'quiere dar muchos besos a',      solo: 'quiere un beso',               emoji: '💋' },
    hug:       { alias: ['abrazar', 'abrazo'],     con: 'quiere abrazar fuerte a',        solo: 'quiere un abrazo',             emoji: '🤗' },
    pat:       { alias: ['acariciar', 'caricia'],  con: 'quiere acariciar a',             solo: 'quiere una caricia',           emoji: '🫳' },
    cuddle:    { alias: ['acurrucar', 'mimar'],    con: 'quiere acurrucarse con',         solo: 'quiere mimitos',               emoji: '🤱' },
    peck:      { alias: ['besito'],                con: 'quiere dar un besito a',         solo: 'quiere un besito',             emoji: '💋' },
    blowkiss:  { alias: ['besovolado'],            con: 'le manda un beso volado a',      solo: 'manda besitos al aire',        emoji: '💨' },
    handhold:  { alias: ['mano', 'tomardemano'],   con: 'quiere tomar de la mano a',      solo: 'quiere agarrar una manito',    emoji: '❤️' },
    highfive:  { alias: ['chocar', 'chocala'],     con: 'quiere chocar los cinco con',    solo: 'choca los cinco al aire',      emoji: '🙌' },
    handshake: { alias: ['apreton'],               con: 'le estrecha la mano a',          solo: 'se estrecha la mano',          emoji: '🤝' },
    slap:      { alias: ['bofetada', 'abofetear'], con: 'quiere dar una bofetada a',      solo: 'se dio una bofetada',          emoji: '👋' },
    punch:     { alias: ['punetazo', 'golpear'],   con: 'quiere dar un punetazo a',       solo: 'se golpeo solo',               emoji: '👊' },
    kick:      { alias: ['patear', 'patada'],      con: 'quiere patear a',                solo: 'pateo el aire',                emoji: '🦵' },
    bite:      { alias: ['morder', 'mordida'],     con: 'quiere morder a',                solo: 'se mordio solo',               emoji: '🦷' },
    bonk:      { alias: [],                        con: 'le da un BONK a',                solo: 'se bonkeo',                    emoji: '🔨' },
    tickle:    { alias: ['cosquillas'],            con: 'quiere hacer cosquillas a',      solo: 'quiere cosquillas',            emoji: '🖐️' },
    poke:      { alias: ['picar', 'pokear'],       con: 'quiere picar a',                 solo: 'se pico solo',                 emoji: '👉' },
    yeet:      { alias: ['lanzar', 'yeetear'],     con: 'quiere lanzar por los aires a',  solo: 'se yeeteo',                    emoji: '💨' },
    carry:     { alias: ['cargar', 'upita'],       con: 'quiere cargar a',                solo: 'quiere que lo carguen',        emoji: '💪' },
    kabedon:   { alias: [],                        con: 'le hace kabedon a',              solo: 'hizo kabedon a la pared',      emoji: '🧱' },
    lappillow: { alias: ['regazo'],                con: 'quiere recostarse en el regazo de', solo: 'quiere un regazo de almohada', emoji: '🛏️' },
    cry:       { alias: ['llorar', 'llora'],       con: 'quiere llorar con',              solo: 'quiere llorar',                emoji: '😭' },
    laugh:     { alias: ['reir', 'risa'],          con: 'se rie a carcajadas con',        solo: 'se rie solo',                  emoji: '😂' },
    smile:     { alias: ['sonreir', 'sonrisa'],    con: 'le sonrie a',                    solo: 'sonrie sin razon',             emoji: '😄' },
    happy:     { alias: ['feliz', 'alegre'],       con: 'esta feliz con',                 solo: 'esta feliz de la vida',        emoji: '😊' },
    angry:     { alias: ['enojado', 'furioso'],    con: 'esta furioso con',               solo: 'esta que trueno',              emoji: '😡' },
    pout:      { alias: ['pucheros'],              con: 'le hace pucheros a',             solo: 'hace pucheros',                emoji: '😾' },
    blush:     { alias: ['sonrojo', 'sonrojarse'], con: 'se sonrojo por',                 solo: 'se sonrojo solit@',            emoji: '😳' },
    wink:      { alias: ['guino'],                 con: 'le guina el ojo a',              solo: 'guina el ojo',                 emoji: '😜' },
    teehee:    { alias: ['travieso'],              con: 'le saca la lengua a',            solo: 'esta travies@',                emoji: '😝' },
    bleh:      { alias: ['lengua'],                con: 'le saca la lengua a',            solo: 'bleh',                         emoji: '😛' },
    smug:      { alias: ['presumido'],             con: 'mira con superioridad a',        solo: 'modo presumido activado',      emoji: '😏' },
    baka:      { alias: ['tonto', 'idiota'],       con: 'le dice BAKA a',                 solo: 'se dice baka a si mismo',      emoji: '🤡' },
    stare:     { alias: ['mirar', 'mirada'],       con: 'mira fijamente a',               solo: 'mira perdido en la nada',      emoji: '👀' },
    wave:      { alias: ['saludar', 'saludo'],     con: 'saluda a',                       solo: 'saluda al viento',             emoji: '👋' },
    salute:    { alias: ['firmes'],                con: 'saluda militarmente a',          solo: 'se saluda a si mismo',         emoji: '🫡' },
    nod:       { alias: ['asentir'],               con: 'le da la razon a',               solo: 'asiente solo',                 emoji: '🙂' },
    nope:      { alias: ['nel'],                   con: 'le dice que NO a',               solo: 'nope, ni de chiste',           emoji: '🙅' },
    thumbsup:  { alias: ['pulgar', 'like'],        con: 'le da pulgar arriba a',          solo: 'se da pulgar arriba',          emoji: '👍' },
    clap:      { alias: ['aplaudir', 'aplauso'],   con: 'le aplaude a',                   solo: 'aplaude solo',                 emoji: '👏' },
    shrug:     { alias: ['nose'],                  con: 'se encoge de hombros ante',      solo: 'no sabe ni le importa',        emoji: '🤷' },
    facepalm:  { alias: ['palma'],                 con: 'se hace facepalm por',           solo: 'facepalm epico',               emoji: '🤦' },
    tableflip: { alias: ['mesa', 'voltearmesa'],   con: 'voltea la mesa por',             solo: 'voltea la mesa',               emoji: '🪑' },
    think:     { alias: ['pensar'],                con: 'esta pensando en',               solo: 'piensa profundamente',         emoji: '🤔' },
    confused:  { alias: ['confundido'],            con: 'queda confundido con',           solo: 'esta confundid@',              emoji: '😵' },
    shocked:   { alias: ['shock'],                 con: 'queda en shock por',             solo: 'esta en shock',                emoji: '😱' },
    bored:     { alias: ['aburrido'],              con: 'se aburre con',                  solo: 'esta aburrid@',                emoji: '🥱' },
    yawn:      { alias: ['bostezo', 'bostezar'],   con: 'bosteza junto a',                solo: 'tiene suenito',                emoji: '🥱' },
    sleep:     { alias: ['dormir', 'sueno'],       con: 'quiere dormir junto a',          solo: 'quiere dormir',                emoji: '😴' },
    dance:     { alias: ['bailar', 'baile'],       con: 'quiere bailar con',              solo: 'baila solito',                 emoji: '🕺' },
    spin:      { alias: ['girar', 'vueltas'],      con: 'quiere dar vueltas con',         solo: 'gira sin parar',               emoji: '🌀' },
    shake:     { alias: ['sacudir'],               con: 'sacude a',                       solo: 'tiembla sin control',          emoji: '🫨' },
    run:       { alias: ['correr', 'huir'],        con: 'corre hacia',                    solo: 'corre sin destino',            emoji: '🏃' },
    lurk:      { alias: ['acechar'],               con: 'acecha a',                       solo: 'acecha en las sombras',        emoji: '🕵️' },
    shoot:     { alias: ['disparar'],              con: 'le dispara a',                   solo: 'practica tiro al blanco',      emoji: '🔫' },
    feed:      { alias: ['alimentar', 'darcomer'], con: 'quiere dar de comer a',          solo: 'quiere que le den de comer',   emoji: '🍙' },
    nom:       { alias: ['comer', 'nomnom'],       con: 'se quiere comer a',              solo: 'nom nom nom',                  emoji: '🍽️' },
    sip:       { alias: ['beber', 'sorber', 'cafe'], con: 'sorbe su bebida junto a',      solo: 'sorbe su cafecito',            emoji: '☕' },
    wag:       { alias: ['colita'],                con: 'menea la colita para',           solo: 'menea la colita',              emoji: '🐶' },
    nya:       { alias: ['nekomode', 'miau'],      con: 'le dice nya~ a',                 solo: 'nya~',                         emoji: '🐱' }
};

const MAPA = {};
for (const [tipo, d] of Object.entries(REACCIONES)) {
    MAPA[tipo] = tipo;
    for (const a of d.alias) MAPA[a] = tipo;
}
const TIPOS = Object.keys(REACCIONES);

const WAIFU_PICS_MAP = {
    kiss: 'kiss', peck: 'kiss', blowkiss: 'kiss',
    hug: 'hug', cuddle: 'cuddle', handhold: 'handhold',
    highfive: 'highfive', handshake: 'handhold',
    slap: 'slap', punch: 'bully', kick: 'kick', baka: 'bully', angry: 'bully',
    bite: 'bite', bonk: 'bonk', poke: 'poke', yeet: 'yeet', carry: 'glomp',
    cry: 'cry', laugh: 'happy', smile: 'smile', happy: 'happy',
    blush: 'blush', wink: 'wink', smug: 'smug', wave: 'wave',
    dance: 'dance', nom: 'nom', tickle: 'lick', lappillow: 'hug',
    kabedon: 'bully', stare: 'cringe', confused: 'cringe', feed: 'nom', sip: 'nom'
};

// ---------- MENCION LIMPIA ----------
async function datosMencion(sock, jid) {
    try {
        if (jid.endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
            const pn = await sock.signalRepository.lidMapper.getPNForLid(jid);
            if (pn) {
                const pj = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                return { token: '@' + pj.split('@')[0].replace(/\D/g, ''), jids: [pj] };
            }
        }
    } catch (e) {}
    return { token: '@' + jid.split('@')[0].replace(/\D/g, ''), jids: [jid] };
}

// ---------- FUENTES (fetch GLOBAL + errores visibles) ----------
async function pedirNekos(tipo) {
    try {
        const res = await fetch(NEKOS + tipo, { headers: HEADERS });
        if (!res.ok) return { url: null, error: 'HTTP ' + res.status };
        const data = await res.json();
        const url = data?.results?.[0]?.url || null;
        return { url, error: url ? null : 'sin resultados' };
    } catch (e) {
        return { url: null, error: e.message };
    }
}

async function pedirWaifuPics(tipo) {
    const cat = WAIFU_PICS_MAP[tipo];
    if (!cat) return { url: null, error: 'sin equivalente' };
    try {
        const res = await fetch('https://api.waifu.pics/sfw/' + cat, { headers: HEADERS });
        if (!res.ok) return { url: null, error: 'HTTP ' + res.status };
        const data = await res.json();
        return { url: data?.url || null, error: data?.url ? null : 'sin resultados' };
    } catch (e) {
        return { url: null, error: e.message };
    }
}

async function pedirDelirius(tipo) {
    try {
        const res = await fetch(DELIRIUS + tipo, { headers: HEADERS });
        if (!res.ok) return { url: null, error: 'HTTP ' + res.status };
        const json = await res.json();
        const d = json.data ?? json.datos;
        const url = typeof d === 'string' ? d : (d?.url || d?.gif || d?.image || d?.img || null);
        return { url, error: url ? null : 'sin resultados' };
    } catch (e) {
        return { url: null, error: e.message };
    }
}

// ---------- CADENA CON DIAGNÓSTICO ----------
async function obtenerUrl(tipo) {
    const errores = [];

    const n = await pedirNekos(tipo);
    if (n.url) return { url: n.url, errores };
    errores.push('nekos: ' + n.error);

    const w = await pedirWaifuPics(tipo);
    if (w.url) return { url: w.url, errores };
    errores.push('waifu: ' + w.error);

    const d = await pedirDelirius(tipo);
    if (d.url) return { url: d.url, errores };
    errores.push('delirius: ' + d.error);

    return { url: null, errores };
}

// ---------- EXTRAER COMANDO (acepta espacios) ----------
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
    descripcion: 'Reacciones anime GIF: kiss, hug, slap, pat... +55 más',
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
            const mentions = [];

            if (target) {
                const t = await datosMencion(sock, target);
                mentions.push(...t.jids);
                caption = '`' + senderName + '` ' + bold(d.con) + ' ' + t.token + ' ' + d.emoji;
            } else {
                caption = '`' + senderName + '` ' + bold(d.solo) + ' ' + d.emoji;
            }

            // ---------- OBTENER GIF ----------
            const { url, errores } = await obtenerUrl(tipo);

            if (!url) {
                return await responder.texto(
                    '❌ No encontre gif para: *' + tipo + '*\n' +
                    '🔎 Diagnostico:\n' +
                    errores.map(e => '• ' + e).join('\n') + '\n\n' +
                    '📸 Mandame esta captura pa arreglarlo'
                );
            }

            // ---------- MÉTODO 1: URL directa ----------
            try {
                await sock.sendMessage(jid, {
                    video: { url },
                    caption,
                    mentions
                }, { quoted: msg });
                return;
            } catch (e) {
                console.error('[REACCION] metodo1:', e.message);
            }

            // ---------- MÉTODO 2: buffer ----------
            try {
                const res = await fetch(url);
                const buffer = Buffer.from(await res.arrayBuffer());
                await sock.sendMessage(jid, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    gifPlayback: true,
                    caption,
                    mentions
                }, { quoted: msg });
                return;
            } catch (e) {
                console.error('[REACCION] metodo2:', e.message);
            }

            // ---------- MÉTODO 3: sticker animado ----------
            try {
                const { Sticker } = await import('wa-sticker-formatter');
                const st = new Sticker(url, { pack: 'BOT-API ⚡', author: d.emoji, type: 'animated', quality: 80 });
                await sock.sendMessage(jid, { sticker: await st.toBuffer() }, { quoted: msg });
                await sock.sendMessage(jid, { text: caption, mentions }, { quoted: msg });
                return;
            } catch (e) {
                console.error('[REACCION] metodo3:', e.message);
            }

            await responder.texto(caption);

        } catch (error) {
            console.error('[REACCION] Error:', error);
            await responder.texto('❌ Error: ' + (error.message || error));
        }
    }
};