import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
const between=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const nodes=new Map();const $=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',dataset:{},classList:{add(){},remove(){}},removeAttribute(){},setAttribute(){}});return nodes.get(id)};
const context=vm.createContext({$,document:{createElement:()=>({getContext:()=>({})})},window:{matchMedia:()=>({matches:false})},performance:{now:()=>0},requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout:()=>1,clearTimeout(){},localStorage:{setItem(){}},updateHistoryButtons(){},refresh(){},console});
const run=code=>vm.runInContext(code,context);
run("const C={teal:'#087e8b',blue:'#4164ca',amber:'#ad7021',red:'#c55769',slate:'#75859a',purple:'#8861ad'};"+
 between('const DEFAULT_ETA','function setPresentationLayout(')+
 between('function lineFrame(','function frameAction(')+
 between('function clipLine(','function labelAt(')+
 between('function axisDirection(','function render(')+
 between('function shiftObject(',"$('diagram').addEventListener('pointerdown'")+
 between('function validateState(',"$('openScene').onclick="));
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const json=code=>JSON.parse(run(`JSON.stringify(${code})`));
// Both metrics, inverse transforms, and null rays, over a range of frames.
for(const geometry of ['minkowski','euclidean']){
 run(`state.geometry='${geometry}'`);
 for(const angle of [-2,-.7,0,.4,2]){
  run(`state.eta=${angle};globalThis.p=pt(2.3,4.8);globalThis.q=boost(p);globalThis.back=base(q)`);
  near(run('back.x'),2.3);near(run('back.t'),4.8);
  near(run(geometry==='euclidean'?'q.x*q.x+q.t*q.t':'q.t*q.t-q.x*q.x'),geometry==='euclidean'?2.3**2+4.8**2:4.8**2-2.3**2);
 }
}
run("loadCase('euclideanComponents',false)");
for(const angle of [-Math.PI,-1,0,1,Math.PI]){
 run(`state.eta=${angle};globalThis.lineObject={type:'line',points:[pt(0,0),pt(3,4)]};globalThis.vertical=lineFrame(lineObject);globalThis.horizontal=lineFrame(lineObject,true)`);
 near(run('boost(pt(3,4),vertical.eta).x'),0);near(run('boost(pt(3,4),horizontal.eta).t'),0);
 run('globalThis.axis={type:"axis",axis:"t",frameEta:state.eta}');near(run('axisDirection(axis).x'),0);near(run('axisDirection(axis).t'),1);
}
// Invariant circles, including a rotated centre; inverse storage when drawing.
run("state.eta=.9;globalThis.circle={type:'circle',center:pt(2,3),radius:5};globalThis.center=boost(circle.center)");
for(const p of json('geometry(circle)[0]'))near(Math.hypot(p.x-run('center.x'),p.t-run('center.t')),5);
run("tool='circle';globalThis.drawn=makeDrawing(pt(1,2),pt(4,6),[])");assert.equal(run('drawn.type'),'circle');near(run('drawn.radius'),5);near(run('boost(drawn.center).x'),1);near(run('boost(drawn.center).t'),2);
// Euclidean example quantities and frame chips.
run("loadCase('euclideanWidth',false);globalThis.width=state.objects.find(o=>o.label==='L = 4');globalThis.slice=state.objects.find(o=>o.label==='W = 5')");
near(run('Math.hypot(width.points[1].x-width.points[0].x,width.points[1].t-width.points[0].t)'),4);
near(run('slice.points[1].x-slice.points[0].x'),5);
run('state.eta=-tilt');near(run('boost(width.points[0]).t-boost(width.points[1]).t'),0);
run("loadCase('euclideanPaths',false);globalThis.paths=state.objects.filter(o=>o.type==='segment').map(o=>Math.hypot(o.points[1].x-o.points[0].x,o.points[1].t-o.points[0].t))");assert.deepEqual(json('paths'),[8,5,5]);
// Light cones: clip both full null lines through the transformed non-origin vertex.
run("loadCase('blank',false);scale=10;globalThis.cone=obj('lightcone','Cone',{center:pt(1,2)})");
for(const angle of [-1.4,0,.7]){
 run(`state.eta=${angle};globalThis.vertex=boost(cone.center)`);
 const paths=json('geometry(cone)');assert.equal(paths.length,2);
 for(const path of paths)for(const p of path)near((p.t-run('vertex.t'))**2-(p.x-run('vertex.x'))**2,0,1e-8);
}
run('add(cone);state.eta=.5');const minkowski=json('state');
run("switchGeometry('euclidean')");assert.equal(run('state.geometry'),'euclidean');assert.deepEqual(json('state.alternateScene'),minkowski);
run("add(obj('point','Custom point',{points:[pt(2,7)]}));state.eta=.3");const euclidean=json('(({alternateScene,...scene})=>scene)(state)');
run("switchGeometry('minkowski')");assert.deepEqual(json('(({alternateScene,...scene})=>scene)(state)'),minkowski);
run("switchGeometry('euclidean')");assert.deepEqual(json('(({alternateScene,...scene})=>scene)(state)'),euclidean);
run('undo()');assert.equal(run('state.geometry'),'minkowski');run('redo()');assert.equal(run('state.geometry'),'euclidean');
// Both scenes survive validation; original v1 scene files remain accepted.
assert.deepEqual(json('validateState(JSON.parse(JSON.stringify(state)))'),json('state'));
run("globalThis.legacy=JSON.parse(JSON.stringify(state.alternateScene));delete legacy.geometry");assert.equal(run('validateState(legacy).geometry'),'minkowski');
assert.throws(()=>run("validateState({...state,geometry:'invalid'})"));
assert.throws(()=>run('validateState({...state,eta:4})'));
assert.throws(()=>run('validateState({...state,objects:[cone]})'));
assert.throws(()=>run('validateState({...state,alternateScene:{...state.alternateScene,alternateScene:state}})'));
for(const id of json('Object.keys(cases)')){run(`delete state.alternateScene;loadCase('${id}',false)`);assert.doesNotThrow(()=>run('validateState(JSON.parse(JSON.stringify(state)))'))}
console.log('Passed: both invariant metrics, inverse transforms, Euclidean line/axis alignment, circles and drawing coordinates, example lengths, translated light cones, mode preservation and undo, legacy scene migration, and validation of all examples.');
