// commands/fun/doom.js — 👹 DOOM en primera persona con raycasting optimizado
import { enviarHtmlInteractivo } from '../../lib/htmlInteractivo.js';

export default {
    nombre: 'doom',
    categoria: 'Juegos',
    alias: ['idtech', 'slayer', 'hell'],
    descripcion: 'Mini DOOM en primera persona, raycasting en vivo',
    uso: '.doom',
    ejecutar: async ({ sock, msg, responder }) => {
        try {
            const from = msg.key.remoteJid;

            const htmlPayload = `<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;margin:0;padding:0}
body{margin:0;background:transparent;font-family:'Courier New',monospace;color:#ff3838;touch-action:manipulation}
.dm-wrap{width:100%;max-width:540px;margin:auto;padding:12px}
.dm-card{background:rgba(15,5,5,.95);border:1px solid rgba(255,56,56,.4);border-radius:14px;overflow:hidden}
.dm-header{padding:10px 14px;background:linear-gradient(90deg,#1a0000,#2a0000);border-bottom:1px solid #ff3838;display:flex;justify-content:space-between;align-items:center}
.dm-title{font-size:18px;font-weight:900;color:#ff3838;letter-spacing:2px;text-shadow:0 0 10px #ff3838}
.dm-sub{font-size:9px;letter-spacing:2px;color:#ff8080;font-weight:700}
.dm-body{padding:10px;text-align:center}
.dm-view{position:relative;width:100%;max-width:320px;margin:0 auto;background:#000;border:2px solid #ff3838;border-radius:4px;image-rendering:pixelated;image-rendering:crisp-edges;aspect-ratio:16/10}
#dmCanvas{width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges}
.dm-flash{position:absolute;inset:0;pointer-events:none;background:#ff0000;opacity:0;transition:opacity .1s}
.dm-hud{position:absolute;inset:0;pointer-events:none;padding:6px;display:flex;justify-content:space-between;align-items:flex-start;font-size:10px;color:#ff8080;text-shadow:1px 1px 0 #000;font-weight:900}
.dm-hud .right{text-align:right}
.dm-hud b{color:#ff3838;font-size:12px}
.dm-msg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.85);padding:14px 18px;border:2px solid #ff3838;border-radius:6px;font-size:14px;font-weight:900;text-align:center;pointer-events:none;display:none;color:#ff3838;text-shadow:0 0 10px #ff3838}
.dm-ctrl{margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.dm-pad{display:grid;grid-template-columns:repeat(3,50px);grid-template-rows:repeat(3,50px);gap:2px}
.dm-pad button{background:#1a0000;border:1px solid #ff3838;color:#ff3838;font-size:18px;font-weight:900;cursor:pointer;border-radius:4px}
.dm-pad button:active{background:#ff3838;color:#000}
.dm-pad .empty{background:transparent;border:none}
.dm-fire{flex:1;height:130px;background:#ff3838;border:2px solid #fff;border-radius:12px;color:#000;font-size:24px;font-weight:900;letter-spacing:2px;cursor:pointer;box-shadow:0 0 20px rgba(255,56,56,.6)}
.dm-fire:active{background:#fff;box-shadow:0 0 30px #fff}
.dm-status{margin-top:6px;font-size:11px;color:#ff8080;letter-spacing:1px;min-height:14px}
#dmNew{display:none;margin:8px auto 0;padding:8px 18px;border:2px solid #ff3838;background:#1a0000;color:#ff3838;font-size:13px;font-weight:900;cursor:pointer;letter-spacing:2px;border-radius:6px}
@keyframes dmShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
.dm-view.shake{animation:dmShake .15s}
@keyframes dmPulse{0%,100%{opacity:1}50%{opacity:.4}}
.dm-dot{width:8px;height:8px;background:#ff3838;border-radius:50%;box-shadow:0 0 8px #ff3838;animation:dmPulse 1s infinite}
</style>
<div class="dm-wrap">
  <div class="dm-card">
    <div class="dm-header">
      <div><div class="dm-sub">ID-TECH SLAYER</div><div class="dm-title">👹 DOOM</div></div>
      <div class="dm-dot"></div>
    </div>
    <div class="dm-body">
      <div class="dm-view" id="dmView">
        <canvas id="dmCanvas" width="320" height="200"></canvas>
        <div class="dm-flash" id="dmFlash"></div>
        <div class="dm-hud">
          <div><b id="dmHP">100</b><br>HEALTH<br><b id="dmAmmo">50</b><br>AMMO</div>
          <div class="right"><b id="dmKills">0</b><br>KILLS<br><b id="dmFPS">0</b><br>FPS</div>
        </div>
        <div class="dm-msg" id="dmMsg"></div>
      </div>
      <div class="dm-status" id="dmStatus">👹 RIP AND TEAR, UNTIL IT IS DONE</div>
      <button id="dmNew">🔄 RIP AGAIN</button>
      <div class="dm-ctrl">
        <div class="dm-pad">
          <div class="empty"></div><button id="dmF">▲</button><div class="empty"></div>
          <button id="dmL">◀</button><div class="empty"></div><button id="dmR">▶</button>
          <div class="empty"></div><button id="dmB">▼</button><div class="empty"></div>
        </div>
        <button class="dm-fire" id="dmFire">FIRE</button>
      </div>
    </div>
  </div>
</div>
<script>
(function(){
var cv=document.getElementById('dmCanvas'),ctx=cv.getContext('2d');
var W=cv.width,H=cv.height;
var view=document.getElementById('dmView'),flash=document.getElementById('dmFlash');
var msgEl=document.getElementById('dmMsg'),statusEl=document.getElementById('dmStatus'),newBtn=document.getElementById('dmNew');
var hpEl=document.getElementById('dmHP'),ammoEl=document.getElementById('dmAmmo'),killsEl=document.getElementById('dmKills'),fpsEl=document.getElementById('dmFPS');
var MAP=[
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,1,0,0,1,0,1],
  [1,0,1,0,0,0,1,0,0,1,0,1],
  [1,0,1,0,0,0,1,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,1,1,1,0,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,1,0,0,0,0,1,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1]
];
var MH=MAP.length,MW=MAP[0].length;
var P={x:2.5,y:2.5,a:0,hp:100,ammo:50,kills:0};
var enemies=[];
var keys={};
var alive=true,shake=0,flashT=0;
var buf=ctx.createImageData(W,H);
function spawnEnemies(){
  enemies=[];
  var spots=[[4.5,4.5],[9.5,2.5],[6.5,7.5],[10.5,9.5],[3.5,9.5]];
  for(var i=0;i<spots.length;i++) enemies.push({x:spots[i][0],y:spots[i][1],hp:20,alive:true,speed:0.015,hurt:0});
}
function castRay(ox,oy,ang){
  var dx=Math.cos(ang),dy=Math.sin(ang);
  var mx=Math.floor(ox),my=Math.floor(oy);
  var ddx=dx===0?1e9:Math.abs(1/dx);
  var ddy=dy===0?1e9:Math.abs(1/dy);
  var sx,sy,dxv,dyv;
  if(dx<0){sx=-1;dxv=(ox-mx)*ddx}else{sx=1;dxv=(mx+1-ox)*ddx}
  if(dy<0){sy=-1;dyv=(oy-my)*ddy}else{sy=1;dyv=(my+1-oy)*ddy}
  var side=0,steps=0;
  while(steps<30){
    if(dxv<dyv){dxv+=ddx;mx+=sx;side=0}
    else{dyv+=ddy;my+=sy;side=1}
    steps++;
    if(mx<0||my<0||mx>=MW||my>=MH) break;
    if(MAP[my][mx]===1){
      var dist;
      if(side===0) dist=dxv-ddx;
      else dist=dyv-ddy;
      var wx=side===0?oy+dist*dy:ox+dist*dx;
      wx=wx-Math.floor(wx);
      return{dist:dist,side:side,wx:wx,wall:1};
    }
  }
  return{dist:30,side:0,wx:0,wall:0};
}
function p32(b,i,r,g,a){b[i]=r;b[i+1]=g;b[i+2]=0;b[i+3]=a}
function render(){
  var data=buf.data;
  for(var y=0;y<H;y++){
    var t=y/H;
    var r,g;
    if(y<H/2){
      r=20+Math.floor(t*2*30);
      g=0;
    }else{
      r=40+Math.floor((t-0.5)*2*60);
      g=15+Math.floor((t-0.5)*2*20);
    }
    for(var x=0;x<W;x++){
      var i=(y*W+x)*4;
      data[i]=r;data[i+1]=g;data[i+2]=0;data[i+3]=255;
    }
  }
  var FOV=Math.PI/3;
  for(var x=0;x<W;x++){
    var camX=2*x/W-1;
    var rayA=P.a+Math.atan(camX*Math.tan(FOV/2));
    var hit=castRay(P.x,P.y,rayA);
    var h=Math.min(H,H/hit.dist);
    var ys=Math.floor((H-h)/2);
    var ye=ys+Math.floor(h);
    if(ys<0) ys=0;if(ye>H) ye=H;
    var shade=hit.side===1?0.6:1;
    var dark=1-hit.dist/15;if(dark<0.15) dark=0.15;
    var c=Math.floor(shade*dark*200);
    var tex=Math.floor(hit.wx*8)%2;
    var c2=tex?Math.floor(c*0.7):c;
    for(var y=ys;y<ye;y++){
      var i=(y*W+x)*4;
      data[i]=c2;data[i+1]=Math.floor(c2*0.3);data[i+2]=Math.floor(c2*0.2);
    }
  }
  for(var e=0;e<enemies.length;e++){
    var en=enemies[e];
    if(!en.alive) continue;
    var ex=en.x-P.x,ey=en.y-P.y;
    var inv=1/(Math.cos(P.a)*Math.sin(P.a+Math.PI/2)-Math.sin(P.a)*Math.cos(P.a+Math.PI/2));
    var tx=inv*(Math.sin(P.a+Math.PI/2)*ex-Math.cos(P.a+Math.PI/2)*ey);
    var ty=inv*(-Math.sin(P.a)*ex+Math.cos(P.a)*ey);
    if(ty<=0.1) continue;
    var sx=Math.floor((W/2)*(1+tx/ty/Math.tan(Math.PI/6)));
    var sh=Math.abs(Math.floor(H/ty));
    var sw=sh*0.6;
    var x0=Math.floor(sx-sw/2),x1=Math.floor(sx+sw/2);
    var y0=Math.floor(H/2-sh/2),y1=y0+sh;
    if(x0<0) x0=0;if(x1>W) x1=W;if(y0<0) y0=0;if(y1>H) y1=H;
    for(var yy=y0;yy<y1;yy++){
      for(var xx=x0;xx<x1;xx++){
        var relY=(yy-y0)/sh,relX=(xx-x0)/sw;
        if(relY<0.2) continue;
        var isHead=relY<0.4&&relX>0.25&&relX<0.75;
        var isBody=relY>=0.4&&relY<0.95&&relX>0.1&&relX<0.9;
        var isArm=relY>=0.4&&relY<0.7&&((relX<0.15)||(relX>0.85));
        if(isHead||isBody||isArm){
          var i=(yy*W+xx)*4;
          if(en.hurt>0){
            data[i]=255;data[i+1]=255;data[i+2]=255;
          }else{
            data[i]=180;data[i+1]=40;data[i+2]=40;
          }
        }
      }
    }
  }
  ctx.putImageData(buf,0,0);
  ctx.fillStyle='#1a0000';
  ctx.fillRect(W/2-40,H-25,80,25);
  ctx.strokeStyle='#ff3838';ctx.lineWidth=2;
  ctx.strokeRect(W/2-40,H-25,80,25);
  ctx.fillStyle='#ff3838';
  ctx.fillRect(W/2-30,H-20,60,15);
}
function tryMove(nx,ny){
  var m=0.2;
  if(MAP[Math.floor(P.y)][Math.floor(nx+m)]===0&&MAP[Math.floor(P.y)][Math.floor(nx-m)]===0) P.x=nx;
  if(MAP[Math.floor(ny+m)][Math.floor(P.x)]===0&&MAP[Math.floor(ny-m)][Math.floor(P.x)]===0) P.y=ny;
}
function update(dt){
  if(!alive) return;
  var sp=2*dt,rsp=2*dt;
  var moved=false;
  if(keys.f){tryMove(P.x+Math.cos(P.a)*sp,P.y+Math.sin(P.a)*sp);moved=true}
  if(keys.b){tryMove(P.x-Math.cos(P.a)*sp*0.7,P.y-Math.sin(P.a)*sp*0.7);moved=true}
  if(keys.l){tryMove(P.x+Math.cos(P.a-Math.PI/2)*sp*0.8,P.y+Math.sin(P.a-Math.PI/2)*sp*0.8);moved=true}
  if(keys.r){tryMove(P.x-Math.cos(P.a-Math.PI/2)*sp*0.8,P.y-Math.sin(P.a-Math.PI/2)*sp*0.8);moved=true}
  if(keys.rl) P.a-=rsp;
  if(keys.rr) P.a+=rsp;
  for(var i=0;i<enemies.length;i++){
    var en=enemies[i];
    if(!en.alive) continue;
    if(en.hurt>0) en.hurt-=dt;
    var dx=P.x-en.x,dy=P.y-en.y;
    var d=Math.sqrt(dx*dx+dy*dy);
    if(d<0.4){
      P.hp-=20*dt;
      flashT=0.2;
      if(P.hp<=0){die();return}
    }else if(d<8){
      en.x+=dx/d*en.speed;
      en.y+=dy/d*en.speed;
    }
  }
}
function shoot(){
  if(!alive) return;
  if(P.ammo<=0){statusEl.textContent='NO AMMO';return}
  P.ammo--;
  ammoEl.textContent=P.ammo;
  shake=0.2;
  flashT=0.15;
  var best=-1,bestD=1e9;
  for(var i=0;i<enemies.length;i++){
    var en=enemies[i];
    if(!en.alive) continue;
    var dx=en.x-P.x,dy=en.y-P.y;
    var ang=Math.atan2(dy,dx)-P.a;
    while(ang>Math.PI) ang-=Math.PI*2;
    while(ang<-Math.PI) ang+=Math.PI*2;
    var d=Math.sqrt(dx*dx+dy*dy);
    if(Math.abs(ang)<0.15&&d<bestD&&d<8){
      var ray=castRay(P.x,P.y,Math.atan2(dy,dx));
      if(ray.dist>d-0.3){bestD=d;best=i}
    }
  }
  if(best>=0){
    enemies[best].hp-=15;
    enemies[best].hurt=0.1;
    if(enemies[best].hp<=0){
      enemies[best].alive=false;
      P.kills++;
      killsEl.textContent=P.kills;
      P.ammo+=5;
      ammoEl.textContent=P.ammo;
      var allDead=true;
      for(var j=0;j<enemies.length;j++) if(enemies[j].alive) allDead=false;
      if(allDead) win();
    }
  }
}
function die(){
  alive=false;
  msgEl.style.display='block';
  msgEl.innerHTML='💀 YOU DIED<br><small>'+P.kills+' KILLS</small>';
  newBtn.style.display='block';
  statusEl.textContent='☠️ THE DEMONS GOT YOU';
}
function win(){
  alive=false;
  msgEl.style.display='block';
  msgEl.innerHTML='🏆 VICTORY<br><small>RIP AND TEAR COMPLETE</small>';
  newBtn.style.display='block';
  statusEl.textContent='👹 ALL DEMONS ELIMINATED';
}
function reset(){
  P.x=2.5;P.y=2.5;P.a=0;P.hp=100;P.ammo=50;P.kills=0;
  hpEl.textContent=100;ammoEl.textContent=50;killsEl.textContent=0;
  alive=true;msgEl.style.display='none';newBtn.style.display='none';
  statusEl.textContent='👹 RIP AND TEAR, UNTIL IT IS DONE';
  spawnEnemies();
}
var last=performance.now(),frames=0,fpsT=last,fpsN=0;
function loop(now){
  var dt=(now-last)/1000;last=now;if(dt>0.05) dt=0.05;
  update(dt);
  render();
  frames++;fpsN++;
  if(now-fpsT>=500){fpsEl.textContent=Math.round(fpsN*1000/(now-fpsT));fpsN=0;fpsT=now}
  hpEl.textContent=Math.max(0,Math.round(P.hp));
  if(shake>0){view.classList.add('shake');shake-=dt;if(shake<=0) view.classList.remove('shake')}
  if(flashT>0){flash.style.opacity=flashT;flashT-=dt*3}else{flash.style.opacity=0}
  requestAnimationFrame(loop);
}
function bind(id,k){
  var el=document.getElementById(id);
  var down=function(e){e.preventDefault();keys[k]=true};
  var up=function(e){keys[k]=false};
  el.addEventListener('touchstart',down,{passive:false});
  el.addEventListener('touchend',up);
  el.addEventListener('touchcancel',up);
  el.addEventListener('mousedown',down);
  el.addEventListener('mouseup',up);
  el.addEventListener('mouseleave',up);
}
bind('dmF','f');bind('dmB','b');bind('dmL','l');bind('dmR','r');
bind('dmFire','fire');
var fireBtn=document.getElementById('dmFire');
var fireTick=null;
function fireStart(e){
  e.preventDefault();
  if(!keys.fire) return;
  shoot();
  clearInterval(fireTick);
  fireTick=setInterval(function(){if(keys.fire) shoot();},350);
}
function fireEnd(){clearInterval(fireTick);fireTick=null}
fireBtn.addEventListener('touchstart',fireStart,{passive:false});
fireBtn.addEventListener('touchend',fireEnd);
fireBtn.addEventListener('touchcancel',fireEnd);
fireBtn.addEventListener('mousedown',fireStart);
fireBtn.addEventListener('mouseup',fireEnd);
fireBtn.addEventListener('mouseleave',fireEnd);
newBtn.addEventListener('click',function(){reset()});
document.addEventListener('keydown',function(e){
  if(e.key==='ArrowUp'||e.key==='w') keys.f=true;
  if(e.key==='ArrowDown'||e.key==='s') keys.b=true;
  if(e.key==='ArrowLeft'||e.key==='a') keys.rl=true;
  if(e.key==='ArrowRight'||e.key==='d') keys.rr=true;
  if(e.key===' ') shoot();
});
document.addEventListener('keyup',function(e){
  if(e.key==='ArrowUp'||e.key==='w') keys.f=false;
  if(e.key==='ArrowDown'||e.key==='s') keys.b=false;
  if(e.key==='ArrowLeft'||e.key==='a') keys.rl=false;
  if(e.key==='ArrowRight'||e.key==='d') keys.rr=false;
});
spawnEnemies();
requestAnimationFrame(loop);
})();
</script>`;

            await enviarHtmlInteractivo(sock, from, htmlPayload, '@DOOM', 'doom');
        } catch (error) {
            console.error('[DOOM] Error:', error);
            await responder.texto('❌ Error iniciando DOOM.');
        }
    }
};