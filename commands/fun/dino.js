// commands/fun/dino.js
import { enviarHtmlInteractivo } from '../../lib/htmlInteractivo.js';

export default {
    nombre: 'dino',
    categoria: 'Juegos',
    alias: ['dinosaurio', 'trex', 'chrome'],
    descripcion: 'Juego del dinosaurio estilo Chrome, sin lag',
    uso: '.dino',
    ejecutar: async ({ msg, responder, sock }) => {
        try {
            const from = msg.key.remoteJid;

            const htmlPayload = `<style>
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; margin: 0; padding: 0; }
body { margin: 0; background: transparent; font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #eee; }
.dn-wrap { width: 100%; max-width: 540px; margin: auto; padding: 12px; }
.dn-card { background: rgba(15,18,28,.95); border: 1px solid rgba(0,255,135,.25); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,255,135,.12); }
.dn-header { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.08); display: flex; justify-content: space-between; align-items: center; }
.dn-title { font-size: 19px; font-weight: 900; color: #fff; text-shadow: 0 0 10px rgba(0,255,135,.6); letter-spacing: 1px; }
.dn-sub { font-size: 10px; letter-spacing: 2px; color: #00ff87; font-weight: 700; text-transform: uppercase; }
.dn-body { padding: 14px; text-align: center; }
.dn-score { display: flex; justify-content: space-around; margin-bottom: 10px; }
.dn-box { background: #1e293b; padding: 6px 18px; border-radius: 10px; }
.dn-box h3 { margin: 0; font-size: 11px; color: #00ff87; letter-spacing: 1px; }
.dn-box h1 { margin: 2px 0 0; font-size: 20px; font-family: 'Courier New', monospace; }
#dnCanvas { background: #0b1120; border-radius: 10px; border: 1px solid #334155; touch-action: none; max-width: 100%; display: block; margin: 0 auto; }
.dn-ctrl { display: flex; gap: 8px; justify-content: center; margin-top: 10px; }
.dn-btn { border: 0; border-radius: 12px; background: #1e293b; color: #00ff87; font-size: 15px; font-weight: 800; cursor: pointer; padding: 12px 22px; }
.dn-btn:active { background: #00ff87; color: #0b1120; }
#dnStatus { margin: 10px 0 0; font-size: 14px; font-weight: 700; color: #8fc7ff; min-height: 18px; }
#dnNew { display: none; margin: 8px auto 0; padding: 10px 22px; border: 0; border-radius: 10px; background: #22c55e; color: #fff; font-size: 15px; font-weight: 800; cursor: pointer; }
</style>
<div class="dn-wrap">
  <div class="dn-card">
    <div class="dn-header">
      <div><div class="dn-sub">DINO RUN</div><div class="dn-title">🦖 Dino</div></div>
      <div style="width:8px;height:8px;background:#00ff87;border-radius:50%;box-shadow:0 0 8px #00ff87"></div>
    </div>
    <div class="dn-body">
      <div class="dn-score">
        <div class="dn-box"><h3>PUNTOS</h3><h1 id="dnScore">0</h1></div>
        <div class="dn-box"><h3>RÉCORD</h3><h1 id="dnBest">0</h1></div>
      </div>
      <canvas id="dnCanvas" width="480" height="160"></canvas>
      <div class="dn-ctrl">
        <button class="dn-btn" id="dnJump">⬆ SALTAR</button>
        <button class="dn-btn" id="dnDuck">⬇ AGACHAR</button>
      </div>
      <p id="dnStatus">Toca SALTAR para empezar</p>
      <button id="dnNew">🔄 Nuevo juego</button>
    </div>
  </div>
</div>
<script>
(function(){
var cv = document.getElementById('dnCanvas'), ctx = cv.getContext('2d');
var W = cv.width, H = cv.height, GY = 130;
var scoreEl = document.getElementById('dnScore'), bestEl = document.getElementById('dnBest');
var statusEl = document.getElementById('dnStatus'), newBtn = document.getElementById('dnNew');
var jumpBtn = document.getElementById('dnJump'), duckBtn = document.getElementById('dnDuck');
var dino = { x: 40, y: GY - 40, w: 34, h: 40, vy: 0, duck: false, onGround: true };
var obs = [], clouds = [{x:120,y:28},{x:300,y:50},{x:430,y:20}];
var speed = 220, score = 0, best = 0, dashOff = 0, spawnT = 1.0, state = 'ready', time = 0, lastScore = -1;
function reset(){ obs.length = 0; speed = 220; score = 0; dashOff = 0; spawnT = 1.0; time = 0; lastScore = -1; dino.y = GY - 40; dino.h = 40; dino.w = 34; dino.vy = 0; dino.duck = false; dino.onGround = true; state = 'run'; scoreEl.textContent = '0'; statusEl.textContent = '¡Corre! Toca para saltar'; newBtn.style.display = 'none'; }
function jump(){ if(state === 'over'){ reset(); return; } if(state === 'ready'){ state = 'run'; statusEl.textContent = '¡Corre!'; } if(dino.onGround){ dino.vy = -620; dino.onGround = false; } }
function setDuck(v){ dino.duck = v; if(v && !dino.onGround){ dino.vy += 320; } }
function spawn(){ var r = Math.random(), o; if(score > 150 && r < 0.22){ o = { t:'b', x: W+20, y: (Math.random() < 0.5 ? 76 : 104), w: 26, h: 16 }; } else if(r < 0.5){ o = { t:'c1', x: W+20, y: GY-30, w: 14, h: 30 }; } else if(r < 0.8){ o = { t:'c2', x: W+20, y: GY-40, w: 18, h: 40 }; } else { o = { t:'c3', x: W+20, y: GY-34, w: 32, h: 34 }; } obs.push(o); }
function update(dt){ time += dt; speed = Math.min(520, speed + 8 * dt); dashOff = (dashOff + speed * dt) % 24;
  for(var i = 0; i < clouds.length; i++){ var c = clouds[i]; c.x -= speed * 0.25 * dt; if(c.x < -40){ c.x = W + 40; c.y = 16 + Math.random() * 45; } }
  spawnT -= dt; if(spawnT <= 0){ spawn(); spawnT = 0.55 + Math.random() * 0.9 * (260 / speed) + 0.35; }
  dino.vy += 2000 * dt; dino.y += dino.vy * dt;
  var sh = dino.duck ? 24 : 40;
  if(dino.y >= GY - sh){ dino.y = GY - sh; dino.vy = 0; dino.onGround = true; } else { dino.onGround = false; }
  dino.h = sh; dino.w = dino.duck ? 44 : 34;
  var wI = 0; for(var j = 0; j < obs.length; j++){ var o = obs[j]; o.x -= speed * dt; if(o.x + o.w > -10){ obs[wI++] = o; } } obs.length = wI;
  var dx = dino.x + 4, dy = dino.y + 4, dw = dino.w - 8, dh = dino.h - 8;
  for(var k = 0; k < obs.length; k++){ var ob = obs[k]; var ox = ob.x + 3, oy = ob.y + 3, ow = ob.w - 6, oh = ob.h - 6; if(dx < ox + ow && dx + dw > ox && dy < oy + oh && dy + dh > oy){ gameOver(); break; } }
  score += speed * dt * 0.05; var sc = Math.floor(score); if(sc !== lastScore){ lastScore = sc; scoreEl.textContent = sc; }
}
function gameOver(){ state = 'over'; if(Math.floor(score) > best){ best = Math.floor(score); bestEl.textContent = best; } statusEl.textContent = '💀 Game Over • Puntos: ' + Math.floor(score) + ' • Toca para reiniciar'; newBtn.style.display = 'block'; }
function drawDino(){ ctx.fillStyle = '#00ff87'; var x = dino.x, y = dino.y;
  if(dino.duck){ ctx.fillRect(x, y + 8, 34, 16); ctx.fillRect(x + 30, y, 14, 12); ctx.fillStyle = '#0b1120'; ctx.fillRect(x + 38, y + 3, 3, 3); ctx.fillStyle = '#00ff87'; var lp = Math.floor(time * 12) % 2; if(lp){ ctx.fillRect(x + 4, y + 24, 6, 0); ctx.fillRect(x + 22, y + 24, 6, 0); } }
  else { ctx.fillRect(x, y + 10, 26, 22); ctx.fillRect(x + 12, y, 22, 16); ctx.fillRect(x - 6, y + 14, 6, 8); ctx.fillStyle = '#0b1120'; ctx.fillRect(x + 26, y + 4, 3, 3); ctx.fillStyle = '#00ff87'; var lp2 = Math.floor(time * 12) % 2; if(dino.onGround){ if(lp2){ ctx.fillRect(x + 4, y + 32, 6, 8); ctx.fillRect(x + 16, y + 32, 6, 5); } else { ctx.fillRect(x + 4, y + 32, 6, 5); ctx.fillRect(x + 16, y + 32, 6, 8); } } else { ctx.fillRect(x + 4, y + 32, 6, 6); ctx.fillRect(x + 16, y + 32, 6, 6); } }
}
function draw(){ ctx.fillStyle = '#0b1120'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#20304a'; for(var i = 0; i < clouds.length; i++){ var c = clouds[i]; ctx.fillRect(c.x, c.y, 34, 8); ctx.fillRect(c.x + 6, c.y - 6, 20, 6); }
  ctx.fillStyle = '#334155'; ctx.fillRect(0, GY, W, 2);
  ctx.fillStyle = '#243447'; for(var x = -dashOff; x < W; x += 24){ ctx.fillRect(x, GY + 6, 12, 2); }
  for(var j = 0; j < obs.length; j++){ var o = obs[j];
    if(o.t === 'b'){ ctx.fillStyle = '#ff9f43'; ctx.fillRect(o.x, o.y + 5, o.w - 6, 8); var up = Math.sin(time * 18) > 0; ctx.fillRect(o.x + 8, up ? o.y : o.y + 10, 9, 5); ctx.fillStyle = '#ffd166'; ctx.fillRect(o.x + o.w - 7, o.y + 7, 7, 3); }
    else { ctx.fillStyle = '#22c55e'; if(o.t === 'c1'){ ctx.fillRect(o.x + 4, o.y, 6, o.h); ctx.fillRect(o.x, o.y + 8, 4, 8); ctx.fillRect(o.x + 10, o.y + 12, 4, 8); } else if(o.t === 'c2'){ ctx.fillRect(o.x + 6, o.y, 6, o.h); ctx.fillRect(o.x, o.y + 10, 5, 10); ctx.fillRect(o.x + 13, o.y + 14, 5, 10); } else { ctx.fillRect(o.x + 2, o.y + 4, 5, o.h - 4); ctx.fillRect(o.x + 13, o.y, 6, o.h); ctx.fillRect(o.x + 24, o.y + 6, 5, o.h - 6); } } }
  drawDino();
}
var last = performance.now();
function frame(now){ var dt = (now - last) / 1000; last = now; if(dt > 0.05){ dt = 0.05; } if(state === 'run'){ update(dt); } draw(); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', function(){ last = performance.now(); });
cv.addEventListener('touchstart', function(e){ e.preventDefault(); jump(); }, { passive: false });
cv.addEventListener('mousedown', function(){ jump(); });
jumpBtn.addEventListener('touchstart', function(e){ e.preventDefault(); jump(); }, { passive: false });
jumpBtn.addEventListener('click', function(){ jump(); });
duckBtn.addEventListener('touchstart', function(e){ e.preventDefault(); setDuck(true); }, { passive: false });
duckBtn.addEventListener('touchend', function(){ setDuck(false); });
duckBtn.addEventListener('mousedown', function(){ setDuck(true); });
duckBtn.addEventListener('mouseup', function(){ setDuck(false); });
duckBtn.addEventListener('mouseleave', function(){ setDuck(false); });
newBtn.addEventListener('click', function(){ reset(); });
document.addEventListener('keydown', function(e){ if(e.key === 'ArrowUp' || e.key === ' '){ e.preventDefault(); jump(); } if(e.key === 'ArrowDown'){ setDuck(true); } });
document.addEventListener('keyup', function(e){ if(e.key === 'ArrowDown'){ setDuck(false); } });
})();
</script>`;

            await enviarHtmlInteractivo(sock, from, htmlPayload, '@DINO', 'dino');
        } catch (error) {
            console.error('[DINO] Error:', error);
            await responder.texto('❌ Error al iniciar el juego.');
        }
    }
};