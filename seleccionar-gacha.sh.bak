#!/data/data/com.termux/files/usr/bin/bash

# ============================================================
# 🎰 SELECTOR VISUAL DE FOTOS PARA GACHA
# Proyecto: BOT-API
# ============================================================

set -u

BASE="$HOME/BOT-API"
SELECTOR="$BASE/.gacha-selector"
GACHA="$BASE/media/gacha"
PORT=8765

echo "🎰 Iniciando selector visual..."
echo

# ------------------------------------------------------------
# Crear carpetas
# ------------------------------------------------------------

mkdir -p "$SELECTOR"
mkdir -p "$GACHA"

# ------------------------------------------------------------
# Verificar almacenamiento
# ------------------------------------------------------------

if [ ! -d "$HOME/storage/shared" ]; then
    echo "⚠️ No existe el almacenamiento compartido."
    echo
    echo "Ejecuta:"
    echo "termux-setup-storage"
    exit 1
fi

# ------------------------------------------------------------
# Limpiar selector anterior
# ------------------------------------------------------------

rm -f "$SELECTOR/server.js"
rm -f "$SELECTOR/seleccion.json"
rm -f "$SELECTOR/index.html"

# ------------------------------------------------------------
# Crear servidor Node temporal
# ------------------------------------------------------------

cat > "$SELECTOR/server.js" <<'NODE'
import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

const HOME = process.env.HOME;
const BASE = path.join(HOME, 'BOT-API');
const SELECTOR = path.join(BASE, '.gacha-selector');
const GACHA = path.join(BASE, 'media', 'gacha');

const PORT = 8765;

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp)$/i;

// ------------------------------------------------------------
// Buscar imágenes
// ------------------------------------------------------------

function buscarImagenes(dir, resultado = []) {
    let entradas;

    try {
        entradas = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return resultado;
    }

    for (const entrada of entradas) {
        const nombre = entrada.name;

        // Evitar carpetas problemáticas
        if (
            nombre === 'Android' ||
            nombre === '.thumbnails' ||
            nombre === '.trashed'
        ) {
            continue;
        }

        const completo = path.join(dir, nombre);

        try {
            if (entrada.isDirectory()) {
                buscarImagenes(completo, resultado);
            } else if (
                entrada.isFile() &&
                IMAGE_EXTENSIONS.test(nombre)
            ) {
                resultado.push(completo);
            }
        } catch {}
    }

    return resultado;
}

// ------------------------------------------------------------
// Imágenes disponibles del teléfono
// ------------------------------------------------------------

const STORAGE = path.join(HOME, 'storage', 'shared');

let imagenes = buscarImagenes(STORAGE);

// Eliminar duplicados
imagenes = [...new Set(imagenes)];

// Ordenar por nombre
imagenes.sort((a, b) => a.localeCompare(b));

console.log(`📸 Imágenes encontradas: ${imagenes.length}`);

// ------------------------------------------------------------
// HTML
// ------------------------------------------------------------

function escapar(texto) {
    return texto
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function generarHTML() {
    const tarjetas = imagenes.map((archivo, index) => {
        const nombre = path.basename(archivo);

        return `
        <div class="card" data-name="${escapar(nombre.toLowerCase())}">
            <label>
                <input
                    type="checkbox"
                    class="foto"
                    value="${index}"
                >

                <div class="imagen">
                    <img
                        src="/image?id=${index}"
                        loading="lazy"
                    >
                </div>

                <div class="nombre">
                    ${escapar(nombre)}
                </div>

                <div class="numero">
                    #${index + 1}
                </div>
            </label>
        </div>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>🎰 Selector Gacha</title>

<style>

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    background:
        radial-gradient(circle at top, #24243e, #09090f 60%);
    color: white;
    font-family:
        Arial,
        Helvetica,
        sans-serif;
}

header {
    position: sticky;
    top: 0;
    z-index: 20;

    padding: 18px;

    background: rgba(10,10,20,.92);
    backdrop-filter: blur(15px);

    border-bottom: 1px solid rgba(255,255,255,.08);
}

h1 {
    margin: 0 0 5px;
    font-size: 24px;
}

.sub {
    color: #aaa;
    font-size: 14px;
}

.controles {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 15px;
}

button,
input[type="text"] {
    border: 0;
    border-radius: 12px;
    padding: 12px 15px;
    font-size: 14px;
}

button {
    background: #6c5ce7;
    color: white;
    font-weight: bold;
}

button.secundario {
    background: #29293a;
}

button.final {
    background: linear-gradient(135deg, #00c853, #00a844);
}

#buscador {
    flex: 1;
    min-width: 180px;
    background: #20202d;
    color: white;
    outline: none;
}

.contador {
    margin-top: 12px;
    font-size: 15px;
    color: #ddd;
}

.grid {
    padding: 15px;

    display: grid;
    grid-template-columns:
        repeat(auto-fill, minmax(145px, 1fr));

    gap: 12px;
}

.card {
    position: relative;

    background: rgba(255,255,255,.06);

    border: 1px solid rgba(255,255,255,.08);

    border-radius: 16px;

    overflow: hidden;

    transition:
        transform .15s,
        border-color .15s,
        box-shadow .15s;
}

.card:has(input:checked) {
    border-color: #7c6cff;

    box-shadow:
        0 0 0 2px rgba(124,108,255,.25),
        0 10px 30px rgba(0,0,0,.3);

    transform: translateY(-2px);
}

.card label {
    display: block;
    cursor: pointer;
}

.card input {
    position: absolute;
    z-index: 5;

    width: 22px;
    height: 22px;

    top: 8px;
    left: 8px;
}

.imagen {
    width: 100%;
    height: 160px;

    background: #111;

    display: flex;
    align-items: center;
    justify-content: center;
}

.imagen img {
    width: 100%;
    height: 100%;

    object-fit: cover;
}

.nombre {
    padding: 8px;

    font-size: 12px;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    color: #ddd;
}

.numero {
    position: absolute;

    right: 7px;
    top: 7px;

    background: rgba(0,0,0,.7);

    padding: 4px 7px;

    border-radius: 8px;

    font-size: 11px;
}

#mensaje {
    display: none;

    position: fixed;

    inset: 0;

    z-index: 100;

    background: rgba(0,0,0,.75);

    align-items: center;
    justify-content: center;

    padding: 25px;
}

.mensaje-box {
    background: #181824;

    padding: 25px;

    border-radius: 20px;

    text-align: center;

    max-width: 400px;

    box-shadow:
        0 20px 80px rgba(0,0,0,.6);
}

.exito {
    color: #00e676;
    font-size: 25px;
    margin-bottom: 10px;
}

</style>
</head>

<body>

<header>

    <h1>🎰 Selector Gacha</h1>

    <div class="sub">
        Elige exactamente las fotos que quieres usar.
    </div>

    <div class="controles">

        <input
            id="buscador"
            type="text"
            placeholder="🔎 Buscar foto..."
        >

        <button onclick="seleccionarTodas()">
            ☑️ Todas
        </button>

        <button
            class="secundario"
            onclick="quitarTodas()"
        >
            ❌ Ninguna
        </button>

        <button
            class="final"
            onclick="terminar()"
        >
            ✅ LISTO
        </button>

    </div>

    <div class="contador">
        Seleccionadas:
        <strong id="contador">0</strong>
    </div>

</header>

<main class="grid" id="grid">

${tarjetas}

</main>

<div id="mensaje">

    <div class="mensaje-box">

        <div class="exito">
            ✅ ¡Listo!
        </div>

        <p id="mensajeTexto">
            Copiando fotos...
        </p>

    </div>

</div>

<script>

const checks =
    [...document.querySelectorAll('.foto')];

const contador =
    document.getElementById('contador');

const buscador =
    document.getElementById('buscador');

function actualizarContador() {

    const cantidad =
        document.querySelectorAll(
            '.foto:checked'
        ).length;

    contador.textContent = cantidad;
}

checks.forEach(check => {
    check.addEventListener(
        'change',
        actualizarContador
    );
});

function seleccionarTodas() {

    checks.forEach(check => {
        check.checked = true;
    });

    actualizarContador();
}

function quitarTodas() {

    checks.forEach(check => {
        check.checked = false;
    });

    actualizarContador();
}

buscador.addEventListener(
    'input',
    () => {

        const texto =
            buscador.value.toLowerCase();

        document
            .querySelectorAll('.card')
            .forEach(card => {

                const nombre =
                    card.dataset.name;

                card.style.display =
                    nombre.includes(texto)
                        ? ''
                        : 'none';

            });
    }
);

async function terminar() {

    const seleccionadas =
        checks
            .filter(check => check.checked)
            .map(check => Number(check.value));

    if (seleccionadas.length === 0) {

        alert(
            '⚠️ Selecciona al menos una foto.'
        );

        return;
    }

    document
        .getElementById('mensaje')
        .style.display = 'flex';

    document
        .getElementById('mensajeTexto')
        .textContent =
        'Copiando ' +
        seleccionadas.length +
        ' foto(s)...';

    try {

        const respuesta =
            await fetch('/seleccionar', {

                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                body: JSON.stringify({
                    indices:
                        seleccionadas
                })

            });

        const resultado =
            await respuesta.json();

        if (!resultado.ok) {
            throw new Error(
                resultado.error ||
                'Error desconocido'
            );
        }

        document
            .getElementById('mensajeTexto')
            .textContent =
            'Se copiaron ' +
            resultado.cantidad +
            ' foto(s) a media/gacha/.';

        setTimeout(() => {

            document
                .getElementById('mensaje')
                .style.display = 'none';

        }, 3000);

    } catch (error) {

        document
            .getElementById('mensajeTexto')
            .textContent =
            '❌ ' + error.message;
    }
}

actualizarContador();

</script>

</body>
</html>
`;
}

// ------------------------------------------------------------
// Servidor
// ------------------------------------------------------------

const server = http.createServer(
    async (req, res) => {

        try {

            const url =
                new URL(
                    req.url,
                    `http://127.0.0.1:${PORT}`
                );

            // Página principal
            if (
                req.method === 'GET' &&
                url.pathname === '/'
            ) {

                const html =
                    generarHTML();

                res.writeHead(200, {
                    'Content-Type':
                        'text/html; charset=utf-8'
                });

                res.end(html);

                return;
            }

            // Imagen
            if (
                req.method === 'GET' &&
                url.pathname === '/image'
            ) {

                const id =
                    Number(url.searchParams.get('id'));

                if (
                    !Number.isInteger(id) ||
                    !imagenes[id]
                ) {

                    res.writeHead(404);
                    res.end('Imagen no encontrada');

                    return;
                }

                const archivo =
                    imagenes[id];

                const extension =
                    path.extname(archivo)
                        .toLowerCase();

                const tipos = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.webp': 'image/webp'
                };

                res.writeHead(200, {
                    'Content-Type':
                        tipos[extension] ||
                        'application/octet-stream',

                    'Cache-Control':
                        'public, max-age=3600'
                });

                fs.createReadStream(
                    archivo
                ).pipe(res);

                return;
            }

            // Recibir selección
            if (
                req.method === 'POST' &&
                url.pathname === '/seleccionar'
            ) {

                let body = '';

                req.on(
                    'data',
                    chunk => {
                        body += chunk;
                    }
                );

                req.on(
                    'end',
                    async () => {

                        try {

                            const datos =
                                JSON.parse(body);

                            if (
                                !Array.isArray(
                                    datos.indices
                                )
                            ) {

                                throw new Error(
                                    'Selección inválida.'
                                );
                            }

                            // Limpiar Gacha
                            const actuales =
                                fs.readdirSync(GACHA);

                            for (
                                const archivo
                                of actuales
                            ) {

                                const completo =
                                    path.join(
                                        GACHA,
                                        archivo
                                    );

                                try {

                                    if (
                                        fs.statSync(
                                            completo
                                        ).isFile()
                                    ) {
                                        fs.unlinkSync(
                                            completo
                                        );
                                    }

                                } catch {}
                            }

                            let cantidad = 0;

                            // Copiar seleccionadas
                            for (
                                const indice
                                of datos.indices
                            ) {

                                if (
                                    !Number.isInteger(
                                        indice
                                    ) ||
                                    !imagenes[indice]
                                ) {
                                    continue;
                                }

                                const origen =
                                    imagenes[indice];

                                const nombre =
                                    path.basename(
                                        origen
                                    );

                                const destino =
                                    path.join(
                                        GACHA,
                                        nombre
                                    );

                                fs.copyFileSync(
                                    origen,
                                    destino
                                );

                                cantidad++;

                                console.log(
                                    `🎰 Copiada: ${nombre}`
                                );
                            }

                            fs.writeFileSync(
                                path.join(
                                    SELECTOR,
                                    'seleccion.json'
                                ),
                                JSON.stringify({
                                    cantidad
                                }, null, 2)
                            );

                            res.writeHead(
                                200,
                                {
                                    'Content-Type':
                                        'application/json'
                                }
                            );

                            res.end(
                                JSON.stringify({
                                    ok: true,
                                    cantidad
                                })
                            );

                            console.log(
                                `\n✅ ${cantidad} foto(s) copiadas a media/gacha/`
                            );

                            // Cerrar después de terminar
                            setTimeout(() => {
                                server.close(() => {
                                    process.exit(0);
                                });
                            }, 1000);

                        } catch (error) {

                            res.writeHead(
                                500,
                                {
                                    'Content-Type':
                                        'application/json'
                                }
                            );

                            res.end(
                                JSON.stringify({
                                    ok: false,
                                    error:
                                        error.message
                                })
                            );
                        }
                    }
                );

                return;
            }

            res.writeHead(404);
            res.end('Not found');

        } catch (error) {

            res.writeHead(500);
            res.end('Server error');
        }
    }
);

server.listen(
    PORT,
    '127.0.0.1',
    () => {

        console.log('');
        console.log(
            '======================================'
        );
        console.log(
            '🎰 SELECTOR GACHA LISTO'
        );
        console.log(
            '======================================'
        );
        console.log('');
        console.log(
            `📱 Abriendo: http://127.0.0.1:${PORT}`
        );
        console.log('');
    }
);
NODE

# ------------------------------------------------------------
# Iniciar servidor
# ------------------------------------------------------------

cd "$BASE"

node "$SELECTOR/server.js" > "$SELECTOR/selector.log" 2>&1 &

SERVER_PID=$!

echo "⏳ Iniciando servidor..."

sleep 2

# ------------------------------------------------------------
# Comprobar que arrancó
# ------------------------------------------------------------

if ! kill -0 "$SERVER_PID" 2>/dev/null; then

    echo
    echo "❌ No se pudo iniciar el selector."
    echo
    cat "$SELECTOR/selector.log"
    exit 1
fi

echo
echo "📱 Abriendo selector visual..."
echo

# ------------------------------------------------------------
# Abrir navegador
# ------------------------------------------------------------

termux-open \
    --view \
    --content-type "text/html" \
    "http://127.0.0.1:$PORT"

echo
echo "======================================"
echo "🎰 SELECTOR ABIERTO"
echo "======================================"
echo
echo "1. Mira las fotos."
echo "2. Marca las que quieras."
echo "3. Pulsa ✅ LISTO."
echo
echo "Las seleccionadas reemplazarán las actuales"
echo "de media/gacha/."
echo
echo "📂 Carpeta:"
echo "$GACHA"
echo
echo "⏳ Esperando selección..."
echo

# ------------------------------------------------------------
# Esperar a que el servidor termine
# ------------------------------------------------------------

while kill -0 "$SERVER_PID" 2>/dev/null; do
    sleep 1
done

echo
echo "======================================"
echo "✅ SELECCIÓN TERMINADA"
echo "======================================"
echo

if [ -f "$SELECTOR/seleccion.json" ]; then

    cat "$SELECTOR/seleccion.json"

    echo
    echo
    echo "📸 Fotos actuales en Gacha:"
    find "$GACHA" \
        -maxdepth 1 \
        -type f \
        -print

else

    echo "⚠️ No se recibió ninguna selección."
fi

echo
