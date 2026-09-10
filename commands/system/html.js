// commands/system/html.js — 🌐 Renderiza HTML VIVO en el chat (+ modo archivo)
import { enviarHtmlInteractivo } from '../../lib/htmlInteractivo.js';

// Limpieza básica: sin iframes/object/embed/meta ni javascript: (anti trucos raros)
function sanitizar(html) {
    return String(html)
        .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<iframe\b[^>]*>/gi, '')
        .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
        .replace(/<embed\b[^>]*>/gi, '')
        .replace(/<meta\b[^>]*>/gi, '')
        .replace(/javascript\s*:/gi, '')
        .trim();
}

export default {
    nombre: 'html',
    categoria: 'Utilidades',
    alias: ['htmlview', 'preview', 'verhtml', 'htmlcard'],
    descripcion: 'Renderiza tu código HTML vivo en el chat',
    uso: '.html <código>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        try {
            const from = msg.key.remoteJid;
            let code = String(argumento || '').trim();

            if (!code) {
                return await responder.texto(
                    '╭━━〔 🌐 𝐈𝐓 𝐏𝐄𝐈 𝐇𝐌 〕━━\n' +
                    '┃\n' +
                    '┃ Mándame código HTML y lo renderizo\n' +
                    '┃ VIVO aquí en el chat (CSS y JS funcionan).\n' +
                    '┃\n' +
                    '┃ Ejemplos:\n' +
                    '┃ .html <h1>HOLA</h1>\n' +
                    '┃ .html <button onclick="alert(\'xd\')">TÓCAME</button>\n' +
                    '┃ .html <marquee style="color:lime">xd xd</marquee>\n' +
                    '┃\n' +
                    '┃ Modo archivo descargable (como antes):\n' +
                    '┃ .html file <código>\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            // Modo archivo: .html file <código>
            const modoFile = /^file\s+/i.test(code);
            if (modoFile) code = code.replace(/^file\s+/i, '').trim();

            // Tope de tamaño para que el mensaje no reviente
            let truncado = false;
            if (code.length > 9000) { code = code.slice(0, 9000); truncado = true; }

            const limpio = sanitizar(code);
            const lineas = code.split('\n').length;
            const bytes = Buffer.byteLength(code, 'utf8');

            if (modoFile) {
                const doc = '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>BOT-API</title>\n</head>\n<body>\n' + limpio + '\n</body>\n</html>';
                await sock.sendMessage(from, {
                    document: Buffer.from(doc, 'utf8'),
                    mimetype: 'text/html',
                    fileName: 'BOT-API-' + Date.now() + '.html',
                    caption: '🌐 Tu HTML como archivo (' + lineas + ' líneas)'
                }, { quoted: msg });
                return;
            }

            // Vista previa VIVA en el chat
            const htmlPayload = `<style>
* { box-sizing: border-box; }
body { margin: 0; background: transparent; font-family: 'Segoe UI', Roboto, Arial, sans-serif; }
.hv-bar { background: linear-gradient(90deg, #0ea5e9, #7c3aed); color: #fff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; padding: 9px 12px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; gap: 8px; }
.hv-frame { background: #0f172a; border: 1px solid rgba(148,163,184,.25); border-top: 0; padding: 14px; min-height: 90px; color: #e2e8f0; overflow: hidden; }
.hv-foot { background: #020617; color: #64748b; font-size: 10px; letter-spacing: 1px; padding: 7px 12px; border-radius: 0 0 12px 12px; font-family: 'Courier New', monospace; }
</style>
<div class="hv-bar"><span>🌐 VISTA PREVIA HTML</span><span id="hvInfo"></span></div>
<div class="hv-frame">
${limpio}
</div>
<div class="hv-foot" id="hvFoot">⚡ renderizado en vivo por BOT-API</div>
<script>
(function(){
  var info = document.getElementById('hvInfo');
  if (info) info.textContent = '${lineas} líneas · ' + ${bytes} + ' B${truncado ? ' · TRUNCADO' : ''}';
  window.onerror = function(m, src, ln){
    var f = document.getElementById('hvFoot');
    if (f) { f.textContent = '⚠️ ERROR JS línea ' + ln + ': ' + m; f.style.color = '#ff6b6b'; }
    return false;
  };
})();
</script>`;

            await enviarHtmlInteractivo(sock, from, htmlPayload, '@HTML', 'htmlprev');
        } catch (error) {
            console.error('[HTML] Error:', error);
            await responder.texto('❌ Error al renderizar el HTML.');
        }
    }
};