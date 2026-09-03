// ============================================================
// BOT-API
// SISTEMA DE NIVELES / XP
// ============================================================
// El nivel se guarda por:
//   CHAT + USUARIO
//
// Ejemplo:
//
// Grupo A → Luis → Nivel 8
// Grupo B → Luis → Nivel 3
// Privado → Luis → Nivel 5
//
// La XP se obtiene al enviar mensajes.
// ============================================================

import fs from 'fs';
import path from 'path';

// ============================================================
// ARCHIVO DE BASE DE DATOS
// ============================================================

const DATABASE_DIR = path.join(
    process.cwd(),
    'database'
);

const FILE = path.join(
    DATABASE_DIR,
    'niveles.json'
);

// ============================================================
// CONFIGURACIÓN
// ============================================================

// XP base que recibe un usuario por mensaje.
// El handler controla el cooldown.
const XP_POR_MENSAJE = 10;

// ============================================================
// ASEGURAR ARCHIVO
// ============================================================

function asegurarArchivo() {

    if (!fs.existsSync(DATABASE_DIR)) {

        fs.mkdirSync(
            DATABASE_DIR,
            {
                recursive: true
            }
        );
    }

    if (!fs.existsSync(FILE)) {

        fs.writeFileSync(
            FILE,
            '{}',
            'utf8'
        );
    }
}

// ============================================================
// CARGAR BASE DE DATOS
// ============================================================

function cargar() {

    asegurarArchivo();

    try {

        const contenido =
            fs.readFileSync(
                FILE,
                'utf8'
            );

        const datos =
            JSON.parse(
                contenido
            );

        if (
            !datos ||
            typeof datos !== 'object' ||
            Array.isArray(datos)
        ) {

            return {};
        }

        return datos;

    } catch (error) {

        console.error(
            '[NIVELES] Error leyendo niveles.json:',
            error?.message || error
        );

        return {};
    }
}

// ============================================================
// GUARDAR BASE DE DATOS
// ============================================================

function guardar(data) {

    asegurarArchivo();

    try {

        fs.writeFileSync(
            FILE,
            JSON.stringify(
                data,
                null,
                2
            ),
            'utf8'
        );

    } catch (error) {

        console.error(
            '[NIVELES] Error guardando niveles.json:',
            error?.message || error
        );
    }
}

// ============================================================
// NORMALIZAR IDENTIFICADOR
// ============================================================

function normalizarId(valor) {

    if (!valor) {
        return null;
    }

    return String(valor)
        .trim()
        .split(':')[0];
}

// ============================================================
// CREAR CLAVE DEL USUARIO
// ============================================================

function crearClave(chatJid, usuarioJid) {

    const chat =
        normalizarId(chatJid);

    const usuario =
        normalizarId(usuarioJid);

    if (!chat || !usuario) {
        return null;
    }

    return `${chat}|${usuario}`;
}

// ============================================================
// XP NECESARIA PARA SUBIR DE NIVEL
// ============================================================
//
// Nivel 1 → 100 XP
// Nivel 2 → 150 XP
// Nivel 3 → 200 XP
// Nivel 4 → 250 XP
//
// Va aumentando progresivamente.
// ============================================================

export function xpNecesaria(nivel) {

    const n =
        Math.max(
            1,
            Number(nivel) || 1
        );

    return 100 + ((n - 1) * 50);
}

// ============================================================
// OBTENER DATOS DE USUARIO
// ============================================================

export function obtenerNivel(
    chatJid,
    usuarioJid
) {

    const clave =
        crearClave(
            chatJid,
            usuarioJid
        );

    if (!clave) {
        return null;
    }

    const db =
        cargar();

    if (!db[clave]) {

        db[clave] = {

            chat: normalizarId(chatJid),

            usuario:
                normalizarId(usuarioJid),

            xp: 0,

            nivel: 1,

            mensajes: 0,

            creadoEn:
                Date.now(),

            actualizadoEn:
                Date.now()
        };

        guardar(db);
    }

    return {
        ...db[clave]
    };
}

// ============================================================
// AGREGAR XP
// ============================================================

export function agregarXP(
    chatJid,
    usuarioJid,
    cantidad = XP_POR_MENSAJE
) {

    const clave =
        crearClave(
            chatJid,
            usuarioJid
        );

    if (!clave) {

        return {

            xp: 0,

            nivel: 1,

            mensajes: 0,

            subio: false,

            nivelesSubidos: 0,

            nivelAnterior: 1,

            xpAnterior: 0
        };
    }

    const db =
        cargar();

    if (!db[clave]) {

        db[clave] = {

            chat:
                normalizarId(chatJid),

            usuario:
                normalizarId(usuarioJid),

            xp: 0,

            nivel: 1,

            mensajes: 0,

            creadoEn:
                Date.now(),

            actualizadoEn:
                Date.now()
        };
    }

    const usuario =
        db[clave];

    const nivelAnterior =
        usuario.nivel;

    const xpAnterior =
        usuario.xp;

    usuario.xp +=
        Number(cantidad) || 0;

    usuario.mensajes++;

    let nivelesSubidos = 0;

    // --------------------------------------------------------
    // COMPROBAR SUBIDA DE NIVEL
    // --------------------------------------------------------

    while (
        usuario.xp >=
        xpNecesaria(usuario.nivel)
    ) {

        usuario.xp -=
            xpNecesaria(
                usuario.nivel
            );

        usuario.nivel++;

        nivelesSubidos++;
    }

    usuario.actualizadoEn =
        Date.now();

    guardar(db);

    return {

        ...usuario,

        subio:
            nivelesSubidos > 0,

        nivelesSubidos,

        nivelAnterior,

        xpAnterior
    };
}

// ============================================================
// OBTENER RANKING DEL CHAT
// ============================================================

export function obtenerRanking(
    chatJid,
    limite = 10
) {

    const chat =
        normalizarId(chatJid);

    if (!chat) {
        return [];
    }

    const db =
        cargar();

    return Object.entries(db)

        .filter(
            ([, datos]) =>
                datos?.chat === chat
        )

        .map(
            ([clave, datos]) => ({

                clave,

                jid:
                    datos.usuario,

                xp:
                    Number(datos.xp) || 0,

                nivel:
                    Number(datos.nivel) || 1,

                mensajes:
                    Number(datos.mensajes) || 0
            })
        )

        .sort(
            (a, b) => {

                if (
                    b.nivel !==
                    a.nivel
                ) {

                    return (
                        b.nivel -
                        a.nivel
                    );
                }

                return (
                    b.xp -
                    a.xp
                );
            }
        )

        .slice(
            0,
            Math.max(
                1,
                Number(limite) || 10
            )
        );
}

// ============================================================
// PORCENTAJE DE XP
// ============================================================

export function porcentajeXP(
    usuario
) {

    if (!usuario) {
        return 0;
    }

    const necesaria =
        xpNecesaria(
            usuario.nivel
        );

    if (!necesaria) {
        return 0;
    }

    return Math.min(
        100,
        Math.floor(
            (
                usuario.xp /
                necesaria
            ) * 100
        )
    );
}

// ============================================================
// BARRA DE XP
// ============================================================

export function barraXP(
    usuario,
    longitud = 10
) {

    const porcentaje =
        porcentajeXP(
            usuario
        );

    const total =
        Math.max(
            5,
            Number(longitud) || 10
        );

    const llenos =
        Math.round(
            (
                porcentaje /
                100
            ) * total
        );

    const vacios =
        total - llenos;

    return (
        '█'.repeat(llenos) +
        '░'.repeat(vacios)
    );
}

// ============================================================
// EXPORTAR XP POR MENSAJE
// ============================================================

export {
    XP_POR_MENSAJE
};