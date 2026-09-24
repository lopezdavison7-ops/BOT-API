// commands/sticker/sticker.js
// ============================================================
// BOT-API
// COMANDO: STICKER / S / STIKER (con formas y efectos)
// ============================================================
// Convierte imágenes/videos en stickers con:
// - Formas: circle, triangle, star, heart, hexagon, etc.
// - Efectos: blur, sepia, sharpen, rotate, flip, etc.
// - Soporte para URLs
// - Stickers animados
// ============================================================

import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { downloadMediaMessage } from 'baileys';
import fetch from 'node-fetch';

const execFileAsync = promisify(spawn);

const MAX_STICKER_SIZE = 500 * 1024;
const MAX_VIDEO_SECONDS = 10;
const RUTA_META = path.join(process.cwd(), 'database', 'stickerMeta.json');

// ============================================================
// UTILIDADES
// ============================================================

function jidANumero(jid) {
    return String(jid || '').split('@')[0].replace(/\D/g, '');
}

function obtenerUsuario(msg) {
    const jid = msg?.key?.participant || msg?.key?.remoteJid || '';
    const numero = jidANumero(jid);
    return numero ? `@${numero}` : '@usuario';
}

function obtenerMensajeCitado(msg) {
    return msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
}

function construirMensajeCompleto(msg, mensajeCitado) {
    return {
        key: {
            remoteJid: msg?.key?.remoteJid,
            fromMe: false,
            id: msg?.key?.id,
            participant: msg?.key?.participant
        },
        message: mensajeCitado
    };
}

function esUrl(text) {
    return /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi.test(text);
}

function detectarTipo(mensaje) {
    if (mensaje?.imageMessage) return 'imagen';
    if (mensaje?.videoMessage) return 'video';
    if (mensaje?.stickerMessage) return 'sticker';
    if (mensaje?.documentMessage) {
        const mt = mensaje.documentMessage?.mimetype || '';
        if (mt.startsWith('image/')) return 'imagen';
        if (mt.startsWith('video/')) return 'video';
        if (mt.startsWith('image/webp')) return 'sticker';
    }
    return null;
}

// ============================================================
// METADATOS PERSONALIZADOS (.setmeta)
// ============================================================

function obtenerMetadatos(msg) {
    const jid = msg?.key?.participant || msg?.key?.remoteJid || '';
    const numero = jidANumero(jid);

    try {
        if (fs.existsSync(RUTA_META)) {
            const db = JSON.parse(fs.readFileSync(RUTA_META, 'utf8'));
            const user = db[numero];
            if (user?.stickerPackName && user?.stickerPackAuthor) {
                return {
                    packname: user.stickerPackName,
                    author: user.stickerPackAuthor
                };
            }
        }
    } catch (e) {}

    return {
        packname: 'BOT-API',
        author: `POR USUARIO ${obtenerUsuario(msg)}`
    };
}

// ============================================================
// ARGUMENTOS: FORMAS Y EFECTOS
// ============================================================

const SHAPE_ARGS = {
    '-c': 'circle',
    '-t': 'triangle',
    '-s': 'star',
    '-r': 'roundrect',
    '-h': 'hexagon',
    '-d': 'diamond',
    '-f': 'frame',
    '-b': 'border',
    '-w': 'wave',
    '-m': 'mirror',
    '-o': 'octagon',
    '-y': 'pentagon',
    '-e': 'ellipse',
    '-z': 'cross',
    '-v': 'heart',
    '-x': 'cover',
    '-i': 'contain'
};

const EFFECT_ARGS = {
    '-blur': 'blur',
    '-sepia': 'sepia',
    '-sharpen': 'sharpen',
    '-brighten': 'brighten',
    '-darken': 'darken',
    '-invert': 'invert',
    '-grayscale': 'grayscale',
    '-rotate90': 'rotate90',
    '-rotate180': 'rotate180',
    '-flip': 'flip',
    '-flop': 'flop',
    '-normalize': 'normalize',
    '-negate': 'negate',
    '-tint': 'tint'
};

function parseArgumentos(args) {
    const effects = [];
    const argsSinFlags = [];

    for (const arg of args) {
        if (SHAPE_ARGS[arg]) {
            effects.push({ type: 'shape', value: SHAPE_ARGS[arg] });
        } else if (EFFECT_ARGS[arg]) {
            effects.push({ type: 'effect', value: EFFECT_ARGS[arg] });
        } else if (!arg.startsWith('-')) {
            argsSinFlags.push(arg);
        }
    }

    return { effects, argsSinFlags };
}

// ============================================================
// CONSTRUIR FILTROS FFMPEG
// ============================================================

function buildFFmpegFilters(effects) {
    const W = 512;
    const H = 512;
    const filters = [];

    const shape = effects.find(e => e.type === 'shape')?.value;
    const effectList = effects.filter(e => e.type === 'effect').map(e => e.value);

    // Escalado base
    if (shape === 'cover') {
        filters.push(`scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`);
    } else {
        filters.push(`scale=${W}:${H}:force_original_aspect_ratio=decrease`);
        filters.push(`pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`);
    }

    filters.push('format=rgba');

    // Efectos visuales
    for (const effect of effectList) {
        switch (effect) {
            case 'blur': filters.push('gblur=sigma=5'); break;
            case 'sepia': filters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'); break;
            case 'sharpen': filters.push('unsharp=5:5:1.0:5:5:0.0'); break;
            case 'brighten': filters.push('eq=brightness=0.05'); break;
            case 'darken': filters.push('eq=brightness=-0.05'); break;
            case 'invert':
            case 'negate': filters.push('negate'); break;
            case 'grayscale': filters.push('hue=s=0'); break;
            case 'rotate90': filters.push('transpose=1'); break;
            case 'rotate180': filters.push('rotate=PI'); break;
            case 'flip': filters.push('hflip'); break;
            case 'flop': filters.push('vflip'); break;
            case 'normalize': filters.push('normalize'); break;
            case 'tint': filters.push('colorchannelmixer=1:0:0:0:0:0.5:0:0:0:0:0.5'); break;
        }
    }

    // Mirror
    if (shape === 'mirror') filters.push('hflip');

    // Formas con máscara alpha
    if (shape && !['cover', 'contain', 'mirror', 'border', 'frame'].includes(shape)) {
        const cx = W / 2;
        const cy = H / 2;
        const r = Math.min(W, H) / 2;
        let alphaExpr = '';

        switch (shape) {
            case 'circle':
                alphaExpr = `if(lte((X-${cx})*(X-${cx})+(Y-${cy})*(Y-${cy}),${r*r}),255,0)`;
                break;
            case 'triangle':
                alphaExpr = `if(gte(Y,${H*0.1})*lte(Y,${H*0.9})*lte(abs(X-${cx}),((${H*0.9}-Y)*0.6)),255,0)`;
                break;
            case 'star':
                alphaExpr = `if(lte(hypot(X-${cx},Y-${cy}),${W*0.25}+${W*0.1}*cos(5*atan2(Y-${cy},X-${cx}))),255,0)`;
                break;
            case 'roundrect': {
                const rad = 50;
                alphaExpr = `if(lte(if(gte(X,${rad})*lte(X,${W-rad})*gte(Y,0)*lte(Y,${H}),0,if(gte(Y,${rad})*lte(Y,${H-rad})*gte(X,0)*lte(X,${W}),0,if(lte(X,${rad})*lte(Y,${rad}),(X-${rad})*(X-${rad})+(Y-${rad})*(Y-${rad}),if(gte(X,${W-rad})*lte(Y,${rad}),(X-${W-rad})*(X-${W-rad})+(Y-${rad})*(Y-${rad}),if(lte(X,${rad})*gte(Y,${H-rad}),(X-${rad})*(X-${rad})+(Y-${H-rad})*(Y-${H-rad}),(X-${W-rad})*(X-${W-rad})+(Y-${H-rad})*(Y-${H-rad})))))),${rad*rad}),255,0)`;
                break;
            }
            case 'hexagon':
                alphaExpr = `if(lte(hypot(X-${cx},Y-${cy}),${W*0.4}*cos(PI/6)/cos(mod(atan2(Y-${cy},X-${cx}),PI/3)-PI/6)),255,0)`;
                break;
            case 'diamond':
                alphaExpr = `if(lte(abs(X-${cx})+abs(Y-${cy}),${r}),255,0)`;
                break;
            case 'wave':
                alphaExpr = `if(lte(abs(Y-(${cy}+${H*0.05}*sin(X*0.05))),${H*0.4}),255,0)`;
                break;
            case 'octagon':
                alphaExpr = `if(lte(hypot(X-${cx},Y-${cy}),${W*0.4}*cos(PI/8)/cos(mod(atan2(Y-${cy},X-${cx}),PI/4)-PI/8)),255,0)`;
                break;
            case 'pentagon':
                alphaExpr = `if(lte(hypot(X-${cx},Y-${cy}),${W*0.4}*cos(PI/5)/cos(mod(atan2(Y-${cy},X-${cx}),2*PI/5)-PI/5)),255,0)`;
                break;
            case 'ellipse':
                alphaExpr = `if(lte(((X-${cx})*(X-${cx}))/(${(W*0.45)*(W*0.45)})+((Y-${cy})*(Y-${cy}))/(${(H*0.4)*(H*0.4)}),1),255,0)`;
                break;
            case 'cross':
                alphaExpr = `if(gt(lte(abs(X-${cx}),${W*0.15})*lte(abs(Y-${cy}),${H*0.45})+lte(abs(Y-${cy}),${H*0.15})*lte(abs(X-${cx}),${W*0.45}),0),255,0)`;
                break;
            case 'heart':
                alphaExpr = `if(lte(pow((X-${cx})/(${W*0.3})*(X-${cx})/(${W*0.3})+(Y-${cy})/(${H*0.3})*(Y-${cy})/(${H*0.3})-1,3)-((X-${cx})/(${W*0.3})*(X-${cx})/(${W*0.3}))*pow((Y-${cy})/(${H*0.3}),3),0),255,0)`;
                break;
        }

        if (alphaExpr) {
            filters.push(`geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alphaExpr}'`);
        }
    }

    // Border y frame
    if (shape === 'border') {
        filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=white@0.9:t=10`);
    }
    if (shape === 'frame') {
        filters.push(`drawbox=x=15:y=15:w=${W-30}:h=${H-30}:color=white@0.7:t=8`);
    }

    filters.push('format=yuva420p');

    return filters.join(',');
}

// ============================================================
// PROCESAR CON FFMPEG
// ============================================================

async function procesarConFFmpeg(inputPath, outputPath, effects, isVideo = false) {
    const vf = buildFFmpegFilters(effects);

    const args = [
        '-y',
        '-i', inputPath,
        '-t', isVideo ? String(MAX_VIDEO_SECONDS) : '0',
        '-vf', vf,
        '-an',
        '-fps_mode', 'passthrough',
        '-c:v', 'libwebp_anim',
        '-preset', 'picture',
        '-compression_level', '6',
        '-q:v', '70',
        '-loop', '0',
        outputPath
    ];

    return new Promise((resolve, reject) => {
        const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let err = '';
        p.stderr.on('data', (d) => err += d.toString());
        p.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(err || 'ffmpeg falló'));
        });
        p.on('error', reject);
    });
}

// ============================================================
// CREAR STICKER
// ============================================================

async function crearSticker(buffer, effects, tipo) {
    const carpeta = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bot-api-sticker-'));
    const ext = tipo === 'video' ? 'mp4' : (tipo === 'sticker' ? 'webp' : 'img');
    const inputPath = path.join(carpeta, `in.${ext}`);
    const outputPath = path.join(carpeta, 'out.webp');

    try {
        await fs.promises.writeFile(inputPath, buffer);

        // Si no hay efectos, usar sharp para imágenes (más rápido)
        if (effects.length === 0 && tipo === 'imagen') {
            const resultado = await sharp(buffer)
                .rotate()
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .webp({ quality: 80, effort: 6 })
                .toBuffer();

            if (resultado.length <= MAX_STICKER_SIZE) {
                return resultado;
            }
        }

        // Procesar con ffmpeg
        await procesarConFFmpeg(inputPath, outputPath, effects, tipo === 'video');

        const resultado = await fs.promises.readFile(outputPath);

        if (resultado.length > MAX_STICKER_SIZE) {
            // Reintentar con menor calidad
            const args2 = [
                '-y', '-i', inputPath,
                '-vf', buildFFmpegFilters(effects),
                '-an', '-c:v', 'libwebp_anim',
                '-compression_level', '6', '-q:v', '50',
                '-loop', '0', outputPath
            ];

            await new Promise((resolve, reject) => {
                const p = spawn('ffmpeg', args2, { stdio: ['ignore', 'pipe', 'pipe'] });
                p.on('close', resolve);
                p.on('error', reject);
            });

            const resultado2 = await fs.promises.readFile(outputPath);
            if (resultado2.length <= MAX_STICKER_SIZE) {
                return resultado2;
            }
        }

        return resultado;

    } finally {
        await fs.promises.rm(carpeta, { recursive: true, force: true }).catch(() => {});
    }
}

// ============================================================
// AYUDA
// ============================================================

function generarAyuda(prefijo, comando) {
    return (
        '╭━━〔 🎨 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 𝐀𝐕𝐀𝐍𝐙𝐀𝐃𝐎 〕━━⬣\n' +
        '┃\n' +
        '┃ 📋 Uso: ' + prefijo + comando + ' [opciones] [URL]\n' +
        '┃\n' +
        '┣━━〔 🔷 𝐅𝐎𝐑𝐌𝐀𝐒 〕━━⬣\n' +
        '┃ -c → Círculo\n' +
        '┃ -t → Triángulo\n' +
        '┃ -s → Estrella\n' +
        '┃ -v → Corazón\n' +
        '┃ -h → Hexágono\n' +
        '┃ -d → Diamante\n' +
        '┃ -o → Octágono\n' +
        '┃ -y → Pentágono\n' +
        '┃ -e → Elipse\n' +
        '┃ -z → Cruz\n' +
        '┃ -w → Onda\n' +
        '┃ -r → Esquinas redondeadas\n' +
        '┃ -b → Borde blanco\n' +
        '┃ -f → Marco\n' +
        '┃ -m → Espejo\n' +
        '┃ -x → Cover (rellenar)\n' +
        '┃ -i → Contain (ajustar)\n' +
        '┃\n' +
        '┣━━〔 ✨ 𝐄𝐅𝐄𝐂𝐓𝐎𝐒 〕━━⬣\n' +
        '┃ -blur → Desenfoque\n' +
        '┃ -sepia → Sepia\n' +
        '┃ -sharpen → Nitidez\n' +
        '┃ -brighten → Más brillo\n' +
        '┃ -darken → Menos brillo\n' +
        '┃ -invert → Invertir colores\n' +
        '┃ -grayscale → Escala de grises\n' +
        '┃ -rotate90 → Rotar 90°\n' +
        '┃ -rotate180 → Rotar 180°\n' +
        '┃ -flip → Voltear horizontal\n' +
        '┃ -flop → Voltear vertical\n' +
        '┃ -normalize → Normalizar\n' +
        '┃ -negate → Negativo\n' +
        '┃ -tint → Tinte rojo\n' +
        '┃\n' +
        '┣━━〔 💡 𝐄𝐉𝐄𝐌𝐏𝐋𝐎𝐒 〕━━⬣\n' +
        '┃ ➪ .s -c -blur\n' +
        '┃ ➪ .s -v -sepia\n' +
        '┃ ➪ .s -s https://...\n' +
        '┃\n' +
        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
    );
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'sticker',
    categoria: 'Multimedia',
    alias: ['s', 'stiker'],
    descripcion: 'Crea stickers con formas y efectos especiales.',
    uso: '.s [opciones] | .s -list',

    ejecutar: async ({ sock, msg, args, argumento, prefijo, responder }) => {
        try {
            const argsArr = args || [];

            // Lista de opciones
            if (argsArr[0] === '-list' || argsArr[0] === '-help' || argsArr[0] === '-ayuda') {
                return await responder.texto(generarAyuda(prefijo, 's'));
            }

            // Parsear argumentos
            const { effects, argsSinFlags } = parseArgumentos(argsArr);

            // Detectar URL en argumentos
            let urlArg = null;
            for (const arg of argsArr) {
                if (esUrl(arg)) {
                    urlArg = arg;
                    break;
                }
            }

            let buffer = null;
            let tipo = null;

            // Opción 1: URL
            if (urlArg) {
                if (!urlArg.match(/\.(jpe?g|png|gif|webp|mp4|mov|avi|mkv|webm)(\?.*)?$/i)) {
                    return await responder.texto('❌ La URL debe ser de imagen o video válido.');
                }

                const response = await fetch(urlArg);
                if (!response.ok) {
                    return await responder.texto('❌ No pude descargar el archivo desde la URL.');
                }

                buffer = Buffer.from(await response.arrayBuffer());
                tipo = urlArg.match(/\.(mp4|mov|avi|mkv|webm)/i) ? 'video' : 'imagen';
                console.log(`[STICKER] Descargado de URL: ${Math.round(buffer.length / 1024)} KB`);
            }
            // Opción 2: Mensaje citado
            else {
                const mensajeCitado = obtenerMensajeCitado(msg);

                if (!mensajeCitado) {
                    return await responder.texto(
                        '╭━━〔 🎨 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 〕━━⬣\n' +
                        '┃\n' +
                        '┃ ❌ Responde a una imagen, video\n' +
                        '┃    o sticker usando *.s*\n' +
                        '┃\n' +
                        '┃ 💡 Opciones avanzadas:\n' +
                        '┃ ➪ .s -list\n' +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━⬣'
                    );
                }

                tipo = detectarTipo(mensajeCitado);

                if (!tipo) {
                    return await responder.texto('❌ Responde a una imagen, video o sticker válido.');
                }

                // Validar duración de video
                if (tipo === 'video') {
                    const segundos = mensajeCitado.videoMessage?.seconds || 0;
                    if (segundos > 20) {
                        return await responder.texto('❌ El video no puede ser mayor a 20 segundos.');
                    }
                }

                const mensajeCompleto = construirMensajeCompleto(msg, mensajeCitado);

                console.log(`[STICKER] Tipo: ${tipo}`);
                console.log('[STICKER] ⬇️ Descargando multimedia...');

                buffer = await downloadMediaMessage(mensajeCompleto, 'buffer', {}, { logger: undefined });

                if (!buffer?.length) {
                    throw new Error('No se pudo descargar la multimedia.');
                }

                console.log(`[STICKER] Multimedia: ${Math.round(buffer.length / 1024)} KB`);
            }

            // Crear sticker con efectos
            console.log(`[STICKER] Efectos aplicados: ${effects.length > 0 ? effects.map(e => e.value).join(', ') : 'ninguno'}`);

            const sticker = await crearSticker(buffer, effects, tipo);

            if (!sticker?.length) {
                throw new Error('No se pudo crear el sticker.');
            }

            console.log(`[STICKER] Tamaño final: ${Math.round(sticker.length / 1024)} KB`);

            // Obtener metadatos
            const metadatos = obtenerMetadatos(msg);

            // Enviar sticker
            const contenido = {
                sticker: Buffer.isBuffer(sticker) ? sticker : Buffer.from(sticker),
                mimetype: 'image/webp',
                packname: metadatos.packname,
                author: metadatos.author
            };

            await sock.sendMessage(msg.key.remoteJid, contenido, { quoted: msg });

            console.log('[STICKER] ✅ Sticker enviado correctamente.');
            console.log('================================================');

        } catch (error) {
            console.error('[STICKER] ❌ Error:', error?.stack || error?.message || error);

            try {
                await responder.texto(
                    '╭━━〔 ❌ 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No pude crear el sticker.\n' +
                    '┃\n' +
                    `┃ ⚠️ ${error?.message || 'Error desconocido.'}\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            } catch {}
        }
    }
};