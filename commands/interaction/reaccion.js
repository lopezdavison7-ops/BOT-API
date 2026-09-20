// commands/interaction/reaccion.js — 🎭 Reacciones anime GIF
import fetch from 'node-fetch';  // ⬅️ ESTE FALTABA, ES LA CLAVE

const NEKOS = 'https://nekos.best/api/v2/';
const DELIRIUS = 'https://api.delirius.online/anime/';

// ---------- BOLD UNICODE (𝐀𝐁𝐂) ----------
function bold(texto) {
    return String(texto).replace(/[A-Za-z]/g, c => {
        const base = c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97;
        return String.fromCodePoint(base + c.charCodeAt(0));
    });
}

// ---------- CATÁLOGO: 60 GIFS DE REACCIÓN ----------
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

// ---------- MAPEO ALIAS → TIPO ----------
const MAPA = {};
for (const [tipo, d] of Object.entries(REACCIONES)) {
    MAPA[tipo] = tipo;
    for (const a of d.alias) MAPA[a] = tipo;
}
const TIPOS = Object.keys(REACCIONES);

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

// ---------- FUENTES: nekos.best → Delirius ----------
async function pedirNekos(tipo) {
    try {
        const res = await fetch(NEKOS + tipo, { timeout: 15000 });
        if (!res.ok) return null;
        const json = await res.json();
        return json?.results?.[0]?.url || null;
    } catch (e) {
        console.error('[REACCION] nekos error:', e.message);
        return null;
    }
}

async function pedirDelirius(tipo) {
    try {
        const res = await fetch(DELIRIUS + tipo, { timeout: 15000 });
        if (!res.ok) return null;
        const json = await res.json();
        const d = json.data ?? json.datos;
        if (typeof d === 'string') return d;
        return d?.url || d?.gif || d?.image || d?.img || null;
    } catch (e) {
        console.error('[REACCION] delirius error:', e.message);
        return null;
    }
}

async function obtenerUrl(tipo) {
    const url = await pedirNekos(tipo);
    if (url) return url;
    return await pedirDelirius(tipo);
}

// ---------- DETECTAR QUÉ REACCIÓN SE INVOCÓ ----------
function detectarTipo(msg) {
    const texto = msg.message?.extendedTextMessage?.text
               || msg.message?.conversation || '';
    const invocado = (texto.match(/^\.([^\s]+)/)?.[1] || '').toLowerCase();
    return MAPA[invocado] || null;
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

            const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';
            const invocado = (texto.match(/^\.([^\s]+)/)?.[1] || '').toLowerCase();

            // ---------- AYUDA ----------
            if (invocado === 'reacciones' || invocado === 'reaction' || invocado === 'reaccion') {
                let lista = '';
                for (let i = 0; i < TIPOS.length; i += 4) {
                    lista += TIPOS.slice(i, i + 4).map(t => REACCIONES[t].emoji + ' .' + t).join('  ') + '\n';
                }
                return await responder.texto(bold('REACCIONES') + ' 🎭\nUsa .<reaccion> [@user]\n\n' + lista + '\n⚡ ' + bold('BOT-API'));
            }

            const tipo = detectarTipo(msg);
            if (!tipo) return await responder.texto('❌ Reaccion no valida. Usa .reacciones para ver todas.');

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

            // ---------- OBTENER URL DEL GIF ----------
            const url = await obtenerUrl(tipo);
            if (!url) {
                return await responder.texto('❌ No encontre gif para: ' + tipo);
            }

            // ---------- MÉTODO 1: URL directa a Baileys (más confiable) ----------
            try {
                await sock.sendMessage(jid, {
                    video: { url },
                    gifPlayback: true,
                    caption,
                    mentions
                }, { quoted: msg });
                return;
            } catch (e) {
                console.error('[REACCION] metodo1 URL:', e.message);
            }

            // ---------- MÉTODO 2: descargar buffer ----------
            try {
                const res = await fetch(url, { timeout: 20000 });
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
                console.error('[REACCION] metodo2 buffer:', e.message);
            }

            // ---------- MÉTODO 3: sticker animado ----------
            try {
                const { Sticker } = await import('wa-sticker-formatter');
                const st = new Sticker(url, { pack: 'BOT-API ⚡', author: d.emoji, type: 'animated', quality: 80 });
                await sock.sendMessage(jid, { sticker: await st.toBuffer() }, { quoted: msg });
                await sock.sendMessage(jid, { text: caption, mentions }, { quoted: msg });
                return;
            } catch (e) {
                console.error('[REACCION] metodo3 sticker:', e.message);
            }

            // ---------- ÚLTIMO RECURSO ----------
            await responder.texto(caption);

        } catch (error) {
            console.error('[REACCION] Error:', error);
            await responder.texto('❌ Error: ' + (error.message || error));
        }
    }
};