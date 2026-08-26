#!/usr/bin/env node
// tiktok-scraper.js
// ============================================================
// TIKTOK SCRAPER (Node.js)
// ============================================================
// Versión en JavaScript del scraper original en Python.
//
// Se usa SOLO el método "yt-dlp" (Método 3 del script original).
// Los métodos con navegador (Playwright/Selenium) se dejaron
// fuera a propósito: abren un Chrome completo, lo cual necesita
// varios cientos de MB de RAM — no es viable en un hosting con
// pocos recursos (como un plan free de HidenCloud/Pterodactyl).
// yt-dlp no abre navegador, así que es mucho más liviano.
//
// REQUISITO:
//   El binario "yt-dlp" tiene que estar instalado en el sistema
//   donde corra este script (no es un paquete npm, es un
//   programa aparte). Instalación:
//     - Linux:   pip install yt-dlp   (o el binario standalone)
//     - Windows: winget install yt-dlp
//
// USO:
//   node tiktok-scraper.js "gatos graciosos"
//   node tiktok-scraper.js "gatos graciosos" 20
//   (el segundo argumento es la cantidad de resultados, default 20)
// ============================================================

import {
    spawn
} from 'child_process';

import fs from 'fs';
import path from 'path';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const busqueda =
    process.argv[2] ||
    'gatos graciosos';

const cantidad =
    Number(process.argv[3]) ||
    20;

const nombreArchivo =
    `tiktok_links_${busqueda.replace(/\s+/g, '_')}.txt`;

// ============================================================
// EJECUTAR YT-DLP Y BUSCAR EN TIKTOK
// ============================================================
// yt-dlp soporta "ytsearchN:" para YouTube, pero para TikTok
// se le pasa directamente la búsqueda como si fuera una URL de
// búsqueda de TikTok — yt-dlp tiene soporte nativo para TikTok.
// ============================================================

function buscarEnTikTok(consulta, limite) {

    return new Promise((resolve, reject) => {

        const args = [
            `https://www.tiktok.com/search?q=${encodeURIComponent(consulta)}`,
            '--dump-json',
            '--flat-playlist',
            '--playlist-end',
            String(limite),
            '--no-warnings',
            '--quiet'
        ];

        console.log(
            `[TIKTOK-SCRAPER] Ejecutando: yt-dlp ${args.join(' ')}`
        );

        const proceso =
            spawn('yt-dlp', args);

        let salida = '';
        let errorSalida = '';

        proceso.stdout.on(
            'data',
            chunk => {
                salida += chunk.toString();
            }
        );

        proceso.stderr.on(
            'data',
            chunk => {
                errorSalida += chunk.toString();
            }
        );

        proceso.on('error', error => {

            if (error.code === 'ENOENT') {

                reject(
                    new Error(
                        'yt-dlp no está instalado en este sistema. ' +
                        'Instálalo con: pip install yt-dlp'
                    )
                );

                return;

            }

            reject(error);

        });

        proceso.on('close', codigo => {

            if (codigo !== 0 && !salida.trim()) {

                reject(
                    new Error(
                        `yt-dlp terminó con código ${codigo}: ${
                            errorSalida.trim() ||
                            'sin detalles'
                        }`
                    )
                );

                return;

            }

            // yt-dlp con --dump-json imprime UN objeto JSON
            // por línea (uno por cada video encontrado).
            const resultados = [];

            salida
                .split('\n')
                .filter(linea => linea.trim())
                .forEach(linea => {

                    try {

                        const datos =
                            JSON.parse(linea);

                        resultados.push({
                            titulo:
                                datos.title ||
                                datos.description ||
                                'Sin título',

                            link:
                                datos.webpage_url ||
                                datos.url ||
                                null,

                            autor:
                                datos.uploader ||
                                datos.channel ||
                                'Desconocido'
                        });

                    } catch {
                        // Línea que no es JSON válido, se ignora.
                    }

                });

            resolve(resultados);

        });

    });

}

// ============================================================
// GUARDAR RESULTADOS
// ============================================================

function guardarResultados(
    resultados,
    consulta,
    archivo
) {

    if (resultados.length === 0) {
        return;
    }

    let contenido =
        `# Links de TikTok\n` +
        `# Búsqueda: ${consulta}\n` +
        `# Total: ${resultados.length}\n\n`;

    resultados.forEach((item, i) => {

        contenido +=
            `${i + 1}. ${item.titulo}\n` +
            `   👤 ${item.autor}\n` +
            `   🔗 ${item.link}\n\n`;

    });

    fs.writeFileSync(
        archivo,
        contenido,
        'utf8'
    );

    console.log(
        `\n✓ Guardados ${resultados.length} resultados en: ${archivo}`
    );

}

function mostrarResultados(resultados) {

    console.log(
        '\n' + '='.repeat(60)
    );

    console.log('RESULTADOS');

    console.log(
        '='.repeat(60)
    );

    resultados.slice(0, 15).forEach((item, i) => {

        console.log(
            `${i + 1}. ${item.titulo}`
        );

        console.log(
            `   👤 ${item.autor}`
        );

        console.log(
            `   🔗 ${item.link}`
        );

    });

    if (resultados.length > 15) {

        console.log(
            `... y ${resultados.length - 15} más`
        );

    }

}

// ============================================================
// EJECUCIÓN PRINCIPAL
// ============================================================

async function main() {

    console.log(
        '='.repeat(60)
    );

    console.log('TIKTOK SCRAPER (Node.js)');

    console.log(
        '='.repeat(60)
    );

    console.log(
        `Búsqueda: ${busqueda}`
    );

    console.log(
        `Cantidad: ${cantidad}`
    );

    console.log(
        `Archivo salida: ${nombreArchivo}`
    );

    console.log(
        '='.repeat(60)
    );

    try {

        const resultados =
            await buscarEnTikTok(
                busqueda,
                cantidad
            );

        if (resultados.length === 0) {

            console.log(
                '\n✗ No se encontraron resultados.'
            );

            console.log(
                '\nPosibles causas:'
            );

            console.log(
                '  1. TikTok cambió su estructura interna ' +
                '(yt-dlp necesita actualizarse: ' +
                'pip install -U yt-dlp)'
            );

            console.log(
                '  2. La búsqueda es muy específica, ' +
                'prueba algo más simple'
            );

            console.log(
                '  3. TikTok puede estar bloqueando la IP ' +
                'temporalmente'
            );

            return;

        }

        console.log(
            `\n✓ Encontrados: ${resultados.length} resultados`
        );

        guardarResultados(
            resultados,
            busqueda,
            nombreArchivo
        );

        mostrarResultados(
            resultados
        );

    } catch (error) {

        console.error(
            `\n✗ Falló: ${error.message}`
        );

    }

}

main();
