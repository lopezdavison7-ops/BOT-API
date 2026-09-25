

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8787;

const ROOT = path.join(__dirname, '..');

const HTML_FILE = path.join(
    ROOT,
    'lib',
    'gacha-selector.html'
);

const GACHA_DIR = path.join(
    ROOT,
    'media',
    'gacha',
    'jpg'
);

fs.mkdirSync(
    GACHA_DIR,
    {
        recursive: true
    }
);

const server = http.createServer(
    async (req, res) => {

        if (
            req.method === 'GET' &&
            req.url === '/'
        ) {

            try {

                const html =
                    fs.readFileSync(
                        HTML_FILE,
                        'utf8'
                    );

                res.writeHead(
                    200,
                    {
                        'Content-Type':
                            'text/html; charset=utf-8'
                    }
                );

                res.end(html);

            } catch (error) {

                res.writeHead(
                    500,
                    {
                        'Content-Type':
                            'text/plain; charset=utf-8'
                    }
                );

                res.end(
                    'Error cargando selector: ' +
                    error.message
                );
            }

            return;
        }

        if (
            req.method === 'POST' &&
            req.url === '/guardar'
        ) {

            try {

                const body =
                    await recibirBody(req);

                const datos =
                    JSON.parse(body);

                if (
                    !datos.imagenes ||
                    !Array.isArray(datos.imagenes) ||
                    datos.imagenes.length === 0
                ) {

                    throw new Error(
                        'No se recibieron imágenes.'
                    );
                }

                const archivos =
                    fs.readdirSync(GACHA_DIR);

                for (const archivo of archivos) {

                    const ruta =
                        path.join(
                            GACHA_DIR,
                            archivo
                        );

                    if (
                        fs.statSync(ruta).isFile()
                    ) {
                        fs.unlinkSync(ruta);
                    }
                }

                let guardadas = 0;

                for (const imagen of datos.imagenes) {

                    if (
                        !imagen.data ||
                        typeof imagen.data !== 'string'
                    ) {
                        continue;
                    }

                    const nombre =
                        limpiarNombre(
                            imagen.nombre ||
                            `gacha_${Date.now()}.jpg`
                        );

                    const ruta =
                        path.join(
                            GACHA_DIR,
                            nombre
                        );

                    const buffer =
                        Buffer.from(
                            imagen.data,
                            'base64'
                        );

                    fs.writeFileSync(
                        ruta,
                        buffer
                    );

                    guardadas++;
                }

                console.log(
                    `🎰 Gacha actualizado: ${guardadas} fotos`
                );

                responderJSON(
                    res,
                    200,
                    {
                        ok: true,
                        cantidad: guardadas
                    }
                );

                return;

            } catch (error) {

                console.error(
                    '❌ Error guardando Gacha:',
                    error
                );

                responderJSON(
                    res,
                    500,
                    {
                        ok: false,
                        error: error.message
                    }
                );

                return;
            }
        }

        res.writeHead(
            404,
            {
                'Content-Type':
                    'text/plain; charset=utf-8'
            }
        );

        res.end('404');
    }
);

server.listen(
    PORT,
    '127.0.0.1',
    () => {

        console.log('');
        console.log(
            '╔══════════════════════════════════════╗'
        );
        console.log(
            '║       🎰 GACHA SELECTOR              ║'
        );
        console.log(
            '╚══════════════════════════════════════╝'
        );
        console.log('');
        console.log(
            `🌐 http://127.0.0.1:${PORT}`
        );
        console.log('');
        console.log(
            '📸 Abre esa dirección en el navegador.'
        );
        console.log('');
    }
);

function recibirBody(req) {

    return new Promise(
        (resolve, reject) => {

            let body = '';

            req.on(
                'data',
                chunk => {

                    body += chunk.toString();

                    if (
                        body.length >
                        80 * 1024 * 1024
                    ) {

                        reject(
                            new Error(
                                'Las imágenes seleccionadas son demasiado grandes.'
                            )
                        );

                        req.destroy();
                    }
                }
            );

            req.on(
                'end',
                () => resolve(body)
            );

            req.on(
                'error',
                reject
            );
        }
    );
}

function limpiarNombre(nombre) {

    return String(nombre)
        .replace(
            /[^a-zA-Z0-9._-]/g,
            '_'
        )
        .replace(
            /\.{2,}/g,
            '.'
        )
        .slice(
            0,
            100
        );
}

function responderJSON(
    res,
    codigo,
    datos
) {

    res.writeHead(
        codigo,
        {
            'Content-Type':
                'application/json; charset=utf-8'
        }
    );

    res.end(
        JSON.stringify(datos)
    );
}

process.on(
    'SIGINT',
    () => {

        console.log(
            '\n🛑 Selector cerrado.'
        );

        server.close(
            () => process.exit(0)
        );
    }
);
