
'use strict';
(()=>{
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const C={teal:'#087e8b',blue:'#4164ca',amber:'#ad7021',red:'#c55769',slate:'#75859a',purple:'#8861ad'};
const colourPalettes={kth:[['KTH blue','#004791'],['Navy','#000061'],['Sky blue','#6298d2'],['Digital blue','#0029ed'],['Light blue','#def0ff'],['Sand','#ebe5e0'],['White','#ffffff']],diagram:[['Teal',C.teal],['Blue',C.blue],['Amber',C.amber],['Rose',C.red],['Slate',C.slate],['Purple',C.purple],['Black','#212121']]};
let colourTarget='drawing';
let fullscreenWanted=false,nativeFullscreenOwned=false;
function colourName(value){return Object.values(colourPalettes).flat().find(([,hex])=>hex===value.toLowerCase())?.[0]||value.toUpperCase()}
function colourButton(target,value,id){const label=target==='drawing'?'Drawing colour':'Selected object colour';return `<button type="button" class="colour-button" id="${id}" data-colour-target="${target}" aria-haspopup="dialog" aria-controls="colourDialog" aria-label="${label}: ${esc(colourName(value))}" title="${label}: ${esc(colourName(value))}"><span class="colour-chip" style="background:${value}"></span>${target==='drawing'?'':`<span class="colour-button-name">${esc(colourName(value))}</span>`}<span class="colour-arrow" aria-hidden="true">▾</span></button>`}
function openColourPalette(target){
 const os=state.objects.filter(o=>selected.has(o.id));if(target==='selection'&&!os.length)return;
 colourTarget=target;const current=target==='drawing'?color:os[0].color,mixed=target==='selection'&&os.some(o=>o.color!==current);
 $('paletteTitle').textContent=target==='drawing'?'Drawing colour':os.length===1?'Object colour':'Selected objects’ colour';
 for(const [group,id]of [['kth','kthSwatches'],['diagram','diagramSwatches']])$(id).innerHTML=colourPalettes[group].map(([name,hex])=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)),dark=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]<150,active=!mixed&&hex===current.toLowerCase();return `<button type="button" class="palette-swatch" data-palette-colour="${hex}" aria-label="${name}" title="${name} · ${hex.toUpperCase()}" aria-pressed="${active}" style="background:${hex};color:${dark?'#fff':'#000061'}"><span aria-hidden="true">${active?'✓':''}</span></button>`}).join('');
 $('paletteCurrent').innerHTML=mixed?'Multiple colours selected':`<span class="colour-chip" style="background:${current}"></span><span>Current: ${esc(colourName(current))}</span>`;
 $('customColour').value=current;$('customColourDetails').open=false;$('colourDialog').showModal();
 const active=$('colourDialog').querySelector('[aria-pressed="true"]')||$('colourDialog').querySelector('[data-palette-colour]');active?.focus();
}
function applyPaletteColour(value){
 if(!/^#[0-9a-f]{6}$/i.test(value))return;value=value.toLowerCase();
 $('colourDialog').close();
 if(colourTarget==='drawing'){color=value;toolbar();$('drawColor').focus();return}
 const os=state.objects.filter(o=>selected.has(o.id));if(!os.length)return;
 if(os.some(o=>o.color!==value)){checkpoint();for(const o of os)o.color=value;render();objectList();inspector();persist()}
 $('objectColour')?.focus();
}

const DEFAULT_ETA=Math.atanh(.98),MAX_BETA=1-Number.EPSILON,MAX_ETA=Math.atanh(MAX_BETA), STORAGE='sh2373-minkowski-lab-v1';
const icons={select:'M5 3l12 9-6 1-3 6z',pan:'M7 11V6a1.5 1.5 0 013 0v5-7a1.5 1.5 0 013 0v7-6a1.5 1.5 0 013 0v7-4a1.5 1.5 0 013 0v7c0 5-4 7-7 7-3 0-4-2-5-4l-3-5a1.5 1.5 0 012-2l2 2',point:'M12 4v4m0 8v4M4 12h4m8 0h4M15 12a3 3 0 11-6 0 3 3 0 016 0',segment:'M5 19 19 5M3 17l4 4M17 3l4 4',line:'M3 21 21 3M3 15v6h6M15 3h6v6',arrow:'M4 20 20 4M11 4h9v9',freehand:'M3 17c4-18 5 10 9-4s7-10 9-6',rect:'M4 5h16v14H4z',circle:'M20 12a8 8 0 11-16 0 8 8 0 0116 0',lightcone:'M3 3l18 18M3 21 21 3M14 12a2 2 0 11-4 0 2 2 0 014 0',hyperbola:'M3 3c2 5 4 6 9 6s7-1 9-6M3 21c2-5 4-6 9-6s7 1 9 6',text:'M5 5h14M12 5v15M8 20h8',undo:'M9 4 4 9l5 5M4 9h9a7 7 0 017 7',redo:'M15 4l5 5-5 5M20 9h-9a7 7 0 00-7 7'};
const icon=k=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[k]}"/></svg>`;
const toolDefs=[['select','Select / move (V)'],['pan','Pan (H)'],['point','Event · click'],['segment','Segment · drag'],['line','Infinite line · drag'],['arrow','Arrow · drag'],['freehand','Freehand · draw'],['rect','Rectangle · drag'],['circle','Circle · drag radius'],['hyperbola','Invariant hyperbola · click a point'],['lightcone','Light cone · click its vertex'],['text','Text · click']];
let state={geometry:'minkowski',objects:[],eta:0,caseId:'time',camera:{x:1,t:2.8,span:11},options:{grid:true,light:true,labels:true,snap:false}},selected=new Set(),tool='select',color=C.teal,mode='beta',nextId=1,history=[],future=[],gesture=null,preview=null,heldBoostKey=null,saveTimer=null,toastTimer=null;
let W=800,H=600,scale=60,labelBoxes=[],frameAnimation=null,frameRAF=0,sliderEtaLimit=DEFAULT_ETA;
const labelMeasure=document.createElement('canvas').getContext('2d');
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=3)=>Math.abs(n)<.5*10**(-d)?(0).toFixed(d):n.toFixed(d);
const pt=(x,t)=>({x,t});
function isEuclidean(){return state.geometry==='euclidean'}
function verticalName(){return isEuclidean()?'y':'t'}
function parameterLimit(){return isEuclidean()?Math.PI:MAX_ETA}
function sliderLimit(){return isEuclidean()?Math.PI:sliderEtaLimit}
function sliderValue(angle){return isEuclidean()?(mode==='beta'?angle*180/Math.PI:angle):(mode==='beta'?Math.tanh(angle):angle)}
function sliderParameter(value){return isEuclidean()?(mode==='beta'?value*Math.PI/180:value):(mode==='beta'?Math.atanh(value):value)}
// t stores the second coordinate in both geometries; Euclidean UI labels it y.
function boost(p,eta=state.eta){
 if(isEuclidean()){const c=Math.cos(eta),s=Math.sin(eta);return pt(c*p.x+s*p.t,c*p.t-s*p.x)}
 const c=Math.cosh(eta),s=Math.sinh(eta);return pt(c*p.x-s*p.t,c*p.t-s*p.x);
}
const base=p=>boost(p,-state.eta), toScreen=p=>({x:W/2+(p.x-state.camera.x)*scale,y:H/2-(p.t-state.camera.t)*scale}), viewToScreen=p=>toScreen(boost(p));
function fromScreen(x,y){return pt(state.camera.x+(x-W/2)/scale,state.camera.t-(y-H/2)/scale)}
function bounds(){return {xmin:state.camera.x-W/(2*scale),xmax:state.camera.x+W/(2*scale),tmin:state.camera.t-H/(2*scale),tmax:state.camera.t+H/(2*scale)}}
function obj(type,label,props={},col=C.teal){return {id:nextId++,type,label,color:col,width:2,dash:false,visible:true,...props}}
function add(o){state.objects.push(o);return o}
function axes(eta=0,name='0',col=C.slate){add(obj('axis',verticalName()+name,{axis:'t',frameEta:eta,width:1.5},col));add(obj('axis','x'+name,{axis:'x',frameEta:eta,width:1.5},col))}
function line(label,p,q,col=C.slate,dash=true){return add(obj('line',label,{points:[p,q],dash,width:1.5},col))}
function seg(label,p,q,col=C.teal,extra={}){return add(obj('segment',label,{points:[p,q],...extra},col))}
function event(label,x,t,col=C.teal,extra={}){return add(obj('point',label,{points:[pt(x,t)],...extra},col))}
const cases={
 time:{number:'01',name:'Time dilation',sub:'Clocks & invariant intervals',title:'The same tick.<br>A different time.',desc:'Two clocks leave the origin. The moving clock has v = 0.60. Its four-unit tick lies on the same proper-time hyperbola as the stationary clock’s four-unit tick.',formula:'Δt₀ = γ Δτ = 5',detail:'v = 0.60 &nbsp; · &nbsp; γ = 1.25 &nbsp; · &nbsp; Δτ = 4',legend:[[C.teal,'Moving clock'],[C.blue,'Stationary clock'],[C.amber,'Lab simultaneity','dash'],[C.purple,'Invariant hyperbolae · 4 units','dash']],prompt:'Switch to the clock frame',question:'The moving clock becomes vertical. Which events are simultaneous now? Compare the two dashed slices through P.',camera:{x:1.3,t:3,span:10.8},frames:[['Lab',0],['Moving clock',.6]],build(){axes();axes(Math.atanh(.6),'′',C.teal);add(obj('hyperbola','τ = 4',{center:pt(0,0),radius:4,kind:'timelike',branch:'positive',dash:true,width:1.5},C.purple));add(obj('hyperbola','ℓ = 4',{center:pt(0,0),radius:4,kind:'spacelike',branch:'positive',dash:true,width:1.2,dy:22},C.purple));line('Lab simultaneity',pt(0,5),pt(4,5),C.amber);line('Clock simultaneity',pt(0,3.2),pt(3,5),C.teal);seg('Stationary clock',pt(0,0),pt(0,5),C.blue,{width:3,dx:-12,anchor:'end'});seg('Moving clock',pt(0,0),pt(3,5),C.teal,{width:3});event('O',0,0,C.slate,{dx:9,dy:18});event('Q · τ = 4',0,4,C.blue,{dx:-13,dy:3,anchor:'end'});event('R · t₀ = 5',0,5,C.amber,{dx:-13,dy:-10,anchor:'end'});event('P · τ = 4',3,5,C.teal,{dx:11,dy:-12})}},
 length:{number:'02',name:'Length contraction',sub:'Measure at the same time',title:'Length needs<br>a “now”.',desc:'A rod of proper length L₀ = 4 moves at v = 0.60. Its endpoints trace the two teal worldlines. A length measurement uses simultaneous events in the observer’s frame.',formula:'L = L₀ / γ = 3.2',detail:'Rod rest length 4 &nbsp; · &nbsp; lab length 3.2',legend:[[C.teal,'Rod endpoints'],[C.amber,'Lab length · same t₀'],[C.blue,'Proper length · same t′']],prompt:'Compare the two rulers',question:'In the rod frame, the blue segment becomes horizontal and measures 4. The amber events are no longer simultaneous.',camera:{x:2.1,t:2.7,span:11.5},frames:[['Lab',0],['Rod frame',.6]],build(){axes();line('Rod · rear',pt(0,0),pt(.6,1),C.teal,false);line('Rod · front',pt(3.2,0),pt(3.8,1),C.teal,false);line('Lab simultaneity',pt(0,2),pt(1,2),C.amber);line('Rod simultaneity',pt(1.2,2),pt(6.2,5),C.blue);seg('L = 3.2 in lab',pt(1.2,2),pt(4.4,2),C.amber,{width:3,dy:20});seg('L₀ = 4 in rod frame',pt(1.2,2),pt(6.2,5),C.blue,{width:3,dy:-12});event('A',1.2,2,C.teal,{dx:-14,dy:15});event('B',4.4,2,C.amber);event('C',6.2,5,C.blue)}},
 twins:{number:'03',name:'Twin paradox',sub:'Two paths through spacetime',title:'One reunion.<br>Two elapsed times.',desc:'The traveller moves at v = +0.60, turns at (x₀, t₀) = (3, 5), and returns at v = −0.60. The stay-at-home twin remains at x₀ = 0.',formula:'τ<sub>home</sub> = 10<br>τ<sub>travel</sub> = 8',detail:'Each travelling leg: √(5² − 3²) = 4',legend:[[C.blue,'Stay-at-home twin'],[C.teal,'Outbound traveller'],[C.red,'Inbound traveller'],[C.amber,'Lab simultaneity','dash']],prompt:'At the turnaround',question:'The traveller’s assigned “now” at home changes from t₀ = 3.2 to 6.8. These are different simultaneity conventions, not a sudden ageing of the home twin.',camera:{x:1,t:5,span:14},frames:[['Home',0],['Outbound',.6],['Inbound',-.6]],build(){axes();line('Outbound now',pt(0,3.2),pt(3,5),C.teal);line('Lab now',pt(0,5),pt(3,5),C.amber);line('Inbound now',pt(0,6.8),pt(3,5),C.red);seg('Home twin · τ = 10',pt(0,0),pt(0,10),C.blue,{width:3.2,showLabel:false});seg('Outbound · τ = 4',pt(0,0),pt(3,5),C.teal,{width:3,dx:12,dy:0});seg('Inbound · τ = 4',pt(3,5),pt(0,10),C.red,{width:3,dx:12,dy:0});event('Departure',0,0,C.slate,{dx:10,dy:17});event('Turn',3,5,C.teal,{dx:12,dy:-12});event('Reunion',0,10,C.blue,{dx:10,dy:-12});event('3.2',0,3.2,C.teal,{dx:-12,dy:3,anchor:'end'});event('5.0',0,5,C.amber,{dx:-12,dy:3,anchor:'end'});event('6.8',0,6.8,C.red,{dx:-12,dy:3,anchor:'end'})}},
 barn:{number:'04',name:'Pole in a barn',sub:'Whose doors close together?',title:'It fits.<br>But when?',desc:'The barn is 4 units long. A pole of rest length 5 moves at v = 0.80, so its lab length is 3. Both doors close momentarily at t₀ = 0, with the pole inside.',formula:'L<sub>pole</sub> = 5 / (5/3) = 3',detail:'In the pole frame: L<sub>barn</sub> = 4 / (5/3) = 2.4',legend:[[C.amber,'Barn doors'],[C.teal,'Pole endpoints'],[C.red,'Door-closing events'],[C.blue,'Pole simultaneity','dash']],prompt:'Switch to the pole frame',question:'The front door closes earlier than the back door: t′front − t′back = −16/3. There is no simultaneous enclosure in this frame. The pole is never stopped.',camera:{x:0,t:0,span:11.5},frames:[['Barn',0],['Pole frame',.8]],build(){axes();add(obj('polygon','Barn interior',{points:[pt(-2,-4),pt(2,-4),pt(2,4),pt(-2,4)],fill:true,width:.6,showLabel:false},C.amber));line('Back door',pt(-2,-1),pt(-2,1),C.amber,false);line('Front door',pt(2,-1),pt(2,1),C.amber,false);line('Pole · rear',pt(-1.5,0),pt(-.7,1),C.teal,false);line('Pole · front',pt(1.5,0),pt(2.3,1),C.teal,false);line('Pole now',pt(-4,-3.2),pt(4,3.2),C.blue);line('Barn now',pt(-3,0),pt(3,0),C.red);seg('Pole · Llab = 3',pt(-1.5,0),pt(1.5,0),C.teal,{width:5,dy:23});event('Back closes',-2,0,C.red,{dx:-10,dy:-13,anchor:'end'});event('Front closes',2,0,C.red,{dx:10,dy:-13});event('Rear at t₀ = 0',-1.5,0,C.teal,{showLabel:false});event('Front at t₀ = 0',1.5,0,C.teal,{showLabel:false})}},
 blank:{number:'＋',name:'Your own diagram',sub:'Start with reference axes',title:'Make spacetime<br>your own.',desc:'Build an example with events, worldlines, arrows, shapes and invariant hyperbolae. Draw in any observer’s frame, then change the velocity to explore the geometry.',formula:'s² = Δt² − Δx²',detail:'Timelike s² > 0 · spacelike s² < 0',legend:[[C.slate,'Reference frame axes']],prompt:'A useful first experiment',question:'Draw an event, then a hyperbola through it. Change the observer: the event follows the same invariant curve.',camera:{x:0,t:0,span:12},frames:[['Reference',0]],build(){axes()}}
};
// Euclidean examples use ordinary spatial coordinates x and y, never time.
const tilt=Math.atan2(3,4);
Object.assign(cases,{
 euclideanComponents:{geometry:'euclidean',number:'01',name:'Components & circles',sub:'Projection and invariant length',title:'One length.<br>Different components.',desc:'The segment OP has length 5, with reference components (3, 4). Rotate the coordinates to align it with the vertical axis. The circle calibrates every direction with the same length.',formula:'x₀² + y₀² = 3² + 4² = 25',detail:'Length 5 · vertical projection 4',legend:[[C.teal,'OP · length 5'],[C.blue,'Vertical radius · length 5'],[C.amber,'Equal y₀ = 4','dash'],[C.purple,'Invariant circle · radius 5','dash']],prompt:'Compare with time dilation',question:'A Euclidean projection is shorter than the full segment: y₀ = 5 cos α = 4. In Minkowski space the corresponding time component is larger than proper time. These are spatial lengths, not clock readings.',camera:{x:.8,t:.8,span:13},frames:[['Reference',0],['OP vertical',-tilt]],build(){axes();axes(-tilt,'′',C.teal);add(obj('circle','r = 5',{center:pt(0,0),radius:5,dash:true,width:1.5},C.purple));line('Equal y₀ = 4',pt(0,4),pt(3,4),C.amber);seg('Vertical radius · 5',pt(0,0),pt(0,5),C.blue,{width:3,dx:-12,anchor:'end'});seg('OP · 5',pt(0,0),pt(3,4),C.teal,{width:3});event('O',0,0,C.slate);event('P · (3, 4)',3,4,C.teal);event('Q · (0, 5)',0,5,C.blue,{dx:-12,anchor:'end'});event('Projection · 4',0,4,C.amber,{dx:-12,anchor:'end'})}},
 euclideanWidth:{geometry:'euclidean',number:'02',name:'Width & oblique slices',sub:'A Euclidean ruler comparison',title:'Which slice<br>measures the width?',desc:'The parallel edges of this tilted strip are 4 units apart, measured perpendicularly. A horizontal slice crosses a longer distance: 5 units. Rotate to align the strip’s edges vertically.',formula:'W = L / cos α = 4 / 0.8 = 5',detail:'Perpendicular width 4 · horizontal slice 5',legend:[[C.teal,'Parallel edges'],[C.blue,'Perpendicular width · 4'],[C.amber,'Horizontal slice · 5']],prompt:'Compare with length contraction',question:'Both examples require choosing a slice across two parallel lines. In Euclidean space an oblique slice is longer than the perpendicular width. This differs from the Lorentzian relation L = L₀ / γ.',camera:{x:3,t:1,span:12},frames:[['Reference',0],['Strip aligned',-tilt]],build(){axes();line('Left edge',pt(0,0),pt(3,4),C.teal,false);line('Right edge',pt(3.2,-2.4),pt(6.2,1.6),C.teal,false);line('Horizontal slice',pt(0,2),pt(1,2),C.amber);line('Perpendicular slice',pt(1.5,2),pt(4.7,-.4),C.blue);seg('W = 5',pt(1.5,2),pt(6.5,2),C.amber,{width:3,dy:-13});seg('L = 4',pt(1.5,2),pt(4.7,-.4),C.blue,{width:3,dy:20});event('A',1.5,2,C.teal);event('B',6.5,2,C.amber);event('C',4.7,-.4,C.blue)}},
 euclideanPaths:{geometry:'euclidean',number:'03',name:'Straight path & detour',sub:'The Euclidean twin comparison',title:'One destination.<br>Two path lengths.',desc:'Two paths join O to R. The straight path has length 8. The bent path goes through P = (3, 4), with two legs of length 5. Rotations change components, but preserve both path lengths.',formula:'L<sub>straight</sub> = 8<br>L<sub>detour</sub> = 5 + 5 = 10',detail:'Euclidean straight paths minimise length',legend:[[C.blue,'Straight path · 8'],[C.teal,'First leg · 5'],[C.red,'Second leg · 5'],[C.amber,'Reference cross-section','dash']],prompt:'Compare with the twins',question:'The bent Euclidean route is longer; the travelling twin’s timelike route has less proper time. Perpendicular slices through P meet the reference axis at 6.25 and 1.75. These are spatial cross-sections, not simultaneities.',camera:{x:1,t:4,span:12},frames:[['Reference',0],['First leg vertical',-tilt],['Second leg vertical',tilt]],build(){axes();line('First-leg perpendicular',pt(0,6.25),pt(3,4),C.teal);line('Reference y₀ = 4',pt(0,4),pt(3,4),C.amber);line('Second-leg perpendicular',pt(0,1.75),pt(3,4),C.red);seg('Straight · 8',pt(0,0),pt(0,8),C.blue,{width:3,dx:-12,anchor:'end'});seg('First leg · 5',pt(0,0),pt(3,4),C.teal,{width:3});seg('Second leg · 5',pt(3,4),pt(0,8),C.red,{width:3});event('O',0,0,C.slate);event('P',3,4,C.teal);event('R',0,8,C.blue);event('6.25',0,6.25,C.teal,{dx:-12,anchor:'end'});event('1.75',0,1.75,C.red,{dx:-12,anchor:'end'})}},
 euclideanPole:{geometry:'euclidean',number:'04',name:'A tilted pole',sub:'Projection is not containment',title:'A long pole.<br>A smaller projection.',desc:'A pole of length 5 lies diagonally inside a rectangle of width 4 and height 5. Its horizontal projection is only 3. Rotate to align the pole horizontally: it remains inside the same rectangle.',formula:'Δx₀ = 5 cos(53.13°) = 3',detail:'Pole length 5 · rectangle width 4',legend:[[C.amber,'Rectangle · 4 × 5'],[C.teal,'Pole · length 5'],[C.blue,'Horizontal projection · 3','dash']],prompt:'Compare with the pole in a barn',question:'Changing coordinates never changes containment. Euclidean projection explains the smaller horizontal component. The relativistic barn example instead compares different simultaneity slices; a rotation is not a Lorentz boost.',camera:{x:0,t:0,span:10},frames:[['Reference',0],['Pole horizontal',Math.atan2(4,3)]],build(){axes();add(obj('polygon','Rectangle · 4 × 5',{points:[pt(-2,-2.5),pt(2,-2.5),pt(2,2.5),pt(-2,2.5)],fill:true,width:2,showLabel:false},C.amber));seg('Pole · 5',pt(-1.5,-2),pt(1.5,2),C.teal,{width:4});seg('Projection · 3',pt(-1.5,0),pt(1.5,0),C.blue,{width:2,dash:true,dy:20});seg('',pt(-1.5,-2),pt(-1.5,0),C.blue,{dash:true,showLabel:false});seg('',pt(1.5,2),pt(1.5,0),C.blue,{dash:true,showLabel:false});event('A',-1.5,-2,C.teal);event('B',1.5,2,C.teal)}},
 euclideanBlank:{geometry:'euclidean',number:'＋',name:'Your own plane',sub:'Start with reference axes',title:'Explore<br>ordinary geometry.',desc:'Draw points, lines, shapes and invariant circles in a Euclidean plane. Rotate the coordinates and compare with boosts in Minkowski space.',formula:'ℓ² = Δx² + Δy²',detail:'Rotations preserve lengths and angles',legend:[[C.slate,'Reference axes']],prompt:'A useful first experiment',question:'Draw a circle centred at the origin and a point on it. Rotate the coordinates: the point follows the same circle. A circle with an offset centre moves with its centre.',camera:{x:0,t:0,span:12},frames:[['Reference',0]],build(){axes()}}
});
function switchGeometry(geometry){
 if(geometry===state.geometry)return;
 checkpoint();
 const {alternateScene,...current}=clone(state);
 if(alternateScene?.geometry===geometry){state={...alternateScene,alternateScene:current};selected.clear();nextId=Math.max(0,...state.objects.map(o=>o.id))+1;tool='select';gesture=null;preview=null;refresh()}
 else{state={...current,alternateScene:current};loadCase(geometry==='euclidean'?'euclideanComponents':'time',false)}
 toast(geometry==='euclidean'?'Euclidean plane: rotations preserve x² + y².':'Minkowski spacetime: boosts preserve t² − x².');
}
function snapshot(){return JSON.stringify(state)}
function checkpoint(){cancelFrameAnimation();history.push(snapshot());if(history.length>80)history.shift();future=[];updateHistoryButtons()}
function undo(){cancelFrameAnimation();if(!history.length)return;future.push(snapshot());state=JSON.parse(history.pop());selected.clear();nextId=Math.max(0,...state.objects.map(o=>o.id))+1;refresh();toast('Undone')}
function redo(){cancelFrameAnimation();if(!future.length)return;history.push(snapshot());state=JSON.parse(future.pop());selected.clear();nextId=Math.max(0,...state.objects.map(o=>o.id))+1;refresh();toast('Redone')}
function persist(immediate=false){clearTimeout(saveTimer);const save=()=>{try{localStorage.setItem(STORAGE,snapshot())}catch{}};if(immediate)save();else saveTimer=setTimeout(save,350)}
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),3000)}
function loadCase(id,record=true){cancelFrameAnimation();sliderEtaLimit=DEFAULT_ETA;if(record)checkpoint();state.objects=[];state.geometry=cases[id].geometry||'minkowski';state.caseId=id;state.eta=0;state.camera=clone(cases[id].camera);nextId=1;selected.clear();cases[id].build();tool='select';preview=null;gesture=null;refresh()}
function lesson(){const c=cases[state.caseId]||cases.blank;$('caseList').innerHTML=Object.entries(cases).filter(([,v])=>(v.geometry||'minkowski')===(state.geometry||'minkowski')).map(([k,v])=>`<button class="case-btn ${k===state.caseId?'active':''}" data-case="${k}" aria-pressed="${k===state.caseId}"><span class="case-no">${v.number}</span><span><span class="case-name">${v.name}</span><span class="case-sub">${v.sub}</span></span></button>`).join('');$('lesson').innerHTML=`<div class="eyebrow">${isEuclidean()?'Euclidean geometry':state.caseId==='blank'?'Open canvas':'The geometry of relativity'}</div><h2>${c.title}</h2><p>${c.desc}</p><div class="equation-card"><div class="formula">${c.formula}</div><div class="small">${c.detail}</div></div><div class="legend">${c.legend.map(([co,l,d])=>`<div class="legend-item"><span class="legend-line ${d||''}" style="border-color:${co}"></span>${l}</div>`).join('')}</div><div class="prompt"><strong>${c.prompt}</strong><p>${c.question}</p></div>`;$('frameChips').innerHTML=c.frames.map(([n,b])=>`<button data-frame="${isEuclidean()?b:Math.atanh(b)}">${n} <span style="opacity:.6">${isEuclidean()?'θ '+fmt(b*180/Math.PI,1)+'°':'v '+(b===0?'0':b.toFixed(2))}</span></button>`).join('')}
function availableTools(){return toolDefs.filter(([k])=>!isEuclidean()||!['hyperbola','lightcone'].includes(k)).map(([k,l])=>[k,isEuclidean()&&k==='point'?'Point · click':isEuclidean()&&k==='circle'?'Invariant circle · drag centre to radius':l])}
function toolbar(){ updateToolHint(); $('toolbar').innerHTML=availableTools().map(([k,l])=>`<button class="tool ${tool===k?'active':''}" data-tool="${k}" title="${l}" aria-label="${l}" aria-pressed="${tool===k}">${icon(k)}</button>`).join('')+`<span class="tool-separator"></span>${colourButton('drawing',color,'drawColor')}<span class="tool-separator"></span><button class="tool" id="undoBtn" title="Undo (⌘/Ctrl Z)" aria-label="Undo">${icon('undo')}</button><button class="tool" id="redoBtn" title="Redo (⌘/Ctrl Shift Z)" aria-label="Redo">${icon('redo')}</button>`;updateHistoryButtons();$('undoBtn').onclick=undo;$('redoBtn').onclick=redo}
function setPresentationLayout(active){
 document.body.classList.toggle('presentation',active);
 document.body.classList.remove('inspector-open');
 $('presentBtn').textContent=active?'Exit full screen':'Full screen';$('presentBtn').setAttribute('aria-pressed',String(active));
 $('fullscreenInspector').setAttribute('aria-expanded','false');
 const menu=$('drawingTools');(active?$('fullscreenToolsSlot'):$('toolsHome')).append(menu);menu.open=!active;
 $('boostSlider').setAttribute('aria-orientation',active?'vertical':'horizontal');
 requestAnimationFrame(render);
}
async function enterPresentation(){
 fullscreenWanted=true;setPresentationLayout(true);$('exitFullscreen').focus();
 if(document.documentElement.requestFullscreen&&document.fullscreenEnabled){
  try{await document.documentElement.requestFullscreen();if(!fullscreenWanted&&document.fullscreenElement)await document.exitFullscreen()}
  catch{if(fullscreenWanted)toast('Expanded view is active. Browser fullscreen is unavailable here.')}
 }else toast('Expanded view fills the available window.');
}
async function exitPresentation(){
 fullscreenWanted=false;setPresentationLayout(false);
 if(document.fullscreenElement===document.documentElement){try{await document.exitFullscreen()}catch{}}
 $('presentBtn').focus();
}
function showFullscreenInspector(open=true){if(!document.body.classList.contains('presentation'))return;document.body.classList.toggle('inspector-open',open);$('fullscreenInspector').setAttribute('aria-expanded',String(open));if(open)$('drawingTools').open=false}
document.addEventListener('fullscreenchange',()=>{
 if(document.fullscreenElement===document.documentElement){nativeFullscreenOwned=true;if(!fullscreenWanted)document.exitFullscreen().catch(()=>{})}
 else if(nativeFullscreenOwned){nativeFullscreenOwned=false;fullscreenWanted=false;setPresentationLayout(false);$('presentBtn').focus()}
});
function updateToolHint(){
 $('status').textContent=tool==='select'?'Select an object to inspect it.':availableTools().find(([k])=>k===tool)?.[1]||'';
 $('canvasHint').textContent=tool==='hyperbola'?'Click a point; the full invariant locus passes through it.':tool==='lightcone'?'Click an event to place its past and future light cone.':tool==='circle'&&isEuclidean()?'Drag from the centre to set the radius. An origin-centred circle stays fixed.':tool==='select'?`← → ${isEuclidean()?'rotate':'boost'} · Space selected frame · ? shortcuts.`:tool==='pan'?'Drag to pan. Scroll to zoom.':tool==='point'||tool==='text'?'Click to place a '+(tool==='point'?(isEuclidean()?'point.':'spacetime event.'):'text label.'):'Drag to draw in the current viewing frame.';
}
function updateHistoryButtons(){if($('undoBtn')){$('undoBtn').disabled=!history.length;$('redoBtn').disabled=!future.length}}
function formatBeta(b){return Math.abs(b)>.98?String(b):fmt(b)}
function updateBoost(){
 const eu=isEuclidean(),sl=$('boostSlider');
 if(!eu)sliderEtaLimit=Math.max(sliderEtaLimit,Math.abs(state.eta));
 const limit=sliderValue(sliderLimit());sl.min=-limit;sl.max=limit;sl.step='any';sl.value=sliderValue(state.eta);
 $('sliderMin').textContent='−'+(eu&&mode==='beta'?'180°':fmt(limit,mode==='beta'?2:3));
 $('sliderMax').textContent='+'+(eu&&mode==='beta'?'180°':fmt(limit,mode==='beta'?2:3));
 $('betaValue').min=eu?-180:-MAX_BETA;$('betaValue').max=eu?180:MAX_BETA;$('betaValue').step='any';
 $('etaValue').min=-parameterLimit();$('etaValue').max=parameterLimit();$('etaValue').step='any';
 $('betaValue').value=eu?fmt(state.eta*180/Math.PI,2):formatBeta(Math.tanh(state.eta));$('etaValue').value=fmt(state.eta);
 $('gammaValue').textContent=fmt(Math.cosh(state.eta));
 $('viewPill').textContent=eu?`Rotated view · θ = ${fmt(state.eta*180/Math.PI,1)}°`:Math.abs(state.eta)<.00001?'Reference view · v = 0':`Viewing frame · v = ${formatBeta(Math.tanh(state.eta))}`;
}
function updateGeometryUI(){
 const eu=isEuclidean();document.body.classList.toggle('euclidean',eu);
 $('geometrySelect').value=eu?'euclidean':'minkowski';
 $('diagramTitle').textContent=eu?'Euclidean plane':'Spacetime diagram';$('diagramUnits').textContent=eu?'equal scales · x and y':'equal scales · c = 1';
 $('diagram').setAttribute('aria-label',eu?'Interactive Euclidean plane, y upwards and x to the right':'Interactive Minkowski diagram, time upwards and space to the right');
 $('transformTitle').textContent=eu?'Rotate the coordinates':'Change the observer';
 $('betaMode').textContent=eu?'Degrees °':'Velocity v';$('etaMode').textContent=eu?'Radians':'Rapidity η';
 $('betaLabel').textContent=eu?'θ (°)':'v';$('etaLabel').textContent=eu?'θ (rad)':'η';
 $('betaValue').setAttribute('aria-label',eu?'Rotation angle in degrees':'Observer velocity v');$('etaValue').setAttribute('aria-label',eu?'Rotation angle in radians':'Observer rapidity');
 $('transformFormula').textContent=eu?'x = x₀ cos θ + y₀ sin θ · y = y₀ cos θ − x₀ sin θ':'t = γ(t₀ − vx₀) · x = γ(x₀ − vt₀)';
 $('geometryNote').textContent=eu?'Rotations · x² + y² invariant':'Boosts · t² − x² invariant';
 $('coords').textContent=`x = —   ${verticalName()} = —`;
 $('sceneNote').textContent=eu?'Draw in any frame; rotations preserve the geometry.':'Draw in any frame; the geometry stays attached to spacetime.';
 setMode(mode);
}
function setBoost(eta,record=false){cancelFrameAnimation();if(!Number.isFinite(eta))return;if(record)checkpoint();state.eta=Math.max(-parameterLimit(),Math.min(parameterLimit(),eta));updateBoost();render();inspector();persist()}
function setMode(m){mode=m;const beta=m==='beta';$('betaMode').classList.toggle('active',beta);$('etaMode').classList.toggle('active',!beta);$('boostSlider').setAttribute('aria-label',isEuclidean()?(beta?'Rotation angle in degrees':'Rotation angle in radians'):(beta?'Lorentz transformation velocity':'Lorentz transformation rapidity'));updateBoost()}
function lineFrame(o,horizontal=false){
 if(isEuclidean()){
  if(o.type==='axis')return {kind:'euclidean',eta:o.frameEta};
  if(!['line','segment','arrow'].includes(o.type))return null;
  const dx=o.points[1].x-o.points[0].x,dy=o.points[1].t-o.points[0].t;
  if(Math.hypot(dx,dy)===0)return {kind:'degenerate',reason:'A zero-length segment has no direction.'};
  const angle=horizontal?Math.atan2(dy,dx):Math.atan2(-dx,dy);
  // An unoriented line is aligned every half-turn; choose the nearest frame.
  let target=angle+Math.round((state.eta-angle)/Math.PI)*Math.PI;
  if(target>Math.PI)target-=Math.PI;if(target<-Math.PI)target+=Math.PI;
  return {kind:'euclidean',eta:target};
 }
 if(o.type==='axis')return {kind:o.axis==='t'?'timelike':'spacelike',eta:o.frameEta};
 if(!['line','segment','arrow'].includes(o.type))return null;
 const dx=o.points[1].x-o.points[0].x,dt=o.points[1].t-o.points[0].t,m=Math.max(Math.abs(dx),Math.abs(dt));
 if(m===0)return {kind:'degenerate',reason:'A zero-length segment has no direction.'};
 const x=dx/m,t=dt/m,s=t*t-x*x;
 if(Math.abs(s)<=8*Number.EPSILON)return {kind:'lightlike',reason:'A lightlike line has no finite rest or purely spatial frame. Directions within numerical precision of lightlike are treated the same way.'};
 const kind=s>0?'timelike':'spacelike',beta=s>0?x/t:t/x;
 return {kind,eta:Math.atanh(beta)};
}
function goToSelectedFrame(horizontal=false){
 const objects=state.objects.filter(o=>selected.has(o.id));
 if(objects.length!==1){toast('Select one line, segment, arrow or frame axis, then press Space.');return}
 const target=lineFrame(objects[0],horizontal);
 if(!target){toast(isEuclidean()?'Select a line, segment, arrow or frame axis to align.':'This object has no single rest frame. Select a line, segment, arrow or frame axis.');return}
 if(target.reason){toast(target.reason);return}
 animateBoost(target.eta);
}
function cancelFrameAnimation(){if(!frameAnimation)return;cancelAnimationFrame(frameRAF);frameAnimation=null;$('diagram').removeAttribute('aria-busy');const btn=$('lineFrameBtn');if(btn){btn.disabled=false;btn.textContent=btn.dataset.idleLabel}persist()}
function animateBoost(target){
 cancelFrameAnimation();if(!Number.isFinite(target))return;
 target=Math.max(-parameterLimit(),Math.min(parameterLimit(),target));if(Math.abs(target-state.eta)<1e-12){toast('Already in this frame.');return}
 checkpoint();const start=state.eta;if(!isEuclidean())sliderEtaLimit=Math.max(sliderEtaLimit,Math.abs(target));
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setBoost(target);return}
 const animation={start,target,began:performance.now(),duration:1100};frameAnimation=animation;$('diagram').setAttribute('aria-busy','true');
 function step(now){if(frameAnimation!==animation)return;const u=Math.min(1,(now-animation.began)/animation.duration),ease=u*u*u*(10+u*(-15+6*u));state.eta=u===1?target:start+(target-start)*ease;updateBoost();render();
 if(u===1){frameAnimation=null;$('diagram').removeAttribute('aria-busy');inspector();persist(true)}else{inspector();frameRAF=requestAnimationFrame(step)}}
 frameRAF=requestAnimationFrame(step);
}
function frameAction(o){
 if(isEuclidean()){
  const f=lineFrame(o);if(!f)return '';
  if(f.reason)return `<div class="hint">${f.reason}</div>`;
  const label=o.type==='axis'?'Go to axis frame':'Align vertically';
  return `<div class="frame-action"><div class="eyebrow">Rotate the coordinates</div><button class="primary" id="lineFrameBtn" data-idle-label="${label}" title="${label} (Space)" ${frameAnimation?'disabled':''}>${frameAnimation?'Changing frame…':label}</button>${o.type==='axis'?'':'<button id="horizontalFrameBtn" style="margin-top:6px">Align horizontally</button>'}<div class="hint">Spatial alignment; no rest-frame interpretation.</div></div>`;
 }
const f=lineFrame(o);if(!f)return '';if(f.reason)return `<div class="frame-action"><div class="eyebrow">${f.kind==='lightlike'?'Lightlike direction':'No direction'}</div><button disabled>Frame unavailable</button><div class="hint">${f.reason}</div></div>`;const time=f.kind==='timelike',label=time?'Go to rest frame':'Make purely spatial';return `<div class="frame-action"><div class="eyebrow">${time?'Timelike':'Spacelike'} direction</div><button class="primary" id="lineFrameBtn" title="Selected line’s frame (Space)" aria-keyshortcuts="Space" data-idle-label="${label}" ${frameAnimation?'disabled':''}>${frameAnimation?'Changing frame…':label}</button><div class="hint">${time?'Vertical · Δx = 0':'Horizontal · Δt = 0'}<br>Target v = ${formatBeta(Math.tanh(f.eta))}</div></div>`}

function refresh(){tool=availableTools().some(([k])=>k===tool)?tool:'select';updateGeometryUI();lesson();toolbar();updateBoost();for(const k of ['grid','light','labels','snap'])$(k+'Toggle').checked=state.options[k];render();objectList();inspector();persist()}
function svgEl(tag,attrs={},parent=null){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))if(v!==undefined)e.setAttribute(k,v);if(parent)parent.append(e);return e}
function pathD(points){return points.map((p,i)=>{const s=toScreen(p);return `${i?'L':'M'}${s.x.toFixed(2)},${s.y.toFixed(2)}`}).join(' ')}
function clipLine(p,q){const b=bounds(),dx=q.x-p.x,dt=q.t-p.t;let lo=-Infinity,hi=Infinity;for(const [v,d,min,max]of [[p.x,dx,b.xmin,b.xmax],[p.t,dt,b.tmin,b.tmax]]){if(Math.abs(d)<1e-12){if(v<min||v>max)return null}else{let a=(min-v)/d,z=(max-v)/d;if(a>z)[a,z]=[z,a];lo=Math.max(lo,a);hi=Math.min(hi,z)}}if(lo>hi||!Number.isFinite(lo)||!Number.isFinite(hi))return null;return [pt(p.x+dx*lo,p.t+dt*lo),pt(p.x+dx*hi,p.t+dt*hi)]}
function labelAt(parent,text,p,col,extra={}){if(!state.options.labels||!text)return;const s=toScreen(p);if(s.x<-80||s.x>W+80||s.y<-20||s.y>H+20)return;const size=extra.size||11,anchor=extra.anchor||'start';labelMeasure.font=`500 ${size}px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif`;const width=labelMeasure.measureText(text).width;let x=s.x+(extra.dx??8),y=s.y+(extra.dy??-9),chosen=null;
for(const [ox,oy] of [[0,0],[0,-17],[0,17],[0,-34],[0,34],[-25,-17],[25,17]]){const cx=x+ox,cy=y+oy,left=cx-(anchor==='end'?width:anchor==='middle'?width/2:0),box={x:left-3,y:cy-size-3,w:width+6,h:size+7};if(box.x<3||box.x+box.w>W-3||box.y<3||box.y+box.h>H-3)continue;if(!labelBoxes.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y)){chosen={x:cx,y:cy,box};break}}
if(chosen){x=chosen.x;y=chosen.y;labelBoxes.push(chosen.box)}else labelBoxes.push({x:x-(anchor==='end'?width:0)-3,y:y-size-3,w:width+6,h:size+7});
const e=svgEl('text',{x,y,fill:col,'font-family':'-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif','font-size':size,'font-weight':extra.bold?650:500,'text-anchor':anchor,stroke:'#fff','stroke-width':4,'stroke-linejoin':'round','paint-order':'stroke','pointer-events':'none'},parent);e.textContent=text}

function axisDirection(o){return boost(o.axis==='t'?pt(0,1):pt(1,0),state.eta-o.frameEta)}
function geometry(o){if(o.type==='axis'){const v=axisDirection(o),ends=clipLine(pt(0,0),v);return ends?[ends]:[]}
 if(o.type==='lightcone'){const c=boost(o.center);return [-1,1].map(sign=>clipLine(c,pt(c.x+1,c.t+sign))).filter(Boolean)}
 if(o.type==='hyperbola'){const c=boost(o.center),r=o.radius,b=bounds(),paths=[];const horizontal=o.kind==='timelike';let lo=horizontal?b.xmin-c.x:b.tmin-c.t,hi=horizontal?b.xmax-c.x:b.tmax-c.t;const signs=o.branch==='both'?[1,-1]:[o.branch==='negative'?-1:1];for(const sign of signs){const pts=[];for(let i=0;i<=300;i++){const z=lo+(hi-lo)*i/300,y=sign*Math.hypot(r,z);pts.push(horizontal?pt(c.x+z,c.t+y):pt(c.x+y,c.t+z))}paths.push(pts)}return paths}
 if(o.type==='circle'){const ps=[];for(let i=0;i<=120;i++){const a=i*Math.PI/60;ps.push(boost(pt(o.center.x+o.radius*Math.cos(a),o.center.t+o.radius*Math.sin(a))))}return[ps]}
 const ps=(o.points||[]).map(p=>boost(p));if(o.type==='line'){const ends=clipLine(ps[0],ps[1]);return ends?[ends]:[]}return [ps]}
function render(){labelBoxes=[];const svg=$('diagram');W=$('canvasWrap').clientWidth||800;H=$('canvasWrap').clientHeight||500;scale=Math.min(W,H)/state.camera.span;svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.replaceChildren();const defs=svgEl('defs',{},svg),clip=svgEl('clipPath',{id:'plotClip'},defs);svgEl('rect',{x:0,y:0,width:W,height:H},clip);svgEl('rect',{width:W,height:H,fill:'#fff'},svg);
 const b=bounds(),g=svgEl('g',{'clip-path':'url(#plotClip)'},svg);let step=1;const raw=48/scale;step=10**Math.floor(Math.log10(raw));if(raw/step>5)step*=10;else if(raw/step>2)step*=5;else if(raw/step>1)step*=2;
 const origin=toScreen(pt(0,0));
 if(state.options.grid){for(let x=Math.ceil(b.xmin/step)*step;x<=b.xmax;x+=step){const sx=toScreen(pt(x,0)).x;svgEl('line',{x1:sx,y1:0,x2:sx,y2:H,stroke:'#eaf0f4','stroke-width':1},g);if(Math.abs(x)>step*.01){const e=svgEl('text',{x:sx,y:Math.min(H-8,Math.max(18,origin.y+17)),fill:'#97a4b1','font-size':10,'text-anchor':'middle'},g);e.textContent=Number(x.toFixed(5))}}
 for(let t=Math.ceil(b.tmin/step)*step;t<=b.tmax;t+=step){const sy=toScreen(pt(0,t)).y;svgEl('line',{x1:0,y1:sy,x2:W,y2:sy,stroke:'#eaf0f4','stroke-width':1},g);if(Math.abs(t)>step*.01){const e=svgEl('text',{x:Math.min(W-20,Math.max(8,origin.x-11)),y:sy+3,fill:'#97a4b1','font-size':10,'text-anchor':origin.x>20?'end':'start'},g);e.textContent=Number(t.toFixed(5))}}}
 if(state.options.light&&!isEuclidean()){for(const sign of [-1,1]){const p=clipLine(pt(0,0),pt(1,sign));if(p)svgEl('path',{d:pathD(p),fill:'none',stroke:'#d7c69f','stroke-width':1.2,'stroke-dasharray':'5 7'},g)}}
 svgEl('line',{x1:origin.x,y1:0,x2:origin.x,y2:H,stroke:'#bfcbd5','stroke-width':1},g);svgEl('line',{x1:0,y1:origin.y,x2:W,y2:origin.y,stroke:'#bfcbd5','stroke-width':1},g);
 const objects=svgEl('g',{},g);for(const o of state.objects)if(o.visible)drawObject(o,objects);if(preview)drawObject(preview,objects,true);
 // The guide labels describe the current display coordinates, independent of stored axes.
 const tx=svgEl('text',{x:Math.max(14,Math.min(W-18,origin.x+10)),y:20,fill:'#3b536b','font-family':'Georgia,serif','font-style':'italic','font-size':18,'paint-order':'stroke',stroke:'#fff','stroke-width':4,'pointer-events':'none'},svg);tx.textContent=verticalName();const xx=svgEl('text',{x:W-17,y:Math.max(24,Math.min(H-12,origin.y-10)),fill:'#3b536b','font-family':'Georgia,serif','font-style':'italic','font-size':18,'paint-order':'stroke',stroke:'#fff','stroke-width':4,'pointer-events':'none'},svg);xx.textContent='x';
 if(selected.size===1&&tool==='select'){const o=state.objects.find(o=>selected.has(o.id));if(o&&o.visible&&['segment','arrow','line','polygon'].includes(o.type))o.points.forEach((p,i)=>{const s=viewToScreen(p);svgEl('circle',{cx:s.x,cy:s.y,r:5,fill:'#fff',stroke:o.color,'stroke-width':2,'data-handle':i,'data-id':o.id,cursor:'crosshair'},g)})}
 svg.style.cursor=tool==='pan'?'grab':tool==='select'?'default':'crosshair';
}
function drawObject(o,parent,isPreview=false){const group=svgEl('g',{'data-id':o.id,opacity:isPreview?.7:1,cursor:tool==='select'?'pointer':undefined},parent),paths=geometry(o),sel=selected.has(o.id)&&!isPreview;let labelPoint=null;
 for(const ps of paths){if(!ps.length)continue;if(o.type==='point'||o.type==='text'){const s=toScreen(ps[0]);if(o.type==='point'){if(sel)svgEl('circle',{cx:s.x,cy:s.y,r:10,fill:o.color,opacity:.13},group);svgEl('circle',{cx:s.x,cy:s.y,r:5,fill:o.color,stroke:'#fff','stroke-width':2},group);svgEl('circle',{cx:s.x,cy:s.y,r:12,fill:'transparent'},group)}else{const t=svgEl('text',{x:s.x,y:s.y,fill:o.color,'font-family':'-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif','font-size':o.fontSize||15,'font-weight':sel?650:500,stroke:'#fff','stroke-width':3,'paint-order':'stroke'},group);t.textContent=o.label;const width=Math.max(30,o.label.length*(o.fontSize||15)*.55);svgEl('rect',{x:s.x-4,y:s.y-(o.fontSize||15),width,height:(o.fontSize||15)+7,fill:'transparent',stroke:sel?o.color:'none','stroke-dasharray':'3 3'},group)}labelPoint=ps[0];continue}
 let d=pathD(ps)+(o.type==='polygon'?' Z':'');if(sel)svgEl('path',{d,fill:'none',stroke:o.color,'stroke-width':o.width+7,opacity:.14,'stroke-linejoin':'round'},group);
 svgEl('path',{d,fill:o.type==='polygon'&&o.fill?o.color:'none','fill-opacity':.055,stroke:o.color,'stroke-width':o.width,'stroke-dasharray':o.dash?'6 5':undefined,'stroke-linecap':'round','stroke-linejoin':'round'},group);
 svgEl('path',{d,fill:'none',stroke:'transparent','stroke-width':Math.max(13,o.width+8),'pointer-events':'stroke'},group);
 if(o.type==='arrow'){const p=toScreen(ps[ps.length-2]),q=toScreen(ps[ps.length-1]),a=Math.atan2(q.y-p.y,q.x-p.x),len=10;svgEl('path',{d:`M${q.x-len*Math.cos(a-.45)},${q.y-len*Math.sin(a-.45)} L${q.x},${q.y} L${q.x-len*Math.cos(a+.45)},${q.y-len*Math.sin(a+.45)}`,fill:'none',stroke:o.color,'stroke-width':o.width,'stroke-linecap':'round'},group)}
 if(o.type==='line')labelPoint=pt(ps[0].x*.25+ps[1].x*.75,ps[0].t*.25+ps[1].t*.75);else labelPoint=ps[Math.floor((ps.length-1)/2)];if(ps.length===2&&o.type!=='line')labelPoint=pt((ps[0].x+ps[1].x)/2,(ps[0].t+ps[1].t)/2);
 }
 if(o.type==='axis'){const v=axisDirection(o),len=Math.hypot(v.x,v.t),pix=len*scale;let tickStep=1;while(pix*tickStep<22)tickStep*=2;const b=bounds(),max=Math.max(Math.abs(b.xmin),Math.abs(b.xmax),Math.abs(b.tmin),Math.abs(b.tmax)),n=Math.min(200,Math.ceil(max/Math.max(Math.abs(v.x),Math.abs(v.t)))+1);for(let i=-n;i<=n;i+=tickStep){if(!i)continue;const s=toScreen(pt(i*v.x,i*v.t)),dx=v.t/len*3,dy=v.x/len*3;svgEl('line',{x1:s.x-dx,y1:s.y-dy,x2:s.x+dx,y2:s.y+dy,stroke:o.color,'stroke-width':1,'pointer-events':'none'},group)}const ps=paths[0];if(ps){const end=ps[1],a=toScreen(end),orig=toScreen(pt(0,0)),dist=Math.hypot(a.x-orig.x,a.y-orig.y),fraction=Math.max(0,1-40/Math.max(1,dist));labelPoint=pt(end.x*fraction,end.t*fraction)}}
 if(o.type==='hyperbola'){const c=boost(o.center),sign=o.branch==='negative'?-1:1;labelPoint=o.kind==='timelike'?pt(c.x,c.t+sign*o.radius):pt(c.x+sign*o.radius,c.t)}
 if(o.type==='lightcone'){labelPoint=boost(o.center);const v=toScreen(labelPoint);svgEl('circle',{cx:v.x,cy:v.y,r:sel?5:3,fill:o.color,stroke:'#fff','stroke-width':1},group)}
 if(o.type!=='text'&&o.showLabel!==false&&labelPoint)labelAt(group,o.label,labelPoint,o.color,o);
}
function objectList(){$('objectCount').textContent=state.objects.length;$('objectList').innerHTML=state.objects.slice().reverse().map(o=>`<div class="object-row ${selected.has(o.id)?'selected':''}"><input type="checkbox" data-visible="${o.id}" aria-label="Show ${esc(o.label||o.type)}" ${o.visible?'checked':''}><span class="swatch" style="background:${o.color}"></span><button data-select="${o.id}" title="${esc(o.label||o.type)}">${esc(o.label||o.type)}</button><span class="kind">${o.type==='axis'?'axis':o.type==='point'?(isEuclidean()?'point':'event'):['hyperbola','circle','lightcone'].includes(o.type)?(o.type==='lightcone'?'light cone':o.type):''}</span></div>`).join('')}
function field(label,key,value,type='text',attrs=''){if(type==='color')return `<div class="field">${label}${colourButton('selection',value,'objectColour')}</div>`;return `<label class="field">${label}<input data-prop="${key}" type="${type}" value="${esc(value)}" ${attrs}></label>`}
function inspector(){const os=state.objects.filter(o=>selected.has(o.id));$('selectionCount').textContent=os.length?`${os.length} selected`:'No selection';if(!os.length){$('inspector').innerHTML=`<div class="inspector-empty">Select an object to change its appearance and geometry.</div><div class="readings">${isEuclidean()?'x² + y² is preserved by every rotation.<br>Lengths and angles stay the same.':'t² − x² is preserved by every boost.<br>Light rays remain at 45°.'}</div><div class="hint">Shift-click to select several objects.<br>Drag an object to move it.</div>`;return}
 const o=os[0];let html=os.length===1?frameAction(o):'';if(os.length===1)html+=field('Label / text','label',o.label);html+=`<div class="field-row">${field('Colour','color',o.color,'color')}${field('Stroke width','width',o.width,'number','min="0.5" max="8" step="0.5"')}</div><div class="field-row"><label class="field">Line style<select data-prop="dash"><option value="false" ${!o.dash?'selected':''}>Solid</option><option value="true" ${o.dash?'selected':''}>Dashed</option></select></label><label class="field">Label<select data-prop="showLabel"><option value="true" ${o.showLabel!==false?'selected':''}>Visible</option><option value="false" ${o.showLabel===false?'selected':''}>Hidden</option></select></label></div>`;
 if(os.length===1){if(o.type==='axis'){html+=(isEuclidean()?field('Frame angle θ (degrees)','frameAngle',fmt(o.frameEta*180/Math.PI,3),'number','min="-180" max="180" step="any"'):field('Frame velocity v relative to reference','frameBeta',formatBeta(Math.tanh(o.frameEta)),'number',`min="${-MAX_BETA}" max="${MAX_BETA}" step="any"`))+'<div class="hint">Axis ticks mark equal units in this frame. Axes share the origin.</div>'}
 if(o.points&&o.type!=='freehand'){const count=o.points.length;html+='<div class="eyebrow" style="margin:13px 0 9px">Current view coordinates</div>';o.points.forEach((p,i)=>{const v=boost(p);html+=`<div class="field-row">${field(count===1?'x':`x${i+1}`,'p'+i+'x',fmt(v.x,4),'number','step="0.1"')}${field(count===1?verticalName():`${verticalName()}${i+1}`,'p'+i+'t',fmt(v.t,4),'number','step="0.1"')}</div>`});if(count===2){const a=boost(o.points[0]),b=boost(o.points[1]),dx=b.x-a.x,dt=b.t-a.t,q=isEuclidean()?dt*dt+dx*dx:dt*dt-dx*dx;html+=isEuclidean()?`<div class="readings" id="intervalReading">Δx = ${fmt(dx)} · Δy = ${fmt(dt)}<br>ℓ² = ${fmt(q)}<br>Length ℓ = ${fmt(Math.sqrt(q))}</div>`:`<div class="readings" id="intervalReading">Δx = ${fmt(dx)} · Δt = ${fmt(dt)}<br>s² = ${fmt(q)} · ${Math.abs(q)<1e-7?'lightlike':q>0?'timelike':'spacelike'}<br>${q>1e-7?'Proper time Δτ':q<-1e-7?'Proper distance ℓ':'Null interval'} = ${fmt(Math.sqrt(Math.abs(q)))}</div>`}else if(count===1){const p=boost(o.points[0]);html+=`<div class="readings">From origin: ${isEuclidean()?'x² + y² = '+fmt(p.x*p.x+p.t*p.t):'t² − x² = '+fmt(p.t*p.t-p.x*p.x)}</div>`}}

 if(o.type==='hyperbola'||o.type==='circle'||o.type==='lightcone'){const c=boost(o.center);html+=`<div class="field-row">${field('Centre x','centerx',fmt(c.x,4),'number','step="0.1"')}${field('Centre '+verticalName(),'centert',fmt(c.t,4),'number','step="0.1"')}</div>`;if(o.type!=='lightcone')html+=field(o.type==='hyperbola'?'Invariant radius √|s²|':isEuclidean()?'Invariant radius':'Radius in reference frame','radius',o.radius,'number','min="0.01" max="1000" step="0.1"');if(o.type==='circle'&&isEuclidean())html+='<div class="hint">(x − xcentre)² + (y − ycentre)² = r². The radius is invariant; the centre rotates.</div>';if(o.type==='lightcone')html+='<div class="hint">Past and future null rays through this event. The vertex transforms; the rays remain at 45°.</div>';if(o.type==='hyperbola')html+=`<div class="field-row"><label class="field">Kind<select data-prop="kind"><option value="timelike" ${o.kind==='timelike'?'selected':''}>Timelike</option><option value="spacelike" ${o.kind==='spacelike'?'selected':''}>Spacelike</option></select></label><label class="field">Branches<select data-prop="branch"><option value="both" ${o.branch==='both'?'selected':''}>Both</option><option value="positive" ${o.branch==='positive'?'selected':''}>${o.kind==='timelike'?'Future':'Right'}</option><option value="negative" ${o.branch==='negative'?'selected':''}>${o.kind==='timelike'?'Past':'Left'}</option></select></label></div><div class="hint">${o.kind==='timelike'?'(t − tc)² − (x − xc)²':'(x − xc)² − (t − tc)²'} = ${fmt(o.radius**2)}. The full locus is invariant about its centre.</div>`}
 if(o.type==='text')html+=field('Font size','fontSize',o.fontSize||15,'number','min="8" max="48" step="1"');
 if(o.type!=='text')html+=`<div class="field-row">${field('Label offset x (px)','dx',o.dx??8,'number','step="1"')}${field('Label offset y (px)','dy',o.dy??-9,'number','step="1"')}</div>`;
 }
 html+='<div class="inspector-actions" style="margin-top:12px"><button id="duplicateBtn">Duplicate</button><button id="deleteBtn" class="danger">Delete</button></div>';$('inspector').innerHTML=html;$('duplicateBtn').onclick=duplicate;$('deleteBtn').onclick=removeSelected;if($('lineFrameBtn'))$('lineFrameBtn').onclick=()=>goToSelectedFrame();if($('horizontalFrameBtn'))$('horizontalFrameBtn').onclick=()=>goToSelectedFrame(true);
}
function select(id,multi=false){if(!multi)selected.clear();if(multi&&selected.has(id))selected.delete(id);else selected.add(id);render();objectList();inspector()}
function removeSelected(){if(!selected.size)return;checkpoint();state.objects=state.objects.filter(o=>!selected.has(o.id));selected.clear();render();objectList();inspector();persist()}
function duplicate(){if(!selected.size)return;checkpoint();const os=state.objects.filter(o=>selected.has(o.id)).map(o=>({...clone(o),id:nextId++,label:o.label+' copy'}));state.objects.push(...os);selected=new Set(os.map(o=>o.id));render();objectList();inspector();persist();toast('Duplicated in place. Drag to reposition.')}
function pointer(e,snap=true){const r=$('diagram').getBoundingClientRect(),p=fromScreen(e.clientX-r.left,e.clientY-r.top);if(snap&&state.options.snap){p.x=Math.round(p.x*4)/4;p.t=Math.round(p.t*4)/4}return p}
function shiftObject(o,delta,original){if(o.type==='axis')return;if(original.points)o.points=original.points.map(p=>pt(p.x+delta.x,p.t+delta.t));if(original.center)o.center=pt(original.center.x+delta.x,original.center.t+delta.t)}
function makeDrawing(a,b,points){const pa=base(a),pb=base(b);switch(tool){case'segment':case'line':case'arrow':return obj(tool,tool==='line'?(isEuclidean()?'Line':'Worldline'):tool==='arrow'?'Arrow':'Segment',{points:[pa,pb]},color);case'freehand':return obj('freehand','Curve',{points:points.map(base)},color);case'rect':return obj('polygon','Rectangle',{points:[base(a),base(pt(b.x,a.t)),base(b),base(pt(a.x,b.t))],fill:true},color);case'circle':{const r=Math.min(1000,Math.max(.01,Math.hypot(b.x-a.x,b.t-a.t)));if(isEuclidean())return obj('circle','Circle',{center:pa,radius:r},color);const ps=[];for(let i=0;i<128;i++){const angle=2*Math.PI*i/128;ps.push(base(pt(a.x+r*Math.cos(angle),a.t+r*Math.sin(angle))))}return obj('freehand','Circle',{points:[...ps,ps[0]]},color)}default:return null}}
$('diagram').addEventListener('pointerdown',e=>{if(e.button!==0)return;const p=pointer(e),raw=pointer(e,false),target=e.target.closest('[data-id]');$('diagram').focus();$('diagram').setPointerCapture(e.pointerId);
 if(tool==='pan'){gesture={type:'pan',start:raw,camera:clone(state.camera),px:e.clientX,py:e.clientY};return}
 if(tool==='select'){if(target){const id=Number(target.dataset.id),handle=e.target.dataset.handle;if(e.shiftKey){select(id,true);return}if(!selected.has(id))select(id);const movable=state.objects.filter(o=>selected.has(o.id)&&o.type!=='axis');gesture={type:handle!==undefined?'handle':'move',index:Number(handle),id,start:base(p),originals:clone(movable),before:snapshot(),moved:false};}else{selected.clear();render();objectList();inspector()}return}
 if(tool==='point'||tool==='text'){checkpoint();const o=add(obj(tool,tool==='point'?(isEuclidean()?'Point':'Event'):'Your annotation',{points:[base(p)],fontSize:15},color));selected=new Set([o.id]);tool='select';toolbar();render();objectList();inspector();persist();if(o.type==='text'){showFullscreenInspector();$('inspector').querySelector('[data-prop="label"]').focus();$('inspector').querySelector('[data-prop="label"]').select()}return}
 if(tool==='lightcone'){checkpoint();const o=add(obj('lightcone','Light cone',{center:base(p),dash:true},color));selected=new Set([o.id]);tool='select';toolbar();render();objectList();inspector();persist();return}
 if(tool==='hyperbola'){const s=p.t*p.t-p.x*p.x;if(Math.abs(s)<.01){toast('Choose a point away from the light cone (|s²| ≥ 0.01).');return}checkpoint();const o=add(obj('hyperbola',s>0?'Timelike hyperbola':'Spacelike hyperbola',{center:pt(0,0),kind:s>0?'timelike':'spacelike',radius:Math.sqrt(Math.abs(s)),branch:'both',dash:false},color));selected=new Set([o.id]);tool='select';toolbar();render();objectList();inspector();persist();return}
 gesture={type:'draw',start:p,points:[p],before:snapshot()};preview=makeDrawing(p,p,[p]);render();
});
$('diagram').addEventListener('pointermove',e=>{const p=pointer(e),raw=pointer(e,false);$('coords').textContent=`x = ${fmt(raw.x,2)}   ${verticalName()} = ${fmt(raw.t,2)}`;if(!gesture)return;if(gesture.type==='pan'){state.camera.x=gesture.camera.x-(e.clientX-gesture.px)/scale;state.camera.t=gesture.camera.t+(e.clientY-gesture.py)/scale;render();return}
 if(gesture.type==='draw'){const last=gesture.points[gesture.points.length-1];if(Math.hypot(p.x-last.x,p.t-last.t)*scale>2)gesture.points.push(p);preview=makeDrawing(gesture.start,p,gesture.points);render();return}
 const bp=base(p),d=pt(bp.x-gesture.start.x,bp.t-gesture.start.t);if(Math.hypot(d.x,d.t)<1e-7)return;if(!gesture.moved){history.push(gesture.before);if(history.length>80)history.shift();future=[];gesture.moved=true;updateHistoryButtons()}
 if(gesture.type==='handle'){const o=state.objects.find(o=>o.id===gesture.id);if(o)o.points[gesture.index]=bp}else for(const original of gesture.originals){const o=state.objects.find(o=>o.id===original.id);shiftObject(o,d,original)}render();
});
function endGesture(e){if(!gesture)return;if(gesture.type==='draw'){const p=pointer(e),a=gesture.start;if(Math.hypot(p.x-a.x,p.t-a.t)*scale>3){checkpoint();const o=makeDrawing(a,p,gesture.points);if(o){add(o);selected=new Set([o.id])}}preview=null}gesture=null;render();objectList();inspector();persist()}
$('diagram').addEventListener('pointerup',endGesture);$('diagram').addEventListener('pointercancel',()=>{if(gesture?.before){state=JSON.parse(gesture.before);if(gesture.moved)history.pop()}gesture=null;preview=null;refresh()});
$('diagram').addEventListener('wheel',e=>{e.preventDefault();const p=pointer(e,false),old=state.camera.span;state.camera.span=Math.min(200,Math.max(.5,old*Math.exp(e.deltaY*.001)));const ratio=state.camera.span/old;state.camera.x=p.x+(state.camera.x-p.x)*ratio;state.camera.t=p.t+(state.camera.t-p.t)*ratio;render();persist()},{passive:false});
function zoom(f){state.camera.span=Math.min(200,Math.max(.5,state.camera.span*f));render();persist()}
function fit(){let ps=[];for(const o of state.objects){if(!o.visible||o.type==='axis')continue;if(o.points)ps.push(...o.points.map(p=>boost(p)));if(o.center){const c=boost(o.center);ps.push(c);if(o.radius)ps.push(pt(c.x+o.radius,c.t),pt(c.x-o.radius,c.t),pt(c.x,c.t+o.radius),pt(c.x,c.t-o.radius))}}if(!ps.length){state.camera=clone(cases[state.caseId].camera);render();persist();return}const xs=ps.map(p=>p.x),ts=ps.map(p=>p.t),minx=Math.min(...xs),maxx=Math.max(...xs),mint=Math.min(...ts),maxt=Math.max(...ts);state.camera.x=(minx+maxx)/2;state.camera.t=(mint+maxt)/2;state.camera.span=Math.min(200,Math.max(3,Math.max((maxx-minx)*Math.min(W,H)/W,(maxt-mint)*Math.min(W,H)/H)*1.35));render();persist()}
$('geometrySelect').onchange=e=>switchGeometry(e.target.value);
$('caseList').onclick=e=>{const b=e.target.closest('[data-case]');if(b)loadCase(b.dataset.case)};
$('toolbar').onclick=e=>{const b=e.target.closest('[data-tool]');if(b){tool=b.dataset.tool;preview=null;gesture=null;toolbar();if(fullscreenWanted){$('drawingTools').open=false;$('toolsSummary').focus()}render();updateToolHint()}};
$('objectList').onclick=e=>{const b=e.target.closest('[data-select]');if(b)select(Number(b.dataset.select),e.shiftKey)};
$('objectList').onchange=e=>{if(e.target.dataset.visible){checkpoint();const o=state.objects.find(o=>o.id===Number(e.target.dataset.visible));o.visible=e.target.checked;render();persist()}};
$('inspector').addEventListener('change',e=>{const key=e.target.dataset.prop;if(!key)return;const os=state.objects.filter(o=>selected.has(o.id));let v=e.target.value;const numeric=['width','frameBeta','frameAngle','radius','fontSize','dx','dy','centerx','centert'].includes(key)||/^p\d+[xt]$/.test(key);if(numeric){v=Number(v);if(!Number.isFinite(v)||Math.abs(v)>10000){toast('Enter a finite value between −10,000 and 10,000.');inspector();return}}checkpoint();for(const o of os){if(/^p\d+[xt]$/.test(key)){const i=Number(key.slice(1,-1)),coord=key.slice(-1),p=boost(o.points[i]);p[coord]=v;o.points[i]=base(p)}else if(key==='centerx'||key==='centert'){const p=boost(o.center);p[key.slice(-1)]=v;o.center=base(p)}else if(key==='frameAngle')o.frameEta=Math.max(-180,Math.min(180,v))*Math.PI/180;else if(key==='frameBeta')o.frameEta=Math.atanh(Math.max(-MAX_BETA,Math.min(MAX_BETA,v)));else if(key==='dash'||key==='showLabel')o[key]=v==='true';else if(key==='radius')o.radius=Math.max(.01,Math.min(1000,v));else if(key==='width')o.width=Math.max(.5,Math.min(8,v));else if(key==='fontSize')o.fontSize=Math.max(8,Math.min(48,v));else o[key]=typeof v==='string'?v.slice(0,200):v}render();objectList();inspector();persist()});
$('boostSlider').addEventListener('pointerdown',checkpoint);$('boostSlider').oninput=e=>setBoost(sliderParameter(Number(e.target.value)));$('betaValue').onchange=e=>{const v=Number(e.target.value);if(Number.isFinite(v))setBoost(isEuclidean()?v*Math.PI/180:Math.atanh(Math.max(-MAX_BETA,Math.min(MAX_BETA,v))),true)};$('etaValue').onchange=e=>setBoost(Number(e.target.value),true);$('betaMode').onclick=()=>setMode('beta');$('etaMode').onclick=()=>setMode('eta');$('frameChips').onclick=e=>{const b=e.target.closest('[data-frame]');if(b)animateBoost(Number(b.dataset.frame))};
$('addAxes').onclick=()=>{checkpoint();const n=state.objects.filter(o=>o.type==='axis'&&o.axis==='t').length;axes(state.eta,`[${n}]`,color);selected=new Set(state.objects.slice(-2).map(o=>o.id));render();objectList();inspector();persist();toast(isEuclidean()?`Captured frame at θ = ${fmt(state.eta*180/Math.PI,1)}°`:`Captured frame at v = ${fmt(Math.tanh(state.eta))}`)};
for(const k of ['grid','light','labels','snap'])$(k+'Toggle').onchange=e=>{state.options[k]=e.target.checked;render();persist()};$('zoomIn').onclick=()=>zoom(.8);$('zoomOut').onclick=()=>zoom(1.25);$('fitView').onclick=fit;$('homeView').onclick=()=>{state.camera=clone(cases[state.caseId].camera);render();persist()};
function download(name,data,type){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
$('saveScene').onclick=()=>download('minkowski-scene.json',JSON.stringify({format:'minkowski-lab',version:1,state},null,2),'application/json');
$('exportSVG').onclick=()=>{const old=selected;selected=new Set();render();const svg=$('diagram').cloneNode(true);svg.setAttribute('width',W);svg.setAttribute('height',H);svg.setAttribute('xmlns',NS);const title=document.createElementNS(NS,'title');title.textContent=`KTH · SH2373 · ${cases[state.caseId].name} · ${isEuclidean()?'θ = '+fmt(state.eta*180/Math.PI,1)+'°':'v = '+fmt(Math.tanh(state.eta))}`;svg.prepend(title);download('minkowski-diagram.svg','<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(svg),'image/svg+xml');selected=old;render()};
$('saveHTML').onclick=()=>{const doc=document.documentElement.cloneNode(true);doc.querySelector('#embedded-scene').textContent=JSON.stringify(state).replace(/</g,'\\u003c');doc.querySelector('#toast').classList.add('hidden');doc.querySelectorAll('dialog').forEach(d=>d.removeAttribute('open'));doc.querySelector('body').classList.remove('presentation','inspector-open');const menu=doc.querySelector('#drawingTools');doc.querySelector('#toolsHome').append(menu);menu.setAttribute('open','');doc.querySelector('#presentBtn').textContent='Full screen';doc.querySelector('#presentBtn').setAttribute('aria-pressed','false');doc.querySelector('#fullscreenInspector').setAttribute('aria-expanded','false');doc.querySelector('#boostSlider').setAttribute('aria-orientation','horizontal');download('minkowski-lab.html','<!DOCTYPE html>\n'+doc.outerHTML,'text/html');toast('Saved a complete offline app with this scene.')};
function validateState(s,nested=false){if(!s||typeof s!=='object'||!Array.isArray(s.objects)||s.objects.length>1200)throw Error('Invalid scene or too many objects.');const finite=(n,max=10000)=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=max;const point=p=>p&&finite(p.x)&&finite(p.t);if(!finite(s.eta,MAX_ETA+.00001)||!s.camera||!finite(s.camera.x)||!finite(s.camera.t)||!finite(s.camera.span,200)||s.camera.span<.5)throw Error('Invalid observer or camera.');if(!Object.hasOwn(cases,s.caseId))throw Error('Unknown example.');s.geometry??='minkowski';if(!['minkowski','euclidean'].includes(s.geometry)||(cases[s.caseId].geometry||'minkowski')!==s.geometry)throw Error('Geometry and example do not match.');if(s.geometry==='euclidean'&&Math.abs(s.eta)>Math.PI+1e-10)throw Error('Rotation outside ±180°.');if(s.alternateScene){if(nested||s.alternateScene.geometry===s.geometry)throw Error('Invalid alternate scene.');s.alternateScene=validateState(s.alternateScene,true);if(s.alternateScene.geometry===s.geometry)throw Error('Alternate scene must use the other geometry.')}const ids=new Set();let totalPoints=0;for(const o of s.objects){if(!Number.isSafeInteger(o.id)||ids.has(o.id))throw Error('Invalid object identifiers.');ids.add(o.id);if(!['axis','point','segment','arrow','line','freehand','polygon','text','circle','hyperbola','lightcone'].includes(o.type))throw Error('Unknown object type.');if(s.geometry==='euclidean'&&['hyperbola','lightcone'].includes(o.type))throw Error('This object belongs to Minkowski space.');if(typeof o.label!=='string'||o.label.length>200||!/^#[0-9a-f]{6}$/i.test(o.color)||!finite(o.width,8)||o.width<.5||typeof o.visible!=='boolean')throw Error('Invalid object style.');if(['axis'].includes(o.type)){if(!['x','t'].includes(o.axis)||!finite(o.frameEta,MAX_ETA+.00001))throw Error('Invalid frame axis.');if(s.geometry==='euclidean'&&Math.abs(o.frameEta)>Math.PI+1e-10)throw Error('Invalid axis angle.')}else if(o.type==='lightcone'){if(!point(o.center))throw Error('Invalid light-cone vertex.')}else if(['hyperbola','circle'].includes(o.type)){if(!point(o.center)||!finite(o.radius,1000)||o.radius<.01)throw Error('Invalid curve.');if(o.type==='hyperbola'&&(!['timelike','spacelike'].includes(o.kind)||!['both','positive','negative'].includes(o.branch)))throw Error('Invalid hyperbola.')}else{if(!Array.isArray(o.points)||!o.points.every(point)||o.points.length<1||o.points.length>20000)throw Error('Invalid points.');totalPoints+=o.points.length;if(['point','text'].includes(o.type)&&o.points.length!==1)throw Error('Expected one event.');if(['line','segment','arrow'].includes(o.type)&&o.points.length!==2)throw Error('Expected two endpoints.');if(o.type==='polygon'&&o.points.length<3)throw Error('Invalid polygon.')}for(const k of ['dx','dy','fontSize'])if(o[k]!==undefined&&!finite(o[k],10000))throw Error('Invalid label position.')}if(totalPoints>50000)throw Error('Scene is too complex.');s.options={grid:s.options?.grid!==false,light:s.options?.light!==false,labels:s.options?.labels!==false,snap:s.options?.snap===true};return clone(s)}
$('openScene').onclick=()=>$('fileInput').click();$('fileInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>8e6)throw Error('Scene file must be smaller than 8 MB.');const data=JSON.parse(await f.text());if(data.format!=='minkowski-lab'||data.version!==1)throw Error('Choose a Minkowski Lab scene file.');const s=validateState(data.state);checkpoint();state=s;nextId=Math.max(0,...state.objects.map(o=>o.id))+1;selected.clear();refresh();toast('Scene opened.')}catch(err){toast('Could not open scene: '+err.message)}e.target.value=''};

document.addEventListener('click',e=>{const trigger=e.target.closest('[data-colour-target]');if(trigger)openColourPalette(trigger.dataset.colourTarget)});
$('colourDialog').addEventListener('click',e=>{const swatch=e.target.closest('[data-palette-colour]');if(swatch)applyPaletteColour(swatch.dataset.paletteColour)});
$('closePalette').onclick=()=>$('colourDialog').close();
$('applyCustomColour').onclick=()=>applyPaletteColour($('customColour').value);
$('helpBtn').onclick=$('conventionsBtn').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();$('presentBtn').onclick=()=>fullscreenWanted?exitPresentation():enterPresentation();$('exitFullscreen').onclick=exitPresentation;$('fullscreenInspector').onclick=()=>showFullscreenInspector(!document.body.classList.contains('inspector-open'));$('closeFullscreenInspector').onclick=()=>showFullscreenInspector(false);document.addEventListener('click',e=>{if(fullscreenWanted&&!$('drawingTools').contains(e.target))$('drawingTools').open=false});
// Keyboard boost repeats share one undo step. Input fields retain native shortcuts.
function nudgeBoost(direction,fine,key){
 const limit=sliderValue(sliderLimit()),current=sliderValue(state.eta);
 const step=isEuclidean()?(mode==='beta'?(fine ? .1 : 1):(fine ? .001 : .01)):(fine ? .001 : .01);
 let next=current+direction*step;
 // ±π describe the same orientation: retain the step past the boundary.
 if(isEuclidean())next=((next+limit)%(2*limit)+2*limit)%(2*limit)-limit;
 else next=Math.max(-limit,Math.min(limit,next));
 if(next===current)return;
 if(heldBoostKey!==key){checkpoint();heldBoostKey=key}
 setBoost(sliderParameter(next));
}
function handleKeyDown(e){
 if(e.defaultPrevented||e.isComposing||$('helpDialog').open||$('colourDialog').open)return;
 const key=e.key.toLowerCase(),slider=e.target===$('boostSlider');
 const editing=e.target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName);
 if(e.key==='Escape'){
  e.preventDefault();heldBoostKey=null;cancelFrameAnimation();
  if(gesture){if(gesture.before){state=JSON.parse(gesture.before);if(gesture.moved)history.pop()}gesture=null;preview=null;refresh();return}
  if(fullscreenWanted){
   if($('drawingTools').open){$('drawingTools').open=false;$('toolsSummary').focus()}
   else if(document.body.classList.contains('inspector-open')){showFullscreenInspector(false);$('fullscreenInspector').focus()}
   else exitPresentation();
  }else if(!editing){preview=null;selected.clear();tool='select';refresh()}
  return;
 }
 if((editing&&!slider)||gesture)return;
 if(e.metaKey||e.ctrlKey||e.altKey){
  if(!e.altKey&&(e.metaKey||e.ctrlKey)&&key==='z'){e.preventDefault();heldBoostKey=null;e.shiftKey?redo():undo()}
  if(!e.altKey&&(e.metaKey||e.ctrlKey)&&key==='s'){e.preventDefault();$('saveScene').click()}
  return;
 }
 const direction=e.key==='ArrowRight'||(slider&&e.key==='ArrowUp')?1:e.key==='ArrowLeft'||(slider&&e.key==='ArrowDown')?-1:0;
 if(direction){e.preventDefault();nudgeBoost(direction,e.shiftKey,e.key);return}
 // Home / End on the focused slider retain their endpoint meaning.
 if(slider&&(e.key==='Home'||e.key==='End')){
  e.preventDefault();if(!e.repeat){heldBoostKey=null;setBoost((e.key==='Home'?-1:1)*sliderLimit(),true)}return;
 }
 if(e.code==='Space'||e.key===' '){e.preventDefault();if(!e.repeat){heldBoostKey=null;goToSelectedFrame()}return}
 if(['0','f','home','+','=','-','v','h','?','delete','backspace'].includes(key)){
  e.preventDefault();
  if(e.repeat&&!['+','=','-'].includes(key))return;
  heldBoostKey=null;
  if(key==='0'){animateBoost(0);return}
  cancelFrameAnimation();
  if(key==='f'){fullscreenWanted?exitPresentation():enterPresentation()}
  else if(key==='home')fit();
  else if(key==='+'||key==='=')zoom(.8);
  else if(key==='-')zoom(1.25);
  else if(key==='v'||key==='h'){tool=key==='v'?'select':'pan';preview=null;toolbar();render()}
  else if(key==='?')$('helpDialog').showModal();
  else removeSelected();
 }
}
function handleKeyUp(e){if(e.key===heldBoostKey)heldBoostKey=null}
document.addEventListener('pointerdown',()=>{heldBoostKey=null;cancelFrameAnimation()},true);
window.addEventListener('keydown',handleKeyDown);
window.addEventListener('keyup',handleKeyUp);
window.addEventListener('blur',()=>{heldBoostKey=null});
window.addEventListener('pagehide',()=>{cancelFrameAnimation();persist(true)});
new ResizeObserver(()=>render()).observe($('canvasWrap'));
let restored=false;try{const embedded=JSON.parse($('embedded-scene').textContent);if(embedded){state=validateState(embedded);restored=true}else{const saved=localStorage.getItem(STORAGE);if(saved){state=validateState(JSON.parse(saved));restored=true}}}catch{}setPresentationLayout(false);if(!restored)loadCase('time',false);else{nextId=Math.max(0,...state.objects.map(o=>o.id))+1;refresh()}setMode('beta');
// A small read-only interface for numerical verification and integrations.
window.MinkowskiLab=Object.freeze({boost:(p,eta)=>boost(p,eta),getState:()=>clone(state),validateState:s=>validateState(s)});
})();
