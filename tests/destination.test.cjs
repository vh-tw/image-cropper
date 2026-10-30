const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('destination picker cancellation does not export; directory permission is requested before async saving',async()=>{
 const controls=new Map(),steps=[];const context={Geometry:require('../geometry.js'),window:{},Client:{chooseOutputDirectory:async()=>{steps.push('picker');throw new DOMException('Cancelled','AbortError')},exportImages:async()=>{steps.push('export');return {count:1,folder:'selected/results',errors:[]}}},document:{querySelector:s=>{if(!controls.has(s))controls.set(s,{value:'folder'});return controls.get(s)},querySelectorAll:()=>[]}};
 vm.createContext(context);const source=fs.readFileSync(__dirname+'/../app.js','utf8');vm.runInContext(source.slice(0,source.indexOf("$('#exportEdited').onclick")),context);
 vm.runInContext("state={files:['a.png'],progress:{items:{}}};setBusy=value=>busy=value;notice=()=>{};persist=async()=>{}",context);
 await vm.runInContext('exportImages(false)',context);assert.deepEqual(steps,['picker']);assert.equal(vm.runInContext('busy',context),false);assert.match(controls.get('#saved').textContent,/cancelled/);
 steps.length=0;context.Client.chooseOutputDirectory=async()=>{steps.push('picker');return {name:'selected'}};
 context.trackPersist=()=>steps.push('persist');vm.runInContext('persist=async()=>trackPersist()',context);
 await vm.runInContext('exportImages(false)',context);assert.deepEqual(steps,['picker','persist','export']);assert.equal(vm.runInContext('busy',context),false);
 steps.length=0;await vm.runInContext("exportImages(false,'zip')",context);assert.deepEqual(steps,['persist','export'],'Only the separate ZIP action should bypass the directory picker');
 steps.length=0;await vm.runInContext('exportImages(true)',context);assert.deepEqual(steps,['picker','persist','export'],'Save Edited must also require a folder');
 steps.length=0;context.Client.chooseOutputDirectory=()=>{steps.push('unsupported');throw Error('Folder saving unavailable')};await vm.runInContext('exportImages(false)',context);assert.deepEqual(steps,['unsupported'],'Unsupported browser must not silently download a ZIP');
});
