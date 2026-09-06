// commands/utils/reloj.js
import { enviarHtmlInteractivo } from '../../lib/htmlInteractivo.js';

export default {
    nombre: 'reloj',
    categoria: 'Utilidades',
    alias: ['clock', 'hora', 'time'],
    descripcion: 'Reloj analógico y digital en vivo dentro del chat',
    uso: '.reloj',
    ejecutar: async ({ msg, responder, sock }) => {
        try {
            const from = msg.key.remoteJid;

            const htmlPayload = `<style>
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; margin: 0; padding: 0; }
body { margin: 0; background: transparent; font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #eee; }
.rl-wrap { width: 100%; max-width: 540px; margin: auto; padding: 12px; }
.rl-card { background: rgba(15,18,28,.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(0,243,255,.25); border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,243,255,.15), 0 0 20px rgba(157,78,221,.2); }
.rl-header { padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,.08); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(90deg, rgba(0,243,255,.05), rgba(157,78,221,.05)); }
.rl-title { font-size: 19px; font-weight: 900; color: #fff; text-shadow: 0 0 10px rgba(0,243,255,.6); letter-spacing: 1px; }
.rl-sub { font-size: 10px; letter-spacing: 2px; color: #00f3ff; font-weight: 700; text-transform: uppercase; }
.rl-body { padding: 24px 18px; text-align: center; }
.rl-clock { position: relative; width: 220px; height: 220px; border-radius: 50%; margin: 0 auto 18px; background: radial-gradient(circle at 50% 50%, #1a2238 0%, #0b1120 70%); border: 3px solid rgba(0,243,255,.4); box-shadow: inset 0 0 30px rgba(0,243,255,.15), 0 0 25px rgba(0,243,255,.3); }
.rl-clock::before { content: ''; position: absolute; width: 14px; height: 14px; background: #fff; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 10; box-shadow: 0 0 10px #00f3ff; }
.rl-num { position: absolute; top: 50%; left: 50%; transform-origin: 0 50%; font-weight: 800; font-size: 14px; color: #00f3ff; text-shadow: 0 0 6px rgba(0,243,255,.6); width: 100px; }
.rl-num span { display: inline-block; transform: translateX(-50%); }
.rl-hand { position: absolute; bottom: 50%; left: 50%; transform-origin: 50% 100%; border-radius: 8px; transition: transform .2s cubic-bezier(.4,2,.6,1); }
.rl-hand-h { width: 4px; height: 55px; background: #fff; margin-left: -2px; box-shadow: 0 0 8px rgba(255,255,255,.6); }
.rl-hand-m { width: 3px; height: 80px; background: #a5b4fc; margin-left: -1.5px; box-shadow: 0 0 8px rgba(165,180,252,.6); }
.rl-hand-s { width: 2px; height: 95px; background: #ff4757; margin-left: -1px; box-shadow: 0 0 10px #ff4757; }
.rl-digital { font-family: 'Courier New', monospace; font-size: 44px; font-weight: 900; letter-spacing: 2px; color: #fff; text-shadow: 0 0 14px rgba(0,243,255,.8), 0 0 28px rgba(0,243,255,.4); margin-bottom: 10px; }
.rl-ampm { display: inline-block; font-size: 14px; font-weight: 800; color: #00f3ff; margin-left: 8px; letter-spacing: 2px; }
.rl-date { font-size: 15px; color: #c7cfdd; letter-spacing: 1px; margin-top: 4px; text-transform: capitalize; }
.rl-date b { color: #fff; }
.rl-tz { margin-top: 10px; font-size: 11px; color: #8fc7ff; letter-spacing: 2px; text-transform: uppercase; }
@keyframes rlPulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
.rl-dot { display: inline-block; width: 8px; height: 8px; background: #00ff87; border-radius: 50%; box-shadow: 0 0 8px #00ff87; animation: rlPulse 1.5s infinite; margin-right: 8px; vertical-align: middle; }
</style>
<div class="rl-wrap">
  <div class="rl-card">
    <div class="rl-header">
      <div><div class="rl-sub">ALEX BOT</div><div class="rl-title">⏰ Reloj</div></div>
      <span class="rl-dot"></span>
    </div>
    <div class="rl-body">
      <div class="rl-clock" id="rlClock">
        <div class="rl-hand rl-hand-h" id="rlH"></div>
        <div class="rl-hand rl-hand-m" id="rlM"></div>
        <div class="rl-hand rl-hand-s" id="rlS"></div>
      </div>
      <div class="rl-digital" id="rlDigi">--:--:--<span class="rl-ampm">--</span></div>
      <div class="rl-date" id="rlDate">Cargando...</div>
      <div class="rl-tz" id="rlTz">Zona horaria</div>
    </div>
  </div>
</div>
<script>
(function(){
const clock = document.getElementById('rlClock');
const handH = document.getElementById('rlH');
const handM = document.getElementById('rlM');
const handS = document.getElementById('rlS');
const digi = document.getElementById('rlDigi');
const dateEl = document.getElementById('rlDate');
const tzEl = document.getElementById('rlTz');
const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
// Colocar números del 1 al 12
for (let i = 1; i <= 12; i++) {
  const angle = i * 30;
  const div = document.createElement('div');
  div.className = 'rl-num';
  div.style.transform = 'rotate(' + angle + 'deg)';
  div.innerHTML = '<span style="transform: translateX(-50%) rotate(-' + angle + 'deg)">' + i + '</span>';
  clock.appendChild(div);
}
function pad(n){ return n < 10 ? '0' + n : '' + n; }
function tick(){
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ms = now.getMilliseconds();
  const sDeg = (s + ms/1000) * 6;
  const mDeg = (m + s/60) * 6;
  const hDeg = ((h % 12) + m/60) * 30;
  handH.style.transform = 'rotate(' + hDeg + 'deg)';
  handM.style.transform = 'rotate(' + mDeg + 'deg)';
  handS.style.transform = 'rotate(' + sDeg + 'deg)';
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  digi.innerHTML = pad(h12) + ':' + pad(m) + ':' + pad(s) + '<span class="rl-ampm">' + ampm + '</span>';
  dateEl.innerHTML = dias[now.getDay()] + ', <b>' + now.getDate() + '</b> de <b>' + meses[now.getMonth()] + '</b> ' + now.getFullYear();
}
try { tzEl.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e){}
tick();
setInterval(tick, 1000);
})();
</script>`;

            await enviarHtmlInteractivo(sock, from, htmlPayload, '@RELOJ', 'reloj');
        } catch (error) {
            console.error('[RELOJ] Error:', error);
            await responder.texto('❌ Error al abrir el reloj.');
        }
    }
};