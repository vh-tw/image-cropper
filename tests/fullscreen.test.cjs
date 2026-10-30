const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('fullscreen toggles in/out, reflects Escape, and handles rejected requests',async()=>{
 const controls=new Map(),messages=[],button={innerHTML:'',setAttribute:(name,value)=>button[name]=value};
 const ctx={Geometry:require('../geometry.js'),document:{fullscreenElement:null,querySelector:s=>s==='#fullscreen'?button:controls.get(s)||{},documentElement:{},exitFullscreen:async()=>ctx.document.fullscreenElement=null}};
 ctx.document.documentElement.requestFullscreen=async()=>ctx.document.fullscreenElement=ctx.document.documentElement;
 vm.createContext(ctx);const code=fs.readFileSync(__dirname+'/../app.js','utf8');vm.runInContext(code.slice(0,code.indexOf("$('#exportEdited').onclick")),ctx);ctx.message=text=>messages.push(text);vm.runInContext('notice=message',ctx);
 await vm.runInContext('toggleFullscreen()',ctx);assert.ok(ctx.document.fullscreenElement);assert.equal(button['aria-pressed'],'true');assert.match(button.innerHTML,/Exit Fullscreen/);
 await vm.runInContext('toggleFullscreen()',ctx);assert.equal(ctx.document.fullscreenElement,null);assert.equal(button['aria-pressed'],'false');assert.match(button.innerHTML,/全螢幕/);
 await vm.runInContext('toggleFullscreen()',ctx);ctx.document.fullscreenElement=null;vm.runInContext('updateFullscreenButton()',ctx);assert.equal(button['aria-pressed'],'false','Escape should restore button state');
 ctx.document.documentElement.requestFullscreen=async()=>{throw Error('Denied')};await vm.runInContext('toggleFullscreen()',ctx);assert.match(messages.at(-1),/Denied/);assert.equal(button['aria-pressed'],'false');
});
