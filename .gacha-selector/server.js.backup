import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ============================================================
// RUTAS
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = path.join(
    process.env.HOME,
    'BOT-API'
);

const SELECTOR_DIR = path.join(
    BASE,
    '.gacha-selector'
);

const STORAGE_DIR = path.join(
    process.env.HOME,
    'storage',
    'shared'
);

const GACHA_DIR = path.join(
    BASE,
    'media',
    'gacha',
    'jpg'
);

const PORT = 8765;

// ============================================================
// CONFIGURACIÓN
// ============================================================

const EXTENSIONES = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp'
];

const TIPOS_IMAGEN = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
};

// ============================================================
// CREAR CARPETAS NECESARIAS
// ============================================================

fs.mkdirSync(
    SELECTOR_DIR,
    {
        recursive: true
    }
);

fs.mkdirSync(
    GACHA_DIR,
    {
        recursive: true
    }
);

// ============================================================
// BUSCAR IMÁGENES DEL TELÉFONO
// ============================================================

function buscarImagenes(
    directorio,
    resultado = []
) {

    let entradas;

    try {

        entradas =
            fs.readdirSync(
                directorio,
                {
                    withFileTypes: true
                }
            );

    } catch {

        return resultado;
    }

    for (
        const entrada
        of entradas
    ) {

        const nombre =
            entrada.name;

        // --------------------------------------------
        // Ignorar carpetas innecesarias
        // --------------------------------------------

        if (
            nombre === 'Android' ||
            nombre === '.thumbnails' ||
            nombre === '.trashed' ||
            nombre === 'cache' ||
            nombre === 'data' ||
            nombre === 'node_modules'
        ) {

            continue;
        }

        const completo =
            path.join(
                directorio,
                nombre
            );

        try {

            // ----------------------------------------
            // Entrar en subcarpetas
            // ----------------------------------------

            if (
                entrada.isDirectory()
            ) {

                buscarImagenes(
                    completo,
                    resultado
                );

                continue;
            }

            // ----------------------------------------
            // Buscar imágenes
            // ----------------------------------------

            if (
                entrada.isFile()
            ) {

                const extension =
                    path.extname(
                        nombre
                    ).toLowerCase();

                if (
                    EXTENSIONES.includes(
                        extension
                    )
                ) {

                    resultado.push(
                        completo
                    );
                }
            }

        } catch {
            // Ignorar archivos inaccesibles
        }
    }

    return resultado;
}

// ============================================================
// CARGAR IMÁGENES
// ============================================================

let imagenes =
    buscarImagenes(
        STORAGE_DIR
    );

// Eliminar duplicados
imagenes = [
    ...new Set(imagenes)
];

// Ordenar
imagenes.sort(
    (a, b) =>
        path.basename(a)
            .localeCompare(
                path.basename(b),
                'es',
                {
                    numeric: true
                }
            )
);

console.log(
    `📸 Imágenes encontradas: ${imagenes.length}`
);

// ============================================================
// ESCAPAR HTML
// ============================================================

function escapar(
    texto
) {

    return String(texto)
        .replaceAll(
            '&',
            '&amp;'
        )
        .replaceAll(
            '<',
            '&lt;'
        )
        .replaceAll(
            '>',
            '&gt;'
        )
        .replaceAll(
            '"',
            '&quot;'
        )
        .replaceAll(
            "'",
            '&#039;'
        );
}

// ============================================================
// GENERAR TARJETAS DE IMÁGENES
// ============================================================

function generarTarjetas() {

    return imagenes
        .map(
            (
                archivo,
                indice
            ) => {

                const nombre =
                    path.basename(
                        archivo
                    );

                return `
<div
    class="card"
    data-name="${escapar(
        nombre.toLowerCase()
    )}"
>

    <label>

        <input
            type="checkbox"
            class="foto"
            value="${indice}"
        >

        <div class="check-mark">
            ✓
        </div>

        <div class="imagen">

            <img
                src="/image?id=${indice}"
                alt="${escapar(nombre)}"
                loading="lazy"
            >

        </div>

        <div class="nombre">
            ${escapar(nombre)}
        </div>

        <div class="numero">
            #${indice + 1}
        </div>

    </label>

</div>
`;

            }
        )
        .join('');
}

// ============================================================
// HTML PRINCIPAL
// ============================================================

function generarHTML() {

    const tarjetas =
        generarTarjetas();

    return `<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<meta
    name="theme-color"
    content="#0b0b14"
>

<title>
    🎰 Selector Gacha
</title>

<style>

/* ============================================================
   RESET
   ============================================================ */

* {
    box-sizing: border-box;
}

/* ============================================================
   BODY
   ============================================================ */

body {

    margin: 0;

    min-height: 100vh;

    color: #ffffff;

    font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

    background:
        radial-gradient(
            circle at top left,
            #30206b 0%,
            transparent 35%
        ),
        radial-gradient(
            circle at top right,
            #164e63 0%,
            transparent 30%
        ),
        #08080f;

}

/* ============================================================
   HEADER
   ============================================================ */

header {

    position: sticky;

    top: 0;

    z-index: 50;

    padding: 18px;

    background:
        rgba(
            8,
            8,
            15,
            .90
        );

    border-bottom:
        1px solid
        rgba(
            255,
            255,
            255,
            .08
        );

    backdrop-filter:
        blur(18px);

}

/* ============================================================
   TITULO
   ============================================================ */

h1 {

    margin: 0;

    font-size: 25px;

    font-weight: 800;

    letter-spacing: -.5px;

}

.subtitulo {

    margin-top: 5px;

    color: #a8a8b8;

    font-size: 13px;

}

/* ============================================================
   CONTROLES
   ============================================================ */

.controles {

    display: flex;

    gap: 8px;

    flex-wrap: wrap;

    margin-top: 15px;

}

button,
input[type="text"] {

    min-height: 44px;

    border: 0;

    border-radius: 13px;

    font-size: 14px;

}

button {

    padding:
        0 15px;

    color: white;

    font-weight: 700;

    cursor: pointer;

    background:
        linear-gradient(
            135deg,
            #6955ff,
            #8b5cf6
        );

}

button:active {

    transform:
        scale(.96);

}

button.secundario {

    background:
        rgba(
            255,
            255,
            255,
            .09
        );

}

button.final {

    background:
        linear-gradient(
            135deg,
            #00c853,
            #00a844
        );

}

button:disabled {

    opacity: .55;

    cursor:
        not-allowed;

}

#buscador {

    flex: 1;

    min-width: 190px;

    padding:
        0 14px;

    outline: none;

    color: white;

    background:
        rgba(
            255,
            255,
            255,
            .08
        );

    border:
        1px solid
        rgba(
            255,
            255,
            255,
            .08
        );

}

#buscador::placeholder {

    color:
        #858596;

}

/* ============================================================
   CONTADOR
   ============================================================ */

.contador {

    margin-top: 12px;

    color: #cfcfe0;

    font-size: 14px;

}

#contador {

    color: #8b7cff;

    font-size: 17px;

}

/* ============================================================
   GRID
   ============================================================ */

.grid {

    display: grid;

    grid-template-columns:
        repeat(
            auto-fill,
            minmax(
                145px,
                1fr
            )
        );

    gap: 12px;

    padding: 15px;

}

/* ============================================================
   TARJETA
   ============================================================ */

.card {

    position: relative;

    overflow: hidden;

    border:
        1px solid
        rgba(
            255,
            255,
            255,
            .09
        );

    border-radius: 17px;

    background:
        rgba(
            255,
            255,
            255,
            .055
        );

    transition:
        transform .15s ease,
        border-color .15s ease,
        box-shadow .15s ease;

}

.card label {

    display: block;

    position: relative;

    cursor: pointer;

}

/* ============================================================
   CHECKBOX
   ============================================================ */

.card input {

    position: absolute;

    opacity: 0;

    pointer-events: none;

}

/* ============================================================
   MARCA VISUAL
   ============================================================ */

.check-mark {

    position: absolute;

    top: 8px;

    left: 8px;

    z-index: 5;

    width: 27px;

    height: 27px;

    display: flex;

    align-items: center;

    justify-content: center;

    border:
        2px solid
        rgba(
            255,
            255,
            255,
            .7
        );

    border-radius: 9px;

    color: transparent;

    background:
        rgba(
            0,
            0,
            0,
            .45
        );

    transition:
        .15s ease;

}

.card:has(
    input:checked
) {

    border-color:
        #8b7cff;

    transform:
        translateY(-2px);

    box-shadow:
        0 0 0 2px
        rgba(
            139,
            124,
            255,
            .25
        ),
        0 12px 30px
        rgba(
            0,
            0,
            0,
            .35
        );

}

.card:has(
    input:checked
) .check-mark {

    color: white;

    border-color:
        #8b7cff;

    background:
        #6955ff;

}

/* ============================================================
   IMAGEN
   ============================================================ */

.imagen {

    width: 100%;

    height: 175px;

    overflow: hidden;

    background:
        #11111a;

}

.imagen img {

    display: block;

    width: 100%;

    height: 100%;

    object-fit: cover;

}

/* ============================================================
   NOMBRE
   ============================================================ */

.nombre {

    padding:
        9px;

    overflow: hidden;

    color: #ddddE8;

    font-size: 11px;

    white-space: nowrap;

    text-overflow:
        ellipsis;

}

/* ============================================================
   NUMERO
   ============================================================ */

.numero {

    position: absolute;

    top: 8px;

    right: 8px;

    padding:
        4px 7px;

    border-radius: 8px;

    color: #fff;

    font-size: 10px;

    background:
        rgba(
            0,
            0,
            0,
            .65
        );

}

/* ============================================================
   MENSAJE
   ============================================================ */

#mensaje {

    display: none;

    position: fixed;

    inset: 0;

    z-index: 100;

    align-items: center;

    justify-content: center;

    padding: 20px;

    background:
        rgba(
            0,
            0,
            0,
            .80
        );

    backdrop-filter:
        blur(8px);

}

.mensaje-box {

    width: 100%;

    max-width: 380px;

    padding: 28px;

    text-align: center;

    border:
        1px solid
        rgba(
            255,
            255,
            255,
            .1
        );

    border-radius: 22px;

    background:
        #171722;

    box-shadow:
        0 25px 80px
        rgba(
            0,
            0,
            0,
            .6
        );

}

.exito {

    margin-bottom: 10px;

    font-size: 38px;

}

#mensajeTexto {

    margin: 0;

    color: #d8d8e5;

    line-height: 1.5;

}

</style>

</head>

<body>

<header>

    <h1>
        🎰 Selector Gacha
    </h1>

    <div class="subtitulo">
        Selecciona exactamente las fotos
        que quieres usar en el Gacha.
    </div>

    <div class="controles">

        <input
            id="buscador"
            type="text"
            placeholder="🔎 Buscar foto..."
            autocomplete="off"
        >

        <button
            type="button"
            id="btnTodas"
        >
            ☑️ Todas
        </button>

        <button
            type="button"
            class="secundario"
            id="btnNinguna"
        >
            ❌ Ninguna
        </button>

        <button
            type="button"
            class="final"
            id="btnListo"
        >
            ✅ LISTO
        </button>

    </div>

    <div class="contador">

        Seleccionadas:
        <strong id="contador">
            0
        </strong>

        /
        ${imagenes.length}

    </div>

</header>

<main
    class="grid"
    id="grid"
>
    ${tarjetas}
</main>

<div id="mensaje">

    <div class="mensaje-box">

        <div class="exito">
            🎰
        </div>

        <p id="mensajeTexto">
            Preparando...
        </p>

    </div>

</div>

<!-- ========================================================== -->
     <script>

// ============================================================
// ELEMENTOS
// ============================================================

const checks = [
    ...document.querySelectorAll('.foto')
];

const contador =
    document.getElementById('contador');

const buscador =
    document.getElementById('buscador');

const btnTodas =
    document.getElementById('btnTodas');

const btnNinguna =
    document.getElementById('btnNinguna');

const btnListo =
    document.getElementById('btnListo');

const mensaje =
    document.getElementById('mensaje');

const mensajeTexto =
    document.getElementById('mensajeTexto');

// ============================================================
// CONTADOR
// ============================================================

function actualizarContador() {

    const seleccionadas =
        document.querySelectorAll(
            '.foto:checked'
        ).length;

    contador.textContent =
        seleccionadas;
}

// ============================================================
// ACTUALIZAR CUANDO SE MARCA UNA FOTO
// ============================================================

checks.forEach(
    check => {

        check.addEventListener(
            'change',
            actualizarContador
        );

    }
);

// ============================================================
// SELECCIONAR TODAS
// ============================================================

function seleccionarTodas() {

    checks.forEach(
        check => {

            check.checked = true;

        }
    );

    actualizarContador();

}

// ============================================================
// QUITAR TODAS
// ============================================================

function quitarTodas() {

    checks.forEach(
        check => {

            check.checked = false;

        }
    );

    actualizarContador();

}

// ============================================================
// BOTÓN TODAS
// ============================================================

btnTodas.addEventListener(
    'click',
    function(event) {

        event.preventDefault();

        seleccionarTodas();

    }
);

// ============================================================
// BOTÓN NINGUNA
// ============================================================

btnNinguna.addEventListener(
    'click',
    function(event) {

        event.preventDefault();

        quitarTodas();

    }
);

// ============================================================
// BUSCADOR
// ============================================================

buscador.addEventListener(
    'input',
    function() {

        const texto =
            buscador.value
                .toLowerCase()
                .trim();

        const tarjetas =
            document.querySelectorAll(
                '.card'
            );

        tarjetas.forEach(
            card => {

                const nombre =
                    card.dataset.name;

                if (
                    nombre.includes(texto)
                ) {

                    card.style.display =
                        '';

                } else {

                    card.style.display =
                        'none';

                }

            }
        );

    }
);

// ============================================================
// MOSTRAR MENSAJE
// ============================================================

function mostrarMensaje(
    texto
) {

    mensajeTexto.textContent =
        texto;

    mensaje.style.display =
        'flex';

}

// ============================================================
// OCULTAR MENSAJE
// ============================================================

function ocultarMensaje() {

    mensaje.style.display =
        'none';

}

// ============================================================
// OBTENER SELECCIÓN
// ============================================================

function obtenerSeleccionadas() {

    return checks
        .filter(
            check =>
                check.checked
        )
        .map(
            check =>
                Number(
                    check.value
                )
        );

}

// ============================================================
// BOTÓN LISTO
// ============================================================

btnListo.addEventListener(
    'click',
    async function(event) {

        event.preventDefault();

        const seleccionadas =
            obtenerSeleccionadas();

        // ----------------------------------------------------
        // COMPROBAR QUE HAYA FOTOS
        // ----------------------------------------------------

        if (
            seleccionadas.length === 0
        ) {

            alert(
                '⚠️ Selecciona al menos una foto.'
            );

            return;

        }

        // ----------------------------------------------------
        // CONFIRMAR
        // ----------------------------------------------------

        const confirmar =
            confirm(
                '🎰 Seleccionaste ' +
                seleccionadas.length +
                ' foto(s).\n\n' +
                'Estas serán las nuevas fotos ' +
                'del Gacha.\n\n' +
                '¿Quieres continuar?'
            );

        if (!confirmar) {

            return;

        }

        // ----------------------------------------------------
        // DESACTIVAR BOTÓN
        // ----------------------------------------------------

        btnListo.disabled =
            true;

        btnTodas.disabled =
            true;

        btnNinguna.disabled =
            true;

        buscador.disabled =
            true;

        // ----------------------------------------------------
        // MOSTRAR CARGANDO
        // ----------------------------------------------------

        mostrarMensaje(
            '📦 Guardando ' +
            seleccionadas.length +
            ' foto(s)...'
        );

        // ----------------------------------------------------
        // ENVIAR AL SERVIDOR
        // ----------------------------------------------------

        try {

            const respuesta =
                await fetch(
                    '/seleccionar',
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body:
                            JSON.stringify({
                                indices:
                                    seleccionadas
                            })
                    }
                );

            // ------------------------------------------------
            // COMPROBAR RESPUESTA HTTP
            // ------------------------------------------------

            if (
                !respuesta.ok
            ) {

                throw new Error(
                    'El servidor respondió ' +
                    respuesta.status
                );

            }

            // ------------------------------------------------
            // LEER JSON
            // ------------------------------------------------

            const resultado =
                await respuesta.json();

            // ------------------------------------------------
            // COMPROBAR RESULTADO
            // ------------------------------------------------

            if (
                !resultado.ok
            ) {

                throw new Error(
                    resultado.error ||
                    'No se pudo guardar la selección.'
                );

            }

            // ------------------------------------------------
            // MOSTRAR ÉXITO
            // ------------------------------------------------

            mostrarMensaje(
                '✅ ¡Listo!\n\n' +
                resultado.cantidad +
                ' foto(s) fueron guardadas correctamente.'
            );

            // ------------------------------------------------
            // CAMBIAR BOTÓN
            // ------------------------------------------------

            btnListo.textContent =
                '✅ GUARDADO';

            // ------------------------------------------------
            // DESPUÉS DE UN MOMENTO
            // ------------------------------------------------

            setTimeout(
                function() {

                    mensajeTexto.textContent =
                        '🎰 Gacha actualizado.\n\n' +
                        'Ya puedes cerrar esta página.';

                },
                1800
            );

        } catch (error) {

            console.error(
                'Error:',
                error
            );

            // ------------------------------------------------
            // MOSTRAR ERROR
            // ------------------------------------------------

            mostrarMensaje(
                '❌ No se pudo guardar.\n\n' +
                error.message
            );

            // ------------------------------------------------
            // VOLVER A ACTIVAR CONTROLES
            // ------------------------------------------------

            btnListo.disabled =
                false;

            btnTodas.disabled =
                false;

            btnNinguna.disabled =
                false;

            buscador.disabled =
                false;

            btnListo.textContent =
                '✅ LISTO';

        }

    }
);

// ============================================================
// INICIALIZAR
// ============================================================

actualizarContador();

</script>

</body>

</html>`;
 
}
// ============================================================
// SERVIDOR HTTP
// ============================================================

const server = http.createServer(
    async (req, res) => {

        try {

            const url =
                new URL(
                    req.url,
                    `http://127.0.0.1:${PORT}`
                );

            // =================================================
            // PÁGINA PRINCIPAL
            // =================================================

            if (
                req.method === 'GET' &&
                url.pathname === '/'
            ) {

                const html =
                    generarHTML();

                res.writeHead(
                    200,
                    {
                        'Content-Type':
                            'text/html; charset=utf-8',

                        'Cache-Control':
                            'no-store'
                    }
                );

                res.end(
                    html
                );

                console.log(
                    '🌐 Página abierta'
                );

                return;
            }

            // =================================================
            // SERVIR IMÁGENES
            // =================================================

            if (
                req.method === 'GET' &&
                url.pathname === '/image'
            ) {

                const id =
                    Number(
                        url.searchParams.get(
                            'id'
                        )
                    );

                // ---------------------------------------------
                // Validar ID
                // ---------------------------------------------

                if (
                    !Number.isInteger(id) ||
                    id < 0 ||
                    id >= imagenes.length
                ) {

                    res.writeHead(
                        404,
                        {
                            'Content-Type':
                                'text/plain; charset=utf-8'
                        }
                    );

                    res.end(
                        'Imagen no encontrada'
                    );

                    return;
                }

                const archivo =
                    imagenes[id];

                // ---------------------------------------------
                // Comprobar que existe
                // ---------------------------------------------

                if (
                    !fs.existsSync(
                        archivo
                    )
                ) {

                    res.writeHead(
                        404,
                        {
                            'Content-Type':
                                'text/plain; charset=utf-8'
                        }
                    );

                    res.end(
                        'Archivo no encontrado'
                    );

                    return;
                }

                // ---------------------------------------------
                // Tipo de imagen
                // ---------------------------------------------

                const extension =
                    path.extname(
                        archivo
                    ).toLowerCase();

                const tipo =
                    TIPOS_IMAGEN[
                        extension
                    ] ||
                    'application/octet-stream';

                // ---------------------------------------------
                // Enviar imagen
                // ---------------------------------------------

                res.writeHead(
                    200,
                    {
                        'Content-Type':
                            tipo,

                        'Cache-Control':
                            'public, max-age=3600'
                    }
                );

                const stream =
                    fs.createReadStream(
                        archivo
                    );

                stream.on(
                    'error',
                    error => {

                        console.error(
                            '❌ Error enviando imagen:',
                            error.message
                        );

                        if (
                            !res.headersSent
                        ) {

                            res.writeHead(
                                500
                            );

                        }

                        res.end();
                    }
                );

                stream.pipe(
                    res
                );

                return;
            }

            // =================================================
            // RECIBIR SELECCIÓN
            // =================================================

            if (
                req.method === 'POST' &&
                url.pathname === '/seleccionar'
            ) {

                console.log(
                    '📥 Recibiendo selección...'
                );

                let body = '';

                req.on(
                    'data',
                    chunk => {

                        body +=
                            chunk.toString();

                        // Evitar peticiones
                        // exageradamente grandes
                        if (
                            body.length >
                            1024 * 1024
                        ) {

                            req.destroy();

                        }

                    }
                );

                req.on(
                    'end',
                    async () => {

                        try {

                            // ---------------------------------
                            // Leer JSON
                            // ---------------------------------

                            let datos;

                            try {

                                datos =
                                    JSON.parse(
                                        body
                                    );

                            } catch {

                                throw new Error(
                                    'Los datos recibidos no son JSON válidos.'
                                );

                            }

                            // ---------------------------------
                            // Validar índices
                            // ---------------------------------

                            if (
                                !datos ||
                                !Array.isArray(
                                    datos.indices
                                )
                            ) {

                                throw new Error(
                                    'La selección no es válida.'
                                );

                            }

                            // ---------------------------------
                            // Eliminar duplicados
                            // ---------------------------------

                            const indices =
                                [
                                    ...new Set(
                                        datos.indices
                                    )
                                ];

                            // ---------------------------------
                            // Validar que haya fotos
                            // ---------------------------------

                            if (
                                indices.length === 0
                            ) {

                                throw new Error(
                                    'No seleccionaste ninguna foto.'
                                );

                            }

                            console.log(
                                `🎰 Fotos seleccionadas: ${indices.length}`
                            );

                            // ---------------------------------
                            // Comprobar índices
                            // ---------------------------------

                            for (
                                const indice
                                of indices
                            ) {

                                if (
                                    !Number.isInteger(
                                        indice
                                    ) ||
                                    indice < 0 ||
                                    indice >= imagenes.length
                                ) {

                                    throw new Error(
                                        `Índice de imagen inválido: ${indice}`
                                    );

                                }

                            }

                            // ---------------------------------
                            // Crear carpeta Gacha
                            // ---------------------------------

                            fs.mkdirSync(
                                GACHA_DIR,
                                {
                                    recursive: true
                                }
                            );

                            // ---------------------------------
                            // LIMPIAR GACHA
                            // ---------------------------------

                            console.log(
                                '🧹 Limpiando Gacha anterior...'
                            );

                            const archivosActuales =
                                fs.readdirSync(
                                    GACHA_DIR
                                );

                            for (
                                const archivo
                                of archivosActuales
                            ) {

                                const completo =
                                    path.join(
                                        GACHA_DIR,
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

                                        console.log(
                                            `🗑️ Eliminada: ${archivo}`
                                        );

                                    }

                                } catch (
                                    error
                                ) {

                                    console.log(
                                        `⚠️ No se pudo eliminar ${archivo}: ${error.message}`
                                    );

                                }

                            }

                            // ---------------------------------
                            // CONTADOR
                            // ---------------------------------

                            let cantidad = 0;

                            // ---------------------------------
                            // COPIAR FOTOS
                            // ---------------------------------

                            for (
                                const indice
                                of indices
                            ) {

                                const origen =
                                    imagenes[
                                        indice
                                    ];

                                if (
                                    !fs.existsSync(
                                        origen
                                    )
                                ) {

                                    console.log(
                                        `⚠️ No existe: ${origen}`
                                    );

                                    continue;

                                }

                                const nombreOriginal =
                                    path.basename(
                                        origen
                                    );

                                const extension =
                                    path.extname(
                                        nombreOriginal
                                    ).toLowerCase();

                                const nombreBase =
                                    path.basename(
                                        nombreOriginal,
                                        extension
                                    );

                                // ---------------------------------
                                // Para evitar problemas con
                                // caracteres raros
                                // ---------------------------------

                                const nombreSeguro =
                                    nombreBase
                                        .replace(
                                            /[^a-zA-Z0-9_-]/g,
                                            '_'
                                        );

                                const destino =
                                    path.join(
                                        GACHA_DIR,
                                        `${String(
                                            cantidad + 1
                                        ).padStart(
                                            2,
                                            '0'
                                        )}_${nombreSeguro}.jpg`
                                    );

                                // ---------------------------------
                                // JPG/JPEG
                                // ---------------------------------

                                if (
                                    extension === '.jpg' ||
                                    extension === '.jpeg'
                                ) {

                                    fs.copyFileSync(
                                        origen,
                                        destino
                                    );

                                    cantidad++;

                                    console.log(
                                        `🎰 Copiada: ${path.basename(destino)}`
                                    );

                                    continue;
                                }

                                // ---------------------------------
                                // PNG / WEBP
                                // ---------------------------------

                                try {

                                    await execFileAsync(
                                        'convert',
                                        [
                                            origen,
                                            '-background',
                                            'white',
                                            '-alpha',
                                            'remove',
                                            '-alpha',
                                            'off',
                                            destino
                                        ]
                                    );

                                    cantidad++;

                                    console.log(
                                        `🔄 Convertida: ${path.basename(destino)}`
                                    );

                                } catch (
                                    conversionError
                                ) {

                                    console.log(
                                        `⚠️ No se pudo convertir ${nombreOriginal}`
                                    );

                                    console.log(
                                        conversionError.message
                                    );

                                    // ---------------------------------
                                    // Intentar copiar como respaldo
                                    // ---------------------------------

                                    try {

                                        fs.copyFileSync(
                                            origen,
                                            destino
                                        );

                                        cantidad++;

                                        console.log(
                                            `📦 Copiada como respaldo: ${path.basename(destino)}`
                                        );

                                    } catch (
                                        copyError
                                    ) {

                                        console.log(
                                            `❌ No se pudo copiar: ${copyError.message}`
                                        );

                                    }

                                }

                            }

                            // ---------------------------------
                            // Comprobar resultado
                            // ---------------------------------

                            if (
                                cantidad === 0
                            ) {

                                throw new Error(
                                    'No se pudo guardar ninguna imagen.'
                                );

                            }

                            // ---------------------------------
                            // Guardar selección
                            // ---------------------------------

                            const seleccionInfo = {

                                cantidad,

                                carpeta:
                                    GACHA_DIR,

                                fecha:
                                    new Date()
                                        .toISOString()

                            };

                            fs.writeFileSync(
                                path.join(
                                    SELECTOR_DIR,
                                    'seleccion.json'
                                ),
                                JSON.stringify(
                                    seleccionInfo,
                                    null,
                                    2
                                )
                            );

                            // ---------------------------------
                            // Mostrar resultado
                            // ---------------------------------

                            console.log('');

                            console.log(
                                '======================================'
                            );

                            console.log(
                                `✅ ${cantidad} foto(s) guardadas`
                            );

                            console.log('');// ============================================================
// RESPUESTA JSON
// ============================================================

res.writeHead(
    200,
    {
        'Content-Type':
            'application/json; charset=utf-8',

        'Cache-Control':
            'no-store'
    }
);

res.end(
    JSON.stringify(
        {
            ok: true,
            cantidad
        }
    )
);

console.log(
    '📤 Respuesta enviada al teléfono.'
);

// ============================================================
// CERRAR SELECTOR
// ============================================================

setTimeout(
    () => {

        server.close(
            () => {

                console.log(
                    '🔴 Selector cerrado correctamente.'
                );

                process.exit(0);

            }
        );

    },
    1000
);

return;

} catch (error) {

    console.error(
        '❌ Error guardando selección:',
        error
    );

    if (!res.headersSent) {

        res.writeHead(
            500,
            {
                'Content-Type':
                    'application/json; charset=utf-8'
            }
        );

    }

    res.end(
        JSON.stringify(
            {
                ok: false,
                error:
                    error.message
            }
        )
    );

}

});

return;
}

// ============================================================
// RUTA NO ENCONTRADA
// ============================================================

res.writeHead(
    404,
    {
        'Content-Type':
            'text/plain; charset=utf-8'
    }
);

res.end(
    '404 - Not Found'
);

} catch (error) {

console.error(
    '❌ Error del servidor:',
    error
);

if (!res.headersSent) {

    res.writeHead(
        500,
        {
            'Content-Type':
                'text/plain; charset=utf-8'
        }
    );

}

res.end(
    '500 - Server Error'
);

}

}
);// ============================================================
// INICIAR SERVIDOR
// ============================================================

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

        console.log(
            `📸 Imágenes disponibles: ${imagenes.length}`
        );

        console.log(
            `📂 Gacha: ${GACHA_DIR}`
        );

        console.log('');

    }
);// ============================================================
// MANEJO DE CIERRE DEL PROCESO
// ============================================================

process.on(
    'SIGINT',
    () => {

        console.log('');
        console.log(
            '🛑 Cerrando selector...'
        );

        server.close(
            () => {

                console.log(
                    '✅ Selector cerrado.'
                );

                process.exit(0);

            }
        );

    }
);

process.on(
    'SIGTERM',
    () => {

        console.log(
            '🛑 Selector detenido.'
        );

        server.close(
            () => {

                process.exit(0);

            }
        );

    }
);

// ============================================================
// FIN DEL SELECTOR GACHA
// ============================================================
