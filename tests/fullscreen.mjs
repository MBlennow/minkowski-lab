import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile(new URL('../src/app.js', import.meta.url),'utf8');
const code=source.slice(source.indexOf('function setPresentationLayout('),source.indexOf('function updateToolHint('));
function element(){const classes=new Set();return {attrs:{},children:[],textContent:'',open:false,focused:false,classList:{toggle(k,v){v??=!classes.has(k);v?classes.add(k):classes.delete(k)},remove(...ks){ks.forEach(k=>classes.delete(k))},contains(k){return classes.has(k)}},setAttribute(k,v){this.attrs[k]=v},append(e){this.children.push(e);e.parent=this},focus(){this.focused=true}}}
const nodes=new Map();const $=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)};
const listeners={},messages=[];const document={body:element(),documentElement:element(),fullscreenElement:null,fullscreenEnabled:false,addEventListener(name,handler){listeners[name]=handler}};
const context=vm.createContext({$,document,requestAnimationFrame:fn=>fn(),render(){},toast:msg=>messages.push(msg)});
vm.runInContext('let fullscreenWanted=false,nativeFullscreenOwned=false;'+code,context);
const call=js=>vm.runInContext(js,context);
await call('enterPresentation()');assert.equal(document.body.classList.contains('presentation'),true);assert.equal($('boostSlider').attrs['aria-orientation'],'vertical');assert.equal($('drawingTools').parent,$('fullscreenToolsSlot'));assert.equal($('drawingTools').open,false);assert.equal(messages.length,1);
call('showFullscreenInspector()');assert.equal(document.body.classList.contains('inspector-open'),true);assert.equal($('fullscreenInspector').attrs['aria-expanded'],'true');
await call('exitPresentation()');assert.equal(document.body.classList.contains('presentation'),false);assert.equal(document.body.classList.contains('inspector-open'),false);assert.equal($('boostSlider').attrs['aria-orientation'],'horizontal');assert.equal($('drawingTools').parent,$('toolsHome'));assert.equal($('drawingTools').open,true);
document.fullscreenEnabled=true;document.documentElement.requestFullscreen=async()=>{document.fullscreenElement=document.documentElement;listeners.fullscreenchange()};document.exitFullscreen=async()=>{document.fullscreenElement=null;listeners.fullscreenchange()};
await call('enterPresentation()');assert.equal(document.fullscreenElement,document.documentElement);await document.exitFullscreen();assert.equal(document.body.classList.contains('presentation'),false);assert.equal($('presentBtn').focused,true);
document.documentElement.requestFullscreen=async()=>{throw Error('Not allowed')};await call('enterPresentation()');assert.equal(document.body.classList.contains('presentation'),true);assert.match(messages.at(-1),/unavailable/);await call('exitPresentation()');
let resolveRequest;document.documentElement.requestFullscreen=()=>new Promise(resolve=>{resolveRequest=()=>{document.fullscreenElement=document.documentElement;listeners.fullscreenchange();resolve()}});const pending=call('enterPresentation()');await call('exitPresentation()');resolveRequest();await pending;assert.equal(document.body.classList.contains('presentation'),false);assert.equal(document.fullscreenElement,null);
console.log('Passed: full-window fallback, vertical slider state, tools placement, editor overlay, exit restoration, native fullscreen exit, denied request, and late fullscreen request cancellation.');
