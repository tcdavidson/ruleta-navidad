import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const STORAGE_KEY = 'david-nerea-christmas-roulette-v1';
const $ = id => document.getElementById(id);
const state = loadState();
let scene, camera, renderer, wheelGroup, wheelMesh, spinning = false, animationId;
let currentRotation = 0;
let toastTimer;

function defaultState(){ return {giftTotal:10, missTotal:2, remaining:[], history:[], totalSpins:0}; }
function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && Array.isArray(saved.remaining) && Array.isArray(saved.history)) return saved;
  } catch(e){}
  const fresh=defaultState(); fresh.remaining=buildSlots(fresh.giftTotal,fresh.missTotal); return fresh;
}
function buildSlots(gifts, misses){
  return [...Array.from({length:gifts},(_,i)=>({type:'gift',value:i+1})),...Array.from({length:misses},()=>({type:'miss',value:'—'}))];
}
function persist(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); updateStats(); }
function updateStats(){
  $('remainingLabel').textContent=`${state.remaining.length} casillas disponibles`;
  $('giftCount').textContent=state.remaining.filter(s=>s.type==='gift').length;
  $('missCount').textContent=state.remaining.filter(s=>s.type==='miss').length;
  $('spinCount').textContent=state.totalSpins;
  $('spinButton').disabled=spinning || state.remaining.length===0;
  $('testButton').disabled=spinning;
  if(state.remaining.length===0 && !spinning){
    $('resultMain').textContent='¡Has descubierto toda la magia!';
    $('resultSub').textContent='No quedan casillas. Puedes reiniciar la ruleta desde configuración.';
    $('result').classList.add('finished');
  }
}
function showToast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}

function makeWheelTexture(slots){
  const size=1024, canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'), cx=size/2, cy=size/2, radius=470;
  ctx.clearRect(0,0,size,size);
  const colors=['#9d3434','#174d3e','#b28a48','#17413d','#8f3850','#1c5545','#9a713d','#17413d'];
  const count=Math.max(slots.length,1), step=Math.PI*2/count;
  for(let i=0;i<count;i++){
    const start=-Math.PI/2+i*step, end=start+step;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,radius,start,end);ctx.closePath();
    ctx.fillStyle=slots[i]?.type==='miss'?'#234d50':colors[i%colors.length];ctx.fill();
    ctx.strokeStyle='#e8ca83';ctx.lineWidth=7;ctx.stroke();
    ctx.save();ctx.translate(cx,cy);ctx.rotate(start+step/2);
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#fff1cf';ctx.shadowColor='#0008';ctx.shadowBlur=8;
    const label=slots[i]?(slots[i].type==='miss'?'✦':String(slots[i].value)):'✦';
    const fontSize=Math.max(25,Math.min(64,340/count));
    ctx.font=`700 ${fontSize}px Georgia`;
    ctx.fillText(label,radius*.69,0);
    ctx.restore();
  }
  ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.strokeStyle='#f1d797';ctx.lineWidth=22;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,76,0,Math.PI*2);ctx.fillStyle='#102b25';ctx.fill();ctx.strokeStyle='#e5c77d';ctx.lineWidth=10;ctx.stroke();
  ctx.fillStyle='#f2d99e';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 55px Georgia';ctx.fillText('✦',cx,cy+2);
  return new THREE.CanvasTexture(canvas);
}
function initThree(){
  const mount=$('wheelMount');
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(0,0,8.6);
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(mount.clientWidth,mount.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;mount.appendChild(renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff,2.1));
  const key=new THREE.DirectionalLight(0xffdf9d,3);key.position.set(-3,4,6);scene.add(key);
  const rim=new THREE.PointLight(0x5dd4c1,18,12);rim.position.set(3,-2,4);scene.add(rim);
  wheelGroup=new THREE.Group();scene.add(wheelGroup);
  const texture=makeWheelTexture(state.remaining);
  wheelMesh=new THREE.Mesh(new THREE.CylinderGeometry(2.45,2.45,.25,96),new THREE.MeshStandardMaterial({color:0x9b713d,metalness:.78,roughness:.25}));
  wheelMesh.rotation.x=Math.PI/2;wheelMesh.position.z=-.18;wheelGroup.add(wheelMesh);
  const face=new THREE.Mesh(new THREE.CircleGeometry(2.34,96),new THREE.MeshStandardMaterial({map:texture,metalness:.25,roughness:.42,side:THREE.DoubleSide}));
  face.position.z=.0;wheelGroup.add(face);
  const rimMesh=new THREE.Mesh(new THREE.TorusGeometry(2.44,.075,12,120),new THREE.MeshStandardMaterial({color:0xf0d28c,metalness:.85,roughness:.2}));
  rimMesh.position.z=.16;wheelGroup.add(rimMesh);
  const innerRim=new THREE.Mesh(new THREE.TorusGeometry(.37,.055,10,64),new THREE.MeshStandardMaterial({color:0xe7c77e,metalness:.8,roughness:.22}));innerRim.position.z=.1;wheelGroup.add(innerRim);
  for(let i=0;i<24;i++){
    const a=i*Math.PI*2/24;const bead=new THREE.Mesh(new THREE.SphereGeometry(.045,12,12),new THREE.MeshStandardMaterial({color:0xffe7ad,emissive:0x8b5a20,emissiveIntensity:.35,metalness:.6}));
    bead.position.set(Math.cos(a)*2.43,Math.sin(a)*2.43,.23);wheelGroup.add(bead);
  }
  wheelGroup.rotation.z=currentRotation;
  renderLoop();
  new ResizeObserver(()=>{if(!renderer)return;const w=mount.clientWidth,h=mount.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)}).observe(mount);
}
function renderLoop(){animationId=requestAnimationFrame(renderLoop);renderer.render(scene,camera)}
function rebuildWheel(){
  if(!wheelGroup)return;
  while(wheelGroup.children.length) {const child=wheelGroup.children.pop();child.geometry?.dispose();if(Array.isArray(child.material))child.material.forEach(m=>m.dispose());else child.material?.dispose();}
  // Recreate the complete wheel using the latest remaining slots.
  const texture=makeWheelTexture(state.remaining);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(2.45,2.45,.25,96),new THREE.MeshStandardMaterial({color:0x9b713d,metalness:.78,roughness:.25}));base.rotation.x=Math.PI/2;base.position.z=-.18;wheelGroup.add(base);
  const face=new THREE.Mesh(new THREE.CircleGeometry(2.34,96),new THREE.MeshStandardMaterial({map:texture,metalness:.25,roughness:.42,side:THREE.DoubleSide}));face.position.z=0;wheelGroup.add(face);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(2.44,.075,12,120),new THREE.MeshStandardMaterial({color:0xf0d28c,metalness:.85,roughness:.2}));rim.position.z=.16;wheelGroup.add(rim);
  const hub=new THREE.Mesh(new THREE.TorusGeometry(.37,.055,10,64),new THREE.MeshStandardMaterial({color:0xe7c77e,metalness:.8,roughness:.22}));hub.position.z=.1;wheelGroup.add(hub);
  for(let i=0;i<24;i++){const a=i*Math.PI*2/24,b=new THREE.Mesh(new THREE.SphereGeometry(.045,12,12),new THREE.MeshStandardMaterial({color:0xffe7ad,emissive:0x8b5a20,emissiveIntensity:.35,metalness:.6}));b.position.set(Math.cos(a)*2.43,Math.sin(a)*2.43,.23);wheelGroup.add(b)}
  wheelGroup.rotation.z=currentRotation;
}
function animateSpin(slotIndex, count, isTest){
  if(spinning)return;
  spinning=true;updateStats();
  $('resultMain').textContent='La suerte está echada…';$('resultSub').textContent='Un deseo, un giro y un poquito de magia.';
  const slice=Math.PI*2/count, targetIndex=slotIndex;
  // Pointer is at 12 o'clock. Land the middle of the selected segment beneath it.
  const desired=- (targetIndex+.5)*slice;
  const current=((currentRotation%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  let delta=((desired-current)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
  delta+=Math.PI*2*(5+Math.floor(Math.random()*3));
  const start=currentRotation, end=start+delta, duration=5200+Math.random()*900, startTime=performance.now();
  const ease=t=>1-Math.pow(1-t,5);
  function frame(now){
    const t=Math.min(1,(now-startTime)/duration);currentRotation=start+(end-start)*ease(t);wheelGroup.rotation.z=currentRotation;renderer.render(scene,camera);
    if(t<1){requestAnimationFrame(frame);return}
    spinning=false;
    const slot=state.remaining[targetIndex];
    if(!isTest){
      state.remaining.splice(targetIndex,1);state.history.push({type:slot.type,value:slot.value,at:new Date().toISOString()});state.totalSpins++;
      persist();rebuildWheel();
    }
    showResult(slot,isTest);updateStats();
  }
  requestAnimationFrame(frame);
}
function showResult(slot,isTest){
  $('resultMain').textContent=slot.type==='miss'?'Esta vez no ha habido suerte':String(slot.value);
  $('resultSub').textContent=slot.type==='miss'?'¡La próxima tirada puede traer una sorpresa!':(isTest?'Resultado de prueba · no se ha consumido':'¡Hoy toca regalito, mi amorcito! ♥');
  $('result').classList.remove('finished');
  if(slot.type==='gift'&&!isTest)celebrate();
}
function celebrate(){
  const colors=['#e8c77e','#e7a8bd','#70d4c5','#fff0c4'];
  for(let i=0;i<42;i++){const p=document.createElement('i');p.style.cssText=`position:fixed;z-index:9;left:${45+Math.random()*10}%;top:42%;width:6px;height:10px;background:${colors[i%colors.length]};pointer-events:none;border-radius:2px;`;document.body.appendChild(p);const x=(Math.random()-.5)*440,y=220+Math.random()*260;p.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${x}px,${y}px) rotate(${Math.random()*720}deg)`,opacity:0}],{duration:1000+Math.random()*900,easing:'cubic-bezier(.15,.7,.3,1)'}).onfinish=()=>p.remove()}
}
$('spinButton').addEventListener('click',()=>{
  if(!state.remaining.length)return;
  const index=Math.floor(Math.random()*state.remaining.length);
  animateSpin(index,state.remaining.length,false);
});
$('testButton').addEventListener('click',()=>{
  if(!state.remaining.length){showToast('No quedan casillas para probar. Reinicia la ruleta.');return}
  const index=Math.floor(Math.random()*state.remaining.length);
  animateSpin(index,state.remaining.length,true);
});
$('openSettings').addEventListener('click',()=>{
  $('numberCount').value=state.giftTotal;$('missCountInput').value=state.missTotal;$('settingsModal').hidden=false;
});
$('closeSettings').addEventListener('click',()=>$('settingsModal').hidden=true);
$('settingsModal').addEventListener('click',e=>{if(e.target===$('settingsModal'))$('settingsModal').hidden=true});
$('applySettings').addEventListener('click',()=>{
  const gifts=Math.max(0,Math.min(50,parseInt($('numberCount').value,10)||0));
  const misses=Math.max(0,Math.min(30,parseInt($('missCountInput').value,10)||0));
  if(gifts+misses===0){showToast('Añade al menos una casilla.');return}
  state.giftTotal=gifts;state.missTotal=misses;state.remaining=buildSlots(gifts,misses);state.history=[];state.totalSpins=0;currentRotation=0;
  persist();rebuildWheel();$('resultMain').textContent='¿Preparada, mi amorcito?';$('resultSub').textContent='Pulsa el botón y deja que la magia suceda.';$('result').classList.remove('finished');$('settingsModal').hidden=true;showToast('Ruleta actualizada y progreso reiniciado.');
});
$('resetProgress').addEventListener('click',()=>{
  if(!confirm('¿Seguro que quieres recuperar todas las casillas y reiniciar el progreso?'))return;
  state.remaining=buildSlots(state.giftTotal,state.missTotal);state.history=[];state.totalSpins=0;currentRotation=0;persist();rebuildWheel();$('resultMain').textContent='¡Todo listo para volver a jugar!';$('resultSub').textContent='La ruleta vuelve a estar completa.';$('result').classList.remove('finished');$('settingsModal').hidden=true;showToast('Progreso restablecido.');
});
window.addEventListener('beforeunload',()=>{if(animationId)cancelAnimationFrame(animationId)});
persist();initThree();
