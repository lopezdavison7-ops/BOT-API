// ============================================================
// BOT-API
// COMANDO: HTML
// ============================================================
// Genera y envía un ARCHIVO HTML REAL como documento.
//
// Ejemplos:
// .html Hola bro 🔥
// .html BOT-API | Hola bro 🔥
// .html <h1>BOT-API</h1><button onclick="alert('Hola')">Tocar</button>
//
// El archivo es autocontenido: incluye HTML + CSS + JavaScript.
// WhatsApp lo recibe como archivo .html y muestra la opción
// "Descargar". Al abrirlo desde el dispositivo, se ejecuta como
// una página HTML normal.
// ============================================================

function escaparHtml(valor = '') {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escaparAtributo(valor = '') {
    return escaparHtml(valor).replace(/\n/g, ' ');
}

function separarContenido(argumento = '') {
    const texto = String(argumento).trim();

    if (!texto) {
        return {
            titulo: 'BOT-API',
            cuerpo: 'Página HTML interactiva.',
            htmlPersonalizado: false,
        };
    }

    // Si el usuario envía un documento HTML completo, lo conserva.
    if (/<(!doctype|html|head|body)[\s>]/i.test(texto)) {
        return {
            titulo: 'BOT-API',
            cuerpo: texto,
            htmlPersonalizado: true,
        };
    }

    const partes = texto.split(/\s*\|\s*/, 2);

    if (partes.length === 2) {
        return {
            titulo: partes[0].trim().slice(0, 100) || 'BOT-API',
            cuerpo: partes[1].trim(),
            htmlPersonalizado: /<\/?[a-z][\s\S]*>/i.test(partes[1]),
        };
    }

    return {
        titulo: 'BOT-API',
        cuerpo: texto,
        htmlPersonalizado: /<\/?[a-z][\s\S]*>/i.test(texto),
    };
}

function sanitizarHtmlBasico(html) {
    // El archivo se genera localmente. Aun así quitamos elementos
    // que podrían intentar acceder a recursos innecesarios.
    return String(html)
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
        .replace(/<embed\b[^>]*>/gi, '')
        .replace(/javascript\s*:/gi, '')
        .trim();
}

function construirContenido(titulo, cuerpo, htmlPersonalizado) {
    if (htmlPersonalizado) {
        return sanitizarHtmlBasico(cuerpo);
    }

    return `
        <section class="card">
            <div class="badge">🌐 HTML INTERACTIVO</div>
            <h1>${escaparHtml(titulo)}</h1>
            <p>${escaparHtml(cuerpo).replace(/\n/g, '<br>')}</p>
            <button id="boton" type="button">✨ TOCAR</button>
            <div id="resultado" class="resultado"></div>
        </section>
    `;
}

function crearDocumentoHtml({ titulo, cuerpo, htmlPersonalizado }) {
    const contenido = construirContenido(titulo, cuerpo, htmlPersonalizado);
    const tituloSeguro = escaparAtributo(titulo || 'BOT-API');

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#080b16">
<title>${tituloSeguro}</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;font-family:Arial,Helvetica,sans-serif;background:#080b16;color:#fff}
body{display:flex;justify-content:center;align-items:center;padding:24px;background:
radial-gradient(circle at 15% 10%,rgba(0,153,255,.28),transparent 30%),
radial-gradient(circle at 85% 90%,rgba(145,0,255,.25),transparent 32%),#080b16}
.card{width:min(100%,460px);padding:28px;border:1px solid rgba(100,180,255,.25);border-radius:28px;background:rgba(18,24,38,.92);box-shadow:0 20px 70px rgba(0,0,0,.45);text-align:center}
.badge{font-size:13px;font-weight:700;letter-spacing:1.5px;opacity:.75;margin-bottom:16px}
h1{margin:0 0 14px;font-size:32px;line-height:1.1}
p{margin:0 0 24px;color:#c7cfdd;font-size:17px;line-height:1.55;word-break:break-word}
button{border:0;border-radius:15px;padding:15px 24px;font-size:16px;font-weight:800;color:#fff;background:linear-gradient(135deg,#168cff,#7b3cff);box-shadow:0 10px 30px rgba(45,120,255,.28);cursor:pointer}
button:active{transform:scale(.97)}
.resultado{min-height:24px;margin-top:18px;color:#8fc7ff;font-weight:700}
</style>
</head>
<body>
${contenido}
<script>
(function(){
  const boton=document.getElementById('boton');
  const resultado=document.getElementById('resultado');
  if(boton){
    boton.addEventListener('click',function(){
      if(resultado) resultado.textContent='✨ BOT-API • Interactivo';
    });
  }
})();
</script>
</body>
</html>`;
}

const comando = {
    nombre: 'html',
    alias: ['htmlcard'],
    categoria: 'utilidades',
    descripcion: 'Genera y envía una página HTML interactiva como archivo.',
    uso: '.html <contenido>',

    async ejecutar({ sock, msg, jid, argumento, responder }) {
        try {
            const { titulo, cuerpo, htmlPersonalizado } = separarContenido(argumento);
            const html = crearDocumentoHtml({
                titulo,
                cuerpo,
                htmlPersonalizado,
            });

            const archivo = Buffer.from(html, 'utf8');
            const nombre = `BOT-API-${Date.now()}.html`;

            await sock.sendMessage(
                jid,
                {
                    document: archivo,
                    mimetype: 'text/html',
                    fileName: nombre,
                    caption: `🌐 ${titulo}`,
                },
                { quoted: msg }
            );
        } catch (error) {
            console.error('[HTML] Error enviando archivo HTML:', error?.stack || error);

            await responder.text(
                `❌ No se pudo enviar el archivo HTML.\n\n${error?.message || 'Error desconocido'}`
            );
        }
    },
};

export default comando;
