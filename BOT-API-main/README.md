<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=25D366&height=180&section=header&text=ALEX%20BOT&fontSize=60&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Tu%20asistente%20de%20WhatsApp%2C%20siempre%20activo&descAlignY=58&descAlign=50" width="100%" />

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&pause=1200&color=25D366&center=true&vCenter=true&width=600&lines=Descarga+videos+de+TikTok+%26+YouTube+%F0%9F%8E%A5;Administra+tus+grupos+%F0%9F%9B%A1%EF%B8%8F;Juega%2C+traduce+y+mucho+m%C3%A1s+%E2%9C%A8" alt="Typing SVG" />

<br/>

<img src="https://img.shields.io/badge/Node.js-ESM-339933?style=for-the-badge&logo=node.js&logoColor=white" />
<img src="https://img.shields.io/badge/WhatsApp-Baileys-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
<img src="https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" />
<img src="https://img.shields.io/badge/Licencia-MIT-blue?style=for-the-badge" />
<img src="https://img.shields.io/badge/Estado-Activo-brightgreen?style=for-the-badge" />

</div>

<br/>

<p align="center">
  <b>ALEX BOT</b> es un bot de WhatsApp modular y ligero, conectado a la <b>ALEX SCRAPER API</b>.<br/>
  Descarga contenido, modera tus grupos, juega con tus amigos y automatiza tu WhatsApp — todo desde el chat.
</p>

<div align="center">

[![Ver comandos](https://img.shields.io/badge/📋_Ver_comandos-25D366?style=flat-square)](#-comandos-disponibles)
[![Instalación](https://img.shields.io/badge/⚙️_Instalación-333333?style=flat-square)](#%EF%B8%8F-instalación-rápida)
[![Deploy](https://img.shields.io/badge/☁️_Deploy_en_Render-46E3B7?style=flat-square)](#%EF%B8%8F-deploy-en-render)
[![Problemas](https://img.shields.io/badge/⚠️_Solución_de_problemas-red?style=flat-square)](#%EF%B8%8F-solución-de-problemas)

</div>

---

<br/>

## 🧩 ¿Por qué ALEX BOT?

<table>
<tr>
<td width="33%" valign="top">

### 🧱 100% modular
Cada comando vive en su propio archivo. Agregar uno nuevo es crear un archivo más — nada de tocar código gigante.

</td>
<td width="33%" valign="top">

### 🛡️ Administración real
Kick, promover, degradar, cerrar grupo, mencionar a todos — con verificación automática de permisos.

</td>
<td width="33%" valign="top">

### ☁️ Deploy gratis
Pensado para correr 24/7 gratis en Render, o en tu celular con Termux, o en un VPS con PM2.

</td>
</tr>
</table>

<br/>

## 🚀 Comandos disponibles

<details open>
<summary><b>🎬 Multimedia</b></summary>
<br/>

| Comando | Alias | Qué hace |
|---|---|---|
| `.tiktok <link>` | — | Descarga video de TikTok sin marca de agua |
| `.ytmp4 <link/texto>` | `.yt` `.video` | Descarga video de YouTube |
| `.ytmp3 <link/texto>` | `.musica` | Descarga audio de YouTube |
| `.qr <texto>` | — | Genera un código QR |
| `.avatar <número>` | `.foto` `.pfp` | Foto de perfil de un contacto |

</details>

<details open>
<summary><b>🛡️ Administración de grupo</b></summary>
<br/>

| Comando | Alias | Qué hace |
|---|---|---|
| `.kick <@usuario>` | `.expulsar` `.ban` | Expulsa a alguien del grupo *(solo admins)* |
| `.promover <@usuario>` | `.promote` `.admin` | Hace admin a alguien *(solo admins)* |
| `.degradar <@usuario>` | `.demote` | Quita la administración *(solo admins)* |
| `.grupo abrir` / `.grupo cerrar` | `.group` | Controla quién puede escribir *(solo admins)* |
| `.todos <mensaje>` | `.everyone` `.tagall` | Menciona a todos los miembros *(solo admins)* |

</details>

<details open>
<summary><b>🎲 Diversión</b></summary>
<br/>

| Comando | Alias | Qué hace |
|---|---|---|
| `.gacha` | `.tirada` `.roll` | Tirada gacha con rareza random 🟡🟣🔵⚪ |
| `.ppt <piedra/papel/tijera>` | `.piedrapapeltijera` | Piedra, papel o tijera contra el bot |
| `.animefrase` | `.frase` | Frase random de anime |
| `.animememe` | `.meme` | Meme random de anime |
| `.reaccion <tipo>` | — | GIF de reacción anime (hug, pat, wave...) |
| `.encuesta <pregunta\|op1\|op2>` | `.poll` | Crea una encuesta real de WhatsApp |

</details>

<details open>
<summary><b>🛠️ Utilidades</b></summary>
<br/>

| Comando | Alias | Qué hace |
|---|---|---|
| `.menu` | `.ayuda` `.help` | Muestra todos los comandos disponibles |
| `.clima <ciudad>` | `.tiempo` | Clima actual de cualquier ciudad |
| `.traducir <texto>\|<idioma>` | `.tr` | Traduce texto a otro idioma |
| `.password <longitud>` | `.clave` | Genera una contraseña segura |
| `.identificar <link>` | `.id` | Detecta de qué plataforma es un link |
| `.recordatorio <min\|mensaje>` | `.recordar` | Te manda un recordatorio en X minutos |
| `.stats` | `.estadisticas` | Estadísticas de uso del bot |
| `.ping` | — | Velocidad de respuesta del bot |

</details>

<br/>

## ⚡️ Instalación rápida

```bash
git clone <URL-de-tu-repo>
cd <nombre-del-repo>
npm install
npm start
```

Cuando corra por primera vez, va a aparecer un **código de emparejamiento** en la consola.
En WhatsApp: **Ajustes → Dispositivos vinculados → Vincular con número de teléfono** → ingresa el código.

<br/>

## 🔑 Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `BOT_PHONE_NUMBER` | Número del bot, con código de país, sin `+` | `50499999999` |
| `ALEX_API_URL` | URL de la ALEX SCRAPER API | `https://alex-api-scraper2-1.onrender.com` |
| `ALEX_API_KEY` | API key de tu cuenta en la API | `alx_xxxxxxxx` |
| `OWNER` | Tu número (te da acceso admin en cualquier grupo) | `50499999999` |
| `BOT_USAR_QR` | *(Opcional)* `true` para vincular con QR en vez de código | `true` |

<br/>

<details>
<summary><b>📱 Instalación en Termux (Android)</b></summary>
<br/>

1. Instala [Termux](https://f-droid.org/en/packages/com.termux/) desde F-Droid (la versión de Play Store está desactualizada)
2. Actualiza paquetes e instala Node.js y git:
   ```bash
   pkg update && pkg upgrade -y
   pkg install nodejs-lts git -y
   ```
3. Clona el repositorio e instala dependencias:
   ```bash
   git clone <URL-de-tu-repo>
   cd <nombre-del-repo>
   npm install
   ```
4. Crea las variables de entorno:
   ```bash
   export BOT_PHONE_NUMBER=50499999999
   export ALEX_API_URL=https://alex-api-scraper2-1.onrender.com
   export ALEX_API_KEY=tu_api_key
   ```
5. Inicia el bot:
   ```bash
   npm start
   ```
6. Ingresa el código de emparejamiento en WhatsApp

> 💡 **Tip:** instala `termux-wake-lock` para que el bot no se detenga al bloquear el celular, y desactiva la optimización de batería para Termux en Ajustes del sistema.
>
> 💡 **Para que siga corriendo aunque cierres Termux**, usa `tmux`:
> ```bash
> pkg install tmux -y
> tmux new -s bot
> npm start
> # Ctrl+B luego D para salir sin cerrar el proceso
> # tmux attach -t bot   ← para volver a entrar
> ```

</details>

<details>
<summary><b>🖥️ Instalación en VPS (Ubuntu/Debian)</b></summary>
<br/>

1. Conéctate por SSH e instala Node.js y git:
   ```bash
   ssh usuario@tu-ip-del-vps
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs git
   ```
2. Clona el repositorio e instala dependencias:
   ```bash
   git clone <URL-de-tu-repo>
   cd <nombre-del-repo>
   npm install
   ```
3. Configura las variables de entorno (ver tabla arriba)
4. Instala **PM2** para que el bot corra 24/7 y se reinicie solo:
   ```bash
   sudo npm install -g pm2
   pm2 start index.js --name alex-bot
   pm2 save
   pm2 startup
   ```
5. Revisa el código de emparejamiento:
   ```bash
   pm2 logs alex-bot
   ```

**Comandos útiles de PM2:**
```bash
pm2 restart alex-bot   # reiniciar
pm2 stop alex-bot      # detener
pm2 logs alex-bot      # ver logs en vivo
```

</details>

<br/>

## ☁️ Deploy en Render

1. Sube este repo a GitHub
2. Crea un **Web Service** nuevo en Render conectado al repo
3. **Build Command:** `npm install` &nbsp;·&nbsp; **Start Command:** `npm start`
4. Agrega las variables de entorno de la tabla de arriba
5. Deploy → revisa **Logs** para ver el código de emparejamiento
6. *(Opcional)* Agrega un monitor en [UptimeRobot](https://uptimerobot.com) apuntando a la URL del servicio para que no se duerma

<br/>

## ⚠️ Solución de problemas

<details>
<summary><b>"No se pudo vincular el dispositivo" / "Vuelve a intentarlo más tarde"</b></summary>
<br/>

Esto **no es un error del bot** — es un límite de seguridad que pone WhatsApp cuando detecta varios intentos de vinculación seguidos en poco tiempo (con código o con QR, da igual el método).

**Qué hacer:**
1. Deja de intentar vincular por unas horas (ideal: de un día para otro)
2. No sigas haciendo Manual Deploy repetidamente mientras tanto — cada intento cuenta
3. Cuando reintentes, hazlo **una sola vez**, con buena señal, y entra al código/QR apenas aparezca
4. El bot ya trae protección automática: si detecta varios intentos fallidos seguidos, deja de reintentar solo para no empeorar el bloqueo (revisa los Logs, ahí te avisa)

</details>

<details>
<summary><b>El código de emparejamiento dice "número incorrecto" aunque esté bien</b></summary>
<br/>

Confirma que `BOT_PHONE_NUMBER` tenga el número completo con código de país, sin `+`, sin espacios, sin ceros extra (ej: `50499999999`).

</details>

<details>
<summary><b>Prefiero usar QR en vez de código</b></summary>
<br/>

Pon la variable de entorno `BOT_USAR_QR` = `true`, despliega, y entra a `https://tu-servicio.onrender.com/qr` desde el navegador para escanear con la cámara de WhatsApp.

</details>

<br/>

## 📁 Estructura del proyecto

```
bot/
├── index.js              # Conexión a WhatsApp (Baileys)
├── handler.js             # Router de comandos
├── lib/
│   ├── api.js               # Conexión con ALEX SCRAPER API
│   ├── responder.js          # Helpers para responder (texto/imagen/video/audio)
│   ├── estadisticas.js       # Contador de uso de comandos
│   └── grupos.js             # Helpers de permisos y administración de grupo
└── commands/               # Un archivo por comando
```

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=25D366&height=100&section=footer" width="100%" />

Hecho con 💚 y mucho café

</div>
