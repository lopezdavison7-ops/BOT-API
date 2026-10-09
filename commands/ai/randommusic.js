import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 10 });
const API = 'https://anabot.my.id/api/ai/randomMusic';
const APIKEY = 'Alex30';

function fmtDur(s) {
    s = Number(s) || 0;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
}

function parseLyrics(raw) {
    if (!raw) return '';
    
    try {
        // Intento 1: Parsear como JSON directo
        const parsed = JSON.parse(raw);
        
        // Si es string, retornarlo
        if (typeof parsed === 'string') {
            return parsed;
        }
        
        // Si es objeto con campo "text"
        if (parsed && typeof parsed === 'object' && parsed.text) {
            return parsed.text;
        }
        
        return '';
    } catch (e) {
        // Intento 2: Si falla, intentar parsear string escapado manualmente
        try {
            // Remover comillas exteriores y escapes
            const cleaned = raw.replace(/^\{.*?"text":\s*"(.*)".*\}$/s, '$1');
            if (cleaned !== raw) {
                // Unescape caracteres
                return cleaned
                    .replace(/\\n/g, '\n')
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, '\\');
            }
        } catch (e2) {
            // Último recurso: retornar como está
            return String(raw);
        }
    }
    
    return '';
}

function formatLyrics(text) {
    if (!text) return '';
    
    // Limpiar y formatear
    const lines = text
        .split(/\n|\[Verse|\[Chorus|\[Bridge|\[Pre-Chorus|\[Outro/)
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith(']'))
        .slice(0, 6); // Solo 6 líneas
    
    if (lines.length === 0) return '';
    
    return lines.join('\n┃ ');
}

export default {
    nombre: 'randommusic',
    categoria: 'IA',
    alias: ['musicai', 'aiamusic', 'randomsong', 'songai', 'musicagenerada'],
    descripcion: 'Genera una canción aleatoria con IA (SongGPT)',
    uso: '.randommusic',

    ejecutar: async ({ sock, msg, responder, jid }) => {
        await sock.sendMessage(jid, { react: { text: '🎵', key: msg.key } });

        try {
            const url = `${API}?apikey=${APIKEY}`;
            const res = await fetch(url, {
                agent: AGENTE,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: AbortSignal.timeout(20000)
            });

            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }

            const data = await res.json();

            if (!data.success || !data.data?.result) {
                throw new Error('API no devolvió canción');
            }

            const song = data.data.result;
            const duracion = fmtDur(song.duration);
            const mood = song.mood || 'N/A';
            const tags = Array.isArray(song.tags) ? song.tags.slice(0, 5).join(', ') : '';
            
            // Parsear y formatear letra
            const rawLyrics = parseLyrics(song.lyrics);
            const lyrics = formatLyrics(rawLyrics);

            let caption =
                '╭━━〔 🎵 𝐌𝐔́𝐒𝐈𝐂𝐀 𝐈𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎧 *' + (song.title || 'Sin título') + '*\n' +
                '┃ 👤 ' + (song.artist || 'Artista IA') + '\n' +
                '┃\n' +
                '┃ 🎭 Género › *' + (song.genre || 'N/A') + '*\n' +
                '┃ ⏱️ Duración › *' + duracion + '*\n' +
                '┃ 🌐 Idioma › ' + (song.language || 'N/A') + '\n' +
                '┃ 💫 Mood › ' + mood + '\n' +
                (tags ? '┃ 🏷️ Tags › ' + tags + '\n' : '') +
                '┃\n';

            if (lyrics) {
                caption += '┣━━〔 📝 𝐋𝐄𝐓𝐑𝐀 〕━━⬣\n' +
                           '┃\n' +
                           '┃ ' + lyrics + '\n' +
                           '┃\n';
            }

            caption += '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            if (song.cover_image) {
                try {
                    await sock.sendMessage(jid, {
                        image: { url: song.cover_image },
                        caption
                    }, { quoted: msg });
                } catch {
                    await sock.sendMessage(jid, { text: caption }, { quoted: msg });
                }
            } else {
                await sock.sendMessage(jid, { text: caption }, { quoted: msg });
            }

            if (song.audio_file) {
                await sock.sendMessage(jid, {
                    audio: { url: song.audio_file },
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: msg });
            }

            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error('[RANDOMMUSIC] Error:', error?.message || error);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ No se pudo generar música\n' +
                '┃\n' +
                '┃ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 Intenta de nuevo\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};