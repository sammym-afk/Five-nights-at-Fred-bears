const screens={menu:q('#menu'),office:q('#office'),cams:q('#cams'),gameOver:q('#gameOver'),win:q('#win')};
function q(s){return document.querySelector(s)}
const el=id=>document.getElementById(id);

const cameras=[
 ['CAM 1 — Main Stage','MAIN STAGE','room-stage'],
 ['CAM 2 — Dining Area','DINING AREA','room-dining'],
 ['CAM 3 — Party Hall','PARTY HALL','room-party'],
 ['CAM 4 — Safe Room','SAFE ROOM','room-safe']
];

let s={};

function show(name){
  Object.values(screens).forEach(x=>x.classList.remove('active'));
  screens[name].classList.add('active')
}

function reset(n=1){
  s={
    night:n,hour:0,elapsed:0,power:100,
    left:false,right:false,leftLight:false,rightLight:false,
    cams:false,cam:0,
    a:0,b:0,
    aWait:0,bWait:0,
    running:true
  };
  show('office');
  render()
}

function render(){
  el('night').textContent='Night '+s.night;
  el('time').textContent=(s.hour===0?12:s.hour)+' AM';

  const p='Power '+Math.max(0,Math.ceil(s.power))+'%';
  el('power').textContent=p;
  el('camPower').textContent=p;

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

  const usage=1+(s.left?1:0)+(s.right?1:0)+(s.leftLight?1:0)+(s.rightLight?1:0)+(s.cams?1:0);
  el('usageBars').textContent='▮'.repeat(Math.min(6,usage));

  const cam=cameras[s.cam];
  el('camName').textContent=cam[0];
  el('roomLabel').textContent=cam[1];

  const room=el('cameraRoom');
  room.className='cameraRoom '+cam[2];

  el('fredbearFigure').classList.toggle('hiddenChar',s.a!==s.cam);
  el('springBonnieFigure').classList.toggle('hiddenChar',s.b!==s.cam);

  if(s.leftLight && s.a===3){
    el('status').textContent='Fredbear is at the LEFT door — close it!';
  } else if(s.rightLight && s.b===3){
    el('status').textContent='Spring Bonnie is at the RIGHT door — close it!';
  } else if(s.power<=0){
    el('status').textContent='Power out...';
  } else {
    el('status').textContent='Easy Mode: check cameras and watch the doors.';
  }
}

function lose(who){
  if(!s.running)return;
  s.running=false;

  const spring = who==='b';
  el('jumpName').textContent=spring?'SPRING BONNIE!':'FREDBEAR!';
  el('gameOverText').textContent=spring?'Spring Bonnie got into the office.':'Fredbear got into the office.';
  el('jumpHead').classList.toggle('spring',spring);
  el('jumpEars').classList.toggle('spring',spring);

  show('gameOver')
}

function win(){
  if(!s.running)return;
  s.running=false;
  localStorage.setItem('fredbearEasySave',JSON.stringify({night:s.night+1}));
  el('winText').textContent='Night '+s.night+' complete!';
  show('win')
}

function tick(){
  if(!s.running)return;

  s.elapsed++;

  // Easy mode: slower power drain.
  let d=.025;
  if(s.left)d+=.025;
  if(s.right)d+=.025;
  if(s.leftLight)d+=.015;
  if(s.rightLight)d+=.015;
  if(s.cams)d+=.018;
  s.power-=d;

  // Short-ish nights: ~2 minutes 30 seconds.
  s.hour=Math.min(6,Math.floor(s.elapsed/25));

  if(s.power<=0){
    s.power=0;
    s.left=false;
    s.right=false;
    s.leftLight=false;
    s.rightLight=false;
    s.cams=false
  }

  // At the doors, give a generous warning before a jumpscare.
  if(s.a===3 && !s.left){
    s.aWait++;
    if(s.aWait>=8)return lose('a')
  } else {
    s.aWait=0
  }

  if(s.b===3 && !s.right){
    s.bWait++;
    if(s.bWait>=8)return lose('b')
  } else {
    s.bWait=0
  }

  if(s.hour>=6)return win();
  render()
}

function move(){
  if(!s.running)return;

  // Easy movement: low chance and only one room at a time.
  const chance=Math.min(.36,.10+s.night*.025);

  if(Math.random()<chance && s.a<3)s.a++;
  if(Math.random()<chance*.85 && s.b<3)s.b++;

  // Closed doors send them back safely.
  if(s.a===3 && s.left){
    s.a=Math.random()<.5?0:1;
    s.aWait=0
  }
  if(s.b===3 && s.right){
    s.b=Math.random()<.5?0:1;
    s.bWait=0
  }

  render()
}

el('newGame').onclick=()=>{
  localStorage.removeItem('fredbearEasySave');
  reset(1)
};

el('continueGame').onclick=()=>{
  let v={night:1};
  try{v=JSON.parse(localStorage.getItem('fredbearEasySave')||'{"night":1}')}catch(e){}
  reset(v.night||1)
};

el('leftDoor').onclick=()=>{
  if(s.power<=0)return;
  s.left=!s.left;
  render()
};

el('rightDoor').onclick=()=>{
  if(s.power<=0)return;
  s.right=!s.right;
  render()
};

el('leftLight').onclick=()=>{
  if(s.power<=0)return;
  s.leftLight=!s.leftLight;
  if(s.leftLight)s.rightLight=false;
  render()
};

el('rightLight').onclick=()=>{
  if(s.power<=0)return;
  s.rightLight=!s.rightLight;
  if(s.rightLight)s.leftLight=false;
  render()
};

el('openCams').onclick=()=>{
  if(s.power<=0)return;
  s.cams=true;
  s.leftLight=false;
  s.rightLight=false;
  show('cams');
  render()
};

el('closeCams').onclick=()=>{
  s.cams=false;
  show('office');
  render()
};

document.querySelectorAll('[data-cam]').forEach(b=>{
  b.onclick=()=>{
    s.cam=Number(b.dataset.cam);
    render()
  }
});

el('retry').onclick=()=>reset(s.night||1);
el('nextNight').onclick=()=>reset((s.night||1)+1);

setInterval(tick,1000);
setInterval(move,6000);
