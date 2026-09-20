// commands/interaction/reacciones.js — 🎭 Reacciones anime
// ============================================================
// Fuentes: Delirius (principal) → otakugifs.xyz (respaldo)
// Caption: solo la frase con emoji (sin título)
// ============================================================

const DELIRIUS_RX = 'https://api.delirius.online/reactions/';
const OTAKUGIFS = 'https://api.otakugifs.xyz/gif?reaction=';

// ---------- BOLD UNICODE (𝐀𝐁𝐂) ----------
function bold(texto) {
    return String(texto).replace(/[A-Za-z]/g, c => {
        const base = c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97;
        return String.fromCodePoint(base + c.charCodeAt(0));
    });
}

// ---------- CATÁLOGO (alias ES + frases + emoji) ----------
const REACCIONES = {
    kiss:      { alias: ['besar', 'beso'],        con: 'quiere dar muchos besos a',     solo: 'quiere un beso',            emoji: '💋' },
    hug:       { alias: ['abrazar', 'abrazo'],    con: 'quiere abrazar fuerte a',       solo: 'quiere un abrazo',          emoji: '🤗' },
    pat:       { alias: ['acariciar', 'caricia'], con: 'quiere acariciar a',            solo: 'quiere una caricia',        emoji: '🥰' },
    slap:      { alias: ['bofetada', 'abofetear'],con: 'quiere dar una bofetada a',     solo: 'se dio una bofetada',       emoji: '👋' },
    punch:     { alias: ['punetazo', 'golpear'],  con: 'le dio un punetazo a',          solo: 'se golpeo solo',            emoji: '👊' },
    poke:      { alias: ['picar', 'pokear'],      con: 'quiere picar a',                solo: 'se pico solo',              emoji: '👉' },
    bite:      { alias: ['morder', 'mordida'],    con: 'mordio a',                      solo: 'se mordio solo',            emoji: '😬' },
    cry:       { alias: ['llorar', 'llora'],      con: 'lloro con',                     solo: 'quiere llorar',             emoji: '😢' },
    laugh:     { alias: ['reir', 'risa'],         con: 'se rio con',                    solo: 'se rie solo',               emoji: '😂' },
    smile:     { alias: ['sonreir', 'sonrisa'],   con: 'le sonrio a',                   solo: 'sonrie sin razon',          emoji: '😄' },
    happy:     { alias: ['feliz', 'alegre'],      con: 'esta feliz con',                solo: 'esta feliz de la vida',     emoji: '😊' },
    angry:     { alias: ['enojado', 'furioso'],   con: 'esta furioso con',              solo: 'esta que trueno',           emoji: '😡' },
    sad:       { alias: ['triste'],               con: 'esta triste por',               solo: 'esta triste',               emoji: '😔' },
    blush:     { alias: ['sonrojo', 'sonrojarse'],con: 'se sonrojo por',                solo: 'se sonrojo solit@',         emoji: '☺️' },
    shy:       { alias: ['timido'],               con: 'se puso timid@ con',            solo: 'se pone timid@',            emoji: '😳' },
    wink:      { alias: ['guino'],                con: 'le guino el ojo a',             solo: 'guina el ojo',              emoji: '😜' },
    bleh:      { alias: ['lengua'],               con: 'le saco la lengua a',           solo: 'bleh',                      emoji: '😝' },
    pout:      { alias: ['pucheros'],             con: 'le hizo pucheros a',            solo: 'hace pucheros',             emoji: '😡' },
    bored:     { alias: ['aburrido'],             con: 'se aburrio con',                solo: 'esta aburrid@',             emoji: '😑' },
    scared:    { alias: ['miedo', 'asustar'],     con: 'se asusto de',                  solo: 'se asusta solo',            emoji: '😨' },
    sleep:     { alias: ['dormir', 'sueno'],      con: 'se durmio junto a',             solo: 'quiere dormir',             emoji: '😴' },
    dance:     { alias: ['bailar', 'baile'],      con: 'bailo con',                     solo: 'baila solito',              emoji: '💃' },
    run:       { alias: ['correr', 'huir'],       con: 'corrio hacia',                  solo: 'corre sin destino',         emoji: '🏃' },
    think:     { alias: ['pensar'],               con: 'esta pensando en',              solo: 'piensa profundamente',      emoji: '🤔' },
    facepalm:  { alias: ['palma'],                con: 'se hizo facepalm por',          solo: 'facepalm epico',            emoji: '🤦' },
    clap:      { alias: ['aplaudir', 'aplauso'],  con: 'le aplaudio a',                 solo: 'aplaude solo',              emoji: '👏' },
    cuddle:    { alias: ['acurrucar', 'mimar'],   con: 'se acurruco con',               solo: 'quiere mimitos',            emoji: '🤗' },
    love:      { alias: ['amar', 'amor'],         con: 'ama a',                         solo: 'se ama a si mism@',         emoji: '❤️' },
    lick:      { alias: ['lamer'],                con: 'lame a',                        solo: 'se lame el labio',          emoji: '👅' },
    kill:      { alias: ['matar'],                con: 'quiere matar a',                solo: 'quiere autodestruirse',     emoji: '🔪' },
    eat:       { alias: ['comer'],                con: 'come frente a',                 solo: 'esta comiendo',             emoji: '🍜' },
    coffee:    { alias: ['cafe'],                 con: 'toma cafe pensando en',         solo: 'sorbe su cafecito',         emoji: '☕' },
    smoke:     { alias: ['fumar'],                con: 'fuma pensando en',              solo: 'fuma tranquilo',            emoji: '🚬' },
    drunk:     { alias: ['borracho'],             con: 'esta borrach@ por',             solo: 'esta borrach@',             emoji: '🍺' },
    bath:      { alias: ['banar', 'bano'],        con: 'se bana junto a',               solo: 'se esta banando',           emoji: '🛁' },
    wave:      { alias: ['saludar', 'saludo'],    con: 'saludo a',                      solo: 'saluda al viento',          emoji: '👋' },
    highfive:  { alias: ['chocar', 'chocala'],    con: 'choco los cinco con',           solo: 'choca los cinco al aire',   emoji: '🙌' },
    handshake: { alias: ['apreton'],              con: 'le estrecho la mano a',         solo: 'se estrecha la mano',       emoji: '🤝' },
    thumbsup:  { alias: ['pulgar', 'like'],       con: 'le dio pulgar arriba a',        solo: 'se da pulgar arriba',       emoji: '👍' },
    tickle:    { alias: ['cosquillas'],           con: 'le hizo cosquillas a',          solo: 'quiere cosquillas',         emoji: '🖐️' },
    yeet:      { alias: ['lanzar'],               con: 'lanzo por los aires a',         solo: 'se yeeteo',                 emoji: '💨' },
    bonk:      { alias: [],                       con: 'le dio un BONK a',              solo: 'se bonkeo',                 emoji: '🔨' },
    kick:      { alias: ['patear', 'patada'],     con: 'pateo a',                       solo: 'pateo el aire',             emoji: '🦵' },
    stare:     { alias: ['mirar', 'mirada'],      con: 'miro fijamente a',              solo: 'mira perdido en la nada',   emoji: '👀' },
    smug:      { alias: ['presumido'],            con: 'miro con superioridad a',       solo: 'modo presumido activado',   emoji: '😏' },
    baka:      { alias: ['tonto', 'idiota'],      con: 'le dijo BAKA a',                solo: 'se dice baka a si mismo',   emoji: '🤡' },
    nod:       { alias: ['asentir'],              con: 'le dio la razon a',             solo: 'asiente solo',              emoji: '🙂' },
    nope:      { alias: ['nel'],                  con: 'le dijo que NO a',              solo: 'nope, ni de chiste',        emoji: '🙅' },
    shrug:     { alias: ['nose'],                 con: 'se encogio de hombros ante',    solo: 'no sabe ni le importa',     emoji: '🤷' },
    tableflip: { alias: ['mesa'],                 con: 'volteo la mesa por',            solo: 'voltea la mesa',            emoji: '🪑' },
    confused:  { alias: ['confundido'],           con: 'quedo confundido con',          solo: 'esta confundid@',           emoji: '😵' },
    shocked:   { alias: ['shock'],                con: 'quedo en shock por',            solo: 'esta en shock',             emoji: '😱' },
    yawn:      { alias: ['bostezo'],              con: 'bostezo junto a',               solo: 'tiene suenito',             emoji: '🥱' },
    sip:       { alias: ['beber', 'sorber'],      con: 'sorbio su bebida junto a',      solo: 'sorbe su cafecito',         emoji: '☕' },
    feed:      { alias: ['alimentar'],            con: 'le dio de comer a',             solo: 'quiere que le den de comer',emoji: '🍙' },
    nom:       { alias: ['nomnom'],               con: 'se comio a',                    solo: 'nom nom nom',               emoji: '🍽️' },
    peck:      { alias: ['besito'],               con: 'le dio un besito a',            solo: 'quiere un besito',          emoji: '💋' },
    blowkiss:  { alias: ['besovolado'],           con: 'le mando un beso volado a',     solo: 'manda besitos al aire',     emoji: '💨' },
    handhold:  { alias: ['mano'],                 con: 'tomo de la mano a',             solo: 'quiere agarrar una manito', emoji: '❤️' },
    carry:     { alias: ['cargar', 'upita'],      con: 'cargo a',                       solo: 'quiere que lo carguen',     emoji: '💪' },
    kabedon:   { alias: [],                       con: 'le hizo kabedon a',             solo: 'hizo kabedon a la pared',   emoji: '🧱' },
    lappillow: { alias: ['regazo'],               con: 'se recosto en el regazo de',    solo: 'quiere un regazo',          emoji: '🛏️' },
    salute:    { alias: ['firmes'],               con: 'saludo militarmente a',         solo: 'se saluda a si mismo',      emoji: '🫡' },
    spin:      { alias: ['girar'],                con: 'dio vueltas con',               solo: 'gira sin parar',            emoji: '🌀' },
    shake:     { alias: ['sacudir'],              con: 'sacudio a',                     solo: 'tiembla sin control',       emoji: '🫨' },
    lurk:      { alias: ['acechar'],              con: 'acecha a',                      solo: 'acecha en las sombras',     emoji: '🕵️' },
    shoot:     { alias: ['disparar'],             con: 'le disparo a',                  solo: 'practica tiro al blanco',   emoji: '🔫' },
    wag:       { alias: ['colita'],               con: 'meneo la colita para',          solo: 'menea la colita',           emoji: '🐶' },
    nya:       { alias: ['miau'],                 con: 'le dijo nya~ a',                solo: 'nya~',                      emoji: '🐱' }
};

// ---------- MAPEO ALIAS → TIPO ----------
const MAPA = {};
for (const [tipo, d] of Object.entries(REACCIONES)) {
    MAPA[tipo] = tipo;
    for (const a of d.alias) MAPA[a] = tipo;
}
const TIPOS = Object.keys(REACCIONES);

// ---------- MAPEO DE FALLBACK para otakugifs.xyz ----------
// Si Delirius no tiene la reacción, otakugifs usa la equivalente más cercana
const OTAKUGIFS_MAP = {
    // Delirius tiene todo esto, pero si falla, otakugifs responde con equivalente
    baka: 'angry',
    smoke: 'bored',
    angry: 'angry',
    kill: 'angry',
    drunk: 'bored',
    eat: 'nom',
    nom: 'nom',
    coffee: 'sip',
    sip: 'sip',
    feed: 'nom',
    lick: 'kiss',
    love: 'kiss',
    bonk: 'angry',
    kick: 'slap',
    punch: 'slap',
    shoot: 'slap',
    yeet: 'slap',
    tableflip: 'angry',
    stare: 'think',
    smug: 'smile',
    nod: 'thumbsup',
    nope: 'shrug',
    shrug: 'shrug',
    confused: 'think',
    shocked: 'cry',
    scared: 'cry',
    yawn: 'sleep',
    sip: 'sip',
    wag: 'happy',
    nya: 'happy',
    kabedon: 'hug',
    lappillow: 'hug',
    carry: 'hug',
    handhold: 'hug',
    salute: 'thumbsup',
    spin: 'dance',
    shake: 'dance',
    lurk: 'think',
    peck: 'kiss',
    blowkiss: 'kiss'
};

// ---------- MENCION LIMPIA ----------
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

// ---------- FUENTE 1: DELIRIUS ----------
async function pedirDelirius(tipo) {
    try {
        const res = await fetch(DELIRIUS_RX + tipo);
        if (!res.ok) return null;
        const json = await res.json();
        const status = json.status ?? json.estado ?? false;
        const d = json.data ?? json.datos;
        if (!status || !d) return null;
        return { url: d.url, tipo: 'mp4', fuente: 'delirius' };
    } catch (e) {
        return null;
    }
}

// ---------- FUENTE 2: OTAKUGIFS (gif, respaldo) ----------
async function pedirOtakugifs(tipo) {
    // Primero probar el tipo directo
    const candidatos = [tipo, OTAKUGIFS_MAP[tipo]].filter(Boolean);
    const vistos = new Set();

    for (const c of candidatos) {
        if (vistos.has(c)) continue;
        vistos.add(c);
        try {
            const res = await fetch(OTAKUGIFS + c);
            if (!res.ok) continue;
            const json = await res.json();
            if (json?.url) return { url: json.url, tipo: 'gif', fuente: 'otakugifs' };
        } catch (e) {}
    }
    return null;
}

// ---------- CADENA: delirius → otakugifs ----------
async function obtenerVideo(tipo) {
    const d = await pedirDelirius(tipo);
    if (d) return d;
    return await pedirOtakugifs(tipo);
}

// ---------- EXTRAER COMANDO ----------
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
    descripcion: 'Reacciones anime: Delirius + otakugifs respaldo',
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
            const mentions = [sender];

            if (target) {
                const t = await datosMencion(sock, target);
                mentions.push(...t.jids);
                // SOLO LA FRASE, sin título
                caption = '`' + senderName + '` ' + bold(d.con) + ' ' + t.token + ' ' + d.emoji;
            } else {
                caption = '`' + senderName + '` ' + bold(d.solo) + ' ' + d.emoji;
            }

            // ---------- OBTENER VIDEO (delirius → otakugifs) ----------
            const video = await obtenerVideo(tipo);

            if (!video) {
                return await responder.texto('❌ Ninguna API tiene: *' + tipo + '*');
            }

            // ---------- ENVIAR ----------
            try {
                const esMp4 = video.tipo === 'mp4';
                await sock.sendMessage(jid, {
                    video: { url: video.url },
                    mimetype: esMp4 ? 'video/mp4' : 'video/mp4',
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