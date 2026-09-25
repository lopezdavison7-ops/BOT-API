

import fetch from 'node-fetch';

function bold(t) {
    return String(t).replace(/[A-Za-z]/g, c =>
        String.fromCodePoint((c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97) + c.charCodeAt(0))
    );
}

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

const GENEROS = [
    { keys: ['reggaeton', 'regueton', 'dembow', 'perreo', 'latino'], bpm: 95, beat: 'dembow', esc: 'menor', nombre: 'Reggaetón' },
    { keys: ['techno', 'tech', 'electronico', 'electronic', 'edm'], bpm: 128, beat: 'four', esc: 'menor', nombre: 'Techno' },
    { keys: ['house', 'dance', 'fiesta'], bpm: 124, beat: 'four', esc: 'menor', nombre: 'House' },
    { keys: ['lofi', 'lo-fi', 'chill', 'relax', 'estudio'], bpm: 75, beat: 'lofi', esc: 'menor', nombre: 'Lo-Fi' },
    { keys: ['trap', 'drill', 'rap', 'hiphop', 'hip-hop'], bpm: 140, beat: 'trap', esc: 'menor', nombre: 'Trap' },
    { keys: ['rock', 'metal', 'guitarra'], bpm: 120, beat: 'rock', esc: 'menor', nombre: 'Rock' },
    { keys: ['ambient', 'cinematico', 'epico', 'soundtrack', 'calma'], bpm: 70, beat: 'none', esc: 'mayor', nombre: 'Ambient' },
    { keys: ['feliz', 'happy', 'alegre', 'pop'], bpm: 110, beat: 'four', esc: 'mayor', nombre: 'Pop' }
];
const ESCALAS = { menor: [0, 2, 3, 5, 7, 8, 10], mayor: [0, 2, 4, 5, 7, 9, 11] };
const PATRONES = {
    four:   { k: [0, 4, 8, 12], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] },
    dembow: { k: [0, 4, 8, 12], s: [4, 12, 7, 15], h: [0, 3, 6, 8, 11, 14] },
    trap:   { k: [0, 7, 10], s: [8], h: [0, 2, 4, 6, 8, 10, 12, 14] },
    lofi:   { k: [0, 10], s: [4, 12], h: [2, 6, 10, 14] },
    rock:   { k: [0, 8, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] },
    none:   { k: [], s: [], h: [] }
};

function addTone(buf, sr, t0, dur, freq, amp, type, attack) {
    attack = attack || 0.01;
    const start = Math.floor(t0 * sr), end = Math.min(buf.length, Math.floor((t0 + dur) * sr));
    let phase = 0;
    for (let i = start; i < end; i++) {
        const t = (i - start) / sr;
        phase += 2 * Math.PI * freq / sr;
        let s = 0;
        if (type === 'sine') s = Math.sin(phase);
        else if (type === 'tri') s = (2 / Math.PI) * Math.asin(Math.sin(phase));
        else if (type === 'saw') s = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
        else if (type === 'square') s = Math.sin(phase) > 0 ? 0.6 : -0.6;
        const env = Math.min(1, t / attack) * Math.exp(-2.5 * t / dur);
        buf[i] += s * amp * env;
    }
}
function addKick(buf, sr, t0) {
    const dur = 0.28, start = Math.floor(t0 * sr), end = Math.min(buf.length, start + Math.floor(dur * sr));
    let phase = 0;
    for (let i = start; i < end; i++) {
        const t = (i - start) / sr;
        const f = 140 * Math.exp(-t * 28) + 48;
        phase += 2 * Math.PI * f / sr;
        buf[i] += Math.sin(phase) * 0.85 * Math.exp(-t * 16);
    }
}
function addSnare(buf, sr, t0, rng) {
    const dur = 0.18, start = Math.floor(t0 * sr), end = Math.min(buf.length, start + Math.floor(dur * sr));
    let phase = 0;
    for (let i = start; i < end; i++) {
        const t = (i - start) / sr;
        phase += 2 * Math.PI * 190 / sr;
        buf[i] += ((rng() * 2 - 1) * 0.45 + Math.sin(phase) * 0.25) * Math.exp(-t * 22);
    }
}
function addHat(buf, sr, t0, rng, amp) {
    const dur = 0.05, start = Math.floor(t0 * sr), end = Math.min(buf.length, start + Math.floor(dur * sr));
    let prev = 0;
    for (let i = start; i < end; i++) {
        const t = (i - start) / sr;
        const n = rng() * 2 - 1; const hp = n - prev; prev = n;
        buf[i] += hp * amp * Math.exp(-t * 70);
    }
}

function sintetizar(prompt) {
    const p = prompt.toLowerCase();
    const g = GENEROS.find(x => x.keys.some(k => p.includes(k))) || { bpm: 100, beat: 'four', esc: 'menor', nombre: 'Electrónica' };
    const rng = mulberry32(hashStr(p));
    const SR = 22050;
    const compases = 6;
    const compas = (60 / g.bpm) * 4;
    const dur = compases * compas;
    const buf = new Float32Array(Math.floor(SR * dur));
    const esc = ESCALAS[g.esc];
    const raiz = 45 + Math.floor(rng() * 5);
    const progs = [[0, 5, 3, 4], [0, 3, 4, 4], [0, 6, 5, 4], [0, 4, 5, 3]];
    const prog = progs[Math.floor(rng() * progs.length)];
    const paso = compas / 16;
    const pat = PATRONES[g.beat] || PATRONES.four;

    for (let c = 0; c < compases; c++) {
        const t0 = c * compas;
        const grado = prog[c % prog.length];
        const rootMidi = raiz + esc[grado % esc.length];

        for (const s of pat.k) addKick(buf, SR, t0 + s * paso);
        for (const s of pat.s) addSnare(buf, SR, t0 + s * paso, rng);
        for (const s of pat.h) addHat(buf, SR, t0 + s * paso, rng, g.beat === 'lofi' ? 0.10 : 0.14);

        for (let b = 0; b < 8; b++) {
            if (g.beat === 'trap' && b % 2 === 1) continue;
            addTone(buf, SR, t0 + b * (compas / 8), compas / 8, mtof(rootMidi - 12), 0.30, 'saw');
        }

        const n3 = rootMidi + esc[(grado + 2) % esc.length] + ((grado + 2) >= esc.length ? 12 : 0);
        const n5 = rootMidi + esc[(grado + 4) % esc.length] + ((grado + 4) >= esc.length ? 12 : 0);
        for (const n of [rootMidi, n3, n5]) addTone(buf, SR, t0, compas, mtof(n), 0.10, 'tri', 0.3);

        for (let m = 0; m < 8; m++) {
            if (rng() < 0.35) continue;
            const gi = Math.floor(rng() * esc.length);
            const oct = rng() < 0.3 ? 12 : 0;
            addTone(buf, SR, t0 + m * (compas / 8), compas / 8 * 0.9, mtof(raiz + 12 + esc[gi] + oct), 0.22, 'square', 0.005);
        }
    }

    let max = 0;
    for (let i = 0; i < buf.length; i++) max = Math.max(max, Math.abs(buf[i]));
    if (max > 0) for (let i = 0; i < buf.length; i++) buf[i] = buf[i] / max * 0.85;
    return { buf, SR, dur, g };
}

function toWav(samples, sr) {
    const n = samples.length; const b = Buffer.alloc(44 + n * 2);
    b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8);
    b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
    b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
    b.write('data', 36); b.writeUInt32LE(n * 2, 40);
    for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, samples[i])); b.writeInt16LE(Math.round(s * 32767), 44 + i * 2); }
    return b;
}

async function generarHF(prompt) {
    const token = process.env.HF_TOKEN;
    if (!token) return null;
    try {
        const res = await fetch('https://api-inference.huggingface.co/models/facebook/musicgen-small', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: prompt }),
            timeout: 120000
        });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 1000) return null;
        return buf;
    } catch (e) { return null; }
}

export default {
    nombre: 'crearmusica',
    categoria: 'ai',
    alias: ['musicgen', 'hacermusica', 'generarmusica', 'musicia', 'song'],
    descripcion: 'Genera música al instante (reggaetón, techno, lofi, trap...)',
    uso: '.crearmusica <descripción>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const prompt = (argumento || '').trim();

        if (!prompt) {
            return await responder.texto(
                '╭━━〔 🎵 𝐂𝐑𝐄𝐀𝐑 𝐌𝐔𝐒𝐈𝐂𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 📝 Describe la música que quieres:\n' +
                '┃\n' +
                '┃ ➪ .crearmusica reggaeton latino\n' +
                '┃ ➪ .crearmusica lofi chill para estudiar\n' +
                '┃ ➪ .crearmusica techno oscuro\n' +
                '┃ ➪ .crearmusica trap duro\n' +
                '┃ ➪ .crearmusica rock con guitarra\n' +
                '┃ ➪ .crearmusica ambient cinematografico\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        let audio = null, mime = 'audio/wav', fuente = '', extra = '';
        const hf = await generarHF(prompt);
        if (hf) {
            audio = hf; mime = 'audio/flac'; fuente = 'Hugging Face MusicGen (IA)';
        } else {

            const r = sintetizar(prompt);
            audio = toWav(r.buf, r.SR);
            fuente = 'Sintetizador BOT-API';
            extra = '┃  Género: ' + r.g.nombre + ' · ' + r.g.bpm + ' BPM\n┃ ⏱️ Duración: ' + r.dur.toFixed(1) + 's\n';
        }

        const caption =
            '╭━━〔 🎵 𝐌𝐔𝐒𝐈𝐂𝐀 𝐆𝐄𝐍𝐄𝐑𝐀𝐃𝐀 〕━━⬣\n' +
            '┃\n' +
            '┃ 🎼 Prompt: ' + prompt + '\n' +
            extra +
            '┃ 🌐 Fuente: ' + fuente + '\n' +
            '┃\n' +
            '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        try {
            await sock.sendMessage(msg.key.remoteJid, {
                audio: audio,
                mimetype: mime,
                ptt: false,
                caption: caption
            }, { quoted: msg });
        } catch (e) {
            console.error('[MUSICA] envio error:', e.message);
            await responder.texto('❌ Falló al enviar el audio: ' + e.message);
        }
    }
};