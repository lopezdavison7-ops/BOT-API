import axios from 'axios';
import crypto from 'crypto';

const OWNER_NUMERO = '50578391933';

const cfg = {
  key: 'AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0',
  idt: 'https://www.googleapis.com/identitytoolkit/v3/relyingparty',
  stk: 'https://securetoken.googleapis.com/v1/token',
  vfy: 'https://us-central1-alight-creative.cloudfunctions.net/verifyPurchase'
};

const dip = () => [crypto.randomInt(1, 255), crypto.randomInt(0, 255), crypto.randomInt(0, 255), crypto.randomInt(1, 255)].join('.');

const sp = (h) => ({
  ...h,
  'x-forwarded-for': dip(),
  'x-real-ip': dip(),
  'client-ip': dip(),
  'x-client-ip': dip(),
  'x-originating-ip': dip(),
  'x-cluster-client-ip': dip()
});

const h1 = {
  'content-type': 'application/json',
  'x-android-package': 'com.alightcreative.motion',
  'x-android-cert': 'ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8',
  'user-agent': 'dalvik/2.1.0 (linux; u; android 15; 23127pn0cc build/bp1a.250505.005)'
};

const h2 = {
  'content-type': 'application/json; charset=utf-8',
  'user-agent': 'okhttp/3.12.1',
  'accept-encoding': 'gzip'
};

const bad = (e) => {
  const d = e.response?.data;
  return d ? (typeof d === 'object' ? JSON.stringify(d) : String(d)) : e.message;
};

if (!global.ampremSessions) global.ampremSessions = new Map();

async function link(email) {
  const c1 = { identifier: email, continueUri: 'http://localhost' };
  const c2 = {
    requestType: 6,
    email: email,
    androidInstallApp: true,
    canHandleCodeInApp: true,
    continueUrl: 'https://alightcreative.com?ui_sid=0366624874&ui_sd=0',
    iosBundleId: 'com.alightcreative.motion',
    androidPackageName: 'com.alightcreative.motion',
    androidMinimumVersion: '585',
    clientType: 'CLIENT_TYPE_ANDROID'
  };
  try {
    await axios.post(`${cfg.idt}/createAuthUri?key=${cfg.key}`, c1, { headers: sp(h1) });
    const r = await axios.post(`${cfg.idt}/getOobConfirmationCode?key=${cfg.key}`, c2, { headers: sp(h1) });
    return { ok: true, r: r.data };
  } catch (e) {
    return { ok: false, why: bad(e) };
  }
}

function code(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/&/g, '&');
  try { s = decodeURIComponent(s); } catch {}
  
  try {
    const u = new URL(s);
    let c = u.searchParams.get('oobCode');
    if (!c) {
      const n = u.searchParams.get('link') || u.searchParams.get('q') || u.searchParams.get('url');
      if (n) {
        try { c = new URL(n).searchParams.get('oobCode'); } catch {}
      }
    }
    if (c) return c.replace(/[^a-zA-Z0-9_-]/g, '');
  } catch {}
  
  const m = s.match(/oobCode=([a-zA-Z0-9_-]+)/i);
  if (m) return m[1];
  
  const t = raw.trim();
  if (/^[a-zA-Z0-9_-]{10,}$/.test(t) && !t.includes('://')) return t;
  
  return null;
}

async function auth(email, raw) {
  const c = code(raw);
  if (!c) return { ok: false, why: 'Código no encontrado en el link.' };
  try {
    const a = await axios.post(`${cfg.idt}/emailLinkSignin?key=${cfg.key}`, {
      email: email,
      oobCode: c,
      clientType: 'CLIENT_TYPE_ANDROID'
    }, { headers: sp(h1) });
    
    let u = null;
    try {
      const b = await axios.post(`${cfg.idt}/getAccountInfo?key=${cfg.key}`, {
        idToken: a.data.idToken
      }, { headers: sp(h1) });
      u = b.data?.users?.[0] || null;
    } catch {}
    
    return {
      ok: true,
      email: email,
      id: a.data.idToken,
      ref: a.data.refreshToken,
      uid: a.data.localId,
      nuevo: !!a.data.isNewUser,
      user: u
    };
  } catch (e) {
    return { ok: false, why: bad(e) };
  }
}

async function pro(id) {
  const o = 'neo-' + crypto.randomBytes(6).toString('hex');
  const b = {
    data: {
      productId: 'am.full.sub.annual.19q4',
      token: 'mmgaobamlahbbeccfplmbkbb.AO-J1OzqG0or_GJJIx-ms8GrTm-jaglCRfhQSRPUZKpl2YspYS-oN7_94uv8RC5vQbvd_Ios2pPDStZ2n7F0hLE3FiOU7HS3R6Fquulv5xLXFECSv4ctElw',
      skuType: 'subs',
      orderId: o
    }
  };
  const h = {
    ...h2,
    authorization: 'Bearer ' + id,
    'firebase-instance-id-token': 'cSDnCyp3T-uwp07z3tL86T:APA91bFkmvvsHw5nnqa1SBFci-99DRsKClLiETdRrVcJjS5yBx1v_FbCb1d8WhBuea_zmwnYBktyTIzcRhN4b6uNOUur9wPc0gKXmJDoZic0LhNq5V2s0xI'
  };
  try {
    const r = await axios.post(cfg.vfy, b, { headers: sp(h) });
    return { ok: true, order: o, r: r.data };
  } catch (e) {
    return { ok: false, why: bad(e) };
  }
}

export default {
  nombre: 'amprem',
  categoria: 'Herramientas',
  alias: ['alightpremium', 'alight'],
  descripcion: 'Inyecta Premium a Alight Motion (Solo Owner)',
  
  ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
    const sender = msg.key.participant || msg.key.remoteJid || '';
    const numeroSender = String(sender).split('@')[0].split(':')[0].replace(/\D/g, '');

    console.log(`[AMPPREM] Número detectado del remitente: ${numeroSender}`);
    console.log(`[AMPPREM] Owner configurado: ${OWNER_NUMERO}`);

    if (numeroSender !== OWNER_NUMERO) {
      return responder.texto(
        '╭━━〔 🔒 𝐀𝐂𝐂𝐄𝐒𝐎 𝐃𝐄𝐍𝐄𝐆𝐀𝐃𝐎 〕━━⬣\n' +
        '┃\n' +
        '┃ ❌ Este comando es exclusivo\n' +
        '┃    para el Owner del bot.\n' +
        '┃\n' +
        `┃ 🔍 Tu número detectado: ${numeroSender}\n` +
        '┃\n' +
        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
      );
    }

    const input = String(argumento || '').trim();

    if (!input) {
      return responder.texto(
        '╭━━〔 🎬 𝐀𝐌𝐏𝐑𝐄𝐌 〕━━⬣\n' +
        '┃\n' +
        '┃ ❌ Falta el email o link\n' +
        '┃\n' +
        '┃ 💡 Uso:\n' +
        '┃ ➪ .amprem email@gmail.com\n' +
        '┃ ➪ .amprem <link_verificacion>\n' +
        '┃\n' +
        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
      );
    }

    const isLink = input.includes('http') || input.includes('oobCode') || /^[a-zA-Z0-9_-]{10,}$/.test(input);
    const isEmail = input.includes('@') && !isLink;

    if (isEmail) {
      await responder.texto('⏳ Enviando link de verificación...');
      
      const res = await link(input);
      if (res.ok) {
        global.ampremSessions.set(sender, { email: input });
        
        await responder.texto(
          '╭━━〔 ✅ 𝐄𝐍𝐕𝐈𝐀𝐃𝐎 〕━━⬣\n' +
          '┃\n' +
          '┃ 📧 *Email:* ' + input + '\n' +
          '┃\n' +
          '┃ 📬 Revisa tu Bandeja de Entrada\n' +
          '┃    o la carpeta de Spam.\n' +
          '┃\n' +
          '┃ 👇 *Responde a este mensaje*\n' +
          '┃    con el link de Alight:\n' +
          '┃    .amprem <link_aqui>\n' +
          '┃\n' +
          '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
      } else {
        await responder.texto(
          '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
          '┃\n' +
          '┃ ⚠️ Fallo al enviar link:\n' +
          '┃\n' +
          '┃ ' + res.why + '\n' +
          '┃\n' +
          '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
      }
      return;
    }

    if (isLink) {
      const session = global.ampremSessions.get(sender);
      
      if (!session || !session.email) {
        return responder.texto(
          '╭━━〔 ⚠️ 𝐒𝐈𝐍 𝐒𝐄𝐒𝐈𝐎𝐍 〕━━⬣\n' +
          '┃\n' +
          '┃ ❌ No hay email guardado.\n' +
          '┃\n' +
          '┃ 💡 Empieza de nuevo:\n' +
          '┃    .amprem email@gmail.com\n' +
          '┃\n' +
          '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
      }

      const email = session.email;
      await responder.texto('⏳ Verificando login para *' + email + '*...');

      const authRes = await auth(email, input);
      if (!authRes.ok) {
        return responder.texto(
          '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
          '┃\n' +
          '┃ ⚠️ Fallo la verificación:\n' +
          '┃\n' +
          '┃ ' + authRes.why + '\n' +
          '┃\n' +
          '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
      }

      await responder.texto('✅ Login exitoso. Procesando Premium...');

      const proRes = await pro(authRes.id);
      if (proRes.ok) {
        global.ampremSessions.delete(sender);
        
        await responder.texto(
          '╭━━〔 🎉 𝐏𝐑𝐄𝐌𝐈𝐔𝐌 𝐀𝐂𝐓𝐈𝐕𝐎 〕━━⬣\n' +
          '┃\n' +
          '┃ 🎬 *ALIGHT MOTION PREMIUM*\n' +
          '┃\n' +
          '┃ 📧 *Email:* ' + email + '\n' +
          '┃ 🆔 *Order ID:* ' + proRes.order + '\n' +
          '┃ 📅 *Estado:* Activo (Anual)\n' +
          '┃\n' +
          '┃ ✅ Cuenta actualizada.\n' +
          '┃    Abre la app de Alight Motion.\n' +
          '┃\n' +
          '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
      } else {
        await responder.texto(
          '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
          '┃\n' +
          '┃ ⚠️ Fallo al inyectar Premium:\n' +
          '┃\n' +
          '┃ ' + proRes.why + '\n' +
          '┃\n' +
          '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
      }
      return;
    }

    return responder.texto(
      '╭━━〔 ⚠️ 𝐈𝐍𝐕𝐀𝐋𝐈𝐃𝐎 〕━━⬣\n' +
      '┃\n' +
      '┃ ❌ Input no válido.\n' +
      '┃\n' +
      '┃ 💡 Envía un email o\n' +
      '┃    un link de verificación.\n' +
      '┃\n' +
      '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
    );
  }
};