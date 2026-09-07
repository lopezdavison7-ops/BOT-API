// commands/fun/mem.js
// Memoria: TÚ vs 💻 BOT-API ⚡ con dificultades reales
import { enviarHtmlInteractivo } from '../../lib/htmlInteractivo.js';

export default {
    nombre: 'mem',
    categoria: 'Juegos',
    alias: ['memoria', 'memory', 'juego'],
    descripcion: 'Memorama contra 💻 BOT-API  con 3 dificultades',
    uso: '.mem',
    ejecutar: async ({ msg, responder, sock }) => {
        try {
            const from = msg.key.remoteJid;

            const htmlPayload = `<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; box-sizing: border-box; }
body { margin: 0; background: transparent; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #eee; touch-action: manipulation; }
.mv-wrap { width: 100%; max-width: 540px; margin: auto; padding: 12px; }
.mv-card { background: rgba(15,18,28,.95); border: 1px solid rgba(0,243,255,.25); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,243,255,.15), 0 0 15px rgba(157,78,221,.2); }
.mv-header { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.1); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(90deg, rgba(0,243,255,.05), rgba(157,78,221,.05)); }
.mv-title { font-size: 18px; font-weight: 900; color: #fff; text-shadow: 0 0 10px rgba(0,243,255,.6); letter-spacing: 1px; }
.mv-sub { font-size: 10px; letter-spacing: 2px; color: #00f3ff; font-weight: 700; text-transform: uppercase; }
.mv-body { padding: 16px; }
.mv-dif { display: flex; justify-content: space-between; gap: 6px; margin-bottom: 14px; }
.btn-dif { flex: 1; padding: 9px 6px; border: none; border-radius: 20px; cursor: pointer; font-weight: bold; font-size: 12px; color: #fff; opacity: .55; }
.btn-dif.active { opacity: 1; box-shadow: 0 0 12px rgba(255,255,255,.35); }
.facil { background: #22c55e; }
.medio { background: #eab308; }
.dificil { background: #ef4444; }
.mv-scores { display: flex; justify-content: space-around; margin-bottom: 12px; gap: 8px; }
.mv-box { background: #1e293b; padding: 8px 10px; border-radius: 10px; width: 50%; text-align: center; }
.mv-box.bot { border: 1px solid rgba(0,243,255,.4); }
.mv-box h3 { margin: 0; font-size: 11px; color: #00f3ff; letter-spacing: 1px; }
.mv-box h1 { margin: 4px 0 0; font-size: 24px; }
.mv-stats { display: flex; justify-content: space-between; gap: 6px; margin-bottom: 12px; }
.mv-stat { background: #16233a; border-radius: 8px; padding: 6px 4px; flex: 1; text-align: center; }
.mv-stat small { display: block; font-size: 9px; letter-spacing: 1.5px; color: #64748b; font-weight: 700; }
.mv-stat b { font-size: 14px; color: #fff; }
.mv-board { display: grid; gap: 5px; margin: 0 auto; width: fit-content; background: #1e293b; padding: 10px; border-radius: 10px; }
.mv-cell { width: 44px; height: 44px; background: #334155; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 22px; cursor: pointer; border: 2px solid #475569; }
.mv-cell.flip { background: #f8fafc; border-color: #94a3b8; }
#mvStatus { margin: 12px 0; font-size: 15px; text-align: center; font-weight: 700; color: #8fc7ff; min-height: 20px; }
#mvNew { padding: 10px 20px; background: #22c55e; border: none; border-radius: 10px; color: #fff; font-size: 15px; font-weight: 800; cursor: pointer; display: none; margin: 0 auto; text-align: center; width: fit-content; }
@keyframes mvPulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
</style>
<div class="mv-wrap">
  <div class="mv-card">
    <div class="mv-header">
      <div><div class="mv-sub">MEMORIA PvP</div><div class="mv-title">🧠 Tú vs  BOT-API ⚡</div></div>
      <div style="width:8px;height:8px;background:#00ff87;border-radius:50%;box-shadow:0 0 8px #00ff87;animation:mvPulse 1.5s infinite"></div>
    </div>
    <div class="mv-body">
      <div class="mv-dif">
        <button class="btn-dif facil" id="mvFacil">🟢 Fácil</button>
        <button class="btn-dif medio" id="mvMedio">🟡 Medio</button>
        <button class="btn-dif dificil" id="mvDificil">🔴 Difícil</button>
      </div>
      <div class="mv-scores">
        <div class="mv-box"><h3>👤 TÚ</h3><h1 id="mvP">0</h1></div>
        <div class="mv-box bot"><h3>💻 BOT-API ⚡</h3><h1 id="mvB">0</h1></div>
      </div>
      <div class="mv-stats">
        <div class="mv-stat"><small>TURNO</small><b id="mvTurn">TÚ</b></div>
        <div class="mv-stat"><small>PAREJAS</small><b id="mvPairs">0/8</b></div>
        <div class="mv-stat"><small>TIEMPO</small><b id="mvTime">0s</b></div>
      </div>
      <div class="mv-board" id="mvBoard"></div>
      <div id="mvStatus">¡Tu turno! Encuentra una pareja.</div>
      <button id="mvNew">🔄 Nuevo juego</button>
    </div>
  </div>
</div>
<script>
(function(){
var board = document.getElementById('mvBoard');
var pEl = document.getElementById('mvP'), bEl = document.getElementById('mvB');
var turnEl = document.getElementById('mvTurn'), pairsEl = document.getElementById('mvPairs'), timeEl = document.getElementById('mvTime');
var statusEl = document.getElementById('mvStatus'), newBtn = document.getElementById('mvNew');
var btns = { facil: document.getElementById('mvFacil'), medio: document.getElementById('mvMedio'), dificil: document.getElementById('mvDificil') };
var DIFS = {
  facil:   { cols: 4, rows: 4, mem: 0.35, use: 0.5,  delay: 900, name: 'FÁCIL' },
  medio:   { cols: 5, rows: 4, mem: 0.7,  use: 0.85, delay: 600, name: 'MEDIO' },
  dificil: { cols: 6, rows: 4, mem: 1,    use: 1,    delay: 400, name: 'DIFÍCIL' }
};
var EMO = ['🎯','','⚽','🦊','🍎','🎸','🦄','🚗','','🚀','','💎','','🎩','','🎁','','🔥','','💡','','🌸','','⭐'];
var cards = [], flipped = [], known = {}, dif = DIFS.facil, difKey = 'facil';
var pScore = 0, bScore = 0, pairs = 0, totalPairs = 0, turn = 'p', locked = false, over = false;
var seconds = 0, clock = null;
function startClock(){ stopClock(); seconds = 0; timeEl.textContent = '0s'; clock = setInterval(function(){ seconds++; timeEl.textContent = seconds + 's'; }, 1000); }
function stopClock(){ if(clock){ clearInterval(clock); clock = null; } }
function startGame(key){
  difKey = key; dif = DIFS[key];
  totalPairs = (dif.cols * dif.rows) / 2;
  pairs = 0; pScore = 0; bScore = 0; turn = 'p'; locked = false; over = false;
  flipped = []; known = {}; cards = [];
  pEl.textContent = '0'; bEl.textContent = '0';
  pairsEl.textContent = '0/' + totalPairs;
  turnEl.textContent = 'TÚ';
  for(var k in btns){ btns[k].classList.toggle('active', k === key); }
  var used = EMO.slice(0, totalPairs);
  var deck = used.concat(used).sort(function(){ return Math.random() - 0.5; });
  board.innerHTML = '';
  board.style.gridTemplateColumns = 'repeat(' + dif.cols + ', 44px)';
  deck.forEach(function(emoji, index){
    var cell = document.createElement('div');
    cell.className = 'mv-cell';
    cell.dataset.index = index;
    cell.dataset.emoji = emoji;
    cell.addEventListener('click', function(){ flipCard(cell, 'p'); });
    board.appendChild(cell);
    cards.push(cell);
  });
  newBtn.style.display = 'none';
  statusEl.textContent = '🟢🟡🔴 ' + dif.name + ' • ¡Tu turno! Encuentra una pareja.';
  startClock();
}
function available(){ return cards.filter(function(c){ return c.style.visibility !== 'hidden' && flipped.indexOf(c) === -1; }); }
function flipCard(card, player){
  if(over || locked || turn !== player) return;
  if(card.style.visibility === 'hidden' || card.classList.contains('flip')) return;
  card.classList.add('flip');
  card.textContent = card.dataset.emoji;
  flipped.push(card);
  if(player === 'ai'){ known[card.dataset.index] = card.dataset.emoji; }
  else if(Math.random() < dif.mem){ known[card.dataset.index] = card.dataset.emoji; }
  if(flipped.length === 2){ locked = true; setTimeout(function(){ checkMatch(player); }, 700); }
}
function checkMatch(player){
  var c1 = flipped[0], c2 = flipped[1];
  if(c1.dataset.emoji === c2.dataset.emoji){
    c1.style.visibility = 'hidden'; c2.style.visibility = 'hidden';
    flipped = []; locked = false; pairs++;
    if(player === 'p'){ pScore++; pEl.textContent = pScore; } else { bScore++; bEl.textContent = bScore; }
    pairsEl.textContent = pairs + '/' + totalPairs;
    if(pairs === totalPairs){ endGame(); return; }
    if(player === 'p'){ statusEl.textContent = '✅ ¡Pareja! Sigues tú.'; }
    else { statusEl.textContent = '⚡ 💻 BOT-API encontró pareja...'; setTimeout(aiTurn, dif.delay); }
  } else {
    setTimeout(function(){
      c1.classList.remove('flip'); c1.textContent = '';
      c2.classList.remove('flip'); c2.textContent = '';
      flipped = []; locked = false;
      turn = (player === 'p') ? 'ai' : 'p';
      if(turn === 'ai'){ setTimeout(aiTurn, dif.delay); }
      else { turnEl.textContent = 'TÚ'; statusEl.textContent = '¡Tu turno! Encuentra una pareja.'; }
    }, 900);
  }
}
function findKnownPair(avail){
  var map = {};
  for(var i = 0; i < avail.length; i++){
    var e = known[avail[i].dataset.index];
    if(!e) continue;
    if(map[e]){ return [map[e], avail[i]]; }
    map[e] = avail[i];
  }
  return null;
}
function pickSecond(first, avail){
  var e = first.dataset.emoji, cands = [], rest = [];
  for(var i = 0; i < avail.length; i++){
    var c = avail[i];
    if(c === first || c.style.visibility === 'hidden') continue;
    rest.push(c);
    if(known[c.dataset.index] === e){ cands.push(c); }
  }
  if(cands.length && Math.random() < dif.use){ return cands[0]; }
  return rest[Math.floor(Math.random() * rest.length)];
}
function aiTurn(){
  if(over) return;
  turn = 'ai'; turnEl.textContent = 'BOT-API';
  statusEl.textContent = '🤖 Turno de 💻 BOT-API ⚡...';
  var avail = available();
  if(avail.length < 2){ return; }
  var pair = findKnownPair(avail);
  var first, second = null;
  if(pair && Math.random() < dif.use){ first = pair[0]; second = pair[1]; }
  else { first = avail[Math.floor(Math.random() * avail.length)]; }
  setTimeout(function(){
    flipCard(first, 'ai');
    setTimeout(function(){
      var sec = second ? second : pickSecond(first, avail);
      flipCard(sec, 'ai');
    }, 350);
  }, 450);
}
function endGame(){
  over = true; stopClock(); locked = true;
  var txt;
  if(pScore > bScore){ txt = '🏆 ¡GANASTE! Superaste a 💻 BOT-API ⚡ en ' + seconds + 's'; }
  else if(bScore > pScore){ txt = '😈 💻 BOT-API ⚡ gana ' + bScore + '-' + pScore + '. ¡Revancha!'; }
  else { txt = '🤝 ¡Empate técnico contra 💻 BOT-API !'; }
  statusEl.textContent = txt;
  newBtn.style.display = 'block';
}
btns.facil.addEventListener('click', function(){ startGame('facil'); });
btns.medio.addEventListener('click', function(){ startGame('medio'); });
btns.dificil.addEventListener('click', function(){ startGame('dificil'); });
newBtn.addEventListener('click', function(){ startGame(difKey); });
startGame('facil');
})();
</script>`;

            await enviarHtmlInteractivo(sock, from, htmlPayload, '@MEMORIA', 'mem');
        } catch (error) {
            console.error('[MEM] Error:', error);
            await responder.texto('❌ Error al iniciar el juego.');
        }
    }
};