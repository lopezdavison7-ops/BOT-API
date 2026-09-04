// ============================================================
// BOT-API
// CONTROLLER: SHAZAM / SONG FINDER
// ============================================================
// Adaptado para BOT-API
//
// Flujo:
// 1. Recibe Buffer de audio/video.
// 2. Recorta los primeros 60 segundos con FFmpeg.
// 3. Convierte a MP3.
// 4. Sube el archivo a Uguu.
// 5. Envía la URL a SongFinder.
// 6. Devuelve la información de la canción.
//
// No necesita API KEY.
// ============================================================

import fetch from 'node-fetch';
import { FormData, Blob } from 'formdata-node';
import { fileTypeFromBuffer } from 'file-type';
import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const SONGFINDER_API =
    'https://songfinder.gg/api/recognize/url';

const UGUU_UPLOAD =
    'https://uguu.se/upload';

const CLIP_SECONDS = 60;

const MAX_INPUT_BYTES =
    60 * 1024 * 1024;

// ============================================================
// HEADERS SONGFINDER
// ============================================================

const SF_HEADERS = {
    accept: '*/*',

    'accept-language':
        'es-419,es;q=0.9,es-ES;q=0.8,en;q=0.7',

    'content-type':
        'application/json',

    origin:
        'https://songfinder.gg',

    referer:
        'https://songfinder.gg/',

    'sec-ch-ua':
        '"Not;A=Brand";v="8", "Chromium";v="150", "Microsoft Edge";v="150"',

    'sec-ch-ua-mobile':
        '?0',

    'sec-ch-ua-platform':
        '"Windows"',

    'sec-fetch-dest':
        'empty',

    'sec-fetch-mode':
        'cors',

    'sec-fetch-site':
        'same-origin',

    'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0'
};

// ============================================================
// TOKEN
// ============================================================

function makeToken() {
    return crypto
        .randomBytes(24)
        .toString('base64url');
}

// ============================================================
// RECONOCER CANCIÓN DESDE URL
// ============================================================

async function recognizeUrl(
    audioUrl,
    startTime = 0
) {
    if (!audioUrl) {
        throw new Error(
            'No se recibió una URL de audio.'
        );
    }

    const res = await fetch(
        SONGFINDER_API,
        {
            method: 'POST',

            headers: SF_HEADERS,

            body: JSON.stringify({
                url: audioUrl,

                startTime,

                recaptchaToken:
                    makeToken()
            })
        }
    );

    const texto =
        await res.text();

    let json = null;

    try {
        json = JSON.parse(texto);
    } catch {
        json = null;
    }

    // --------------------------------------------------------
    // Error HTTP
    // --------------------------------------------------------

    if (!res.ok) {
        throw new Error(
            `SongFinder respondió HTTP ${res.status}`
        );
    }

    // --------------------------------------------------------
    // Sin coincidencia
    // --------------------------------------------------------

    if (
        !json?.success ||
        !json?.track
    ) {
        throw new Error(
            json?.message ||
            json?.error ||
            'No se encontró coincidencia.'
        );
    }

    const t =
        json.track;

    // --------------------------------------------------------
    // Resultado
    // --------------------------------------------------------

    return {
        title:
            t.title || '',

        artist:
            t.artist || '',

        album:
            t.album || '',

        releaseDate:
            t.releaseDate || '',

        genre:
            t.genre || '',

        label:
            t.label || '',

        coverArt:
            t.coverArt || '',

        isrc:
            t.isrc || ''
    };
}

// ============================================================
// SUBIR ARCHIVO A UGUU
// ============================================================

async function uploadUguu(buffer) {
    if (!Buffer.isBuffer(buffer)) {
        throw new Error(
            'uploadUguu esperaba un Buffer.'
        );
    }

    // --------------------------------------------------------
    // Detectar tipo de archivo
    // --------------------------------------------------------

    const tipo =
        await fileTypeFromBuffer(buffer);

    const ext =
        tipo?.ext || 'mp3';

    const mime =
        tipo?.mime || 'audio/mpeg';

    // --------------------------------------------------------
    // Crear Blob
    // --------------------------------------------------------

    const blob =
        new Blob(
            [buffer],
            {
                type: mime
            }
        );

    // --------------------------------------------------------
    // Crear FormData
    // --------------------------------------------------------

    const form =
        new FormData();

    const nombre =
        crypto.randomBytes(5)
            .toString('hex');

    form.append(
        'files[]',
        blob,
        `${nombre}.${ext}`
    );

    // --------------------------------------------------------
    // Subir
    // --------------------------------------------------------

    const res =
        await fetch(
            UGUU_UPLOAD,
            {
                method: 'POST',

                body: form,

                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (X11; Linux x86_64)'
                }
            }
        );

    if (!res.ok) {
        throw new Error(
            `Uguu respondió HTTP ${res.status}`
        );
    }

    // --------------------------------------------------------
    // Leer respuesta
    // --------------------------------------------------------

    let json;

    try {
        json =
            await res.json();
    } catch {
        throw new Error(
            'Uguu devolvió una respuesta inválida.'
        );
    }

    const url =
        json?.files?.[0]?.url;

    if (!url) {
        throw new Error(
            'Uguu no devolvió ningún enlace.'
        );
    }

    return url;
}

// ============================================================
// PREPARAR CLIP
// ============================================================
// Convierte el audio/video a MP3 y limita la duración.
//
// Si FFmpeg falla, devuelve el Buffer original.
// ============================================================

function prepareClip(
    buffer,
    seconds = CLIP_SECONDS
) {
    return new Promise(
        resolve => {

            const tmpIn =
                path.join(
                    os.tmpdir(),
                    `sf_${Date.now()}_${crypto
                        .randomBytes(3)
                        .toString('hex')}`
                );

            // ------------------------------------------------
            // Guardar archivo temporal
            // ------------------------------------------------

            try {
                fs.writeFileSync(
                    tmpIn,
                    buffer
                );
            } catch {
                return resolve(buffer);
            }

            // ------------------------------------------------
            // Ejecutar FFmpeg
            // ------------------------------------------------

            const ff =
                spawn(
                    'ffmpeg',
                    [
                        '-hide_banner',

                        '-loglevel',
                        'error',

                        '-i',
                        tmpIn,

                        '-t',
                        String(seconds),

                        '-vn',

                        '-acodec',
                        'libmp3lame',

                        '-ar',
                        '44100',

                        '-ac',
                        '2',

                        '-b:a',
                        '128k',

                        '-f',
                        'mp3',

                        'pipe:1'
                    ]
                );

            const chunks = [];

            // ------------------------------------------------
            // Limpiar temporal
            // ------------------------------------------------

            const limpiar = () => {
                try {
                    fs.unlinkSync(
                        tmpIn
                    );
                } catch {}
            };

            // ------------------------------------------------
            // Recibir MP3
            // ------------------------------------------------

            ff.stdout.on(
                'data',
                chunk => {
                    chunks.push(chunk);
                }
            );

            // ------------------------------------------------
            // Error FFmpeg
            // ------------------------------------------------

            ff.on(
                'error',
                () => {
                    limpiar();
                    resolve(buffer);
                }
            );

            // ------------------------------------------------
            // Finalizar FFmpeg
            // ------------------------------------------------

            ff.on(
                'close',
                code => {

                    limpiar();

                    if (
                        code === 0 &&
                        chunks.length
                    ) {
                        return resolve(
                            Buffer.concat(
                                chunks
                            )
                        );
                    }

                    // Si FFmpeg no pudo procesarlo,
                    // utilizamos el archivo original.
                    resolve(buffer);
                }
            );
        }
    );
}

// ============================================================
// IDENTIFICAR CANCIÓN
// ============================================================

async function identifySong(
    buffer,
    options = {}
) {
    // --------------------------------------------------------
    // Validar Buffer
    // --------------------------------------------------------

    if (!Buffer.isBuffer(buffer)) {
        throw new Error(
            'Se esperaba un Buffer.'
        );
    }

    if (
        buffer.length >
        (
            options.maxBytes ||
            MAX_INPUT_BYTES
        )
    ) {
        throw new Error(
            'El archivo es demasiado grande.'
        );
    }

    if (
        buffer.length === 0
    ) {
        throw new Error(
            'El archivo está vacío.'
        );
    }

    // --------------------------------------------------------
    // Duración
    // --------------------------------------------------------

    const seconds =
        options.seconds ||
        CLIP_SECONDS;

    // --------------------------------------------------------
    // Preparar clip
    // --------------------------------------------------------

    const clip =
        await prepareClip(
            buffer,
            seconds
        );

    // --------------------------------------------------------
    // Subir a Uguu
    // --------------------------------------------------------

    const url =
        await uploadUguu(
            clip
        );

    // --------------------------------------------------------
    // Buscar canción
    // --------------------------------------------------------

    const track =
        await recognizeUrl(
            url,
            options.startTime || 0
        );

    // --------------------------------------------------------
    // Resultado final
    // --------------------------------------------------------

    return {
        ...track,

        sourceUrl:
            url
    };
}

// ============================================================
// EXPORTACIONES
// ============================================================

export {
    identifySong,
    recognizeUrl,
    uploadUguu,
    prepareClip
};