// database/perfiles.js
// ============================================================
// PERFILES DE USUARIO
// ============================================================

import path from 'path';
import { fileURLToPath } from 'url';
import { obtenerStore, guardarStore } from '../lib/jsonStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVO = path.join(__dirname, 'perfiles.json');

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
    masculino: { etiqueta: 'Masculino', emoji: '♂️' },
    femenino: { etiqueta: 'Femenino', emoji: '♀️' },
    otro: { etiqueta: 'Otro', emoji: '⚧️' }
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
        propuestaDe: null, // quien le propuso
        propuestaFecha: null // timestamp de la propuesta
    };
}

// ============================================================
// OBTENER / GUARDAR PERFIL
// ============================================================

export function obtenerPerfil(id) {
    const db = datos();
    if (!db[id]) {
        db[id] = crearPerfil();
        guardar();
    }
    return db[id];
}

export function guardarPerfil(id, perfil) {
    const db = datos();
    db[id] = perfil;
    guardar();
    return perfil;
}

// ============================================================
// EDAD / FECHA DE NACIMIENTO
// ============================================================

export function validarFechaNacimiento(texto) {
    const match = String(texto).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) {
        return { valido: false, error: 'Formato inválido. Usa DD/MM/AAAA (ej: 15/08/2001).' };
    }
    const dia = Number(match[1]);
    const mes = Number(match[2]);
    const anio = Number(match[3]);
    const fecha = new Date(anio, mes - 1, dia);
    const esFechaReal = fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
    if (!esFechaReal) {
        return { valido: false, error: 'Esa fecha no existe en el calendario.' };
    }
    if (fecha > new Date()) {
        return { valido: false, error: 'La fecha no puede ser en el futuro.' };
    }
    const edad = calcularEdad(fecha);
    if (edad < 5 || edad > 120) {
        return { valido: false, error: 'Esa edad no parece real. Revisa la fecha.' };
    }
    return { valido: true, fecha, edad };
}

export function calcularEdad(fecha) {
    const f = fecha instanceof Date? fecha : new Date(fecha);
    const ahora = new Date();
    let edad = ahora.getFullYear() - f.getFullYear();
    const noHaCumplidoAun = ahora.getMonth() < f.getMonth() || (ahora.getMonth() === f.getMonth() && ahora.getDate() < f.getDate());
    if (noHaCumplidoAun) edad--;
    return edad;
}

export function setFechaNacimiento(id, fechaISO) {
    const perfil = obtenerPerfil(id);
    perfil.fechaNacimiento = fechaISO;
    guardar();
    return perfil;
}

// ============================================================
// GÉNERO
// ============================================================

export function setGenero(id, claveGenero) {
    const perfil = obtenerPerfil(id);
    perfil.genero = claveGenero;
    guardar();
    return perfil;
}

// ============================================================
// MATRIMONIO
// ============================================================

export function estaCasado(id) {
    return Boolean(obtenerPerfil(id).pareja);
}

export function obtenerPareja(id) {
    return obtenerPerfil(id).pareja;
}

export function crearPropuesta(deId, paraId) {
    const perfilDestino = obtenerPerfil(paraId);
    perfilDestino.propuestaDe = deId;
    perfilDestino.propuestaFecha = Date.now(); // <- guarda el tiempo
    guardar();
}

// CAMBIO 1: Ahora retorna objeto con emisor y timestamp
export function obtenerPropuestaPendiente(paraId) {
    const perfil = obtenerPerfil(paraId);
    if (!perfil.propuestaDe ||!perfil.propuestaFecha) return null;
    return {
        emisor: perfil.propuestaDe,
        timestamp: perfil.propuestaFecha
    };
}

// CAMBIO 2: Renombrada para que coincida con el comando
export function eliminarPropuesta(paraId) {
    const perfil = obtenerPerfil(paraId);
    perfil.propuestaDe = null;
    perfil.propuestaFecha = null;
    guardar();
}

// Acepta la propuesta pendiente dirigida a `paraId`.
export function aceptarPropuesta(paraId) {
    const perfilPara = obtenerPerfil(paraId);
    const deId = perfilPara.propuestaDe;
    if (!deId) return null;

    const DOS_MINUTOS = 2 * 60 * 1000;
    // NUEVO: Checar si expiró al aceptar
    if (Date.now() - perfilPara.propuestaFecha > DOS_MINUTOS) {
        eliminarPropuesta(paraId);
        return 'expirado'; // <- para que el comando sepa que expiró
    }

    const perfilDe = obtenerPerfil(deId);
    const ahora = Date.now();

    perfilPara.pareja = deId;
    perfilPara.casadoDesde = ahora;
    perfilPara.propuestaDe = null;
    perfilPara.propuestaFecha = null;

    perfilDe.pareja = paraId;
    perfilDe.casadoDesde = ahora;

    guardar();
    return deId;
}

// ============================================================
// DIVORCIO
// ============================================================

export function divorciar(id) {
    const perfil = obtenerPerfil(id);
    const parejaId = perfil.pareja;
    if (!parejaId) return null;

    perfil.pareja = null;
    perfil.casadoDesde = null;

    const perfilPareja = obtenerPerfil(parejaId);
    perfilPareja.pareja = null;
    perfilPareja.casadoDesde = null;

    guardar();
    return parejaId;
}