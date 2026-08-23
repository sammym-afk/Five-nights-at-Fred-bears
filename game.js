const q=s=>document.querySelector(s);
const el=id=>document.getElementById(id);

const screens={
  menu:el('menu'),
  office:el('office'),
  cams:el('cams'),
  gameOver:el('gameOver'),
  win:el('win')
};

const cameras=[
  ['CAM 1 — Main Stage','MAIN STAGE','room-stage'],
  ['CAM 2 — Dining Area','DINING AREA','room-dining'],
  ['CAM 3 — Party Hall','PARTY HALL','room-party'],
  ['CAM 4 — Safe Room','SAFE ROOM','room-safe']
];

// Original phone calls written for this fan-game.
const calls={
  1:[
    "Hey, welcome to Fredbear's Family Diner.",
    "This is the easy training shift, so the mascots move slowly.",
    "Use the camera monitor to see Fredbear and Spring Bonnie.",
    "If one reaches a doorway, turn on that door light and close the door.",
    "Keep an eye on your power, but don't worry — tonight is pretty forgiving.",
    "Make it to six A M and you're good. Have a quiet night."
  ],
  2:[
    "Hey, you made it through night one.",
    "Fredbear and Spring Bonnie may wander a little more tonight.",
    "You still have plenty of reaction time at the doors.",
    "Remember, cameras help you see exactly which room each mascot is in.",
    "Good luck."
  ],
  3:[
    "Night three already.",
    "The dining room and party hall are good places to check first.",
    "If you lose track of somebody, lower the monitor and check both door lights.",
    "Stay calm, save power, and you'll be fine."
  ],
  4:[
    "Hey. Almost there.",
    "They move a bit faster now, but this is still easy mode.",
    "Don't leave both doors closed unless you need to.",
    "Watch the stage, dining room, party hall, and safe room."
  ],
  5:[
    "Last scheduled night.",
    "You've got this.",
    "Use the cameras, trust the warning lights, and don't panic if somebody reaches the office.",
    "See you at six."
  ]
};

let state={};
let audioCtx=null;
let soundOn=true;
let speechToken=0;

function show(name){
  Object.values(screens).forEach(s=>s.classList.remove('active'));
  screens[name].classList.add('active');
}

function ensureAudio(){
  if(!soundOn)return null;
  if(!audioCtx){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(AC)audioCtx=new AC();
  }
  if(audioCtx && audioCtx.state==='suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq=440,dur=.1,type='square',volume=.04){
  const ctx=ensureAudio();
  if(!ctx)return;
  const o=ctx.createOscillator();
  const g=ctx.createGain();
  o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(volume,ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+dur);
  o.connect(g);g.connect(ctx.destination);
  o.start();o.stop(ctx.currentTime+dur);
}

function noise(dur=.12,volume=.035){
  const ctx=ensureAudio();
  if(!ctx)return;
  const len=Math.max(1,Math.floor(ctx.sampleRate*dur));
  const buffer=ctx.createBuffer(1,len,ctx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<len;i++) data[i]=Math.random()*2-1;
  const src=ctx.createBufferSource();
  const gain=ctx.createGain();
  gain.gain.value=volume;
  src.buffer=buffer;src.connect(gain);gain.connect(ctx.destination);src.start();
}

function ring(){
  tone(720,.12,'sine',.05);
  setTimeout(()=>tone(590,.14,'sine',.05),150);
}

function doorSound(){noise(.08,.05);tone(90,.15,'sawtooth',.03)}
function lightSound(){tone(260,.05,'square',.025)}
function cameraSound(){noise(.09,.035);tone(130,.05,'square',.02)}
function jumpscareSound(){
  noise(.65,.12);
  tone(70,.65,'sawtooth',.08);
  setTimeout(()=>tone(45,.5,'square',.07),100);
}
function sixAMSound(){
  [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.22,'sine',.045),i*160));
}

function setSound(on){
  soundOn=on;
  el('soundToggle').textContent='SOUND: '+(on?'ON':'OFF');
  if(!on && 'speechSynthesis' in window) speechSynthesis.cancel();
}

function reset(n=1){
  speechToken++;
  if('speechSynthesis' in window)speechSynthesis.cancel();
  state={
    night:n,hour:0,elapsed:0,power:100,
    left:false,right:false,leftLight:false,rightLight:false,
    cams:false,cam:0,
    fredbear:0,springBonnie:0,
    fredWait:0,springWait:0,
    running:true
  };
  show('office');
  render();
  setTimeout(()=>startPhoneCall(n),500);
}

function render(){
  el('night').textContent='Night '+state.night;
  el('time').textContent=(state.hour===0?12:state.hour)+' AM';
  const powerText='Power '+Math.max(0,Math.ceil(state.power))+'%';
  el('power').textContent=powerText;
  el('camPower').textContent=powerText;

  el('leftDoor').textContent='LEFT DOOR: '+(state.left?'CLOSED':'OPEN');
  el('rightDoor').textContent='RIGHT DOOR: '+(state.right?'CLOSED':'OPEN');

  el('leftDoor').classList.toggle('closed',state.left);
  el('rightDoor').classList.toggle('closed',state.right);
  el('leftDoorVisual').classList.toggle('down',state.left);
  el('rightDoorVisual').classList.toggle('down',state.right);

  el('leftLight').classList.toggle('lightOn',state.leftLight);
  el('rightLight').classList.toggle('lightOn',state.rightLight);
  el('leftGlow').classList.toggle('on',state.leftLight);
  el('rightGlow').classList.toggle('on',state.rightLight);

  el('leftVisitor').classList.toggle('show',state.leftLight&&state.fredbear===3);
  el('rightVisitor').classList.toggle('show',state.rightLight&&state.springBonnie===3);

  let usage=1+(state.left?1:0)+(state.right?1:0)+(state.leftLight?1:0)+(state.rightLight?1:0)+(state.cams?1:0);
  el('usageBars').textContent='▮'.repeat(Math.min(6,usage));

  const cam=cameras[state.cam];
  el('camName').textContent=cam[0];
  el('roomLabel').textContent=cam[1];
  el('cameraRoom').className='cameraRoom '+cam[2];

  el('fredbearFigure').classList.toggle('hiddenChar',state.fredbear!==state.cam);
  el('springBonnieFigure').classList.toggle('hiddenChar',state.springBonnie!==state.cam);

  if(state.leftLight&&state.fredbear===3){
    el('status').textContent='Fredbear is at the LEFT door — close it!';
  }else if(state.rightLight&&state.springBonnie===3){
    el('status').textContent='Spring Bonnie is at the RIGHT door — close it!';
  }else if(state.power<=0){
    el('status').textContent='Power out...';
  }else{
    el('status').textContent='Easy Mode: use cameras and door lights.';
  }
}

function startPhoneCall(night){
  const lines=calls[Math.min(night,5)]||calls[5];
  const myToken=++speechToken;
  el('phoneStatus').textContent='Ringing...';
  ring();
  setTimeout(()=>ring(),420);

  setTimeout(()=>{
    if(myToken!==speechToken||!state.running)return;
    el('phoneStatus').textContent='Call connected';
    speakLines(lines,myToken);
  },900);
}

function speakLines(lines,token){
  let i=0;
  const next=()=>{
    if(token!==speechToken||!state.running)return;
    if(i>=lines.length){
      el('phoneStatus').textContent='Call ended';
      tone(180,.08,'sine',.025);
      return;
    }
    const line=lines[i++];
    el('phoneStatus').textContent=line;

    if(soundOn && 'speechSynthesis' in window){
      const u=new SpeechSynthesisUtterance(line);
      u.rate=.93;
      u.pitch=.82;
      u.volume=.75;
      u.onend=()=>setTimeout(next,180);
      u.onerror=()=>setTimeout(next,450);
      speechSynthesis.speak(u);
    }else{
      setTimeout(next,Math.max(1100,line.length*38));
    }
  };
  next();
}

function stopPhoneCall(){
  speechToken++;
  if('speechSynthesis' in window)speechSynthesis.cancel();
  el('phoneStatus').textContent='Call skipped';
  tone(160,.06,'sine',.02);
}

function lose(who){
  if(!state.running)return;
  state.running=false;
  stopPhoneCall();

  const spring=who==='spring';
  el('jumpName').textContent=spring?'SPRING BONNIE!':'FREDBEAR!';
  el('gameOverText').textContent=spring?'Spring Bonnie got into the office.':'Fredbear got into the office.';
  el('jumpHead').classList.toggle('spring',spring);
  el('jumpEars').classList.toggle('spring',spring);

  jumpscareSound();
  show('gameOver');
}

function win(){
  if(!state.running)return;
  state.running=false;
  stopPhoneCall();
  localStorage.setItem('fredbearFixedSave',JSON.stringify({night:state.night+1}));
  el('winText').textContent='Night '+state.night+' complete!';
  sixAMSound();
  show('win');
}

function tick(){
  if(!state.running)return;
  state.elapsed++;

  // Easy power use.
  let drain=.022;
  if(state.left)drain+=.022;
  if(state.right)drain+=.022;
  if(state.leftLight)drain+=.012;
  if(state.rightLight)drain+=.012;
  if(state.cams)drain+=.016;
  state.power=Math.max(0,state.power-drain);

  // About 2.5 minutes per night.
  state.hour=Math.min(6,Math.floor(state.elapsed/25));

  if(state.power<=0){
    state.left=false;
    state.right=false;
    state.leftLight=false;
    state.rightLight=false;
    state.cams=false;
  }

  // Easy reaction window: 10 seconds at the door.
  if(state.fredbear===3&&!state.left){
    state.fredWait++;
    if(state.fredWait>=10)return lose('fred');
  }else{
    state.fredWait=0;
  }

  if(state.springBonnie===3&&!state.right){
    state.springWait++;
    if(state.springWait>=10)return lose('spring');
  }else{
    state.springWait=0;
  }

  if(state.hour>=6)return win();
  render();
}

function moveAnimatronics(){
  if(!state.running)return;

  // Easy movement. Never jumps directly to the office.
  const chance=Math.min(.34,.08+state.night*.025);

  if(Math.random()<chance && state.fredbear<3){
    state.fredbear++;
    tone(80,.06,'sine',.012);
  }

  if(Math.random()<chance*.82 && state.springBonnie<3){
    state.springBonnie++;
    tone(95,.06,'sine',.012);
  }

  // Closed doors push them back.
  if(state.fredbear===3&&state.left){
    state.fredbear=Math.random()<.6?1:0;
    state.fredWait=0;
  }

  if(state.springBonnie===3&&state.right){
    state.springBonnie=Math.random()<.6?1:0;
    state.springWait=0;
  }

  render();
}

// MENU
el('newGame').addEventListener('click',()=>{
  ensureAudio();
  localStorage.removeItem('fredbearFixedSave');
  reset(1);
});

el('continueGame').addEventListener('click',()=>{
  ensureAudio();
  let save={night:1};
  try{
    save=JSON.parse(localStorage.getItem('fredbearFixedSave')||'{"night":1}');
  }catch(e){}
  reset(save.night||1);
});

el('soundToggle').addEventListener('click',()=>{
  ensureAudio();
  setSound(!soundOn);
});

// OFFICE
el('leftDoor').addEventListener('click',()=>{
  if(!state.running||state.power<=0)return;
  state.left=!state.left;
  doorSound();
  render();
});

el('rightDoor').addEventListener('click',()=>{
  if(!state.running||state.power<=0)return;
  state.right=!state.right;
  doorSound();
  render();
});

el('leftLight').addEventListener('click',()=>{
  if(!state.running||state.power<=0)return;
  state.leftLight=!state.leftLight;
  if(state.leftLight)state.rightLight=false;
  lightSound();
  render();
});

el('rightLight').addEventListener('click',()=>{
  if(!state.running||state.power<=0)return;
  state.rightLight=!state.rightLight;
  if(state.rightLight)state.leftLight=false;
  lightSound();
  render();
});

el('openCams').addEventListener('click',()=>{
  if(!state.running||state.power<=0)return;
  state.cams=true;
  state.leftLight=false;
  state.rightLight=false;
  cameraSound();
  show('cams');
  render();
});

el('closeCams').addEventListener('click',()=>{
  state.cams=false;
  cameraSound();
  show('office');
  render();
});

document.querySelectorAll('[data-cam]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    state.cam=Number(btn.dataset.cam);
    cameraSound();
    render();
  });
});

el('skipCall').addEventListener('click',stopPhoneCall);

el('retry').addEventListener('click',()=>{
  ensureAudio();
  reset(state.night||1);
});

el('nextNight').addEventListener('click',()=>{
  ensureAudio();
  reset((state.night||1)+1);
});

setInterval(tick,1000);
setInterval(moveAnimatronics,6500);
