// commands/fun/akinator.js — 🧞 Akinator
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
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: linear-gradient(160deg, #0b0e1a, #1a1040 60%, #0b0e1a); color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
.card { width: 100%; max-width: 420px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 20px; padding: 22px; backdrop-filter: blur(8px); box-shadow: 0 8px 40px rgba(139, 92, 246, 0.15); animation: in 0.3s ease; }
@keyframes in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; } }
.logo { text-align: center; font-size: 14px; letter-spacing: 2px; color: #a78bfa; margin-bottom: 14px; font-weight: 600; }
.genie { font-size: 64px; text-align: center; margin: 8px 0; }
h1 { text-align: center; font-size: 22px; margin-bottom: 6px; }
.sub { text-align: center; color: #94a3b8; font-size: 13px; margin-bottom: 18px; line-height: 1.5; }
.bar { height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 99px; overflow: hidden; margin-bottom: 6px; }
.bar > div { height: 100%; width: 0; background: linear-gradient(90deg, #8b5cf6, #ec4899); transition: width 0.4s; }
.step { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 14px; }
.q { font-size: 18px; text-align: center; min-height: 52px; margin-bottom: 16px; line-height: 1.4; font-weight: 500; }
.btns { display: grid; gap: 9px; }
button { border: 0; border-radius: 13px; padding: 13px; font-size: 15px; font-weight: 600; cursor: pointer; transition: transform 0.1s, filter 0.2s; color: #fff; }
button:active { transform: scale(0.97); }
button:disabled { opacity: 0.5; cursor: wait; }
.b1 { background: linear-gradient(135deg, #22c55e, #16a34a); }
.b2 { background: linear-gradient(135deg, #ef4444, #dc2626); }
.b3 { background: linear-gradient(135deg, #64748b, #475569); }
.b4 { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.b5 { background: linear-gradient(135deg, #f97316, #ea580c); }
.bstart { background: linear-gradient(135deg, #8b5cf6, #ec4899); font-size: 17px; padding: 16px; width: 100%; }
.bback { background: rgba(255, 255, 255, 0.08); color: #cbd5e1; font-size: 13px; padding: 10px; margin-top: 4px; }
.hidden { display: none; }
img.face { width: 110px; height: 110px; object-fit: cover; border-radius: 16px; border: 2px solid #8b5cf6; display: block; margin: 0 auto 12px; background: #1e1b4b; }
.gname { text-align: center; font-size: 21px; font-weight: 800; color: #f0abfc; margin-bottom: 4px; }
.gdesc { text-align: center; color: #94a3b8; font-size: 13px; margin-bottom: 16px; line-height: 1.4; min-height: 18px; }
.spin { width: 34px; height: 34px; border: 3px solid rgba(139, 92, 246, 0.25); border-top-color: #8b5cf6; border-radius: 50%; margin: 30px auto; animation: sp 0.8s linear infinite; }
@keyframes sp { to { transform: rotate(360deg); } }
.msg { text-align: center; color: #f87171; font-size: 13px; margin-top: 10px; min-height: 16px; }
.foot { text-align: center; color: #475569; font-size: 11px; margin-top: 16px; }
</style>
<div class="card">
    <div class="logo">⚡ BOT-API ⚡</div>
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
        <div class="btns" id="ansBtns">
            <button class="b1" onclick="G.answer(0)">Sí</button>
            <button class="b2" onclick="G.answer(1)">No</button>
            <button class="b3" onclick="G.answer(2)">No sé</button>
            <button class="b4" onclick="G.answer(3)">Probablemente sí</button>
            <button class="b5" onclick="G.answer(4)">Probablemente no</button>
            <button class="bback" onclick="G.back()" id="btnBack">↩️ Atrás</button>
        </div>
    </div>
    <div id="scr-guess" class="hidden">
        <img class="face" id="gImg" src="" alt="" onerror="this.style.visibility='hidden'">
        <div class="gname" id="gName"></div>
        <div class="gdesc" id="gDesc"></div>
        <div class="btns">
            <button class="b1" onclick="G.verdict(true)">✅ Sí, es él/ella</button>
            <button class="b2" onclick="G.verdict(false)">❌ No, sigue intentando</button>
        </div>
    </div>
    <div id="scr-end" class="hidden">
        <div class="genie" id="endEmoji">🎉</div>
        <h1 id="endTitle"></h1>
        <p class="sub" id="endText"></p>
        <button class="bstart" onclick="location.reload()">🔄 Jugar de nuevo</button>
    </div>
    <div id="scr-load" class="hidden"><div class="spin"></div></div>
    <div class="msg" id="msg"></div>
    <div class="foot">🧞 Powered by Akinator · 💙 BOT-API</div>
</div>
<script>
(function(){
const G = {
    servers: ['https://api.akinator.org', 'https://server2.akinator.com:9142'],
    server: null, ses: null, sig: null, step: 0, hist: [], guesses: [], busy: false,
    $: id => document.getElementById(id),
    show(id) { ['scr-start','scr-q','scr-guess','scr-end','scr-load'].forEach(s => this.$(s).classList.toggle('hidden', s !== id)); },
    err(t) { this.$('msg').textContent = t; },
    base(extra) { return `childMod=false&player=website-desktop&partner=1&${extra}`; },
    async api(path, params) {
        for (const sv of (this.server ? [this.server, ...this.servers.filter(s => s !== this.server)] : this.servers)) {
            try {
                const r = await fetch(`${sv}/ws/${path}?${params}`, { signal: AbortSignal.timeout(12000) });
                const j = await r.json();
                if (j.completion === 'OK') { this.server = sv; return j.parameters; }
            } catch (e) {}
        }
        return null;
    },
    async start() {
        this.err(''); this.show('scr-load');
        const uid = 'botapi-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
        const p = await this.api('new_session.php', this.base(`uid_ext_session=${uid}&turkMode=undefined&softConstraint=undefined&language=es&_=${Date.now()}`));
        if (!p) { this.show('scr-start'); return this.err('❌ No pude conectar con Akinator. Intenta de nuevo.'); }
        this.ses = p.session; this.sig = p.signature; this.step = 0; this.hist = []; this.guesses = [];
        this.showQ(p);
    },
    showQ(p) {
        this.step = parseInt(p.step ?? this.step);
        this.show('scr-q');
        this.$('qText').textContent = p.question || '...';
        const prog = parseInt(String(p.progression || '0').replace('%', '')) || 0;
        this.$('prog').style.width = prog + '%';
        this.$('progT').textContent = prog + '%';
        this.$('stepN').textContent = 'Pregunta ' + (this.step + 1);
        this.$('btnBack').style.display = this.hist.length ? '' : 'none';
        this.setBtns(true);
    },
    setBtns(on) { this.$('ansBtns').querySelectorAll('button').forEach(b => b.disabled = !on); },
    async answer(a) {
        if (this.busy) return; this.busy = true; this.setBtns(false); this.err('');
        this.hist.push(a);
        const p = await this.api('answer_api.php', this.base(`session=${this.ses}&signature=${this.sig}&step=${this.step}&answer=${a}&_=${Date.now()}`));
        this.busy = false;
        if (!p) { this.setBtns(true); return this.err('⚠️ Error de conexión, reintenta.'); }
        if (p.elements?.length) return this.showGuess(p.elements);
        this.showQ(p);
    },
    async back() {
        if (!this.hist.length || this.busy) return;
        this.busy = true; this.setBtns(false); this.err('');
        const p = await this.api('list_answers.php', this.base(`session=${this.ses}&signature=${this.sig}&step=${this.step}&_=${Date.now()}`));
        this.busy = false;
        if (!p) { this.setBtns(true); return this.err('⚠️ No pude retroceder.'); }
        this.hist.pop(); this.step = Math.max(0, this.step - 1);
        this.showQ({ ...p, step: this.step });
    },
    showGuess(els) {
        const el = (els.find(e => !this.guesses.includes(e.element.name)) || els[0]).element;
        this.curGuess = el; this.show('scr-guess');
        let img = el.photo || '';
        if (img && !img.startsWith('http')) img = 'https://media.akinator.com' + img;
        this.$('gImg').src = img; this.$('gImg').style.visibility = img ? 'visible' : 'hidden';
        this.$('gName').textContent = el.name + (el.pseudo ? ' (' + el.pseudo + ')' : '');
        this.$('gDesc').textContent = el.description || '';
    },
    async verdict(win) {
        if (win) {
            this.show('scr-end'); this.$('endEmoji').textContent = '🎉';
            this.$('endTitle').textContent = '¡GANÉ!';
            this.$('endText').textContent = 'Leí tu mente: ' + this.curGuess.name + ' 🧞⚡';
            return;
        }
        this.guesses.push(this.curGuess.name); this.err(''); this.show('scr-load');
        const p = await this.api('choice_selection.php', this.base(`session=${this.ses}&signature=${this.sig}&step=${this.step}&_=${Date.now()}`));
        if (p?.elements?.length && p.elements.length > this.guesses.length) return this.showGuess(p.elements);
        const q = await this.api('question.php', this.base(`session=${this.ses}&signature=${this.sig}&step=${this.step}&_=${Date.now()}`));
        if (q) return this.showQ(q);
        this.show('scr-end'); this.$('endEmoji').textContent = '🏳️';
        this.$('endTitle').textContent = 'Me ganaste';
        this.$('endText').textContent = 'No pude adivinar tu personaje. ¡Eres un crack! 🧠';
    }
};
window.G = G;
})();
</script>`;

            await enviarHtmlInteractivo(sock, from, htmlPayload, '@AKINATOR', 'akinator');
        } catch (error) {
            console.error('[AKINATOR] Error:', error);
            await responder.texto('❌ Error al iniciar el juego.');
        }
    }
};