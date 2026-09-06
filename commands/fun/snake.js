// commands/fun/snake.js
import { enviarHtmlInteractivo } from '../../lib/htmlInteractivo.js';

export default {
    nombre: 'snake',
    categoria: 'Juegos',
    alias: ['viborita', 'serpiente'],
    descripcion: 'Juego Snake interactivo dentro del chat',
    uso: '.snake',
    ejecutar: async ({ msg, responder, sock }) => {
        try {
            const from = msg.key.remoteJid;

            const htmlPayload = `<style>
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }
body { margin: 0; background: transparent; font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #eee; }
.snk-wrap { width: 100%; max-width: 540px; margin: auto; padding: 12px; }
.snk-card { background: rgba(15,18,28,.88); backdrop-filter: blur(16px); border: 1px solid rgba(0,255,135,.25); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,255,135,.15); }
.snk-header { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.1); display: flex; justify-content: space-between; align-items: center; }
.snk-title { font-size: 19px; font-weight: 900; color: #fff; text-shadow: 0 0 10px rgba(0,255,135,.6); letter-spacing: 1px; }
.snk-sub { font-size: 10px; letter-spacing: 2px; color: #00ff87; font-weight: 700; text-transform: uppercase; }
.snk-body { padding: 16px; text-align: center; }
.snk-score { display: flex; justify-content: space-around; margin-bottom: 12px; }
.snk-box { background: #1e293b; padding: 8px 18px; border-radius: 10px; }
.snk-box h3 { margin: 0; font-size: 11px; color: #00ff87; letter-spacing: 1px; }
.snk-box h1 { margin: 4px 0 0; font-size: 22px; }
#snkCanvas { background: #0b1120; border-radius: 10px; border: 1px solid #334155; touch-action: none; max-width: 100%; }
.snk-pad { display: grid; grid-template-columns: repeat(3, 64px); gap: 6px; justify-content: center; margin-top: 12px; }
.snk-btn { border: 0; border-radius: 12px; background: #1e293b; color: #00ff87; font-size: 20px; font-weight: 800; cursor: pointer; padding: 12px 0; }
.snk-btn:active { background: #00ff87; color: #0b1120; }
#snkStatus { margin: 10px 0 0; font-size: 15px; font-weight: 700; color: #8fc7ff; min-height: 20px; }
#snkNew { display: none; margin: 10px auto 0; padding: 10px 22px; border: 0; border-radius: 10px; background: #22c55e; color: #fff; font-size: 15px; font-weight: 800; cursor: pointer; }
@keyframes snkPulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
</style>
<div class="snk-wrap">
  <div class="snk-card">
    <div class="snk-header">
      <div><div class="snk-sub">SNAKE</div><div class="snk-title">🐍 Viborita</div></div>
      <div style="width:8px;height:8px;background:#00ff87;border-radius:50%;box-shadow:0 0 8px #00ff87;animation:snkPulse 1.5s infinite"></div>
    </div>
    <div class="snk-body">
      <div class="snk-score">
        <div class="snk-box"><h3>PUNTOS</h3><h1 id="snkScore">0</h1></div>
        <div class="snk-box"><h3>RÉCORD</h3><h1 id="snkBest">0</h1></div>
      </div>
      <canvas id="snkCanvas" width="240" height="240"></canvas>
      <div class="snk-pad">
        <div></div><button class="snk-btn" id="snkUp">▲</button><div></div>
        <button class="snk-btn" id="snkLeft">◀</button><button class="snk-btn" id="snkDown">▼</button><button class="snk-btn" id="snkRight">▶</button>
      </div>
      <p id="snkStatus">Toca una flecha para empezar</p>
      <button id="snkNew">🔄 Nuevo juego</button>
    </div>
  </div>
</div>
<script>
(function(){
const cv = document.getElementById('snkCanvas'), ctx = cv.getContext('2d');
const scoreEl = document.getElementById('snkScore'), bestEl = document.getElementById('snkBest');
const statusEl = document.getElementById('snkStatus'), newBtn = document.getElementById('snkNew');
const N = 15, S = cv.width / N;
let snake, dir, nextDir, food, score, best = 0, timer = null, alive = false, started = false;
function reset(){ snake = [{x:7,y:7}]; dir = {x:0,y:0}; nextDir = {x:0,y:0}; score = 0; alive = true; started = false; if(timer){ clearInterval(timer); timer = null; } placeFood(); draw(); scoreEl.textContent = 0; statusEl.textContent = 'Toca una flecha para empezar'; newBtn.style.display = 'none'; }
function placeFood(){ do { food = { x: Math.floor(Math.random()*N), y: Math.floor(Math.random()*N) }; } while (snake.some(s => s.x === food.x && s.y === food.y)); }
function setDir(x, y){ if(!alive) return; if(snake.length > 1 && x === -dir.x && y === -dir.y) return; nextDir = {x, y}; if(!started){ started = true; statusEl.textContent = '¡Come las manzanas! 🍎'; timer = setInterval(tick, 140); } }
function tick(){ dir = nextDir; const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }; if(head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || snake.some(s => s.x === head.x && s.y === head.y)){ gameOver(); return; } snake.unshift(head); if(head.x === food.x && head.y === food.y){ score++; scoreEl.textContent = score; if(score > best){ best = score; bestEl.textContent = best; } placeFood(); } else { snake.pop(); } draw(); }
function draw(){ ctx.fillStyle = '#0b1120'; ctx.fillRect(0,0,cv.width,cv.height); ctx.fillStyle = '#ff4757'; ctx.beginPath(); ctx.arc(food.x*S + S/2, food.y*S + S/2, S/2 - 2, 0, Math.PI*2); ctx.fill(); snake.forEach((s,i) => { ctx.fillStyle = i === 0 ? '#00ff87' : '#00c86a'; ctx.fillRect(s.x*S+1, s.y*S+1, S-2, S-2); }); }
function gameOver(){ alive = false; clearInterval(timer); timer = null; statusEl.textContent = '💀 Game Over • Puntos: ' + score; newBtn.style.display = 'block'; }
document.getElementById('snkUp').onclick = () => setDir(0,-1);
document.getElementById('snkDown').onclick = () => setDir(0,1);
document.getElementById('snkLeft').onclick = () => setDir(-1,0);
document.getElementById('snkRight').onclick = () => setDir(1,0);
newBtn.onclick = reset;
let tx = null, ty = null;
cv.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; e.preventDefault(); }, { passive: false });
cv.addEventListener('touchend', e => { if(tx === null) return; const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if(Math.abs(dx) > Math.abs(dy)){ if(Math.abs(dx) > 20) setDir(dx > 0 ? 1 : -1, 0); } else { if(Math.abs(dy) > 20) setDir(0, dy > 0 ? 1 : -1); } tx = ty = null; e.preventDefault(); }, { passive: false });
reset();
})();
</script>`;

            await enviarHtmlInteractivo(sock, from, htmlPayload, '@SNAKE', 'snake');
        } catch (error) {
            console.error('[SNAKE] Error:', error);
            await responder.texto('❌ Error al iniciar el juego.');
        }
    }
};