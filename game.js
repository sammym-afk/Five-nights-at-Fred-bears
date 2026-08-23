const screens={menu:q('#menu'),office:q('#office'),cams:q('#cams'),gameOver:q('#gameOver'),win:q('#win')};
function q(s){return document.querySelector(s)}
const el=id=>document.getElementById(id);

const cameras=[
 ['CAM 1 — Main Stage','MAIN STAGE'],
 ['CAM 2 — Dining Area','DINING AREA'],
 ['CAM 3 — Party Hall','PARTY HALL'],
 ['CAM 4 — Safe Room','SAFE ROOM']
];

let s={};

function show(name){Object.values(screens).forEach(x=>x.classList.remove('active'));screens[name].classList.add('active')}
function reset(n=1){
 s={night:n,hour:0,elapsed:0,power:100,left:false,right:false,leftLight:false,rightLight:false,cams:false,cam:0,a:0,b:0,running:true};
 show('office');render()
}
function render(){
 el('night').textContent='Night '+s.night;
 el('time').textContent=(s.hour===0?12:s.hour)+' AM';
 const p='Power '+Math.max(0,Math.ceil(s.power))+'%';
 el('power').textContent=p; el('camPower').textContent=p;

 el('leftDoor').textContent='DOOR: '+(s.left?'CLOSED':'OPEN');
 el('rightDoor').textContent='DOOR: '+(s.right?'CLOSED':'OPEN');
 el('leftDoor').classList.toggle('closed',s.left);
 el('rightDoor').classList.toggle('closed',s.right);
 el('leftDoorVisual').classList.toggle('down',s.left);
 el('rightDoorVisual').classList.toggle('down',s.right);

 el('leftLight').classList.toggle('lightOn',s.leftLight);
 el('rightLight').classList.toggle('lightOn',s.rightLight);
 el('leftLightGlow').classList.toggle('on',s.leftLight);
 el('rightLightGlow').classList.toggle('on',s.rightLight);

 let usage=1+(s.left?1:0)+(s.right?1:0)+(s.leftLight?1:0)+(s.rightLight?1:0)+(s.cams?1:0);
 el('usageBars').textContent='▮'.repeat(Math.min(6,usage));

 el('camName').textContent=cameras[s.cam][0];
 let occ=[];
 if(s.a===s.cam)occ.push('FREDBEAR');
 if(s.b===s.cam)occ.push('SPRING BONNIE');
 el('feed').textContent=occ.length?occ.join('  +  '):cameras[s.cam][1];

 if(s.leftLight&&s.a===3) el('status').textContent='Fredbear is at the LEFT door.';
 else if(s.rightLight&&s.b===3) el('status').textContent='Spring Bonnie is at the RIGHT door.';
 else if(s.power<=0) el('status').textContent='Power out...';
 else el('status').textContent='Survive until 6 AM.';
}
function lose(){if(!s.running)return;s.running=false;show('gameOver')}
function win(){if(!s.running)return;s.running=false;localStorage.setItem('nightShiftSave',JSON.stringify({night:s.night+1}));el('winText').textContent='Night '+s.night+' complete!';show('win')}
function tick(){
 if(!s.running)return;
 s.elapsed++;
 let d=.06+(s.left?.08:0)+(s.right?.08:0)+(s.leftLight?.05:0)+(s.rightLight?.05:0)+(s.cams?.07:0);
 s.power-=d;
 s.hour=Math.min(6,Math.floor(s.elapsed/22));
 if(s.power<=0){s.power=0;s.left=false;s.right=false;s.leftLight=false;s.rightLight=false;s.cams=false}
 if(s.hour>=6)return win();
 render()
}
function move(){
 if(!s.running)return;
 let chance=Math.min(.78,.18+s.night*.065);
 if(Math.random()<chance)s.a=Math.min(3,s.a+1);
 if(Math.random()<chance*.9)s.b=Math.min(3,s.b+1);

 if(s.a===3&&s.left){s.a=Math.random()<.5?1:0}
 if(s.b===3&&s.right){s.b=Math.random()<.5?1:0}

 if(s.a===3&&!s.left&&Math.random()<.55)return lose();
 if(s.b===3&&!s.right&&Math.random()<.55)return lose();
 render()
}

el('newGame').onclick=()=>{localStorage.removeItem('nightShiftSave');reset(1)};
el('continueGame').onclick=()=>{let v=JSON.parse(localStorage.getItem('nightShiftSave')||'{"night":1}');reset(v.night||1)};
el('leftDoor').onclick=()=>{if(s.power<=0)return;s.left=!s.left;render()};
el('rightDoor').onclick=()=>{if(s.power<=0)return;s.right=!s.right;render()};
el('leftLight').onclick=()=>{if(s.power<=0)return;s.leftLight=!s.leftLight;render()};
el('rightLight').onclick=()=>{if(s.power<=0)return;s.rightLight=!s.rightLight;render()};
el('openCams').onclick=()=>{if(s.power<=0)return;s.cams=true;s.leftLight=false;s.rightLight=false;show('cams');render()};
el('closeCams').onclick=()=>{s.cams=false;show('office');render()};
document.querySelectorAll('[data-cam]').forEach(b=>b.onclick=()=>{s.cam=Number(b.dataset.cam);render()});
el('retry').onclick=()=>reset(s.night||1);
el('nextNight').onclick=()=>reset((s.night||1)+1);
setInterval(tick,1000);
setInterval(move,4800);