// commands/fun/akinator.js — 🧞 Akinator offline con selector de idioma
import { enviarHtmlInteractivo } from '../../lib/htmlInteractivo.js';

export default {
    nombre: 'akinator',
    categoria: 'Juegos',
    alias: ['aki', 'genio', 'adivina'],
    descripcion: 'Akinator: piensa en un personaje y yo lo adivino (ES/EN)',
    uso: '.akinator',
    ejecutar: async ({ msg, responder, sock }) => {
        try {
            const from = msg.key.remoteJid;

            const htmlPayload = `<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{font-family:system-ui,sans-serif;background:linear-gradient(160deg,#0b0e1a,#1a1040);color:#fff;padding:10px}
.card{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(139,92,246,.3);border-radius:16px;padding:14px}
.logo{text-align:center;font-size:11px;letter-spacing:2px;color:#a78bfa;margin-bottom:8px;font-weight:600}
.genie{font-size:44px;text-align:center;margin:4px 0}
h1{text-align:center;font-size:19px;margin-bottom:4px}
.sub{text-align:center;color:#94a3b8;font-size:12px;margin-bottom:12px;line-height:1.4}
.bar{height:5px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden;margin-bottom:4px}
.bar>div{height:100%;width:0;background:linear-gradient(90deg,#8b5cf6,#ec4899);transition:width .4s}
.step{display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-bottom:10px}
.q{font-size:16px;text-align:center;min-height:40px;margin-bottom:12px;line-height:1.35;font-weight:500}
.btns{display:grid;gap:7px}
button{border:0;border-radius:11px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;color:#fff;transition:transform .1s}
button:active{transform:scale(.97)}
.b1{background:linear-gradient(135deg,#22c55e,#16a34a)}
.b2{background:linear-gradient(135deg,#ef4444,#dc2626)}
.b3{background:linear-gradient(135deg,#64748b,#475569)}
.bstart{background:linear-gradient(135deg,#8b5cf6,#ec4899);font-size:16px;padding:14px;width:100%}
.blang{background:linear-gradient(135deg,#3b82f6,#2563eb);font-size:15px;padding:14px}
.hidden{display:none}
.gname{text-align:center;font-size:18px;font-weight:800;color:#f0abfc;margin-bottom:3px}
.gdesc{text-align:center;color:#94a3b8;font-size:12px;margin-bottom:12px;min-height:16px}
.foot{text-align:center;color:#475569;font-size:10px;margin-top:10px}
.flags{display:grid;gap:10px;grid-template-columns:1fr 1fr}
.flag-btn{padding:18px 10px;text-align:center;font-size:15px;font-weight:700;background:rgba(255,255,255,.05);border:1px solid rgba(139,92,246,.3);border-radius:14px;color:#fff;cursor:pointer;transition:transform .1s}
.flag-btn:active{transform:scale(.97)}
.flag-emoji{font-size:36px;display:block;margin-bottom:6px}
</style>
<div class="card">
<div class="logo">⚡ BOT-API </div>

<div id="scr-lang">
<div class="genie">🧞</div>
<h1>Akinator</h1>
<p class="sub" id="langSub">Elige tu idioma / Choose your language</p>
<div class="flags">
<div class="flag-btn" onclick="G.setLang('es')"><span class="flag-emoji">🇪🇸</span>Español</div>
<div class="flag-btn" onclick="G.setLang('en')"><span class="flag-emoji">🇺🇸</span>English</div>
</div>
</div>

<div id="scr-start" class="hidden">
<div class="genie">🧞</div>
<h1>Akinator</h1>
<p class="sub" id="t_sub">Piensa en un personaje real o ficticio. Yo te leo la mente 🔮</p>
<button class="bstart" onclick="G.start()" id="t_play">▶ JUGAR</button>
</div>

<div id="scr-q" class="hidden">
<div class="bar"><div id="prog"></div></div>
<div class="step"><span id="stepN">Pregunta 1</span><span id="progT">0%</span></div>
<div class="q" id="qText">...</div>
<div class="btns">
<button class="b1" onclick="G.answer(1)" id="t_yes">Sí</button>
<button class="b2" onclick="G.answer(0)" id="t_no">No</button>
<button class="b3" onclick="G.answer(2)" id="t_dk">No sé</button>
</div>
</div>

<div id="scr-guess" class="hidden">
<div class="genie">🤔</div>
<div class="gname" id="gName"></div>
<div class="gdesc" id="gDesc"></div>
<div class="btns">
<button class="b1" onclick="G.verdict(1)" id="t_yesit">✅ Sí, es él/ella</button>
<button class="b2" onclick="G.verdict(0)" id="t_noit">❌ No, sigue</button>
</div>
</div>

<div id="scr-end" class="hidden">
<div class="genie" id="endEmoji">🎉</div>
<h1 id="endTitle"></h1>
<p class="sub" id="endText"></p>
<button class="bstart" onclick="G.reset()" id="t_again">🔄 Jugar de nuevo</button>
</div>

<div class="foot">🧞 Akinator offline · 💙 BOT-API</div>
</div>

<script>
const T = {
es: {
  sub: 'Piensa en un personaje real o ficticio.<br>Yo te leo la mente 🔮',
  play: '▶ JUGAR',
  yes: 'Sí', no: 'No', dk: 'No sé',
  yesit: '✅ Sí, es él/ella', noit: '❌ No, sigue',
  again: '🔄 Jugar de nuevo',
  step: 'Pregunta',
  win: '¡GANÉ!', winT: 'Leí tu mente: ',
  lose: 'Me ganaste', loseT: 'No pude adivinarlo. ¡Eres un crack! 🧠',
  guess: '¿Es tu personaje?',
  Q: ['¿Es una persona real?','¿Es hombre?','¿Sigue vivo?','¿Es de anime o manga?','¿Es de película o serie?','¿Es músico o cantante?','¿Es deportista?','¿Es futbolista?','¿Es villano o malvado?','¿Tiene superpoderes o magia?','¿Es de videojuegos?','¿Es de Disney o Pixar?','¿Es de Marvel o DC?','¿Es meme de internet?','¿Es latino o hispano?','¿Es de Estados Unidos?','¿Es de Asia?','¿Es histórico o antiguo?','¿Es millonario?','¿Es niño o joven?']
},
en: {
  sub: 'Think of a real or fictional character.<br>I will read your mind 🔮',
  play: '▶ PLAY',
  yes: 'Yes', no: 'No', dk: "Don't know",
  yesit: "✅ Yes, it's him/her", noit: '❌ No, keep going',
  again: '🔄 Play again',
  step: 'Question',
  win: 'I WON!', winT: 'I read your mind: ',
  lose: 'You beat me', loseT: "Couldn't guess. You're a crack! 🧠",
  guess: 'Is this your character?',
  Q: ['Is it a real person?','Is it male?','Is it still alive?','Is it from anime/manga?','Is it from a movie/series?','Is it a musician/singer?','Is it an athlete?','Is it a football/soccer player?','Is it a villain?','Does it have superpowers/magic?','Is it from a video game?','Is it from Disney/Pixar?','Is it from Marvel/DC?','Is it an internet meme?','Is it Latin/Hispanic?','Is it from the USA?','Is it from Asia?','Is it historical/ancient?','Is it a millionaire?','Is it a child/young person?']
}
};
const P = [
['Cristiano Ronaldo','11100011000000000010'],
['Lionel Messi','11100011000000100010'],
['Neymar Jr','11100011000000100010'],
['Shakira','10100100000000100010'],
['Bad Bunny','11100100000000100010'],
['Frida Kahlo','10000000000000100100'],
['Gabriel García Márquez','11000000000000100100'],
['Simón Bolívar','11000000000000100100'],
['Obama','11100000000000010010'],
['Donald Trump','11100000000000010100'],
['Elon Musk','11100000000000010010'],
['Albert Einstein','11000000000000000100'],
['Napoleón','11000000000000000100'],
['Cleopatra','10000000000000000100'],
['Michael Jackson','10000100000000010100'],
['Taylor Swift','10100100000000010010'],
['Beyoncé','10100100000000010010'],
['Freddie Mercury','10000100000000000100'],
['Goku','01110000010000010000'],
['Naruto','01110000010000010010'],
['Luffy','01110000010000010010'],
['Vegeta','01110000010000010000'],
['Doraemon','01110000010000010000'],
['Sailor Moon','00110000010000010010'],
['Light Yagami','01110000110000010010'],
['L de Death Note','01110000000000010010'],
['Kakashi','01110000010000010000'],
['Mickey Mouse','01101000000100000000'],
['Elsa de Frozen','00101000010100000010'],
['Buzz Lightyear','01101000000100000000'],
['Shrek','01101000000000000000'],
['Bob Esponja','01101000000000000000'],
['Homero Simpson','01101000000000000000'],
['Spider-Man','01101000110010010010'],
['Batman','01101000000010010100'],
['Iron Man','01101000000010010100'],
['Thanos','01101000110010000000'],
['Joker','01101000100010000000'],
['Deadpool','01101000010010010000'],
['Superman','01101000110010000000'],
['Wonder Woman','00101000110010000000'],
['Harry Potter','01101000010000000010'],
['Hermione','00101000010000000010'],
['Mario Bros','01100000001000000000'],
['Luigi','01100000001000000000'],
['Pikachu','01100000011000010000'],
['Link de Zelda','01100000001000000000'],
['Sonic','01100000001000000000'],
['Crewmate Among Us','00100000001000100000'],
['Pepe the Frog','01100000000001000000'],
['Doge','01100000000001000000'],
['Grumpy Cat','00100000000001000000']
];
const G = {
lang: 'es', cand: [], used: [], n: 0, guessIdx: 0, curQ: 0, curName: '',
$(id) { return document.getElementById(id); },
show(id) { ['scr-lang','scr-start','scr-q','scr-guess','scr-end'].forEach(s => this.$(s).classList.toggle('hidden', s !== id)); },
setLang(l) {
  this.lang = l;
  const t = T[l];
  this.$('t_sub').innerHTML = t.sub;
  this.$('t_play').textContent = t.play;
  this.$('t_yes').textContent = t.yes;
  this.$('t_no').textContent = t.no;
  this.$('t_dk').textContent = t.dk;
  this.$('t_yesit').textContent = t.yesit;
  this.$('t_noit').textContent = t.noit;
  this.$('t_again').textContent = t.again;
  this.show('scr-start');
},
start() {
  this.cand = P.map((_, i) => i);
  this.used = []; this.n = 0; this.guessIdx = 0;
  this.nextQ();
},
reset() { this.show('scr-lang'); },
bestQ() {
  let best = -1, bestScore = 1e9;
  for (let q = 0; q < T[this.lang].Q.length; q++) {
    if (this.used.includes(q)) continue;
    let yes = 0;
    for (const i of this.cand) if (P[i][1][q] === '1') yes++;
    const score = Math.abs(yes - this.cand.length / 2);
    if (score < bestScore) { bestScore = score; best = q; }
  }
  return best;
},
nextQ() {
  if (this.cand.length <= 2 || this.used.length >= T[this.lang].Q.length) return this.guess();
  const q = this.bestQ();
  if (q < 0) return this.guess();
  this.curQ = q; this.used.push(q); this.n++;
  const prog = Math.round(100 * (1 - this.cand.length / P.length));
  this.show('scr-q');
  this.$('qText').textContent = T[this.lang].Q[q];
  this.$('prog').style.width = prog + '%';
  this.$('progT').textContent = prog + '%';
  this.$('stepN').textContent = T[this.lang].step + ' ' + this.n;
},
answer(a) {
  if (a !== 2) {
    this.cand = this.cand.filter(i => P[i][1][this.curQ] === String(a));
    if (this.cand.length === 0) this.cand = [0];
  }
  this.nextQ();
},
guess() {
  if (this.guessIdx >= this.cand.length) return this.end(false);
  const p = P[this.cand[this.guessIdx]];
  this.curName = p[0];
  this.show('scr-guess');
  this.$('gName').textContent = p[0];
  this.$('gDesc').textContent = T[this.lang].guess;
},
verdict(w) {
  if (w) return this.end(true);
  this.guessIdx++;
  if (this.guessIdx >= this.cand.length) {
    if (this.used.length >= T[this.lang].Q.length) return this.end(false);
    this.guessIdx = 0;
    return this.nextQ();
  }
  this.guess();
},
end(w) {
  this.show('scr-end');
  const t = T[this.lang];
  this.$('endEmoji').textContent = w ? '🎉' : '🏳️';
  this.$('endTitle').textContent = w ? t.win : t.lose;
  this.$('endText').textContent = w ? t.winT + this.curName + ' 🧞' : t.loseT;
}
};
window.G = G;
</script>`;

            await enviarHtmlInteractivo(sock, from, htmlPayload, '@AKINATOR', 'akinator');
        } catch (error) {
            console.error('[AKINATOR] Error:', error);
            await responder.texto('❌ Error al iniciar el juego.');
        }
    }
};