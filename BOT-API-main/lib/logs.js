
const MAX_LOGS = 50;
const logs = [];

const originalError = console.error;
const originalLog = console.log;
const originalWarn = console.warn;

function agregarLog(tipo, args) {
    const mensaje = args.map(a => {
        if (a instanceof Error) return a.stack || a.message;
        if (typeof a === 'object') {
            try { return JSON.stringify(a, null, 2); } catch { return String(a); }
        }
        return String(a);
    }).join(' ');

    logs.push({
        tipo,
        mensaje,
        fecha: new Date().toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        })
    });

    while (logs.length > MAX_LOGS) logs.shift();
}

console.error = function(...args) {
    agregarLog('ERROR', args);
    originalError.apply(console, args);
};

console.warn = function(...args) {
    agregarLog('WARN', args);
    originalWarn.apply(console, args);
};

console.log = function(...args) {
    agregarLog('LOG', args);
    originalLog.apply(console, args);
};

process.on('uncaughtException', (err) => {
    agregarLog('UNCAUGHT', [err]);
    originalError('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason) => {
    agregarLog('REJECTION', [reason]);
    originalError('[UNHANDLED REJECTION]', reason);
});

export function getLogs(ultimos = 10, filtro = 'all') {
    let filtrados = logs;
    if (filtro !== 'all') {
        filtrados = logs.filter(l => l.tipo === filtro);
    }
    return filtrados.slice(-ultimos);
}

export function getLogsErrores(cantidad) {
    return logs.filter(l =>
        l.tipo === 'ERROR' || l.tipo === 'UNCAUGHT' || l.tipo === 'REJECTION'
    ).slice(-cantidad);
}

export function clearLogs() {
    logs.length = 0;
    return true;
}

export function getTotalLogs() {
    return {
        total: logs.length,
        errores: logs.filter(l => l.tipo === 'ERROR' || l.tipo === 'UNCAUGHT').length,
        warns: logs.filter(l => l.tipo === 'WARN').length
    };
}