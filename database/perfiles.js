// database/perfiles.js
// ============================================================
// PERFILES DE USUARIO
// ============================================================
// Datos "sociales" del perfil: fecha de nacimiento (con edad
// calculada), género y matrimonio (.marry / .aceptar).
// Separado de economia.js (que es solo dinero/cartas) para no
// mezclar responsabilidades, pero comparte el mismo sistema de
// caché en memoria (jsonStore) para no golpear el disco en
// cada comando.
// ============================================================

import path from 'path';
import { fileURLToPath } from 'url';
import { obtenerStore, guardarStore } from '../lib/jsonStore.js';

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const ARCHIVO =
    path.join(
        __dirname,
        'perfiles.json'
    );

function datos() {

    return obtenerStore(ARCHIVO, {});

}

function guardar() {

    guardarStore(ARCHIVO);

}

// ============================================================
// GÉNEROS VÁLIDOS
// ============================================================

export const GENEROS = {

    masculino: {
        etiqueta: 'Masculino',
        emoji: '♂️'
    },

    femenino: {
        etiqueta: 'Femenino',
        emoji: '♀️'
    },

    otro: {
        etiqueta: 'Otro',
        emoji: '⚧️'
    }

};

// ============================================================
// CREAR PERFIL VACÍO
// ============================================================

function crearPerfil() {

    return {

        fechaNacimiento: null,

        genero: null,

        pareja: null,

        casadoDesde: null,

        // Propuesta de matrimonio pendiente DIRIGIDA a este
        // usuario (quién se la mandó).
        propuestaDe: null,

        propuestaFecha: null

    };

}

// ============================================================
// OBTENER / GUARDAR PERFIL
// ============================================================

export function obtenerPerfil(id) {

    const db =
        datos();

    if (!db[id]) {

        db[id] =
            crearPerfil();

        guardar();

    }

    return db[id];

}

export function guardarPerfil(
    id,
    perfil
) {

    const db =
        datos();

    db[id] = perfil;

    guardar();

    return perfil;

}

// ============================================================
// EDAD / FECHA DE NACIMIENTO
// ============================================================

// Valida DD/MM/YYYY, que sea una fecha real del calendario,
// y que la edad resultante sea razonable (5 a 120 años).
export function validarFechaNacimiento(texto) {

    const match =
        String(texto)
            .trim()
            .match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
            );

    if (!match) {

        return {
            valido: false,
            error:
                'Formato inválido. Usa DD/MM/AAAA (ej: 15/08/2001).'
        };

    }

    const dia = Number(match[1]);
    const mes = Number(match[2]);
    const anio = Number(match[3]);

    const fecha =
        new Date(anio, mes - 1, dia);

    const esFechaReal =
        fecha.getFullYear() === anio &&
        fecha.getMonth() === mes - 1 &&
        fecha.getDate() === dia;

    if (!esFechaReal) {

        return {
            valido: false,
            error: 'Esa fecha no existe en el calendario.'
        };

    }

    if (fecha > new Date()) {

        return {
            valido: false,
            error: 'La fecha no puede ser en el futuro.'
        };

    }

    const edad =
        calcularEdad(fecha);

    if (edad < 5 || edad > 120) {

        return {
            valido: false,
            error: 'Esa edad no parece real. Revisa la fecha.'
        };

    }

    return {
        valido: true,
        fecha,
        edad
    };

}

export function calcularEdad(fecha) {

    const f =
        fecha instanceof Date
            ? fecha
            : new Date(fecha);

    const ahora =
        new Date();

    let edad =
        ahora.getFullYear() -
        f.getFullYear();

    const noHaCumplidoAun =
        ahora.getMonth() < f.getMonth() ||
        (
            ahora.getMonth() === f.getMonth() &&
            ahora.getDate() < f.getDate()
        );

    if (noHaCumplidoAun) {

        edad--;

    }

    return edad;

}

export function setFechaNacimiento(
    id,
    fechaISO
) {

    const perfil =
        obtenerPerfil(id);

    perfil.fechaNacimiento = fechaISO;

    guardar();

    return perfil;

}

// ============================================================
// GÉNERO
// ============================================================

export function setGenero(
    id,
    claveGenero
) {

    const perfil =
        obtenerPerfil(id);

    perfil.genero = claveGenero;

    guardar();

    return perfil;

}

// ============================================================
// MATRIMONIO
// ============================================================

export function estaCasado(id) {

    return Boolean(
        obtenerPerfil(id).pareja
    );

}

export function obtenerPareja(id) {

    return obtenerPerfil(id).pareja;

}

export function crearPropuesta(
    deId,
    paraId
) {

    const perfilDestino =
        obtenerPerfil(paraId);

    perfilDestino.propuestaDe = deId;
    perfilDestino.propuestaFecha = Date.now();

    guardar();

}

export function obtenerPropuestaPendiente(paraId) {

    return obtenerPerfil(paraId).propuestaDe;

}

export function cancelarPropuesta(paraId) {

    const perfil =
        obtenerPerfil(paraId);

    perfil.propuestaDe = null;
    perfil.propuestaFecha = null;

    guardar();

}

// Acepta la propuesta pendiente dirigida a `paraId`.
// Devuelve el id de la pareja si se casó, o null si no había
// ninguna propuesta pendiente.
export function aceptarPropuesta(paraId) {

    const perfilPara =
        obtenerPerfil(paraId);

    const deId =
        perfilPara.propuestaDe;

    if (!deId) {

        return null;

    }

    const perfilDe =
        obtenerPerfil(deId);

    const ahora =
        Date.now();

    perfilPara.pareja = deId;
    perfilPara.casadoDesde = ahora;
    perfilPara.propuestaDe = null;
    perfilPara.propuestaFecha = null;

    perfilDe.pareja = paraId;
    perfilDe.casadoDesde = ahora;

    guardar();

    return deId;

}
