const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {IDBFactory}=require('fake-indexeddb');const crypto=require('node:crypto').webcrypto;
const Geometry=require('../geometry.js'),code=fs.readFileSync(__dirname+'/../client.js','utf8');
function session(indexedDB){const controls=new Map(),downloads=[],warnings=[];function input(){const listeners=new Map();return {files:[],value:'',addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k),click(){queueMicrotask(()=>listeners.get(this.files.length?'change':'cancel')?.())}}}
for(const name of ['#filePicker','#folderPicker','#progressPicker'])controls.set(name,input());controls.set('#outputFormat',{value:'png'});controls.set('#storageNotice',{});
const ctx={indexedDB,crypto,Geometry,structuredClone,File,Blob,TextEncoder,CustomEvent,queueMicrotask,setTimeout:fn=>{queueMicrotask(fn);return 1},navigator:{},URL:{createObjectURL:blob=>{downloads.push(blob);return 'blob:local'},revokeObjectURL(){}},document:{querySelector:s=>controls.get(s),dispatchEvent:e=>warnings.push(e.detail),body:{append(){}},createElement:()=>({click(){},remove(){}})}};
vm.createContext(ctx);vm.runInContext(code,ctx);return {api:vm.runInContext('Client',ctx),controls,downloads,warnings}}
function folderFiles(){return ['one.jpg','two.tiff'].map((name,i)=>{const file=new File(['image'+i],name,{lastModified:1234});Object.defineProperty(file,'webkitRelativePath',{value:'Originals/'+name});return file})}
test('folder selection, independent progress, session restore, undo history and backup round trip',async()=>{
 const db=new IDBFactory(),a=session(db);assert.equal((await a.api.api('state')).files.length,0);
 a.controls.get('#folderPicker').files=folderFiles();await a.api.choose();const s=await a.api.api('state');assert.equal(s.folderLabel,'Originals');assert.deepEqual(Array.from(s.files),['one.jpg','two.tiff']);
 const before={layout:'fixed-square-v2',rotation:0,crop:[.3,.3,.3,.2],edited:false};s.progress.items['one.jpg']={...before,rotation:12.3,edited:true,history:{undo:[before],redo:[]}};
 await a.api.api('save',{folder:s.folder,progress:s.progress});
 const b=session(db),restored=await b.api.api('state');assert.equal(restored.folder,s.folder);assert.equal(restored.progress.items['one.jpg'].rotation,12.3);assert.equal(restored.progress.items['one.jpg'].history.undo.length,1);
 await b.api.backup(restored.progress);const backup=JSON.parse(await b.downloads[0].text());assert.equal(backup.progress.items['one.jpg'].rotation,12.3);
 const changed=structuredClone(restored.progress);changed.items['one.jpg'].rotation=90;await b.api.api('save',{folder:restored.folder,progress:changed});
 b.controls.get('#progressPicker').files=[new File([JSON.stringify(backup)],'progress.json')];await b.api.importProgress();assert.equal((await b.api.api('state')).progress.items['one.jpg'].rotation,12.3);
 const bad={...backup,workspace:'other-project'};b.controls.get('#progressPicker').files=[new File([JSON.stringify(bad)],'bad.json')];await assert.rejects(()=>b.api.importProgress(),/different images/);
 const c=session(new IDBFactory());assert.equal((await c.api.api('state')).files.length,0);
});
test('cancel selection, reject malformed progress, collision-safe output names',async()=>{
 const a=session(new IDBFactory());assert.equal((await a.api.choose()).changed,false);
 assert.throws(()=>a.api.validateProgress({items:{x:{rotation:Infinity}}}),/rotation/);
 assert.throws(()=>a.api.validateProgress({items:{x:{rotation:0,crop:[0,0,2,1]}}}),/crop/);
 assert.throws(()=>a.api.validateProgress(JSON.parse('{"items":{"__proto__":{"rotation":0}}}')),/name/);
 assert.equal(a.api.outputName('same.jpg','png'),'same.jpg.png');assert.equal(a.api.outputName('same.webp','png'),'same.webp.png');assert.equal(a.api.outputName('scan.tiff'),'scan.tiff.png');assert.equal(a.api.outputName('photo.jpg'),'photo.jpg');
});
