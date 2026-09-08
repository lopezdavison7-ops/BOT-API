// commands/system/ping2.js — ⚡ Panel de diagnóstico bonito en HTML
import fs from 'fs';
import path from 'path';
import os from 'os';
import { enviarHtmlInteractivo } from '../../lib/htmlInteractivo.js';

function fmtDur(s) {
    s = Math.floor(s);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (d) return d + 'd ' + h + 'h ' + m + 'm';
    if (h) return h + 'h ' + m + 'm ' + sec + 's';
    return m + 'm ' + sec + 's';
}
function fmtBytes(b) {
    if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
    if (b >= 1048576) return (b / 1048576).toFixed(0) + ' MB';
    return (b / 1024).toFixed(0) + ' KB';
}
function contarComandos(dir) {
    let n = 0;
    try {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            if (e.isDirectory()) n += contarComandos(path.join(dir, e.name));
            else if (e.name.endsWith('.js')) n++;
        }
    } catch (e) {}
    return n;
}

export default {
    nombre: 'ping2',
    categoria: 'System',
    alias: ['latencia', 'status', 'diagnostico'],
    descripcion: 'Panel de diagnóstico completo del bot en HTML',
    uso: '.ping2',
    ejecutar: async ({ sock, msg, responder }) => {
        try {
            const from = msg.key.remoteJid;
            const tInicio = Date.now();

            // Latencia desde que llegó el mensaje hasta que empieza a procesar
            const tsMsg = Number(msg.messageTimestamp || 0) * 1000;
            const latRecv = tsMsg > 0 ? Math.max(0, tInicio - tsMsg) : 0;

            // Stats del servidor
            const mem = process.memoryUsage();
            const ramTotal = os.totalmem();
            const ramUsada = ramTotal - os.freeem();
            const ramPct = Math.min(100, Math.round((ramUsada / ramTotal) * 100));
            const cpus = os.cpus().length;
            const cpuPct = Math.min(100, Math.round((os.loadavg()[0] / cpus) * 100));
            let usuarios = 0;
            try { usuarios = Object.keys(JSON.parse(fs.readFileSync(path.join(process.cwd(), 'database', 'economia.json'), 'utf8'))).length; } catch (e) {}
            const cmds = contarComandos(path.join(process.cwd(), 'commands'));
            let ws = '🟡 N/D';
            try {
                const r = sock && sock.ws ? sock.ws.readyState : -1;
                ws = r === 1 ? '🟢 Conectado' : (r === 3 ? '🔴 Cerrado' : '🟡 Estado ' + r);
            } catch (e) {}
            const ahora = new Date();
            const hora = ahora.toLocaleString('es-MX', { hour12: false });

            const proc = Date.now() - tInicio;
            const ping = latRecv + proc;
            const color = ping < 300 ? '#22c55e' : (ping < 800 ? '#eab308' : '#ef4444');
            const calidad = ping < 300 ? 'EXCELENTE' : (ping < 800 ? 'ESTABLE' : 'SATURADO');

            const htmlPayload = `<style>
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; margin: 0; padding: 0; }
body { margin: 0; background: transparent; font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #eee; }
.p2-wrap { width: 100%; max-width: 540px; margin: auto; padding: 12px; }
.p2-card { background: rgba(15,18,28,.95); border: 1px solid rgba(0,243,255,.25); border-radius: 18px; overflow: hidden; }
.p2-header { padding: 14px 16px; background: linear-gradient(90deg, rgba(0,243,255,.08), rgba(157,78,221,.08)); border-bottom: 1px solid rgba(255,255,255,.08); display: flex; justify-content: space-between; align-items: center; }
.p2-title { font-size: 19px; font-weight: 900; color: #fff; letter-spacing: 1px; }
.p2-sub { font-size: 10px; letter-spacing: 2px; color: #00f3ff; font-weight: 700; text-transform: uppercase; }
.p2-body { padding: 16px; text-align: center; }
#p2Gauge { display: block; margin: 0 auto; }
#p2Ping { font-family: 'Courier New', monospace; font-size: 46px; font-weight: 900; margin-top: -70px; min-height: 52px; }
#p2Cal { display: inline-block; padding: 4px 14px; border-radius: 14px; font-size: 11px; font-weight: 900; letter-spacing: 2px; margin-bottom: 10px; }
.p2-bars { margin: 8px 0 12px; }
.p2-bar-row { display: flex; align-items: center; gap: 8px; margin: 6px 0; font-size: 11px; font-weight: 700; color: #94a3b8; }
.p2-bar-row b { width: 62px; text-align: left; color: #e2e8f0; }
.p2-bar-row span { width: 74px; text-align: right; font-family: monospace; }
.p2-track { flex: 1; height: 8px; background: #1e293b; border-radius: 6px; overflow: hidden; }
.p2-fill { height: 100%; width: 0%; border-radius: 6px; transition: width 1.2s cubic-bezier(.2,.8,.2,1); }
#p2RamFill { background: linear-gradient(90deg, #00f3ff, #7b3cff); }
#p2CpuFill { background: linear-gradient(90deg, #22c55e, #eab308); }
.p2-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
.p2-chip { background: #16233a; border-radius: 10px; padding: 8px 6px; text-align: center; }
.p2-chip small { display: block; font-size: 9px; letter-spacing: 1.2px; color: #64748b; font-weight: 800; }
.p2-chip b { font-size: 12px; color: #e2e8f0; font-family: monospace; }
.p2-foot { margin-top: 10px; font-size: 10px; color: #475569; letter-spacing: 1px; }
@keyframes p2Pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
</style>
<div class="p2-wrap">
  <div class="p2-card">
    <div class="p2-header">
      <div><div class="p2-sub">DIAGNÓSTICO EN VIVO</div><div class="p2-title">⚡ PING² · BOT-API</div></div>
      <div style="width:9px;height:9px;background:${color};border-radius:50%;box-shadow:0 0 10px ${color};animation:p2Pulse 1.4s infinite"></div>
    </div>
    <div class="p2-body">
      <canvas id="p2Gauge" width="260" height="140"></canvas>
      <div id="p2Ping" style="color:${color};text-shadow:0 0 20px ${color}">0 ms</div>
      <div id="p2Cal" style="background:${color}22;color:${color}">${calidad}</div>
      <div class="p2-bars">
        <div class="p2-bar-row"><b>🧠 RAM</b><div class="p2-track"><div class="p2-fill" id="p2RamFill"></div></div><span id="p2RamTxt">—</span></div>
        <div class="p2-bar-row"><b>⚙️ CPU</b><div class="p2-track"><div class="p2-fill" id="p2CpuFill"></div></div><span id="p2CpuTxt">—</span></div>
      </div>
      <div class="p2-grid">
        <div class="p2-chip"><small>📨 RECEPCIÓN</small><b id="p2Recv">—</b></div>
        <div class="p2-chip"><small>⚙️ PROCESO</small><b id="p2Proc">—</b></div>
        <div class="p2-chip"><small>🖥 UPTIME BOT</small><b id="p2UpBot">—</b></div>
        <div class="p2-chip"><small>🌐 UPTIME SERVER</small><b id="p2UpOs">—</b></div>
        <div class="p2-chip"><small>👥 USUARIOS</small><b id="p2Users">—</b></div>
        <div class="p2-chip"><small>🎮 COMANDOS</small><b id="p2Cmds">—</b></div>
        <div class="p2-chip"><small>📡 SOCKET</small><b id="p2Ws">—</b></div>
        <div class="p2-chip"><small>📦 NODE</small><b id="p2Node">—</b></div>
        <div class="p2-chip"><small>🕒 HORA SERVER</small><b id="p2Hora">—</b></div>
        <div class="p2-chip"><small>🎬 FPS WEBVIEW</small><b id="p2Fps">—</b></div>
      </div>
      <div class="p2-foot" id="p2Foot"></div>
    </div>
  </div>
</div>
<script>
(function(){
var CFG = { ping: ${ping}, recv: ${latRecv}, proc: ${proc}, color: '${color}', ramPct: ${ramPct}, ramTxt: '${fmtBytes(mem.rss)} RSS', cpuPct: ${cpuPct}, upBot: '${fmtDur(process.uptime())}', upOs: '${fmtDur(os.uptime())}', users: ${usuarios}, cmds: ${cmds}, ws: '${ws}', node: '${process.version}', hora: '${hora}', plat: '${(os.platform() + ' ' + os.arch()).replace(/'/g, '')}' };
var cv = document.getElementById('p2Gauge'), ctx = cv.getContext('2d');
var pingEl = document.getElementById('p2Ping');
var W = cv.width, H = cv.height, CX = W / 2, CY = H - 10, R = 105;
function ang(v){ return Math.PI + (Math.min(v, 1000) / 1000) * Math.PI; }
function drawGauge(needle){
  ctx.clearRect(0, 0, W, H);
  var zones = [[0, 300, '#22c55e'], [300, 800, '#eab308'], [800, 1000, '#ef4444']];
  for (var i = 0; i < zones.length; i++){
    ctx.beginPath();
    ctx.strokeStyle = zones[i][2]; ctx.globalAlpha = 0.25; ctx.lineWidth = 14;
    ctx.arc(CX, CY, R, ang(zones[i][0]), ang(zones[i][1]));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.strokeStyle = CFG.color; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.arc(CX, CY, R, Math.PI, ang(needle));
  ctx.stroke();
  var a = ang(needle) - Math.PI / 2;
  ctx.beginPath();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.moveTo(CX, CY);
  ctx.lineTo(CX + Math.cos(a) * (R - 18), CY + Math.sin(a) * (R - 18));
  ctx.stroke();
  ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(CX, CY, 5, 0, 6.2832); ctx.fill();
}
var t0 = performance.now(), start = null;
function ease(t){ return 1 - Math.pow(1 - t, 3); }
function anim(now){
  if (start === null) start = now;
  var k = Math.min(1, (now - start) / 1100);
  var v = CFG.ping * ease(k);
  drawGauge(v);
  pingEl.textContent = Math.round(v) + ' ms';
  if (k < 1) requestAnimationFrame(anim);
}
requestAnimationFrame(anim);
setTimeout(function(){
  document.getElementById('p2RamFill').style.width = CFG.ramPct + '%';
  document.getElementById('p2CpuFill').style.width = CFG.cpuPct + '%';
}, 150);
document.getElementById('p2RamTxt').textContent = CFG.ramTxt + ' · ' + CFG.ramPct + '%';
document.getElementById('p2CpuTxt').textContent = CFG.cpuPct + '% load';
document.getElementById('p2Recv').textContent = CFG.recv + ' ms';
document.getElementById('p2Proc').textContent = CFG.proc + ' ms';
document.getElementById('p2UpBot').textContent = CFG.upBot;
document.getElementById('p2UpOs').textContent = CFG.upOs;
document.getElementById('p2Users').textContent = CFG.users;
document.getElementById('p2Cmds').textContent = CFG.cmds;
document.getElementById('p2Ws').textContent = CFG.ws;
document.getElementById('p2Node').textContent = CFG.node;
document.getElementById('p2Hora').textContent = CFG.hora;
document.getElementById('p2Foot').textContent = '🖥 ' + CFG.plat + ' · render webview: ' + Math.round(performance.now() - t0) + ' ms';
var frames = 0, fpsStart = performance.now();
function fps(now){
  frames++;
  if (now - fpsStart < 1000) requestAnimationFrame(fps);
  else document.getElementById('p2Fps').textContent = Math.round(frames * 1000 / (now - fpsStart)) + ' fps';
}
requestAnimationFrame(fps);
})();
</script>`;

            await enviarHtmlInteractivo(sock, from, htmlPayload, '@PING2', 'ping2');
        } catch (error) {
            console.error('[PING2] Error:', error);
            await responder.texto('❌ Error al generar el diagnóstico.');
        }
    }
};