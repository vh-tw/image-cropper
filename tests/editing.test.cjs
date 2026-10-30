const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),G=require('../geometry.js');
const ctx={Geometry:G,document:{querySelector:()=>({content:'test'})},window:{},setTimeout,clearTimeout,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}};vm.createContext(ctx);
const code=fs.readFileSync(__dirname+'/../app.js','utf8');vm.runInContext(code.slice(0,code.indexOf("$('#exportEdited').onclick")),ctx);
const c={clientWidth:500,getBoundingClientRect:()=>({left:0,top:0,width:500,height:500}),setPointerCapture(){},hasPointerCapture:()=>false,style:{}};
ctx.row={querySelector:selector=>selector==='.editor'?c:{disabled:false}};
vm.runInContext("state={folder:'test',progress:{items:{a:{layout:'fixed-square-v2',rotation:0,crop:G.frame(120,80),edited:false},b:{layout:'fixed-square-v2',rotation:0,crop:G.frame(120,80),edited:false}}}};cache.set('a',{w:120,h:80});setActive=()=>{};draw=()=>{};changed=()=>{};var original=G.snapshot(item('a'));bindCanvas(row,'a')",ctx);
const event=(x,y)=>({clientX:x,clientY:y,button:0,pointerId:1,preventDefault(){}}),f=G.frame(120,80);
c.onpointerdown(event((f[0]+f[2])*500,(f[1]+f[3])*500));
c.onpointermove(event(1000,1000));
assert.ok(G.contains(vm.runInContext("item('a').crop",ctx),120,80,0));
c.onpointermove(event(300,290));c.onpointerup(event(300,290));
assert.equal(vm.runInContext("item('a').history.undo.length",ctx),1,'one continuous drag should create one undo entry');
vm.runInContext("undoRedo(row,'a','undo')",ctx);
const restored=JSON.parse(vm.runInContext("JSON.stringify(G.snapshot(item('a')))",ctx));
restored.crop.forEach((v,i)=>assert.ok(Math.abs(v-f[i])<1e-10));assert.equal(restored.edited,false);
vm.runInContext("undoRedo(row,'a','redo')",ctx);assert.equal(vm.runInContext("item('a').history.undo.length",ctx),1);
assert.equal(vm.runInContext("item('b').history",ctx),undefined);
const before=vm.runInContext("JSON.stringify(item('a'))",ctx);
c.onpointerdown(event(0,0));c.onpointermove(event(500,500));c.onpointerup(event(500,500));
assert.equal(vm.runInContext("JSON.stringify(item('a'))",ctx),before,'starting a new crop outside the source must be ignored');
// Inside the actual picture, but outside the existing crop: neither a click,
// slight mouse jitter, nor dragging back across the crop may replace it.
for(const end of [[410,250],[412,252],[200,220]]){
  c.onpointerdown(event(410,250));c.onpointermove(event(...end));c.onpointerup(event(...end));
  assert.equal(vm.runInContext("JSON.stringify(item('a'))",ctx),before,'outside-crop gestures must preserve crop, angle and undo history');
}
vm.runInContext("setAngle(row,'a',37.4);finishAngle(row,'a')",ctx);
assert.ok(G.contains(vm.runInContext("item('a').crop",ctx),120,80,37.4));
vm.runInContext("undoRedo(row,'a','undo')",ctx);assert.equal(vm.runInContext("item('a').rotation",ctx),0);
console.log('PASS: pointer resize boundaries, grouped drag undo, redo, independent image histories, ignore outside image, free rotation containment and undo');
