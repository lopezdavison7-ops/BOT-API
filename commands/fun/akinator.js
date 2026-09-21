// commands/fun/akinator.js — 🧞 Akinator offline (sin APIs externas)
import { enviarHtmlInteractivo } from '../../lib/htmlInteractivo.js';

export default {
    nombre: 'akinator',
    categoria: 'Juegos',
    alias: ['aki', 'genio', 'adivina'],
    descripcion: 'Akinator: piensa en un personaje y yo lo adivino',
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
.hidden{display:none}
img.face{width:90px;height:90px;object-fit:cover;border-radius:14px;border:2px solid #8b5cf6;display:block;margin:0 auto 10px;background:#1e1b4b}
.gname{text-align:center;font-size:18px;font-weight:800;color:#f0abfc;margin-bottom:3px}
.gdesc{text-align:center;color:#94a3b8;font-size:12px;margin-bottom:12px;min-height:16px}
.foot{text-align:center;color:#475569;font-size:10px;margin-top:10px}
</style>
<div class="card">
<div class="logo">⚡ BOT-API </div>
<div id="scr-start">
<div class="genie">🧞</div>
<h1>Akinator</h1>
<p class="sub">Piensa en un personaje real o ficticio.<br>Yo te leo la mente 🔮</p>
<button class="bstart" onclick="G.start()">▶ JUGAR</button>
</div>
<div id="scr-q" class="hidden">
<div class="bar"><div id="prog"></div></div>
<div class="step"><span id="stepN">Pregunta 1</span><span id="progT">0%</span></div>
<div class="q" id="qText">...</div>
<div class="btns">
<button class="b1" onclick="G.answer(1)">Sí</button>
<button class="b2" onclick="G.answer(0)">No</button>
<button class="b3" onclick="G.answer(2)">No sé</button>
</div>
</div>
<div id="scr-guess" class="hidden">
<div class="genie">🤔</div>
<div class="gname" id="gName"></div>
<div class="gdesc" id="gDesc"></div>
<div class="btns">
<button class="b1" onclick="G.verdict(1)">✅ Sí, es él/ella</button>
<button class="b2" onclick="G.verdict(0)">❌ No, sigue</button>
</div>
</div>
<div id="scr-end" class="hidden">
<div class="genie" id="endEmoji">🎉</div>
<h1 id="endTitle"></h1>
<p class="sub" id="endText"></p>
<button class="bstart" onclick="G.start()">🔄 Jugar de nuevo</button>
</div>
<div class="foot">🧞 Akinator offline · 💙 BOT-API</div>
</div>
<script>
const G = {
Q: ['¿Es una persona real?','¿Es hombre?','¿Sigue vivo?','¿Es de anime o manga?','¿Es de película o serie?','¿Es músico o cantante?','¿Es deportista?','¿Es futbolista?','¿Es villano o malvado?','¿Tiene superpoderes o magia?','¿Es de videojuegos?','¿Es de Disney o Pixar?','¿Es de Marvel o DC?','¿Es meme de internet?','¿Es latino o hispano?','¿Es de Estados Unidos?','¿Es de Asia?','¿Es histórico o antiguo?','¿Es millonario?','¿Es niño o joven?'],
P: [
['Cristiano Ronaldo','11100011000000000010'],
['Lionel Messi','11100011000000100010'],
['Neymar Jr','11100011000000100010'],
['Shakira','10100100000000100010'],
['Bad Bunny','11100100000000100010'],
['Frida Kahlo','10000000000000100100'],
['García Márquez','11000000000000100100'],
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
],
cand: [], used: [], n: 0, guessIdx: 0,
$(id) { return document.getElementById(id); },
show(id) { ['scr-start','scr-q','scr-guess','scr-end'].forEach(s => this.$(s).classList.toggle('hidden', s !== id)); },
start() {
this.cand = this.P.map((p, i) => i);
this.used = []; this.n = 0; this.guessIdx = 0;
this.nextQ();
},
bestQ() {
let best = -1, bestScore = 1e9;
for (let q = 0; q < this.Q.length; q++) {
if (this.used.includes(q)) continue;
let yes = 0;
for (const i of this.cand) if (this.P[i][1][q] === '1') yes++;
const score = Math.abs(yes - this.cand.length / 2);
if (score < bestScore) { bestScore = score; best = q; }
}
return best;
},
nextQ() {
if (this.cand.length <= 2 || this.used.length >= this.Q.length) return this.guess();
const q = this.bestQ();
if (q < 0) return this.guess();
this.curQ = q; this.used.push(q); this.n++;
const prog = Math.round(100 * (1 - this.cand.length / this.P.length));
this.show('scr-q');
this.$('qText').textContent = this.Q[q];
this.$('prog').style.width = prog + '%';
this.$('progT').textContent = prog + '%';
this.$('stepN').textContent = 'Pregunta ' + this.n;
},
answer(a) {
if (a !== 2) {
this.cand = this.cand.filter(i => this.P[i][1][this.curQ] === String(a));
if (this.cand.length === 0) this.cand = [0];
}
this.nextQ();
},
guess() {
if (this.guessIdx >= this.cand.length) return this.end(false);
const p = this.P[this.cand[this.guessIdx]];
this.curName = p[0];
this.show('scr-guess');
this.$('gName').textContent = p[0];
this.$('gDesc').textContent = '¿Es tu personaje?';
},
verdict(w) {
if (w) return this.end(true);
this.guessIdx++;
if (this.guessIdx >= this.cand.length) {
if (this.used.length >= this.Q.length) return this.end(false);
this.guessIdx = 0;
return this.nextQ();
}
this.guess();
},
end(w) {
this.show('scr-end');
this.$('endEmoji').textContent = w ? '🎉' : '🏳️';
this.$('endTitle').textContent = w ? '¡GANÉ!' : 'Me ganaste';
this.$('endText').textContent = w ? 'Leí tu mente: ' + this.curName + ' 🧞' : 'No pude adivinarlo. ¡Eres un crack! 🧠';
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