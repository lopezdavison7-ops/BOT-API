// commands/interaction/reacciones.js — 🎭 Reacciones anime (SOLO AlyaCore)
// ============================================================
// Fuente única: api.alyacore.xyz/sfw/interaction
// 67 reacciones oficiales de AlyaCore
// ============================================================

const ALYA_BASE = 'https://api.alyacore.xyz/sfw/interaction';
const ALYA_KEY = 'oboe';

// ---------- BOLD UNICODE (𝐀𝐁𝐂) ----------
function bold(texto) {
    return String(texto).replace(/[A-Za-z]/g, c => {
        const base = c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97;
        return String.fromCodePoint(base + c.charCodeAt(0));
    });
}

// ---------- CATÁLOGO: LAS 67 REACCIONES DE ALYACORE ----------
const REACCIONES = {
    peek:       { alias: ['chismear', 'fisgonear'],   con: 'esta fisgoneando a',          solo: 'chismea por ahi',              emoji: '👀' },
    comfort:    { alias: ['consolar'],                con: 'consolo a',                   solo: 'necesita consuelo',            emoji: '🫂' },
    thinkhard:  { alias: ['pensarfuerte'],            con: 'piensa demasiado en',         solo: 'piensa demasiado fuerte',      emoji: '🤯' },
    curious:    { alias: ['curioso'],                 con: 'siente curiosidad por',       solo: 'esta curios@',                 emoji: '🧐' },
    sniff:      { alias: ['oler', 'olfatear'],        con: 'olfateo a',                   solo: 'huele algo raro',              emoji: '👃' },
    stare:      { alias: ['mirar', 'mirada'],         con: 'mira fijamente a',            solo: 'mira perdido en la nada',      emoji: '👀' },
    trip:       { alias: ['viajar'],                  con: 'se fue de viaje con',         solo: 'se va de viaje',               emoji: '✈️' },
    blowkiss:   { alias: ['besovolado'],              con: 'le mando un beso volado a',   solo: 'manda besitos al aire',        emoji: '💨' },
    snuggle:    { alias: ['acurrucarse'],             con: 'se acurruco juntito con',     solo: 'quiere acurrucarse',           emoji: '🛌' },
    angry:      { alias: ['enojado', 'furioso'],      con: 'esta furioso con',            solo: 'esta que trueno',              emoji: '😡' },
    bleh:       { alias: ['lengua'],                  con: 'le saco la lengua a',         solo: 'bleh',                         emoji: '😝' },
    bored:      { alias: ['aburrido'],                con: 'se aburrio con',              solo: 'esta aburrid@',                emoji: '😑' },
    clap:       { alias: ['aplaudir', 'aplauso'],     con: 'le aplaudio a',               solo: 'aplaude solo',                 emoji: '👏' },
    coffee:     { alias: ['cafe'],                    con: 'toma cafe pensando en',       solo: 'sorbe su cafecito',            emoji: '☕' },
    dramatic:   { alias: ['dramatico'],               con: 'hizo un drama por',           solo: 'esta dramatic@',               emoji: '🎭' },
    drunk:      { alias: ['borracho'],                con: 'esta borrach@ por',           solo: 'esta borrach@',                emoji: '🍺' },
    cold:       { alias: ['frio'],                    con: 'tiene frio junt@ a',          solo: 'tiene frio',                   emoji: '🥶' },
    impregnate: { alias: ['prenar', 'embarazar'],     con: 'preño a',                     solo: 'se preño a si mism@',          emoji: '🤰' },
    kisscheek:  { alias: ['besoenmejilla'],           con: 'le beso la mejilla a',        solo: 'quiere un beso en la mejilla', emoji: '😚' },
    sing:       { alias: ['cantar'],                  con: 'le canto a',                  solo: 'canta solit@',                 emoji: '🎤' },
    tickle:     { alias: ['cosquillas'],              con: 'le hizo cosquillas a',        solo: 'quiere cosquillas',            emoji: '🖐️' },
    scream:     { alias: ['gritar'],                  con: 'le grito a',                  solo: 'grito de la nada',             emoji: '😱' },
    push:       { alias: ['empujar'],                 con: 'empujo a',                    solo: 'empujo el aire',               emoji: '🤜' },
    nope:       { alias: ['nel'],                     con: 'le dijo que NO a',            solo: 'nope, ni de chiste',           emoji: '🙅' },
    jump:       { alias: ['saltar'],                  con: 'salto con',                   solo: 'salta de la emocion',          emoji: '🦘' },
    heat:       { alias: ['calor', 'caliente'],       con: 'suda la gota gorda por',      solo: 'esta que se derrite',          emoji: '🥵' },
    gaming:     { alias: ['jugar', 'gamear'],         con: 'juega con',                   solo: 'esta gameando',                emoji: '🎮' },
    draw:       { alias: ['dibujar'],                 con: 'dibuja a',                    solo: 'dibuja en su cuaderno',        emoji: '🎨' },
    call:       { alias: ['llamar'],                  con: 'llama a',                     solo: 'hace una llamadita',           emoji: '📞' },
    laugh:      { alias: ['reir', 'risa'],            con: 'se rio con',                  solo: 'se rie solo',                  emoji: '😂' },
    love:       { alias: ['amar', 'amor'],            con: 'ama a',                       solo: 'se ama a si mism@',            emoji: '❤️' },
    pout:       { alias: ['pucheros'],                con: 'le hizo pucheros a',          solo: 'hace pucheros',                emoji: '😡' },
    punch:      { alias: ['punetazo', 'golpear'],     con: 'le dio un punetazo a',        solo: 'se golpeo solo',               emoji: '👊' },
    run:        { alias: ['correr', 'huir'],          con: 'corrio hacia',                solo: 'corre sin destino',            emoji: '🏃' },
    sad:        { alias: ['triste'],                  con: 'esta triste por',             solo: 'esta triste',                  emoji: '😔' },
    scared:     { alias: ['miedo', 'asustar'],        con: 'se asusto de',                solo: 'se asusta solo',               emoji: '😨' },
    seduce:     { alias: ['seducir'],                 con: 'intenta seducir a',           solo: 'modo seductor activado',       emoji: '😘' },
    shy:        { alias: ['timido'],                  con: 'se puso timid@ con',          solo: 'se pone timid@',               emoji: '😳' },
    sleep:      { alias: ['dormir', 'sueno'],         con: 'se durmio junto a',           solo: 'quiere dormir',                emoji: '😴' },
    smoke:      { alias: ['fumar'],                   con: 'fuma pensando en',            solo: 'fuma tranquilo',               emoji: '🚬' },
    spit:       { alias: ['escupir'],                 con: 'escupio a',                   solo: 'escupio al suelo',             emoji: '🤮' },
    step:       { alias: ['pisar'],                   con: 'piso a',                      solo: 'camina sin mirar',             emoji: '👣' },
    think:      { alias: ['pensar'],                  con: 'esta pensando en',            solo: 'piensa profundamente',         emoji: '🤔' },
    walk:       { alias: ['caminar'],                 con: 'camina con',                  solo: 'camina solo',                  emoji: '🚶' },
    hug:        { alias: ['abrazar', 'abrazo'],       con: 'quiere abrazar fuerte a',     solo: 'quiere un abrazo',             emoji: '🤗' },
    kill:       { alias: ['matar'],                   con: 'quiere matar a',              solo: 'quiere autodestruirse',        emoji: '🔪' },
    eat:        { alias: ['comer'],                   con: 'come frente a',               solo: 'esta comiendo',                emoji: '🍜' },
    kiss:       { alias: ['besar', 'beso'],           con: 'quiere dar muchos besos a',   solo: 'quiere un beso',               emoji: '💋' },
    wink:       { alias: ['guino'],                   con: 'le guino el ojo a',           solo: 'guina el ojo',                 emoji: '😜' },
    pat:        { alias: ['acariciar', 'caricia'],    con: 'quiere acariciar a',          solo: 'quiere una caricia',           emoji: '🥰' },
    happy:      { alias: ['feliz', 'alegre'],         con: 'esta feliz con',              solo: 'esta feliz de la vida',        emoji: '😊' },
    bully:      { alias: ['molestar', 'bullyear'],    con: 'molesta sin parar a',         solo: 'hace bullying solo',           emoji: '😈' },
    bite:       { alias: ['morder', 'mordida'],       con: 'mordio a',                    solo: 'se mordio solo',               emoji: '😬' },
    blush:      { alias: ['sonrojo', 'sonrojarse'],   con: 'se sonrojo por',              solo: 'se sonrojo solit@',            emoji: '☺️' },
    wave:       { alias: ['saludar', 'saludo'],       con: 'saludo a',                    solo: 'saluda al viento',             emoji: '👋' },
    bath:       { alias: ['banar', 'bano'],           con: 'se bana junto a',             solo: 'se esta banando',              emoji: '🛁' },
    smug:       { alias: ['presumido'],               con: 'miro con superioridad a',     solo: 'modo presumido activado',      emoji: '😏' },
    smile:      { alias: ['sonreir', 'sonrisa'],      con: 'le sonrio a',                 solo: 'sonrie sin razon',             emoji: '😄' },
    highfive:   { alias: ['chocar', 'chocala'],       con: 'choco los cinco con',         solo: 'choca los cinco al aire',      emoji: '🙌' },
    handhold:   { alias: ['mano', 'tomardemano'],     con: 'tomo de la mano a',           solo: 'quiere agarrar una manito',    emoji: '❤️' },
    cringe:     { alias: ['verguenza'],               con: 'siente cringe por',           solo: 'esta cringe total',            emoji: '😬' },
    bonk:       { alias: [],                          con: 'le dio un BONK a',            solo: 'se bonkeo',                    emoji: '🔨' },
    cry:        { alias: ['llorar', 'llora'],         con: 'lloro con',                   solo: 'quiere llorar',                emoji: '😢' },
    lick:       { alias: ['lamer'],                   con: 'lame a',                      solo: 'se lame el labio',             emoji: '👅' },
    slap:       { alias: ['bofetada', 'abofetear'],   con: 'quiere dar una bofetada a',   solo: 'se dio una bofetada',          emoji: '👋' },
    dance:      { alias: ['bailar', 'baile'],         con: 'bailo con',                   solo: 'baila solito',                 emoji: '💃' },
    cuddle:     { alias: ['acurrucar', 'mimar'],      con: 'se acurruco con',             solo: 'quiere mimitos',               emoji: '🤗' }
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

// ---------- SACAR URL DE CUALQUIER FORMATO DE RESPUESTA ----------
function sacarUrl(json) {
    if (!json || typeof json !== 'object') return null;
    if (json.status === false) return null;
    const candidatos = [
        json.url, json.video, json.gif, json.link, json.file,
        json.result?.url, json.result?.video, json.result?.gif,
        json.data?.url, json.data?.video, json.data?.gif,
        json.res?.url, json.response?.url
    ];
    for (const c of candidatos) {
        if (typeof c === 'string' && c.startsWith('http')) return c;
    }
    if (typeof json.result === 'string' && json.result.startsWith('http')) return json.result;
    if (typeof json.data === 'string' && json.data.startsWith('http')) return json.data;
    return null;
}

// ---------- PEDIR A ALYACORE ----------
async function pedirAlyaCore(tipo) {
    try {
        const url = `${ALYA_BASE}?inter=${encodeURIComponent(tipo)}&key=${ALYA_KEY}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const json = await res.json();
        const urlVideo = sacarUrl(json);
        if (!urlVideo) return null;
        return { url: urlVideo, esMp4: urlVideo.endsWith('.mp4') };
    } catch (e) {
        console.error('[ALYA] error:', e.message);
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
// ============================================================
// COMANDO PRINCIPAL
// ============================================================
export default {
    nombre: 'reaccion',
    categoria: 'Interacción',
    alias: [...TIPOS, ...Object.values(REACCIONES).flatMap(d => d.alias), 'reacciones', 'reaction'],
    descripcion: 'Reacciones anime (AlyaCore): kiss, hug, smoke, seduce... 67 tipos',
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
                    bold('REACCIONES') + ' 🎭 (' + TIPOS.length + ')\n' +
                    'Usa .<reaccion> [@user]\n\n' +
                    lista + '\n⚡ ' + bold('BOT-API')
                );
            }

            // ---------- DETECTAR TIPO ----------
            const tipo = MAPA[invocado] || null;
            if (!tipo) {
                return await responder.texto('❌ Reaccion no valida. Usa .reacciones para ver las ' + TIPOS.length + ' disponibles.');
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
                caption = '`' + senderName + '` ' + bold(d.con) + ' ' + t.token + ' ' + d.emoji;
            } else {
                caption = '`' + senderName + '` ' + bold(d.solo) + ' ' + d.emoji;
            }

            // ---------- PEDIR VIDEO A ALYACORE ----------
            const video = await pedirAlyaCore(tipo);

            if (!video) {
                return await responder.texto('❌ AlyaCore no tiene: *' + tipo + '*');
            }

            // ---------- ENVIAR VIDEO ANIMADO ----------
            try {
                await sock.sendMessage(jid, {
                    video: { url: video.url },
                    mimetype: video.esMp4 ? 'video/mp4' : 'image/gif',
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