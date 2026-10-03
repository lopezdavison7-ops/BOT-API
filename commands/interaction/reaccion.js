import fetch from 'node-fetch';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execP = promisify(exec);

const APIs = [
    (tipo) => `https://api.waifu.pics/sfw/${tipo}`,
    (tipo) => `https://nekos.life/api/v2/img/${tipo}`,
    (tipo) => `https://nekos.best/api/v2/${tipo}`,
    (tipo) => `https://api.otakugifs.xyz/gif?reaction=${tipo}`
];

const ENDPOINTS = {
    hug: ['hug', 'hug', 'hug', 'hug'],
    kiss: ['kiss', 'kiss', 'kiss', 'kiss'],
    pat: ['pat', 'pat', 'pat', 'pat'],
    slap: ['slap', 'slap', 'slap', 'slap'],
    cuddle: ['cuddle', 'cuddle', 'cuddle', 'cuddle'],
    cry: ['cry', 'cry', 'cry', 'cry'],
    dance: ['dance', 'dance', 'dance', 'dance'],
    blush: ['blush', 'blush', 'blush', 'blush'],
    bonk: ['bonk', 'bonk', 'bonk', 'bonk'],
    bully: ['bully', 'bully', 'bully', 'bully'],
    cringe: ['cringe', 'cringe', 'cringe', 'cringe'],
    bite: ['bite', 'bite', 'bite', 'bite'],
    happy: ['happy', 'happy', 'happy', 'happy'],
    highfive: ['highfive', 'highfive', 'highfive', 'highfive'],
    handhold: ['handhold', 'handhold', 'handhold', 'handhold'],
    lick: ['lick', 'lick', 'lick', 'lick'],
    poke: ['poke', 'poke', 'poke', 'poke'],
    smile: ['smile', 'smile', 'smile', 'smile'],
    smug: ['smug', 'smug', 'smug', 'smug'],
    wave: ['wave', 'wave', 'wave', 'wave'],
    wink: ['wink', 'wink', 'wink', 'wink'],
    yeet: ['yeet', 'yeet', 'yeet', 'yeet'],
    glomp: ['glomp', 'glomp', 'glomp', 'glomp'],
    kill: ['kill', 'kill', 'kill', 'kill'],
    nom: ['nom', 'nom', 'nom', 'nom'],
    peek: ['poke', 'poke', 'poke', 'peek'],
    feed: ['nom', 'nom', 'nom', 'feed'],
    tickle: ['poke', 'poke', 'poke', 'tickle'],
    think: ['smug', 'smug', 'smug', 'think'],
    stare: ['smug', 'smug', 'smug', 'stare'],
    bored: ['smug', 'smug', 'smug', 'bored'],
    pout: ['smug', 'smug', 'smug', 'pout'],
    shrug: ['smug', 'smug', 'smug', 'shrug'],
    facepalm: ['smug', 'smug', 'smug', 'facepalm'],
    laugh: ['smile', 'smile', 'smile', 'laugh'],
    sleep: ['smug', 'smug', 'smug', 'sleep'],
    sad: ['cry', 'cry', 'cry', 'sad'],
    angry: ['bully', 'bully', 'bully', 'angry'],
    confused: ['smug', 'smug', 'smug', 'confused'],
    shocked: ['smug', 'smug', 'smug', 'shocked'],
    scared: ['cry', 'cry', 'cry', 'scared'],
    love: ['hug', 'hug', 'hug', 'love'],
    run: ['dance', 'dance', 'dance', 'run'],
    walk: ['dance', 'dance', 'dance', 'walk'],
    sing: ['dance', 'dance', 'dance', 'sing'],
    coffee: ['nom', 'nom', 'nom', 'coffee'],
    eat: ['nom', 'nom', 'nom', 'eat'],
    drink: ['nom', 'nom', 'nom', 'drink'],
    bath: ['smug', 'smug', 'smug', 'bath'],
    smoke: ['smug', 'smug', 'smug', 'smoke'],
    game: ['smug', 'smug', 'smug', 'game'],
    read: ['smug', 'smug', 'smug', 'read'],
    work: ['smug', 'smug', 'smug', 'work'],
    study: ['smug', 'smug', 'smug', 'study'],
    fight: ['bully', 'bully', 'bully', 'fight'],
    celebrate: ['dance', 'dance', 'dance', 'celebrate'],
    party: ['dance', 'dance', 'dance', 'party'],
    gift: ['handhold', 'handhold', 'handhold', 'gift'],
    arrest: ['slap', 'slap', 'slap', 'arrest'],
    shoot: ['kill', 'kill', 'kill', 'shoot'],
    stab: ['kill', 'kill', 'kill', 'stab'],
    punch: ['slap', 'slap', 'slap', 'punch'],
    throw: ['yeet', 'yeet', 'yeet', 'throw'],
    catch: ['handhold', 'handhold', 'handhold', 'catch'],
    push: ['yeet', 'yeet', 'yeet', 'push'],
    pull: ['handhold', 'handhold', 'handhold', 'pull'],
    drag: ['yeet', 'yeet', 'yeet', 'drag'],
    carry: ['hug', 'hug', 'hug', 'carry'],
    lift: ['hug', 'hug', 'hug', 'lift'],
    drop: ['yeet', 'yeet', 'yeet', 'drop'],
    spin: ['dance', 'dance', 'dance', 'spin'],
    jump: ['dance', 'dance', 'dance', 'jump'],
    fall: ['cry', 'cry', 'cry', 'fall'],
    trip: ['cry', 'cry', 'cry', 'trip'],
    slip: ['cry', 'cry', 'cry', 'slip'],
    climb: ['dance', 'dance', 'dance', 'climb'],
    swim: ['dance', 'dance', 'dance', 'swim'],
    fly: ['dance', 'dance', 'dance', 'fly'],
    drive: ['smug', 'smug', 'smug', 'drive'],
    ride: ['smug', 'smug', 'smug', 'ride'],
    surf: ['dance', 'dance', 'dance', 'surf'],
    ski: ['dance', 'dance', 'dance', 'ski'],
    skate: ['dance', 'dance', 'dance', 'skate'],
    bike: ['dance', 'dance', 'dance', 'bike']
};

const FALLBACK_GIFS = {
    hug: 'https://github.com/Kone457/Nexus/raw/main/Anime/006ba5556a.mp4',
    kiss: 'https://github.com/Kone457/Nexus/raw/main/Anime/006ba5556a.mp4',
    pat: 'https://github.com/Kone457/Nexus/raw/main/Anime/006ba5556a.mp4',
    slap: 'https://github.com/Kone457/Nexus/raw/main/Anime/006ba5556a.mp4',
    cry: 'https://github.com/Kone457/Nexus/raw/main/Anime/006ba5556a.mp4',
    dance: 'https://github.com/Kone457/Nexus/raw/main/Anime/006ba5556a.mp4',
    default: 'https://github.com/Kone457/Nexus/raw/main/Anime/006ba5556a.mp4'
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

function extraerUrl(json) {
    if (!json || typeof json !== 'object') return null;
    const candidatos = [
        json.url, json.video, json.gif, json.link, json.file,
        json.result?.url, json.data?.url, json.response?.url,
        json.results?.[0]?.url, json.results?.[0]?.media?.[0]?.gif?.url
    ];
    for (const c of candidatos) {
        if (typeof c === 'string' && c.startsWith('http')) return c;
    }
    return null;
}

async function pedirGif(tipo) {
    const endpoints = ENDPOINTS[tipo] || ENDPOINTS.hug;
    
    for (let i = 0; i < APIs.length; i++) {
        try {
            const url = APIs[i](endpoints[i]);
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) continue;
            const json = await res.json();
            const gifUrl = extraerUrl(json);
            if (gifUrl) return gifUrl;
        } catch (e) {
            continue;
        }
    }
    
    return FALLBACK_GIFS[tipo] || FALLBACK_GIFS.default;
}

async function descargarBuffer(url) {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (e) {
        console.error('[REACCIONES] Error descargando buffer:', e.message);
        return null;
    }
}

function esGif(buffer) {
    if (buffer.length < 6) return false;
    const header = buffer.slice(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
}

function esMp4(buffer) {
    if (buffer.length < 12) return false;
    const ftyp = buffer.slice(4, 8).toString('ascii');
    return ftyp === 'ftyp';
}

async function gifAMp4(gifBuffer) {
    try {
        await execP('ffmpeg -version', { timeout: 5000 });
    } catch {
        return null;
    }

    const tmp = os.tmpdir();
    const inPath = path.join(tmp, 'rx_' + Date.now() + '.gif');
    const outPath = path.join(tmp, 'rx_' + Date.now() + '.mp4');

    try {
        fs.writeFileSync(inPath, gifBuffer);
        
        await execP(
            `ffmpeg -y -i "${inPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -f mp4 "${outPath}"`,
            { timeout: 20000 }
        );
        
        const mp4Buffer = fs.readFileSync(outPath);
        return mp4Buffer;
    } catch (e) {
        console.error('[REACCIONES] ffmpeg error:', e.message);
        return null;
    } finally {
        try { fs.unlinkSync(inPath); } catch {}
        try { fs.unlinkSync(outPath); } catch {}
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
    descripcion: 'Reacciones anime con descarga completa y conversión',
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

            const buffer = await descargarBuffer(url);
            if (!buffer) return await responder.texto(caption);

            let videoBuffer = buffer;
            let mimetype = 'video/mp4';

            if (esGif(buffer)) {
                const mp4 = await gifAMp4(buffer);
                if (mp4) {
                    videoBuffer = mp4;
                } else {
                    mimetype = 'image/gif';
                }
            }

            try {
                await sock.sendMessage(jid, {
                    video: videoBuffer,
                    mimetype: mimetype,
                    gifPlayback: mimetype === 'video/mp4',
                    caption,
                    mentions
                }, { quoted: msg });
            } catch (e) {
                console.error('[REACCIONES] Error enviando video:', e.message);
                try {
                    await sock.sendMessage(jid, {
                        image: buffer,
                        caption,
                        mentions
                    }, { quoted: msg });
                } catch (e2) {
                    await responder.texto(caption);
                }
            }

        } catch (error) {
            console.error('[REACCIONES] Error:', error);
            await responder.texto('❌ Error: ' + (error.message || error));
        }
    }
};