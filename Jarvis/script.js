/* ===== ORIGINAL HUD CODE ===== */
let activated=false, standby=false, muted=false, voiceMode=true, lock=false, lastCommand=null;
let allOpen=false, settingsOpen=false;
let modesOpen = false;
let currentMode = null; // NO MODE ACTIVE BY DEFAULT

/* ===== BRIGHTNESS SYSTEM ===== */
const brightnessModes = ['low', 'medium', 'high'];
let brightnessIndex = 1; // 0 = low, 1 = medium (DEFAULT), 2 = high

// Apply default brightness on page load
document.body.classList.add('brightness-medium');

/* ===== CAPTIONS SYSTEM ===== */
let captionsEnabled = true; // Captions default ON
let captionsEl = document.createElement('div');
captionsEl.id = 'captionsDisplay';
captionsEl.style.position = 'absolute';
captionsEl.style.top = '50%';
captionsEl.style.left = '50%';
captionsEl.style.transform = 'translate(-50%, -50%)';
captionsEl.style.color = 'var(--accent)';
captionsEl.style.fontFamily = 'monospace';
captionsEl.style.fontSize = '18px';
captionsEl.style.textAlign = 'center';
captionsEl.style.maxWidth = '70%';
captionsEl.style.opacity = '0';
captionsEl.style.pointerEvents = 'none';
captionsEl.style.transition = 'opacity 0.3s ease';
captionsEl.style.zIndex = '9999';
document.body.appendChild(captionsEl);

const colorMap = {
  azure: '#007FFF',
  teal: '#008080',
  emerald: '#50C878',
  lavender: '#B57EDC',
  indigo: '#4B0082',
  sapphire: '#0F52BA',
  aqua: '#00FFFF',
  mint: '#98FF98',
  slate: '#708090',
  periwinkle: '#CCCCFF',
  cobalt: '#0047AB',
  crimson: '#DC143C'
};

function getAccentRGB(){
  const hex = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent')
    .trim();

  const bigint = parseInt(hex.replace('#',''), 16);
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255
  };
}

const statusEl=document.getElementById('status');
const coreCircle=document.getElementById('coreCircle');
const textInput=document.getElementById('textInput');

let voices=[], voiceIndex=0;
speechSynthesis.onvoiceschanged=()=>{ voices=speechSynthesis.getVoices().filter(v=>v.lang.startsWith('en')) }

function speak(msg){
  if(muted) return;
  speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(msg);

  // Voice selection and rate/pitch
  if(voices.length){
    u.voice = voices[voiceIndex % voices.length];
    u.rate = voiceIndex===1 ? 0.9 : voiceIndex===2 ? 1.1 : 1;
    u.pitch = voiceIndex===1 ? 0.8 : voiceIndex===2 ? 1.2 : 1;
  }

  if(captionsEnabled && captionsEl){
    captionsEl.innerHTML = '';
    captionsEl.style.opacity = '1';

    const words = msg.split(' ');
    let currentWordIndex = 0;

    // ===== onboundary fires on each word =====
    u.onboundary = event => {
      if(event.name === 'word' || event.charIndex !== undefined){
        const startIndex = event.charIndex;
        // Find which word this corresponds to
        while(currentWordIndex < words.length && startIndex >= words.slice(0,currentWordIndex+1).join(' ').length + currentWordIndex){
          currentWordIndex++;
        }

        // Display current word with a max of 6 words per line
        const startLine = Math.floor(currentWordIndex / 6) * 6;
        const lineWords = words.slice(startLine, startLine + 6);
        captionsEl.innerText = lineWords.join(' ');
      }
    };

    // Fade out after speaking
    u.onend = () => {
      captionsEl.style.opacity = '0';
    };
  }

  speechSynthesis.speak(u);
}

function execute(cmd){
  if(cmd!=='activate' && !activated) return;
  lastCommand=cmd;
  let reply='';
  if(cmd==='activate'){ activated=true; standby=false; statusEl.innerText='ACTIVE'; coreCircle.classList.remove('standby'); reply='Activated'; }
  else if(cmd==='deactivate'){ activated=false; standby=false; statusEl.innerText='SYSTEM OFFLINE'; coreCircle.classList.remove('standby'); reply='Deactivated'; }
  else if(cmd==='standby'){ standby=true; statusEl.innerText='STANDBY'; coreCircle.classList.add('standby'); reply='Entering Standby Mode'; }
  else if(cmd==='resume'){ standby=false; statusEl.innerText='ACTIVE'; coreCircle.classList.remove('standby'); reply='Resuming'; }
  else if(cmd==='mute'){ muted=true; reply='Muted'; }
  else if(cmd==='unmute'){ muted=false; reply='Voice Restored'; }
  else if(cmd==='changeVoice'){ voiceIndex=(voiceIndex+1)%3; reply='Voice Changed Successfully'; }
  else if(cmd==='repeat' && lastCommand){ reply='Repeating Last Command'; execute(lastCommand); }
  else if(cmd==='input'){ voiceMode=!voiceMode; textInput.style.display=voiceMode?'none':'block'; if(!voiceMode) textInput.focus(); reply=voiceMode?'Input Changed to Voice':'Input Changed to Text'; }
  else if(cmd==='status'){ reply='All Commands Operational'; }
  else if(cmd === 'color'){
    setRandomColor();
    return;
  }
  speak(reply);
}

function setColorByName(colorName){
  if(!activated) return;

  const color = colorMap[colorName];
  if(!color){
    speak("Color not recognized");
    return;
  }

  document.documentElement.style.setProperty('--accent', color);
  speak(`Color changed to ${colorName}`);
}

function setRandomColor(){
  if(!activated) return;

  const keys = Object.keys(colorMap);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];

  document.documentElement.style.setProperty('--accent', colorMap[randomKey]);
  speak(`Color changed to ${randomKey}`);
}

/* ===== MUSIC CONTROL FUNCTIONS ===== */
function playMusic(type){
  if(!musicTracks[type]) return;

  musicPlayer.src = musicTracks[type];
  musicPlayer.play();
  speak(`${type} music playing`);
}

function stopMusic(){
  musicPlayer.pause();
  musicPlayer.currentTime = 0;
  speak('Music stopped');
}

function toggleAll(){
  allOpen=!allOpen;
  document.getElementById('allDropdown').style.display=allOpen?'flex':'none';
}

function toggleSettings(){
  settingsOpen=!settingsOpen;
  document.getElementById('settingsDropdown').style.display=settingsOpen?'flex':'none';
}

textInput.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    parse(textInput.value.toLowerCase());
    textInput.value='';
  }
});

function cleanQuery(text){
  return text
    .toLowerCase()
    .replace(/jarvis|what is|who is|tell me about|explain|define|how to/gi, "")
    .trim();
}

async function handleAIQuery(text){
  if(!activated) return;

  statusEl.innerText = "THINKING";
  speak("Thinking");

  const query = cleanQuery(text);

  /* ===== TRY WIKIPEDIA FIRST ===== */
  try{
    const wikiRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
    );
    const wikiData = await wikiRes.json();

    if(wikiData.extract){
      statusEl.innerText = "ACTIVE";
      speak(wikiData.extract);
      return;
    }
  }catch(e){
    console.warn("Wikipedia failed");
  }

  /* ===== FALLBACK TO DUCKDUCKGO ===== */
  try{
    const ddgData = await askDuckDuckGo(query);

    if(ddgData.AbstractText){
      statusEl.innerText = "ACTIVE";
      speak(ddgData.AbstractText);
      return;
    }

    if(ddgData.RelatedTopics && ddgData.RelatedTopics.length > 0){
      const topic = ddgData.RelatedTopics[0];
      if(topic.Text){
        statusEl.innerText = "ACTIVE";
        speak(topic.Text);
        return;
      }
    }

    speak("I could not find a clear answer");

  }catch(e){
    statusEl.innerText = "ACTIVE";
    speak("Unable to fetch information");
  }
}

function parse(text){
  if(text.includes('activate')) execute('activate');
  else if(text.includes('deactivate')) execute('deactivate');
  else if(text.includes('standby')) execute('standby');
  else if(text.includes('resume')) execute('resume');
  else if(text.includes('mute')) execute('mute');
  else if(text.includes('unmute')) execute('unmute');
  else if(text.includes('voice')) execute('changeVoice');
  else if(text.includes('repeat')) execute('repeat');
  else if(text.includes('color')){
    for(const name in colorMap){
      if(text.includes(name)){
        setColorByName(name);
        return;
      }
    }
    speak("Specify a color name");
  }
  else if(text.includes('input')) execute('input');
  else if(text.includes('status')) execute('status');
  else if(text.includes('play music')) playMusic('chill');
  else if(text.includes('stop music')) stopMusic();
  else handleAIQuery(text);
}

let recog;
function startVoice(){
  recog=new(window.SpeechRecognition||window.webkitSpeechRecognition)();
  recog.lang='en-US';
  recog.continuous=true;
  recog.interimResults=true;
  recog.onresult=e=>{
    if(lock) return;
    const r=e.results[e.results.length-1];
    if(!r.isFinal) return;
    const text=r[0].transcript.toLowerCase().trim();
    if(text.startsWith('jarvis')){
      lock=true;
      parse(text.replace('jarvis','').trim());
      setTimeout(()=>lock=false,1200);
    }
  };
  recog.onend=()=>voiceMode&&recog.start();
  recog.start();
}
startVoice();

/* ===== LOAD CORE SYSTEM ===== */
function loadCoreSystem(){
  speak('Loading Core System');
  const hud=document.getElementById('hudMain');
  hud.style.opacity='0';
  hud.style.transform='scale(0.5)';

  setTimeout(()=>{
    hud.style.display='none';
    document.body.style.background='#000';
    initCoreSystem();
  },1000);
}

/* ===== CORE SYSTEM FUNCTION ===== */
function initCoreSystem(){
  const coreDiv=document.getElementById('coreSystem');
  coreDiv.style.display='block';

  const exitBtn=document.createElement('button');
  exitBtn.innerText='EXIT';
  exitBtn.onclick=()=>{
    coreDiv.innerHTML='';
    coreDiv.style.display='none';
    document.body.style.background='#05060a';
    const hud=document.getElementById('hudMain');
    hud.style.display='block';
    setTimeout(()=>{ hud.style.opacity='1'; hud.style.transform='scale(1)'; },50);
  };
  coreDiv.appendChild(exitBtn);

  const video=document.createElement('video');
  video.autoplay=true;
  video.playsInline=true;
  coreDiv.appendChild(video);

  // ===== START WEBCAM (FIX PARTICLE CONTROL) =====
  navigator.mediaDevices.getUserMedia({ video:true })
  .then(stream=>{
    video.srcObject = stream;
  })
  .catch(err=>console.error(err));

  // ===== MEDIAPIPE HANDS =====
  const hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
  });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  let gestureCooldown = false;
  hands.onResults(results => {
    if (!results.multiHandLandmarks) return;

    const hand = results.multiHandLandmarks[0];
    if (!hand || !hand[0] || !hand[8] || !hand[9]) return;

    const palm = hand[0];
    const index = hand[8];

    const dist = Math.abs(index.y - palm.y);
    targetScale = THREE.MathUtils.clamp(
      1 + dist * 6,
      0.6,
      2.5
    );

    const nx = hand[9].x - 0.5;
    const ny = hand[9].y - 0.5;

    rotationTarget.y = nx * Math.PI;
    rotationTarget.x = ny * Math.PI;

    const fist =
      hand[8].y > palm.y &&
      hand[12].y > palm.y &&
      hand[16].y > palm.y;

    if (fist && !gestureCooldown) {
      if (currentShape === 'sphere') currentShape = 'cube';
      else if (currentShape === 'cube') currentShape = 'triangle';
      else currentShape = 'sphere';

      morph();

      gestureCooldown = true;
      setTimeout(() => { gestureCooldown = false; }, 1500);
    }
  });

  async function handLoop(){
    if(video.readyState >= 2) await hands.send({ image: video });
    requestAnimationFrame(handLoop);
  }
  handLoop();

  const hudText=document.createElement('div');
  hudText.id='hud';
  hudText.innerHTML='JARVIS CORE';
  coreDiv.appendChild(hudText);

  let scene=new THREE.Scene();
  let camera3D=new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 1000);
  camera3D.position.z=130;
  let renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth,innerHeight);
  coreDiv.appendChild(renderer.domElement);

  const COUNT=5000;
  let geometry=new THREE.BufferGeometry();
  let positions=new Float32Array(COUNT*3);
  let basePositions=new Float32Array(COUNT*3);
  const colorsArr=new Float32Array(COUNT*3);

  for(let i=0;i<COUNT;i++){
    const x=(Math.random()-0.5)*80;
    const y=(Math.random()-0.5)*80;
    const z=(Math.random()-0.5)*80;
    positions.set([x,y,z],i*3);
    basePositions.set([x,y,z],i*3);
    const accent = getAccentRGB();
    colorsArr.set([accent.r, accent.g, accent.b], i * 3);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colorsArr,3));
  let particles=new THREE.Points(geometry,new THREE.PointsMaterial({size:2.4,vertexColors:true}));
  scene.add(particles);
  let lastAccent = '';

  function syncParticleColor(){
    const currentAccent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent')
      .trim();
    if(currentAccent !== lastAccent){
      lastAccent = currentAccent;
      const { r, g, b } = getAccentRGB();
      for(let i = 0; i < COUNT; i++){
        colorsArr[i * 3]     = r;
        colorsArr[i * 3 + 1] = g;
        colorsArr[i * 3 + 2] = b;
      }
      geometry.attributes.color.needsUpdate = true;
    }
  }

  let targetScale=1, rotationTarget={x:0,y:0}, currentShape='sphere';

  function sphereShape(){
    const r=45;
    const t=Math.random()*Math.PI*2;
    const p=Math.acos(2*Math.random()-1);
    return [r*Math.sin(p)*Math.cos(t),r*Math.sin(p)*Math.sin(t),r*Math.cos(p)];
  }
  function cubeShape(){
    const s=35;
    return [(Math.random()-0.5)*s,(Math.random()-0.5)*s,(Math.random()-0.5)*s];
  }
  function triangleShape(){
    const s=40;
    const f=Math.floor(Math.random()*4);
    const r=Math.random();
    return f===0?[r*s,r*s,r*s]:f===1?[-r*s,-r*s,r*s]:f===2?[-r*s,r*s,-r*s]:[r*s,-r*s,-r*s];
  }

  function morph(){
    for(let i=0;i<COUNT;i++){
      let p=currentShape==='sphere'?sphereShape():currentShape==='cube'?cubeShape():triangleShape();
      basePositions.set(p,i*3);
    }
  }
  morph();

  function animate(){
    requestAnimationFrame(animate);
    particles.scale.lerp(new THREE.Vector3(targetScale,targetScale,targetScale),0.2);
    particles.rotation.x+=(rotationTarget.x-particles.rotation.x)*0.15;
    particles.rotation.y+=(rotationTarget.y-particles.rotation.y)*0.15;
    const t=performance.now()*0.001;
    for(let i=0;i<COUNT;i++){
      positions[i*3]=basePositions[i*3]+Math.sin(t+i)*0.12;
      positions[i*3+1]=basePositions[i*3+1]+Math.cos(t+i)*0.12;
    }
    geometry.attributes.position.needsUpdate=true;
    syncParticleColor();
    renderer.render(scene,camera3D);
  }
  animate();
}

/* ===== COMMAND CONFIRMATION LAYER (ONLY ADDITION) ===== */
let commandConfirmEnabled=false;
let pendingCommand=null;

const toggleEl=document.getElementById('commandConfirmToggle');
const overlay=document.getElementById('confirmOverlay');
const yesBtn=document.getElementById('confirmYes');
const noBtn=document.getElementById('confirmNo');

toggleEl.onclick=()=>{
  commandConfirmEnabled=!commandConfirmEnabled;
  toggleEl.innerText=`Command Confirmation - ${commandConfirmEnabled?'ON':'OFF'}`;
};

const __originalExecute=window.execute;
window.execute=function(cmd){
  if(commandConfirmEnabled){
    pendingCommand=cmd;
    overlay.style.display='flex';
  }else{
    __originalExecute(cmd);
  }
};

yesBtn.onclick=()=>{
  overlay.style.display='none';
  if(pendingCommand!==null){
    __originalExecute(pendingCommand);
    pendingCommand=null;
  }
};

noBtn.onclick=()=>{
  overlay.style.display='none';
  pendingCommand=null;
};

/* ===== CAPTIONS TOGGLE ===== */
const captionsToggle = document.getElementById('captionsToggle');
if(captionsToggle){
  captionsToggle.onclick = ()=>{
    captionsEnabled = !captionsEnabled;
    captionsToggle.innerText = `Captions - ${captionsEnabled ? 'ON' : 'OFF'}`;
  };
}

/* ===== BRIGHTNESS TOGGLE ===== */
const brightnessToggle = document.getElementById('brightnessToggle');

if(brightnessToggle){
  brightnessToggle.onclick = () => {
    // Remove current brightness class
    document.body.classList.remove(
      'brightness-low',
      'brightness-medium',
      'brightness-high'
    );

    // Move to next mode
    brightnessIndex = (brightnessIndex + 1) % brightnessModes.length;
    const mode = brightnessModes[brightnessIndex];

    // Apply new mode
    document.body.classList.add(`brightness-${mode}`);
    brightnessToggle.innerText = `Brightness - ${mode.toUpperCase()}`;

    // Optional voice feedback (safe)
    speak(`Brightness set to ${mode}`);
  };
}