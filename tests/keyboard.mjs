import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
const frameCode=source.slice(source.indexOf('function lineFrame('),source.indexOf('function cancelFrameAnimation('));
const geometryHelpers=source.slice(source.indexOf('function isEuclidean('),source.indexOf('// t stores'));
const keyCode=source.slice(source.indexOf('function nudgeBoost('),source.indexOf("document.addEventListener('pointerdown',()=>{heldBoostKey"));
const nodes=new Map(),calls=[],messages=[],snapshots=[];
const $=id=>{
 if(!nodes.has(id))nodes.set(id,{tagName:'BUTTON',open:false,focus(){calls.push('focus:'+id)},click(){calls.push('click:'+id)},showModal(){this.open=true;calls.push('modal:'+id)}});
 return nodes.get(id);
};
$('boostSlider').tagName='INPUT';
const document={body:{classList:{contains:()=>false}}};
const context=vm.createContext({$,document,console,toast:m=>messages.push(m),
 animateBoost:eta=>calls.push(['animate',eta]),cancelFrameAnimation:()=>calls.push('cancel'),
 checkpoint:()=>snapshots.push(run('state.eta')),
 setBoost:eta=>{context.newEta=eta;run('state.eta=newEta')},
 enterPresentation:()=>{calls.push('enter');run('fullscreenWanted=true')},
 exitPresentation:()=>{calls.push('exit');run('fullscreenWanted=false')},
 showFullscreenInspector:()=>calls.push('inspector'),fit:()=>calls.push('fit'),zoom:f=>calls.push(['zoom',f]),
 toolbar(){},render(){},refresh(){},removeSelected:()=>calls.push('delete'),undo:()=>calls.push('undo'),redo:()=>calls.push('redo')});
const run=code=>vm.runInContext(code,context);
run(`let state={objects:[],eta:0},selected=new Set(),mode='beta',heldBoostKey=null,sliderEtaLimit=Math.atanh(.98),gesture=null,preview=null,tool='select',history=[],fullscreenWanted=false;`+geometryHelpers+frameCode+keyCode);
function press(key,extra={}){
 const event={key,code:key===' '?'Space':'',target:{tagName:'DIV'},repeat:false,preventDefault(){this.defaultPrevented=true},...extra};
 context.event=event;run('handleKeyDown(event)');return event;
}
function release(key){context.event={key};run('handleKeyUp(event)')}
function near(actual,expected){assert.ok(Math.abs(actual-expected)<1e-12,`${actual} != ${expected}`)}
assert.equal(press('ArrowRight').defaultPrevented,true);near(Math.tanh(run('state.eta')),.01);
press('ArrowRight',{repeat:true});near(Math.tanh(run('state.eta')),.02);assert.equal(snapshots.length,1);
release('ArrowRight');press('ArrowLeft',{shiftKey:true});near(Math.tanh(run('state.eta')),.019);assert.equal(snapshots.length,2);
release('ArrowLeft');run("mode='eta';state.eta=.4");press('ArrowRight');near(run('state.eta'),.41);
release('ArrowRight');run("mode='beta';state.eta=Math.atanh(.979)");press('ArrowRight');near(Math.tanh(run('state.eta')),.98);
press('ArrowRight',{repeat:true});near(Math.tanh(run('state.eta')),.98);
release('ArrowRight');run('state.eta=-Math.atanh(.979)');press('ArrowLeft');near(Math.tanh(run('state.eta')),-.98);
release('ArrowLeft');
// Focused range uses the same controlled steps, instead of the browser's range step.
run('state.eta=0');press('ArrowUp',{target:$('boostSlider')});near(Math.tanh(run('state.eta')),.01);
release('ArrowUp');press('ArrowDown',{target:$('boostSlider')});near(run('state.eta'),0);
press('End',{target:$('boostSlider')});near(run('state.eta'),run('sliderEtaLimit'));
press('Home',{target:$('boostSlider')});near(run('state.eta'),-run('sliderEtaLimit'));
// Rotation arrows wrap through a full turn, preserving fine steps and undo grouping.
run("state.geometry='euclidean';mode='beta';state.eta=179*Math.PI/180;heldBoostKey=null");
const wrapHistory=snapshots.length;
press('ArrowRight');near(run('state.eta'),-Math.PI);
press('ArrowRight',{repeat:true});near(run('state.eta'),-179*Math.PI/180);
assert.equal(snapshots.length,wrapHistory+1);
release('ArrowRight');run('state.eta=-Math.PI');press('ArrowLeft');near(run('state.eta'),179*Math.PI/180);release('ArrowLeft');
run('state.eta=179.95*Math.PI/180');press('ArrowRight',{shiftKey:true});near(run('state.eta'),-179.95*Math.PI/180);release('ArrowRight');
run('state.eta=-179.95*Math.PI/180');press('ArrowLeft',{shiftKey:true});near(run('state.eta'),179.95*Math.PI/180);release('ArrowLeft');
run("mode='eta';state.eta=Math.PI-.004");press('ArrowUp',{target:$('boostSlider')});near(run('state.eta'),-Math.PI+.006);release('ArrowUp');
run('state.eta=-Math.PI+.0004');press('ArrowDown',{shiftKey:true,target:$('boostSlider')});near(run('state.eta'),Math.PI-.0006);release('ArrowDown');
run("mode='beta';state.eta=0");
for(let i=0;i<720;i++)press('ArrowRight',{repeat:i>0});
near(run('state.eta'),0);release('ArrowRight');
run("state.geometry='minkowski'");
// Editable fields, composing text, dialogs and browser modifiers are not intercepted.
for(const target of [{tagName:'INPUT'},{tagName:'TEXTAREA'},{tagName:'SELECT'},{tagName:'DIV',isContentEditable:true}]){
 for(const key of ['ArrowRight',' ','f','0','Delete','Home','?'])assert.equal(press(key,{target}).defaultPrevented,undefined);
}
for(const extra of [{altKey:true},{ctrlKey:true},{metaKey:true},{isComposing:true},{defaultPrevented:true}]){
 const before=run('state.eta');press('ArrowRight',extra);near(run('state.eta'),before);
}
$('helpDialog').open=true;assert.equal(press(' ').defaultPrevented,undefined);$('helpDialog').open=false;
$('colourDialog').open=true;assert.equal(press('ArrowLeft').defaultPrevented,undefined);$('colourDialog').open=false;
// The exact same frame calculation is used by the button and Space.
run("state.objects=[{id:1,type:'segment',points:[{x:0,t:0},{x:3,t:5}]}];selected=new Set([1]);state.eta=-.2");
let count=calls.length;assert.equal(press(' ',{target:{tagName:'BUTTON'}}).defaultPrevented,true);
assert.equal(calls.length,count+1);near(calls.at(-1)[1],Math.atanh(.6));
count=calls.length;press(' ',{repeat:true});assert.equal(calls.length,count,'Holding Space must not cancel or restart the transition');
run("state.objects[0].points=[{x:1,t:2},{x:6,t:5}]");press(' ');near(calls.at(-1)[1],Math.atanh(.6));
run("state.objects[0]={id:1,type:'axis',axis:'x',frameEta:-.8}");press(' ');near(calls.at(-1)[1],-.8);
for(const points of ['[{x:0,t:0},{x:1,t:1}]','[{x:2,t:3},{x:2,t:3}]']){
 run(`state.objects[0]={id:1,type:'line',points:${points}}`);count=calls.length;press(' ');assert.equal(calls.length,count);assert.ok(messages.at(-1).length);
}
run("state.objects[0]={id:1,type:'point',points:[{x:0,t:1}]}");count=calls.length;press(' ');assert.equal(calls.length,count);assert.match(messages.at(-1),/no single rest frame/);
run('selected.clear()');press(' ');assert.match(messages.at(-1),/Select one/);
run("state.objects=[{id:1},{id:2}];selected=new Set([1,2])");press(' ');assert.match(messages.at(-1),/Select one/);
// Additional actions, repeat protection, and Escape precedence.
press('0');assert.deepEqual(calls.at(-1),['animate',0]);
press('f');assert.equal(calls.at(-1),'enter');count=calls.length;press('f',{repeat:true});assert.equal(calls.length,count);press('f');assert.equal(calls.at(-1),'exit');
press('Home');assert.equal(calls.at(-1),'fit');press('+');assert.deepEqual(calls.at(-1),['zoom',.8]);press('-');assert.deepEqual(calls.at(-1),['zoom',1.25]);
press('h');assert.equal(run('tool'),'pan');press('v');assert.equal(run('tool'),'select');
press('z',{ctrlKey:true});assert.equal(calls.at(-1),'undo');press('z',{metaKey:true,shiftKey:true});assert.equal(calls.at(-1),'redo');
press('s',{ctrlKey:true});assert.equal(calls.at(-1),'click:saveScene');press('Delete');assert.equal(calls.at(-1),'delete');
press('?');assert.equal($('helpDialog').open,true);$('helpDialog').open=false;
run("fullscreenWanted=true;gesture={type:'draw'}");press('Escape');assert.equal(run('gesture'),null);assert.equal(run('fullscreenWanted'),true);
$('drawingTools').open=true;press('Escape');assert.equal($('drawingTools').open,false);assert.equal(run('fullscreenWanted'),true);
press('Escape');assert.equal(calls.at(-1),'exit');
assert.ok(!source.includes('Pan (H or Space)'));
console.log('Passed: boost increments, fine steps, mode and range limits, continuous rotation wrapping, held-key undo grouping, focused range, editing/modal guards, frame targets and invalid selections, repeat-safe Space, navigation shortcuts, and Escape precedence.');
