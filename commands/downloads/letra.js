import { spawn } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import axios from 'axios';

const OPUS_MIME = 'audio/webm;codecs=opus';
const OPUS_CHAIN = ['24k', '16k', '12k'];
const MAX_B64_BYTES = 800_000;

const KYZOAPI = {
    url: "https://kyzorohan.web.id",
    key: "kyzo_8c654bff7c735cff"
};

const SVG_STROKE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const SVG_FILL = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

const ICONS = {
    play: SVG_FILL + '<path d="M8 5v14l11-7z"/></svg>',
    pause: SVG_FILL + '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    volume: SVG_STROKE + '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    mute: SVG_STROKE + '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>',
    loop: SVG_STROKE + '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
    back: SVG_STROKE + '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><text x="12" y="15.5" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none" font-family="Arial">10</text></svg>',
    fwd: SVG_STROKE + '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/><text x="12" y="15.5" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none" font-family="Arial">10</text></svg>'
};

function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
}

function jsonForScript(value) {
    return JSON.stringify(value ?? '')
        .replace(/</g, 'u003C')
        .replace(/>/g, 'u003E')
        .replace(/&/g, 'u0026')
        .replace(/\u2028/g, 'u2028')
        .replace(/\u2029/g, 'u2029');
}

function fmtTime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

async function getLyrics(query) {
    try {
        const response = await axios.get('https://lrclib.net/api/search', {
            params: { q: query },
            headers: { 'User-Agent': 'KyzoYMD/1.0' },
            timeout: 15000
        });
        const results = Array.isArray(response.data) ? response.data : [];
        const result = results.find(i => typeof i?.syncedLyrics === 'string' && i.syncedLyrics.trim());
        if (!result) return null;
        return {
            title: result.trackName || query,
            artist: result.artistName || '',
            lyrics: result.syncedLyrics
        };
    } catch {
        return null;
    }
}

function parseLrc(lrc) {
    const lines = [];
    const re = /\[(\d{1,3}):(\d{2})(?:[.:]\d+)?\]\s*(.*)/g;
    let m;
    while ((m = re.exec(lrc || ''))) {
        const text = (m[3] || '').trim();
        lines.push({
            t: Number(m[1]) * 60 + Number(m[2]),
            x: text || '...'
        });
    }
    return lines.sort((a, b) => a.t - b.t);
}

async function downloadAudio(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxContentLength: 50 * 1024 * 1024,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return Buffer.from(res.data);
}

function compressOpus(input, { bitrate, trimSec = 0 }) {
    return new Promise(async (resolve, reject) => {
        const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const inPath = path.join(os.tmpdir(), `letra_in_${stamp}.tmp`);
        const outPath = path.join(os.tmpdir(), `letra_out_${stamp}.webm`);
        const cleanup = async () => {
            try { await fs.unlink(inPath); } catch {}
            try { await fs.unlink(outPath); } catch {}
        };

        try {
            await fs.writeFile(inPath, input);
        } catch (e) {
            await cleanup();
            return reject(e);
        }

        const args = [
            '-y', '-i', inPath,
            ...(trimSec > 0 ? ['-t', String(trimSec)] : []),
            '-vn', '-ac', '1', '-ar', '48000',
            '-c:a', 'libopus', '-b:a', bitrate, '-vbr', 'on',
            '-application', 'audio', '-frame_duration', '40',
            '-compression_level', '10',
            outPath
        ];

        const ff = spawn('ffmpeg', args);
        let stderr = '';
        ff.stderr.on('data', (d) => { stderr += d.toString(); });
        ff.on('error', async (e) => {
            await cleanup();
            reject(new Error('ffmpeg error: ' + e.message));
        });
        ff.on('close', async (code) => {
            if (code !== 0) {
                await cleanup();
                return reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-300)}`));
            }
            try {
                const out = await fs.readFile(outPath);
                await cleanup();
                if (!out.length) throw new Error('output vacío');
                resolve(out);
            } catch (e) {
                await cleanup();
                reject(e);
            }
        });
    });
}

async function compressWithFallback(input, durationSec) {
    let best = null;
    for (const bitrate of OPUS_CHAIN) {
        const buf = await compressOpus(input, { bitrate });
        best = { buf, bitrate, b64len: Math.ceil(buf.length * 4 / 3), trimSec: 0 };
        if (best.b64len <= MAX_B64_BYTES) return best;
    }

    const targetRaw = Math.floor(MAX_B64_BYTES * 3 / 4);
    const ratio = Math.min(1, targetRaw / best.buf.length) * 0.9;
    const trimSec = Math.max(90, Math.floor((durationSec || 180) * ratio));
    const buf = await compressOpus(input, { bitrate: OPUS_CHAIN[0], trimSec });
    const b64len = Math.ceil(buf.length * 4 / 3);
    if (b64len <= MAX_B64_BYTES) {
        return { buf, bitrate: OPUS_CHAIN[0], b64len, trimSec };
    }
    return best;
}

async function YouTubeplay(query) {
    try {
        if (!query || typeof query !== 'string') {
            return { success: false, message: 'La consulta debe ser texto' };
        }

        const response = await axios.get(`${KYZOAPI.url}/api/ytplay`, {
            params: { query, key: KYZOAPI.key },
            timeout: 60000
        });
        const data = response.data;

        if (!data?.status) {
            return {
                success: false,
                message: data?.message || 'Video de YouTube no encontrado'
            };
        }
        if (!data?.download) {
            return { success: false, message: 'URL de descarga de audio no encontrada' };
        }

        let lyrics = null;
        try {
            lyrics = await getLyrics(data.title || query);
        } catch {}

        return {
            success: true,
            result: {
                title: data.title || query,
                channel: data.creator || 'YouTube',
                url: data.source || '',
                thumbnail: data.thumb || '',
                duration: data.duration || 0,
                audio: data.download,
                lyrics
            }
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.message || error.response?.data?.error || error.message || 'Error al obtener datos de YouTube'
        };
    }
}


function buildPlayerHtml({ title, channel, totalSec, poster, audioDataUri, bitrate, isTrimmed, lyrics }) {
    let lines = parseLrc(lyrics?.lyrics);
    if (isTrimmed) lines = lines.filter(l => l.t <= totalSec);
    lines = lines.slice(0, 200);

    const cfg = {
        title,
        channel,
        total: totalSec,
        audio: audioDataUri,
        volume: 0.8,
        icons: ICONS
    };

    const lyricSub = `${lyrics?.title || title} - ${lyrics?.artist || channel}`;
    const badge = isTrimmed ? `Trim ${fmtTime(totalSec)}` : bitrate ? `Opus ${bitrate}` : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} - Reproductor</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
body{margin:0;background:#08090d;font-family:Arial,Helvetica,sans-serif;color:#fff}
input[type=range]{width:100%;height:4px;accent-color:#fff;cursor:pointer}
button{font-family:inherit;color:inherit}
svg{display:block}
.player-wrap{width:100%;max-width:440px;margin:auto;padding:12px}
.player{border:1px solid rgba(255,255,255,.12);border-radius:20px;overflow:hidden}
.content{padding:18px}
.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px}
.top-title{font-size:13px;font-weight:700;letter-spacing:.8px;opacity:.85}
.top-sub{font-size:10px;opacity:.5;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px}
.icon-btn{width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.08);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;cursor:pointer}
.icon-btn svg{width:17px;height:17px}
.cover{position:relative;width:100%;aspect-ratio:16/9;border-radius:15px;overflow:hidden;background:rgba(255,255,255,.05)}
.cover img{width:100%;height:100%;object-fit:cover;display:block}
.big-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transition:opacity .2s}
.big-btn{width:64px;height:64px;border:0;border-radius:50%;background:#fff;color:#08090d;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35)}
.big-btn svg{width:26px;height:26px}
.playing .big-play{opacity:0;pointer-events:none}
.info{padding-top:15px}
.song-title{font-size:19px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.artist{font-size:13px;opacity:.6;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.progress{margin-top:18px}
.times{display:flex;justify-content:space-between;font-size:10px;opacity:.55;margin-top:7px}
.controls{display:flex;align-items:center;justify-content:center;gap:22px;margin-top:13px}
.side-btn{width:40px;height:40px;border:0;background:transparent;color:#fff;display:flex;align-items:center;justify-content:center;padding:0;opacity:.85;cursor:pointer}
.side-btn svg{width:24px;height:24px}
.main-btn{width:46px;height:46px}
.main-btn svg{width:28px;height:28px}
.side-btn:disabled,.big-btn:disabled{opacity:.4;cursor:not-allowed}
.bottom{display:flex;align-items:center;justify-content:space-between;margin-top:15px;gap:12px}
.volume{width:110px}
.lyrics-wrap{margin-top:12px;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:14px;overflow:hidden}
.lyrics-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.lyrics-title{font-size:12px;font-weight:700;letter-spacing:.8px;opacity:.9}
.lyrics-sub{font-size:10px;opacity:.5;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px}
.lyrics-status{font-size:9px;font-weight:700;padding:4px 8px;border-radius:20px;background:rgba(255,255,255,.08);opacity:.7;white-space:nowrap}
.lyrics-box{position:relative;height:245px;overflow-y:auto;padding:112px 4px;margin-top:8px;scrollbar-width:none}
.lyrics-box::-webkit-scrollbar{display:none}
.lyric-line{font-size:15px;line-height:1.5;font-weight:600;opacity:.32;padding:8px 9px;margin:2px 0;border-radius:9px;transition:opacity .25s,background .25s,font-size .25s;cursor:pointer}
.lyric-line.active{opacity:1;background:rgba(255,255,255,.08);font-size:17px}
.lyric-line.past{opacity:.48}
.lyrics-empty{height:180px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;opacity:.45;padding:20px}
</style>
</head>
<body>
<div class="player-wrap">
<div class="player"><div class="content">

<div class="top">
  <div>
    <div class="top-title" id="status">CARGANDO AUDIO</div>
    <div class="top-sub">${esc(title)}${badge ? ' | ' + esc(badge) : ''}</div>
  </div>
  <button class="icon-btn" id="muteBtn" type="button">${ICONS.volume}</button>
</div>

<div class="cover" id="cover">
  ${poster ? `<img src="${poster}" alt="">` : ''}
  <div class="big-play">
    <button class="big-btn" id="bigBtn" type="button" disabled>${ICONS.play}</button>
  </div>
</div>

<div class="info">
  <div class="song-title">${esc(title)}</div>
  <div class="artist">${esc(channel)}</div>
</div>

<div class="progress">
  <input id="bar" type="range" min="0" max="${totalSec || 100}" value="0" step="0.1">
  <div class="times"><span id="ct">0:00</span><span id="dur">${fmtTime(totalSec)}</span></div>
</div>

<div class="controls">
  <button class="side-btn" id="rw" type="button" disabled>${ICONS.back}</button>
  <button class="side-btn main-btn" id="pp" type="button" disabled>${ICONS.play}</button>
  <button class="side-btn" id="ff" type="button" disabled>${ICONS.fwd}</button>
</div>

<div class="bottom">
  <button class="icon-btn" id="loopBtn" type="button" style="opacity:.55">${ICONS.loop}</button>
  <input class="volume" id="vol" type="range" min="0" max="1" step="0.01" value="0.8">
</div>

</div></div>

<div class="lyrics-wrap">
  <div class="lyrics-head">
    <div>
      <div class="lyrics-title">LETRAS</div>
      <div class="lyrics-sub">${esc(lyricSub)}</div>
    </div>
    <div class="lyrics-status" id="lyStatus">${lines.length ? 'SYNC' : 'SIN LETRAS'}</div>
  </div>
  <div class="lyrics-box" id="lyBox"></div>
</div>
</div>

<script>
(function(){
var C=${jsonForScript(cfg)};
var L=${jsonForScript(lines)};
var IC=C.icons;

var $=function(i){return document.getElementById(i)};
var cover=$('cover'),statusEl=$('status'),bar=$('bar'),ct=$('ct'),dur=$('dur');
var pp=$('pp'),bigBtn=$('bigBtn'),rw=$('rw'),ff=$('ff');
var muteBtn=$('muteBtn'),loopBtn=$('loopBtn'),vol=$('vol');
var lyBox=$('lyBox');

var ctx=null,gain=null,buffer=null,src=null;
var playing=false,startCtxTime=0,pauseOffset=0,pos=0;
var seeking=false,loop=false,muted=false,lastIdx=-2,rows=[];

function fmt(s){s=Math.max(0,Math.floor(s||0));var m=Math.floor(s/60),r=s%60;return m+':'+(r<10?'0':'')+r}

function ensureCtx(){
  if(ctx)return ctx;
  var Ctor=window.AudioContext||window.webkitAudioContext;
  if(!Ctor){statusEl.textContent='WEB AUDIO NO SOPORTADO';return null}
  ctx=new Ctor();
  gain=ctx.createGain();
  gain.gain.value=C.volume;
  gain.connect(ctx.destination);
  return ctx;
}

function dataUriToBuffer(uri){
  var i=uri.indexOf(',');
  var bin=atob(i>=0?uri.slice(i+1):uri);
  var bytes=new Uint8Array(bin.length);
  for(var k=0;k<bin.length;k++)bytes[k]=bin.charCodeAt(k);
  return bytes.buffer;
}

function decode(){
  return new Promise(function(resolve,reject){
    var done=false;
    try{
      var p=ctx.decodeAudioData(dataUriToBuffer(C.audio),
        function(b){if(!done){done=true;resolve(b)}},
        function(e){if(!done){done=true;reject(e||new Error('decode error'))}}
      );
      if(p&&p.then)p.then(function(b){if(!done){done=true;resolve(b)}},function(){});
    }catch(e){reject(e)}
  });
}

function setUI(){
  pp.innerHTML=playing?IC.pause:IC.play;
  bigBtn.innerHTML=playing?IC.pause:IC.play;
  cover.classList.toggle('playing',playing);
}

function stopSrc(){
  if(src){
    try{src.onended=null;src.stop()}catch(e){}
    try{src.disconnect()}catch(e){}
    src=null;
  }
}

function startAt(off){
  stopSrc();
  src=ctx.createBufferSource();
  src.buffer=buffer;
  src.connect(gain);
  var o=Math.max(0,Math.min(off,buffer.duration-0.1));
  src.start(0,o);
  startCtxTime=ctx.currentTime-o;
  pauseOffset=o;
  playing=true;
  setUI();
}

function seekTo(t){
  if(!buffer)return;
  t=Math.max(0,Math.min(buffer.duration,t));
  if(playing)startAt(t);
  else{pauseOffset=t;pos=t}
  lastIdx=-2;
  render();
}

async function toggle(){
  if(!buffer)return;
  var c=ensureCtx();
  if(!c)return;
  if(c.state==='suspended')await c.resume();
  if(playing){
    pauseOffset=ctx.currentTime-startCtxTime;
    stopSrc();
    playing=false;
    setUI();
  }else{
    if(pauseOffset>=buffer.duration-0.2)pauseOffset=0;
    startAt(pauseOffset);
  }
}

function buildLyrics(){
  lyBox.innerHTML='';
  if(!L.length){
    lyBox.style.padding='0 4px';
    var e=document.createElement('div');
    e.className='lyrics-empty';
    e.textContent='No se encontraron letras sincronizadas para esta canción.';
    lyBox.appendChild(e);
    return;
  }
  L.forEach(function(l){
    var d=document.createElement('div');
    d.className='lyric-line';
    d.textContent=l.x;
    d.onclick=function(){
      seekTo(l.t);
      if(!playing)toggle();
    };
    lyBox.appendChild(d);
    rows.push(d);
  });
}

function idxAt(t){
  var i=-1;
  for(var k=0;k<L.length;k++){if(L[k].t<=t+0.05)i=k;else break}
  return i;
}

function render(){
  var t=playing?Math.max(0,ctx.currentTime-startCtxTime):pauseOffset;
  pos=t;
  bar.value=t;
  ct.textContent=fmt(t);
  var i=idxAt(t);
  if(i!==lastIdx){
    if(rows[lastIdx])rows[lastIdx].classList.remove('active');
    if(rows[i]){
      rows[i].classList.add('active');
      rows[i].scrollIntoView({block:'center',behavior:'smooth'});
    }
    lastIdx=i;
  }
  for(var k=0;k<rows.length;k++){
    if(k<i)rows[k].classList.add('past');
    else rows[k].classList.remove('past');
  }
}

function tick(){
  if(playing){
    render();
    if(pos>=buffer.duration-0.1){
      if(loop){pauseOffset=0;startAt(0)}
      else{stopSrc();playing=false;setUI();render()}
    }
  }
  requestAnimationFrame(tick);
}

async function init(){
  var c=ensureCtx();
  if(!c)return;
  statusEl.textContent='DECODIFICANDO';
  try{
    buffer=await decode();
    statusEl.textContent='LISTO';
    pp.disabled=false;
    bigBtn.disabled=false;
    rw.disabled=false;
    ff.disabled=false;
    buildLyrics();
    tick();
  }catch(e){
    statusEl.textContent='ERROR: '+e.message;
  }
}

pp.onclick=toggle;
bigBtn.onclick=toggle;
rw.onclick=function(){seekTo(Math.max(0,pos-10))};
ff.onclick=function(){seekTo(Math.min(buffer?buffer.duration:0,pos+10))};
bar.oninput=function(){seekTo(Number(bar.value))};
vol.oninput=function(){if(gain)gain.gain.value=Number(vol.value)};
muteBtn.onclick=function(){
  muted=!muted;
  if(gain)gain.gain.value=muted?0:Number(vol.value);
  muteBtn.innerHTML=muted?IC.mute:IC.volume;
};
loopBtn.onclick=function(){
  loop=!loop;
  loopBtn.style.opacity=loop?'1':'.55';
};

init();
})();
</script>
</body>
</html>`;
}

export default {
    nombre: 'letra',
    categoria: 'Downloader',
    alias: ['lyrics', 'letras', 'karaoke', 'reproductor'],
    descripcion: 'Reproductor de YouTube con letras sincronizadas',
    uso: '.letra <nombre de canción>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const query = String(argumento || '').trim();

        if (!query) {
            return await responder.texto(
                '╭━━〔 🎵 𝐋𝐄𝐓𝐑𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre de la\n' +
                '┃    canción que buscas\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ .letra shape of you\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        try {
            const result = await YouTubeplay(query);

            if (!result.success) {
                throw new Error(result.message);
            }

            const { title, channel, thumbnail, duration, audio, lyrics } = result.result;

            await responder.texto(
                '╭━━〔  𝐏𝐑𝐎𝐂𝐄𝐒𝐍𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎵 *' + title + '*\n' +
                '┃ 👤 ' + channel + '\n' +
                '┃ ⏱️ ' + fmtTime(duration) + '\n' +
                '┃\n' +
                '┃ 📥 Descargando y comprimiendo\n' +
                '┃    audio para reproductor...\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );

            const audioBuffer = await downloadAudio(audio);
            const compressed = await compressWithFallback(audioBuffer, duration);

            const isTrimmed = compressed.trimSec > 0;
            const totalSec = isTrimmed ? compressed.trimSec : duration;

            const audioDataUri = `data:${OPUS_MIME};base64,${compressed.buf.toString('base64')}`;

            const html = buildPlayerHtml({
                title,
                channel,
                totalSec,
                poster: thumbnail,
                audioDataUri,
                bitrate: compressed.bitrate,
                isTrimmed,
                lyrics
            });

            const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}.html`;
            const tempPath = path.join(os.tmpdir(), fileName);
            await fs.writeFile(tempPath, html);

            await sock.sendMessage(jid, {
                document: { url: tempPath },
                mimetype: 'text/html',
                fileName: fileName,
                caption: '🎵 *' + title + '*\n\n📱 Abre este archivo en tu navegador para ver el reproductor con letras sincronizadas'
            }, { quoted: msg });

            try {
                await fs.unlink(tempPath);
            } catch {}

            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error('[LETRA] Error:', error?.message || error);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 Intenta con otro nombre\n' +
                '┃    de canción\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};