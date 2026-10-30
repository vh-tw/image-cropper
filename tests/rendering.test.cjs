const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),G=require('../geometry.js');
let next=0;const frames=new Map(),controls=new Map();
const ctx={Geometry:G,window:{devicePixelRatio:1},document:{activeElement:{},querySelector:s=>{if(!controls.has(s))controls.set(s,{content:'test'});return controls.get(s)}},requestAnimationFrame:fn=>{frames.set(++next,fn);return next},cancelAnimationFrame:id=>frames.delete(id)};
vm.createContext(ctx);const code=fs.readFileSync(__dirname+'/../app.js','utf8');vm.runInContext(code.slice(0,code.indexOf("$('#exportEdited').onclick")),ctx);
function canvas(){let images=0;const context=new Proxy({drawImage(){images++}},{get:(o,k)=>k in o?o[k]:()=>{}});return {width:1400,height:1400,clientWidth:500,getContext:()=>context,get images(){return images}}}
const picture=canvas(),overlay=canvas(),badge={classList:{toggle(){}}};
const elements={'.picture':picture,'.editor':overlay,'.badge':badge,'.angle':{},'.angle-slider':{},'.undo':{},'.redo':{}};
ctx.row={isConnected:true,dataset:{name:'a',zoom:100},querySelectorAll:()=>[],querySelector:s=>elements[s]};
vm.runInContext("state={progress:{items:{a:{layout:'fixed-square-v2',rotation:0,crop:G.frame(120,80),edited:false}}}};cache.set('a',{bitmap:{},w:120,h:80});draw(row,'a')",ctx);
assert.equal(picture.images,1);
vm.runInContext("item('a').crop=[.4,.4,.1,.1];draw(row,'a');item('a').crop=[.3,.3,.2,.2];draw(row,'a')",ctx);
assert.equal(picture.images,1,'Moving only the crop must not redraw/rescale the source');assert.equal(overlay.images,0);
vm.runInContext("requestDraw(row,'a');requestDraw(row,'a');requestDraw(row,'a')",ctx);
assert.equal(frames.size,1,'Multiple pointer updates should share one display frame');
const callback=[...frames.values()][0];frames.clear();callback();assert.equal(picture.images,1);
vm.runInContext("item('a').rotation=10;draw(row,'a')",ctx);assert.equal(picture.images,2);
vm.runInContext("cache.get('a').bitmap={};draw(row,'a')",ctx);assert.equal(picture.images,3,'Loading detail should refresh the source');
vm.runInContext("requestDraw(row,'a');draw(row,'a')",ctx);assert.equal(frames.size,0,'Final draw must cancel pending drag paint');
console.log('PASS: crop-only rendering reuses image layer, no source image work on overlay, pointer coalescing, rotation/detail cache invalidation, final paint flush');
