// commands/fun/runner.js
import { enviarHtmlInteractivo } from '../../lib/htmlInteractivo.js';

export default {
    nombre: 'runner',
    categoria: 'Juegos',
    alias: ['correr', 'esquivar', 'lane'],
    descripcion: 'Runner de 3 carriles: esquiva obstáculos y junta monedas',
    uso: '.runner',
    ejecutar: async ({ msg, responder, sock }) => {
        try {
            const from = msg.key.remoteJid;

            const htmlPayload = `<style>
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; margin: 0; padding: 0; }
body { margin: 0; background: transparent; font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #eee; }
.rn-wrap { width: 100%; max-width: 540px; margin: auto; padding: 12px; }
.rn-card { background: rgba(15,18,28,.95); border: 1px solid rgba(0,243,255,.25); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,243,255,.12); }
.rn-header { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.08); display: flex; justify-content: space-between; align-items: center; }
.rn-title { font-size: 19px; font-weight: 900; color: #fff; text-shadow: 0 0 10px rgba(0,243,255,.6); letter-spacing: 1px; }
.rn-sub { font-size: 10px; letter-spacing: 2px; color: #00f3ff; font-weight: 700; text-transform: uppercase; }
.rn-body { padding: 14px; text-align: center; }
.rn-score { display: flex; justify-content: space-around; margin-bottom: 10px; }
.rn-box { background: #1e293b; padding: 6px 14px; border-radius: 10px; }
.rn-box h3 { margin: 0; font-size: 11px; color: #00f3ff; letter-spacing: 1px; }
.rn-box h1 { margin: 2px 0 0; font-size: 20px; font-family: 'Courier New', monospace; }
#rnCanvas { background: #0b1120; border-radius: 10px; border: 1px solid #334155; touch-action: none; max-width: 100%; display: block; margin: 0 auto; }
.rn-ctrl { display: flex; gap: 10px; justify-content: center; margin-top: 10px; }
.rn-btn { border: 0; border-radius: 12px; background: #1e293b; color: #00f3ff; font-size: 20px; font-weight: 800; cursor: pointer; padding: 10px 30px; }
.rn-btn:active { background: #00f3ff; color: #0b1120; }
#rnStatus { margin: 10px 0 0; font-size: 14px; font-weight: 700; color: #8fc7ff; min-height: 18px; }
#rnNew { display: none; margin: 8px auto 0; padding: 10px 22px; border: 0; border-radius: 10px; background: #22c55e; color: #fff; font-size: 15px; font-weight: 800; cursor: pointer; }
</style>
<div class="rn-wrap">
  <div class="rn-card">
    <div class="rn-header">
      <div><div class="rn-sub">NEON RUNNER</div><div class="rn-title">🏃 Runner</div></div>
      <div style="width:8px;height:8px;background:#00ff87;border-radius:50%;box-shadow:0 0 8px #00ff87"></div>
    </div>
    <div class="rn-body">
      <div class="rn-score">
        <div class="rn-box"><h3>PUNTOS</h3><h1 id="rnScore">0</h1></div>
        <div class="rn-box"><h3>MONEDAS</h3><h1 id="rnCoins">0</h1></div>
        <div class="rn-box"><h3>RÉCORD</h3><h1 id="rnBest">0</h1></div>
      </div>
      <canvas id="rnCanvas" width="270" height="360"></canvas>
      <div class="rn-ctrl">
        <button class="rn-btn" id="rnLeft">◀</button>
        <button class="rn-btn" id="rnRight">▶</button>
      </div>
      <p id="rnStatus">Desliza o usa ◀ ▶ para cambiar de carril</p>
      <button id="rnNew">🔄 Nuevo juego</button>
    </div>
  </div>
</div>
<script>
(function(){
var cv = document.getElementById('rnCanvas'), ctx = cv.getContext('2d');
var W = cv.width, H = cv.height, LANES = [45, 135, 225];
var scoreEl = document.getElementById('rnScore'), coinsEl = document.getElementById('rnCoins'), bestEl = document.getElementById('rnBest');
var statusEl = document.getElementById('rnStatus'), newBtn = document.getElementById('rnNew');
var leftBtn = document.getElementById('rnLeft'), rightBtn = document.getElementById('rnRight');
var lane = 1, px = LANES[1] - 20, py = 300, pw = 40, ph = 46;
var items = [], speed = 220, score = 0, coins = 0, best = 0, lineOff = 0, spawnT = 1.0, state = 'ready', time = 0, lastScore = -1;
function reset(){ items.length = 0; speed = 220; score = 0; coins = 0; lineOff = 0; spawnT = 0.9; time = 0; lastScore = -1; lane = 1; px = LANES[1] - 20; state = 'run'; scoreEl.textContent = '0'; coinsEl.textContent = '0'; statusEl.textContent = '¡Esquiva y junta monedas!'; newBtn.style.display = 'none'; }
function move(d){ if(state === 'over'){ return; } if(state === 'ready'){ state = 'run'; } lane = Math.max(0, Math.min(2, lane + d)); }
function spawn(){ var lanesShuf = [0, 1, 2]; for(var i = 2; i > 0; i--){ var r = Math.floor(Math.random() * (i + 1)); var t = lanesShuf[i]; lanesShuf[i] = lanesShuf[r]; lanesShuf[r] = t; }
  var nObs = Math.random() < 0.35 ? 2 : 1;
  for(var j = 0; j < nObs; j++){ items.push({ t: 'o', lane: lanesShuf[j], x: LANES[lanesShuf[j]] - 25, y: -40, w: 50, h: 34 }); }
  if(Math.random() < 0.65){ var cl = lanesShuf[nObs]; items.push({ t: 'c', lane: cl, x: LANES[cl] - 10, y: -90, w: 20, h: 20 }); }
}
function update(dt){ time += dt; speed = Math.min(520, speed + 10 * dt); lineOff = (lineOff + speed * dt) % 60;
  spawnT -= dt; if(spawnT <= 0){ spawn(); spawnT = 0.5 + Math.random() * 0.6 * (260 / speed) + 0.3; }
  px += (LANES[lane] - pw / 2 - px) * Math.min(1, dt * 14);
  var wI = 0;
  for(var i = 0; i < items.length; i++){ var o = items[i]; o.y += speed * dt;
    if(o.y > H + 50){ continue; }
    if(o.t === 'c'){ var cx = o.x + 10, cy = o.y + 10; if(cx > px && cx < px + pw && cy > py && cy < py + ph){ coins++; coinsEl.textContent = coins; score += 10; continue; } }
    else { var ox = o.x + 5, oy = o.y + 4, ow = o.w - 10, oh = o.h - 8; if(px + 5 < ox + ow && px + pw - 5 > ox && py + 5 < oy + oh && py + ph - 5 > oy){ gameOver(); } }
    items[wI++] = o; }
  items.length = wI;
  score += speed * dt * 0.04; var sc = Math.floor(score); if(sc !== lastScore){ lastScore = sc; scoreEl.textContent = sc; }
}
function gameOver(){ state = 'over'; var fin = Math.floor(score) + coins * 10; if(fin > best){ best = fin; bestEl.textContent = fin; } statusEl.textContent = '💀 Game Over • Puntos: ' + fin + ' • Toca para reiniciar'; newBtn.style.display = 'block'; }
function draw(){ ctx.fillStyle = '#0b1120'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1e293b';
  for(var y = -60 + lineOff; y < H; y += 60){ ctx.fillRect(89, y, 2, 26); ctx.fillRect(179, y, 2, 26); }
  ctx.fillStyle = '#16233a'; ctx.fillRect(0, 0, 4, H); ctx.fillRect(W - 4, 0, 4, H);
  for(var i = 0; i < items.length; i++){ var o = items[i];
    if(o.t === 'o'){ ctx.fillStyle = '#ff4757'; ctx.fillRect(o.x, o.y, o.w, o.h); ctx.fillStyle = '#7a1f28'; ctx.fillRect(o.x + 6, o.y + 8, o.w - 12, 5); ctx.fillRect(o.x + 6, o.y + 20, o.w - 12, 5); }
    else { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(o.x + 10, o.y + 10, 9, 0, 6.2832); ctx.fill(); ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.arc(o.x + 10, o.y + 10, 5, 0, 6.2832); ctx.fill(); } }
  ctx.fillStyle = 'rgba(0,243,255,.25)'; ctx.fillRect(px + 6, py + ph - 4, pw - 12, 14);
  ctx.fillStyle = 'rgba(0,243,255,.12)'; ctx.fillRect(px + 10, py + ph + 6, pw - 20, 12);
  ctx.fillStyle = '#00f3ff'; ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = '#0b1120'; ctx.fillRect(px + 8, py + 8, pw - 16, 10);
  ctx.fillStyle = '#fff'; ctx.fillRect(px + 12, py + 11, 6, 4); ctx.fillRect(px + 22, py + 11, 6, 4);
}
var last = performance.now();
function frame(now){ var dt = (now - last) / 1000; last = now; if(dt > 0.05){ dt = 0.05; } if(state === 'run'){ update(dt); } draw(); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', function(){ last = performance.now(); });
var tx = null;
cv.addEventListener('touchstart', function(e){ if(state === 'over'){ reset(); return; } if(state === 'ready'){ state = 'run'; } tx = e.touches[0].clientX; e.preventDefault(); }, { passive: false });
cv.addEventListener('touchend', function(e){ if(tx === null){ return; } var dx = e.changedTouches[0].clientX - tx; if(Math.abs(dx) > 24){ move(dx > 0 ? 1 : -1); } tx = null; e.preventDefault(); }, { passive: false });
cv.addEventListener('mousedown', function(){ if(state === 'over'){ reset(); } });
leftBtn.addEventListener('touchstart', function(e){ e.preventDefault(); move(-1); }, { passive: false });
leftBtn.addEventListener('click', function(){ move(-1); });
rightBtn.addEventListener('touchstart', function(e){ e.preventDefault(); move(1); }, { passive: false });
rightBtn.addEventListener('click', function(){ move(1); });
newBtn.addEventListener('click', function(){ reset(); });
document.addEventListener('keydown', function(e){ if(e.key === 'ArrowLeft'){ move(-1); } if(e.key === 'ArrowRight'){ move(1); } });
})();
</script>`;

            await enviarHtmlInteractivo(sock, from, htmlPayload, '@RUNNER', 'runner');
        } catch (error) {
            console.error('[RUNNER] Error:', error);
            await responder.texto('❌ Error al iniciar el juego.');
        }
    }
};