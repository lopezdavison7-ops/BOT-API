import fetch from 'node-fetch';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execP = promisify(exec);
const WAIFU_BASE = 'https://api.waifu.pics/sfw/';

let ffmpegDisponible = null;

async function hayFfmpeg() {
    if (ffmpegDisponible !== null) return ffmpegDisponible;
    try {
        await execP('ffmpeg -version');
        ffmpegDisponible = true;
    } catch {
        ffmpegDisponible = false;
    }
    return ffmpegDisponible;
}

async function gifAMp4(gifBuffer) {
    const tmp = os.tmpdir();
    const inPath = path.join(tmp, 'rx_' + Date.now() + '.gif');
    const outPath = path.join(tmp, 'rx_' + Date.now() + '.mp4');
    fs.writeFileSync(inPath, gifBuffer);
    try {
        await execP(`ffmpeg -y -i "${inPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${outPath}"`, { timeout: 20000 });
        const mp4 = fs.readFileSync(outPath);
        return mp4;
    } finally {
        try { fs.unlinkSync(inPath); } catch {}
        try { fs.unlinkSync(outPath); } catch {}
    }
}

const WAIFU_MAP = {
    hug: 'hug', kiss: 'kiss', pat: 'pat', slap: 'slap', cuddle: 'cuddle',
    cry: 'cry', dance: 'dance', blush: 'blush', bonk: 'bonk', bully: 'bully',
    cringe: 'cringe', bite: 'bite', happy: 'happy', highfive: 'highfive',
    handhold: 'handhold', lick: 'lick', poke: 'poke', smile: 'smile',
    smug: 'smug', wave: 'wave', wink: 'wink', yeet: 'yeet', glomp: 'glomp',
    kill: 'kill', nom: 'nom',
    peek: 'poke', feed: 'nom', tickle: 'poke', think: 'smug', stare: 'smug',
    bored: 'smug', pout: 'smug', shrug: 'smug', facepalm: 'smug', laugh: 'smile',
    sleep: 'smug', sad: 'cry', angry: 'bully', confused: 'smug', shocked: 'smug',
    scared: 'cry', love: 'hug', run: 'dance', walk: 'dance', sing: 'dance',
    coffee: 'nom', eat: 'nom', drink: 'nom', bath: 'smug', smoke: 'smug',
    game: 'smug', read: 'smug', work: 'smug', study: 'smug', fight: 'bully',
    celebrate: 'dance', party: 'dance', gift: 'handhold', arrest: 'slap',
    shoot: 'kill', stab: 'kill', punch: 'slap', throw: 'yeet', catch: 'handhold',
    push: 'yeet', pull: 'handhold', drag: 'yeet', carry: 'hug', lift: 'hug',
    drop: 'yeet', spin: 'dance', jump: 'dance', fall: 'cry', trip: 'cry',
    slip: 'cry', climb: 'dance', swim: 'dance', fly: 'dance', drive: 'smug',
    ride: 'smug', surf: 'dance', ski: 'dance', skate: 'dance', bike: 'dance'
};

const MENSAJES = {
    hug: { alias: ['abrazar', 'abrazo'], con: 'abraza a', solo: 'se abraza a sí mismo', emoji: '🤗' },
    kiss: { alias: ['besar', 'beso'], con: 'besa a', solo: 'se besa a sí mismo', emoji: '💋' },
    pat: { alias: ['acariciar', 'caricia'], con: 'acaricia a', solo: 'se acaricia', emoji: '🥰' },
    slap: { alias: ['bofetada', 'abofetear'], con: 'abofetea a', solo: 'se abofetea', emoji: '👋' },
    cuddle: { alias: ['acurrucar', 'mimar'], con: 'se acurruca con', solo: 'se acurruca solo', emoji: '🤗' },
    cry: { alias: ['llorar', 'llora'], con: 'llora por', solo: 'llora solo', emoji: '😢' },
    dance: { alias: ['bailar', 'baile'], con: 'baila con', solo: 'baila solo', emoji: '💃' },
    blush: { alias: ['sonrojo', 'sonrojarse'], con: 'se sonroja por', solo: 'se sonroja', emoji: '☺️' },
    bonk: { alias: [], con: 'le da un bonk a', solo: 'se bonkea', emoji: '🔨' },
    bully: { alias: ['molestar', 'bullyear'], con: 'molesta a', solo: 'se molesta solo', emoji: '😈' },
    cringe: { alias: ['verguenza'], con: 'siente cringe por', solo: 'tiene cringe', emoji: '😬' },
    bite: { alias: ['morder', 'mordida'], con: 'muerde a', solo: 'se muerde', emoji: '😬' },
    happy: { alias: ['feliz', 'alegre'], con: 'está feliz con', solo: 'está feliz', emoji: '😊' },
    highfive: { alias: ['chocar', 'chocala'], con: 'choca los cinco con', solo: 'choca al aire', emoji: '🙌' },
    handhold: { alias: ['mano', 'tomardemano'], con: 'toma de la mano a', solo: 'se toma la mano', emoji: '❤️' },
    lick: { alias: ['lamer'], con: 'lame a', solo: 'se lame', emoji: '👅' },
    poke: { alias: ['picar'], con: 'pica a', solo: 'se pica', emoji: '👉' },
    smile: { alias: ['sonreir', 'sonrisa'], con: 'le sonríe a', solo: 'sonríe', emoji: '😄' },
    smug: { alias: ['presumido'], con: 'mira con superioridad a', solo: 'modo presumido', emoji: '😏' },
    wave: { alias: ['saludar', 'saludo'], con: 'saluda a', solo: 'saluda al aire', emoji: '👋' },
    wink: { alias: ['guino'], con: 'le guiña a', solo: 'guiña', emoji: '😜' },
    yeet: { alias: ['lanzar'], con: 'yeetea a', solo: 'se yeetea', emoji: '💨' },
    glomp: { alias: ['lanzarse'], con: 'se lanza sobre', solo: 'se glompea', emoji: '🤗' },
    kill: { alias: ['matar'], con: 'quiere matar a', solo: 'modo asesino', emoji: '🔪' },
    nom: { alias: ['comer'], con: 'come con', solo: 'come solo', emoji: '🍜' },
    peek: { alias: ['chismear', 'fisgonear'], con: 'espía a', solo: 'espía', emoji: '👀' },
    feed: { alias: ['alimentar'], con: 'alimenta a', solo: 'se alimenta', emoji: '🍱' },
    tickle: { alias: ['cosquillas'], con: 'hace cosquillas a', solo: 'se hace cosquillas', emoji: '🤭' },
    think: { alias: ['pensar'], con: 'piensa en', solo: 'piensa', emoji: '🤔' },
    stare: { alias: ['mirar', 'mirada'], con: 'mira fijamente a', solo: 'mira al vacío', emoji: '👁️' },
    bored: { alias: ['aburrido'], con: 'se aburre con', solo: 'está aburrido', emoji: '😑' },
    pout: { alias: ['pucheros'], con: 'le hace pucheros a', solo: 'hace pucheros', emoji: '😡' },
    shrug: { alias: ['encoger'], con: 'se encoge de hombros con', solo: 'se encoge', emoji: '🤷' },
    facepalm: { alias: ['manoencara'], con: 'hace facepalm por', solo: 'facepalm', emoji: '🤦' },
    laugh: { alias: ['reir', 'risa'], con: 'se ríe con', solo: 'se ríe solo', emoji: '😂' },
    sleep: { alias: ['dormir', 'sueno'], con: 'duerme con', solo: 'duerme', emoji: '😴' },
    sad: { alias: ['triste'], con: 'está triste por', solo: 'está triste', emoji: '😔' },
    angry: { alias: ['enojado', 'furioso'], con: 'está furioso con', solo: 'está furioso', emoji: '😡' },
    confused: { alias: ['confundido'], con: 'está confundido con', solo: 'está confundido', emoji: '😵' },
    shocked: { alias: ['shockeado'], con: 'se shockea con', solo: 'está shockeado', emoji: '😱' },
    scared: { alias: ['miedo', 'asustar'], con: 'le tiene miedo a', solo: 'tiene miedo', emoji: '😨' },
    love: { alias: ['amar', 'amor'], con: 'ama a', solo: 'se ama', emoji: '❤️' },
    run: { alias: ['correr', 'huir'], con: 'corre hacia', solo: 'corre', emoji: '🏃' },
    walk: { alias: ['caminar'], con: 'camina con', solo: 'camina', emoji: '🚶' },
    sing: { alias: ['cantar'], con: 'le canta a', solo: 'canta', emoji: '🎤' },
    coffee: { alias: ['cafe'], con: 'toma café con', solo: 'toma café', emoji: '☕' },
    eat: { alias: ['comer'], con: 'come con', solo: 'come', emoji: '🍜' },
    drink: { alias: ['beber'], con: 'bebe con', solo: 'bebe', emoji: '🥤' },
    bath: { alias: ['banar', 'bano'], con: 'se baña con', solo: 'se baña', emoji: '🛁' },
    smoke: { alias: ['fumar'], con: 'fuma con', solo: 'fuma', emoji: '🚬' },
    game: { alias: ['jugar', 'gamear'], con: 'juega con', solo: 'juega', emoji: '🎮' },
    read: { alias: ['leer'], con: 'lee con', solo: 'lee', emoji: '📚' },
    work: { alias: ['trabajar'], con: 'trabaja con', solo: 'trabaja', emoji: '💼' },
    study: { alias: ['estudiar'], con: 'estudia con', solo: 'estudia', emoji: '📖' },
    fight: { alias: ['pelear'], con: 'pelea con', solo: 'pelea solo', emoji: '🥊' },
    celebrate: { alias: ['celebrar'], con: 'celebra con', solo: 'celebra', emoji: '🎉' },
    party: { alias: ['fiesta', 'fiestear'], con: 'fiestea con', solo: 'fiestea', emoji: '🎊' },
    gift: { alias: ['regalo', 'regalar'], con: 'le da un regalo a', solo: 'se regala', emoji: '🎁' },
    arrest: { alias: ['arrestar'], con: 'arresta a', solo: 'se arresta', emoji: '👮' },
    shoot: { alias: ['disparar'], con: 'le dispara a', solo: 'dispara al aire', emoji: '🔫' },
    stab: { alias: ['apunalar'], con: 'apuñala a', solo: 'se apuñala', emoji: '🗡️' },
    punch: { alias: ['punetazo', 'golpear'], con: 'golpea a', solo: 'golpea al aire', emoji: '👊' },
    throw: { alias: ['lanzar'], con: 'le lanza algo a', solo: 'lanza algo', emoji: '🤾' },
    catch: { alias: ['atrapar'], con: 'atrapa a', solo: 'atrapa algo', emoji: '🤲' },
    push: { alias: ['empujar'], con: 'empuja a', solo: 'empuja al aire', emoji: '🤜' },
    pull: { alias: ['jalar'], con: 'jala a', solo: 'jala algo', emoji: '🤛' },
    drag: { alias: ['arrastrar'], con: 'arrastra a', solo: 'arrastra algo', emoji: '🛷' },
    carry: { alias: ['cargar'], con: 'carga a', solo: 'carga algo', emoji: '🏋️' },
    lift: { alias: ['levantar'], con: 'levanta a', solo: 'levanta algo', emoji: '💪' },
    drop: { alias: ['soltar'], con: 'suelta a', solo: 'suelta algo', emoji: '🤷' },
    spin: { alias: ['girar'], con: 'gira con', solo: 'gira', emoji: '🌀' },
    jump: { alias: ['saltar'], con: 'salta con', solo: 'salta', emoji: '🦘' },
    fall: { alias: ['caer', 'caerse'], con: 'se cae con', solo: 'se cae', emoji: '🤕' },
    trip: { alias: ['tropezar'], con: 'tropieza con', solo: 'tropieza', emoji: '🤸' },
    slip: { alias: ['resbalar'], con: 'resbala con', solo: 'resbala', emoji: '🧊' },
    climb: { alias: ['escalar'], con: 'escala con', solo: 'escala', emoji: '🧗' },
    swim: { alias: ['nadar'], con: 'nada con', solo: 'nada', emoji: '🏊' },
    fly: { alias: ['volar'], con: 'vuela con', solo: 'vuela', emoji: '🦅' },
    drive: { alias: ['conducir', 'manejar'], con: 'conduce con', solo: 'conduce', emoji: '🚗' },
    ride: { alias: ['montar'], con: 'monta con', solo: 'monta', emoji: '🏇' },
    surf: { alias: ['surfear'], con: 'surfea con', solo: 'surfea', emoji: '🏄' },
    ski: { alias: ['esquiar'], con: 'esquía con', solo: 'esquía', emoji: '⛷️' },
    skate: { alias: ['patinar'], con: 'patina con', solo: 'patina', emoji: '🛹' },
    bike: { alias: ['bicicleta', 'bicicletar'], con: 'bicicletea con', solo: 'bicicletea', emoji: '🚴' }
};

const MAPA = {};
for (const [tipo, d] of Object.entries(MENSAJES)) {
    MAPA[tipo] = tipo;
    for (const a of d.alias) MAPA[a] = tipo;
}

function bold(texto) {
    return String(texto).replace(/[A-Za-z]/g, c => {
        const base = c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97;
        return String.fromCodePoint(base + c.charCodeAt(0));
    });
}

async function pedirGif(tipo) {
    const endpoint = WAIFU_MAP[tipo] || 'waifu';
    try {
        const res = await fetch(WAIFU_BASE + endpoint, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return null;
        const json = await res.json();
        return json.url || null;
    } catch (e) {
        console.error('[REACCIONES] waifu.pics falló:', e.message);
        return null;
    }
}

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

function extraerComando(msg) {
    const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';
    const limpio = texto.trim().replace(/^\.+\s*/, '');
    return (limpio.split(/\s+/)[0] || '').toLowerCase();
}

export default {
    nombre: 'reaccion',
    categoria: 'Interacción',
    alias: [...Object.keys(MENSAJES), ...Object.values(MENSAJES).flatMap(d => d.alias), 'reacciones', 'reaction'],
    descripcion: 'Reacciones anime animadas (waifu.pics + ffmpeg)',
    uso: '.<reaccion> [@usuario]',
    ejecutar: async ({ sock, msg, responder }) => {
        try {
            const jid = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;
            const senderName = msg.pushName || sender.split('@')[0].replace(/\D/g, '');

            const invocado = extraerComando(msg);

            if (invocado === 'reacciones' || invocado === 'reaction' || invocado === 'reaccion') {
                const tipos = Object.keys(MENSAJES);
                let lista = '';
                for (let i = 0; i < tipos.length; i += 4) {
                    lista += tipos.slice(i, i + 4).map(t => MENSAJES[t].emoji + ' .' + t).join('  ') + '\n';
                }
                return await responder.texto(
                    bold('REACCIONES') + ' 🎭 (' + tipos.length + ')\n' +
                    'Usa .<reaccion> [@user]\n\n' +
                    lista + '\n⚡ ' + bold('BOT-API')
                );
            }

            const tipo = MAPA[invocado];
            if (!tipo) {
                return await responder.texto('❌ Reacción no válida. Usa .reacciones');
            }

            const d = MENSAJES[tipo];
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

            const url = await pedirGif(tipo);
            if (!url) return await responder.texto(caption);

            let gifBuffer = null;
            try {
                const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
                if (r.ok) gifBuffer = Buffer.from(await r.arrayBuffer());
            } catch (e) {
                console.error('[REACCIONES] descarga gif falló:', e.message);
            }

            if (!gifBuffer) return await responder.texto(caption);

            let mp4 = null;
            if (await hayFfmpeg()) {
                try {
                    mp4 = await gifAMp4(gifBuffer);
                } catch (e) {
                    console.error('[REACCIONES] ffmpeg falló:', e.message);
                }
            }

            try {
                await sock.sendMessage(jid, {
                    video: mp4 || gifBuffer,
                    mimetype: 'video/mp4',
                    gifPlayback: true,
                    caption,
                    mentions
                }, { quoted: msg });
                return;
            } catch (e) {
                console.error('[REACCIONES] envio video falló:', e.message);
            }

            try {
                await sock.sendMessage(jid, {
                    image: gifBuffer,
                    caption,
                    mentions
                }, { quoted: msg });
            } catch (e) {
                await responder.texto(caption);
            }

        } catch (error) {
            console.error('[REACCIONES] Error:', error);
            await responder.texto('❌ Error: ' + (error.message || error));
        }
    }
};