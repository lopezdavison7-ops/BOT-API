import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import sharp from 'sharp';
import { downloadMediaMessage } from 'baileys';
import fetch from 'node-fetch';

const MAX_STICKER_SIZE = 500 * 1024;
const RUTA_META = path.join(process.cwd(), 'database', 'stickerMeta.json');

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
    }
    return null;
}

function obtenerMetadatos(msg) {
    const numero = jidANumero(msg?.key?.participant || msg?.key?.remoteJid || '');

    try {
        if (fs.existsSync(RUTA_META)) {
            const db = JSON.parse(fs.readFileSync(RUTA_META, 'utf8'));
            const user = db[numero];
            if (user?.stickerPackName && user?.stickerPackAuthor) {
                return { packname: user.stickerPackName, author: user.stickerPackAuthor };
            }
        }
    } catch (e) {}

    return { packname: 'BOT-API', author: `POR USUARIO ${obtenerUsuario(msg)}` };
}

const SHAPE_ARGS = {
    '-c': 'circle', '-t': 'triangle', '-s': 'star', '-r': 'roundrect',
    '-h': 'hexagon', '-d': 'diamond', '-f': 'frame', '-b': 'border',
    '-w': 'wave', '-m': 'mirror', '-o': 'octagon', '-y': 'pentagon',
    '-e': 'ellipse', '-z': 'cross', '-v': 'heart', '-x': 'cover', '-i': 'contain'
};

const EFFECT_ARGS = {
    '-blur': 'blur', '-sepia': 'sepia', '-sharpen': 'sharpen',
    '-brighten': 'brighten', '-darken': 'darken', '-invert': 'invert',
    '-grayscale': 'grayscale', '-rotate90': 'rotate90', '-rotate180': 'rotate180',
    '-flip': 'flip', '-flop': 'flop', '-normalize': 'normalize',
    '-negate': 'negate', '-tint': 'tint'
};

function parseArgumentos(args) {
    const effects = [];
    for (const arg of args) {
        if (SHAPE_ARGS[arg]) effects.push({ type: 'shape', value: SHAPE_ARGS[arg] });
        else if (EFFECT_ARGS[arg]) effects.push({ type: 'effect', value: EFFECT_ARGS[arg] });
    }
    return effects;
}

function buildFFmpegFilters(effects) {
    const W = 512, H = 512;
    const filters = [];
    const shape = effects.find(e => e.type === 'shape')?.value;
    const effectList = effects.filter(e => e.type === 'effect').map(e => e.value);

    if (shape === 'cover') {
        filters.push(`scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`);
    } else {
        filters.push(`scale=${W}:${H}:force_original_aspect_ratio=decrease`);
        filters.push(`pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`);
    }

    filters.push('format=rgba');

    for (const effect of effectList) {
        switch (effect) {
            case 'blur': filters.push('gblur=sigma=5'); break;
            case 'sepia': filters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'); break;
            case 'sharpen': filters.push('unsharp=5:5:1.0:5:5:0.0'); break;
            case 'brighten': filters.push('eq=brightness=0.05'); break;
            case 'darken': filters.push('eq=brightness=-0.05'); break;
            case 'invert': case 'negate': filters.push('negate'); break;
            case 'grayscale': filters.push('hue=s=0'); break;
            case 'rotate90': filters.push('transpose=1'); break;
            case 'rotate180': filters.push('rotate=PI'); break;
            case 'flip': filters.push('hflip'); break;
            case 'flop': filters.push('vflip'); break;
            case 'normalize': filters.push('normalize'); break;
            case 'tint': filters.push('colorchannelmixer=1:0:0:0:0:0.5:0:0:0:0:0.5'); break;
        }
    }

    if (shape === 'mirror') filters.push('hflip');

    if (shape && !['cover', 'contain', 'mirror', 'border', 'frame'].includes(shape)) {
        const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2;
        let alphaExpr = '';

        switch (shape) {
            case 'circle': alphaExpr = `if(lte((X-${cx})*(X-${cx})+(Y-${cy})*(Y-${cy}),${r*r}),255,0)`; break;
            case 'triangle': alphaExpr = `if(gte(Y,${H*0.1})*lte(Y,${H*0.9})*lte(abs(X-${cx}),((${H*0.9}-Y)*0.6)),255,0)`; break;
            case 'star': alphaExpr = `if(lte(hypot(X-${cx},Y-${cy}),${W*0.25}+${W*0.1}*cos(5*atan2(Y-${cy},X-${cx}))),255,0)`; break;
            case 'roundrect': {
                const rad = 50;
                alphaExpr = `if(lte(if(gte(X,${rad})*lte(X,${W-rad})*gte(Y,0)*lte(Y,${H}),0,if(gte(Y,${rad})*lte(Y,${H-rad})*gte(X,0)*lte(X,${W}),0,if(lte(X,${rad})*lte(Y,${rad}),(X-${rad})*(X-${rad})+(Y-${rad})*(Y-${rad}),if(gte(X,${W-rad})*lte(Y,${rad}),(X-${W-rad})*(X-${W-rad})+(Y-${rad})*(Y-${rad}),if(lte(X,${rad})*gte(Y,${H-rad}),(X-${rad})*(X-${rad})+(Y-${H-rad})*(Y-${H-rad}),(X-${W-rad})*(X-${W-rad})+(Y-${H-rad})*(Y-${H-rad})))))),${rad*rad}),255,0)`;
                break;
            }
            case 'hexagon': alphaExpr = `if(lte(hypot(X-${cx},Y-${cy}),${W*0.4}*cos(PI/6)/cos(mod(atan2(Y-${cy},X-${cx}),PI/3)-PI/6)),255,0)`; break;
            case 'diamond': alphaExpr = `if(lte(abs(X-${cx})+abs(Y-${cy}),${r}),255,0)`; break;
            case 'wave': alphaExpr = `if(lte(abs(Y-(${cy}+${H*0.05}*sin(X*0.05))),${H*0.4}),255,0)`; break;
            case 'octagon': alphaExpr = `if(lte(hypot(X-${cx},Y-${cy}),${W*0.4}*cos(PI/8)/cos(mod(atan2(Y-${cy},X-${cx}),PI/4)-PI/8)),255,0)`; break;
            case 'pentagon': alphaExpr = `if(lte(hypot(X-${cx},Y-${cy}),${W*0.4}*cos(PI/5)/cos(mod(atan2(Y-${cy},X-${cx}),2*PI/5)-PI/5)),255,0)`; break;
            case 'ellipse': alphaExpr = `if(lte(((X-${cx})*(X-${cx}))/(${(W*0.45)*(W*0.45)})+((Y-${cy})*(Y-${cy}))/(${(H*0.4)*(H*0.4)}),1),255,0)`; break;
            case 'cross': alphaExpr = `if(gt(lte(abs(X-${cx}),${W*0.15})*lte(abs(Y-${cy}),${H*0.45})+lte(abs(Y-${cy}),${H*0.15})*lte(abs(X-${cx}),${W*0.45}),0),255,0)`; break;
            case 'heart': alphaExpr = `if(lte(pow((X-${cx})/(${W*0.3})*(X-${cx})/(${W*0.3})+(Y-${cy})/(${H*0.3})*(Y-${cy})/(${H*0.3})-1,3)-((X-${cx})/(${W*0.3})*(X-${cx})/(${W*0.3}))*pow((Y-${cy})/(${H*0.3}),3),0),255,0)`; break;
        }

        if (alphaExpr) filters.push(`geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alphaExpr}'`);
    }

    if (shape === 'border') filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=white@0.9:t=10`);
    if (shape === 'frame') filters.push(`drawbox=x=15:y=15:w=${W-30}:h=${H-30}:color=white@0.7:t=8`);

    filters.push('format=yuva420p');
    return filters.join(',');
}

async function procesarConFFmpeg(inputPath, outputPath, effects, isVideo = false) {
    const codec = isVideo ? 'libwebp_anim' : 'libwebp';

    const args = [
        '-y', '-i', inputPath,
        '-vf', buildFFmpegFilters(effects),
        '-an', '-c:v', codec,
        '-compression_level', '6', '-q:v', '70',
    ];

    if (isVideo) args.push('-loop', '0');
    args.push(outputPath);

    return new Promise((resolve, reject) => {
        const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let err = '';
        p.stderr.on('data', (d) => {
            const line = d.toString();
            if (!line.includes('deprecated pixel format')) err += line;
        });
        p.on('close', (code) => code === 0 ? resolve() : reject(new Error(err || 'ffmpeg falló')));
        p.on('error', reject);
    });
}

async function crearSticker(buffer, effects, tipo) {
    const carpeta = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bot-api-sticker-'));
    const ext = tipo === 'video' ? 'mp4' : (tipo === 'sticker' ? 'webp' : 'img');
    const inputPath = path.join(carpeta, `in.${ext}`);
    const outputPath = path.join(carpeta, 'out.webp');

    try {
        await fs.promises.writeFile(inputPath, buffer);

        if (effects.length === 0 && tipo === 'imagen') {
            const resultado = await sharp(buffer)
                .rotate()
                .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .webp({ quality: 80, effort: 6 })
                .toBuffer();

            if (resultado.length <= MAX_STICKER_SIZE) return resultado;
        }

        const esAnimacion = tipo === 'video';
        await procesarConFFmpeg(inputPath, outputPath, effects, esAnimacion);

        const resultado = await fs.promises.readFile(outputPath);

        if (resultado.length > MAX_STICKER_SIZE) {
            const args2 = [
                '-y', '-i', inputPath,
                '-vf', buildFFmpegFilters(effects),
                '-an', '-c:v', esAnimacion ? 'libwebp_anim' : 'libwebp',
                '-compression_level', '6', '-q:v', '50',
            ];
            if (esAnimacion) args2.push('-loop', '0');
            args2.push(outputPath);

            await new Promise((resolve) => {
                const p = spawn('ffmpeg', args2, { stdio: ['ignore', 'pipe', 'pipe'] });
                p.on('close', resolve);
                p.on('error', resolve);
            });

            const resultado2 = await fs.promises.readFile(outputPath);
            if (resultado2.length <= MAX_STICKER_SIZE) return resultado2;
        }

        return resultado;

    } finally {
        await fs.promises.rm(carpeta, { recursive: true, force: true }).catch(() => {});
    }
}

function generarAyuda(prefijo) {
    return (
        '╭━━〔 🎨 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 〕━━⬣\n' +
        '┃\n' +
        '┃ 🔷 Formas:\n' +
        '┃ -c círculo | -v corazón | -s estrella\n' +
        '┃ -h hexágono | -d diamante | -t triángulo\n' +
        '┃ -o octágono | -y pentágono | -e elipse\n' +
        '┃ -z cruz | -w onda | -r redondeado\n' +
        '┃ -b borde | -f marco | -m espejo\n' +
        '┃ -x cover | -i contain\n' +
        '┃\n' +
        '┃ ✨ Efectos:\n' +
        '┃ -blur | -sepia | -sharpen | -grayscale\n' +
        '┃ -invert | -negate | -tint | -normalize\n' +
        '┃ -brighten | -darken | -rotate90 | -rotate180\n' +
        '┃ -flip | -flop\n' +
        '┃\n' +
        '┃ 💡 Ejemplos:\n' +
        '┃ ➪ .s -c -blur\n' +
        '┃ ➪ .s -v -sepia\n' +
        '┃\n' +
        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
    );
}

export default {
    nombre: 'sticker',
    categoria: 'Multimedia',
    alias: ['s', 'stiker'],
    descripcion: 'Crea stickers con formas y efectos.',
    uso: '.s [opciones] | .s -list',

    ejecutar: async ({ sock, msg, args, prefijo, responder }) => {
        try {
            const argsArr = args || [];

            if (argsArr[0] === '-list' || argsArr[0] === '-help' || argsArr[0] === '-ayuda') {
                return await responder.texto(generarAyuda(prefijo));
            }

            const effects = parseArgumentos(argsArr);

            let urlArg = null;
            for (const arg of argsArr) {
                if (esUrl(arg)) { urlArg = arg; break; }
            }

            let buffer = null;
            let tipo = null;

            if (urlArg) {
                if (!urlArg.match(/\.(jpe?g|png|gif|webp|mp4|mov|avi|mkv|webm)(\?.*)?$/i)) {
                    return await responder.texto('❌ URL debe ser de imagen o video válido.');
                }

                const response = await fetch(urlArg);
                if (!response.ok) return await responder.texto('❌ No pude descargar desde la URL.');

                buffer = Buffer.from(await response.arrayBuffer());
                tipo = urlArg.match(/\.(mp4|mov|avi|mkv|webm)/i) ? 'video' : 'imagen';
            } else {
                const mensajeCitado = obtenerMensajeCitado(msg);

                if (!mensajeCitado) {
                    return await responder.texto(
                        '╭━━〔 🎨 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 〕━━⬣\n' +
                        '┃\n' +
                        '┃ ❌ Responde a una imagen o video\n' +
                        '┃\n' +
                        '┃ 💡 Opciones: .s -list\n' +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━⬣'
                    );
                }

                tipo = detectarTipo(mensajeCitado);
                if (!tipo) return await responder.texto('❌ Responde a una imagen o video válido.');

                if (tipo === 'video' && (mensajeCitado.videoMessage?.seconds || 0) > 20) {
                    return await responder.texto('❌ El video no puede pasar de 20 segundos.');
                }

                buffer = await downloadMediaMessage(construirMensajeCompleto(msg, mensajeCitado), 'buffer', {}, { logger: undefined });
                if (!buffer?.length) throw new Error('No se pudo descargar la multimedia.');
            }

            const sticker = await crearSticker(buffer, effects, tipo);
            if (!sticker?.length) throw new Error('No se pudo crear el sticker.');

            const metadatos = obtenerMetadatos(msg);

            await sock.sendMessage(msg.key.remoteJid, {
                sticker: Buffer.isBuffer(sticker) ? sticker : Buffer.from(sticker),
                mimetype: 'image/webp',
                packname: metadatos.packname,
                author: metadatos.author
            }, { quoted: msg });

        } catch (error) {
            console.error('[STICKER] ❌ Error:', error?.message || error);
            try {
                await responder.texto('❌ No pude crear el sticker: ' + (error?.message || 'error'));
            } catch {}
        }
    }
};