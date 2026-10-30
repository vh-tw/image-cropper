const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),G=require('../geometry.js');
const page=[];const ctx={Geometry:G,document:{querySelector:()=>({content:'test'})},window:{innerHeight:900,scrollBy:v=>page.push(v)}};vm.createContext(ctx);
const code=fs.readFileSync(__dirname+'/../app.js','utf8');vm.runInContext(code.slice(0,code.indexOf("$('#exportEdited').onclick")),ctx);
const row={dataset:{name:'a',zoom:200}},canvas={getBoundingClientRect:()=>({left:0,top:0,width:500,height:500})};
let original=false;
const pane={clientHeight:300,scrollTop:0,scrollLeft:0,closest:()=>row,querySelector:s=>s==='canvas'?canvas:s==='.original'&&original?canvas:null};
ctx.pane=pane;vm.runInContext("state={progress:{items:{a:{rotation:0}}}};cache.set('a',{w:120,h:80});var zoomCalls=0;setActive=()=>{};applyZoom=()=>zoomCalls++",ctx);
function wheel(x,y,extra={}){const e={target:{closest:()=>pane},clientX:x,clientY:y,deltaY:30,deltaX:0,deltaMode:0,ctrlKey:false,preventDefault(){this.prevented=true},...extra};ctx.e=e;vm.runInContext('handleWheel(e)',ctx);return e}
assert.ok(wheel(250,250).prevented);assert.equal(pane.scrollTop,30);assert.equal(page.length,0);
wheel(20,20);assert.equal(pane.scrollTop,30);assert.equal(page.at(-1).top,30);
wheel(250,250,{deltaMode:1,deltaY:2});assert.equal(pane.scrollTop,62);
wheel(250,250,{ctrlKey:true});assert.equal(vm.runInContext('zoomCalls',ctx),1);assert.equal(pane.scrollTop,62);
vm.runInContext("item('a').rotation=45",ctx);wheel(75,140);assert.equal(page.length,2,'Rotated image corner blank should scroll page');
original=true;wheel(75,140);assert.equal(pane.scrollTop,92,'Original pane should use unrotated image bounds');
const outside=wheel(0,0,{target:{closest:()=>null}});assert.equal(outside.prevented,undefined,'Page background uses normal browser scrolling');
console.log('PASS: image-only wheel pan, gray-space page scroll, rotated/original hit detection, line delta, Ctrl zoom, normal page background');
