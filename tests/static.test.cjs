const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.join(__dirname,'..');
test('Pages subpath assets, syntax, vendored integrity, no server API or external runtime URLs',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const [,url]of html.matchAll(/(?:src|href)="([^"]+)"/g)){assert.ok(url.startsWith('./'),url);assert.ok(fs.existsSync(path.join(root,url)),url)}
 for(const file of ['app.js','client.js','geometry.js','decoder.js','decode-worker.js']){const source=fs.readFileSync(path.join(root,file),'utf8');new vm.Script(source,{filename:file});assert.ok(!source.includes('/api/'));assert.ok(!/https?:\/\//.test(source),file)}
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'vendor/manifest.json')));for(const [file,info]of Object.entries(manifest))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'vendor',file))).digest('hex'),info.sha256);
 assert.match(html,/Open Folder/);assert.match(html,/Save Progress/);assert.match(html,/Restore Progress/);
});
test('ZIP library writes valid independently readable entries',async()=>{
 const JSZip=require('../vendor/jszip.min.js'),zip=new JSZip();zip.file('cropped-results/a.png',new Uint8Array([137,80,78,71]));zip.file('crop-progress.json','{"items":{}}');
 const output=await zip.generateAsync({type:'uint8array',streamFiles:true});const read=await JSZip.loadAsync(output);assert.equal(await read.file('crop-progress.json').async('string'),'{"items":{}}');assert.equal((await read.file('cropped-results/a.png').async('uint8array'))[0],137);
});
test('TIFF decoding and EXIF orientation, using bundled decoder and 8-bit output',async()=>{
 const context={console,Uint8Array,Uint8ClampedArray,ArrayBuffer,DataView,TextDecoder,TextEncoder};context.self=context;context.globalThis=context;vm.createContext(context);
 for(const file of ['vendor/pako.min.js','vendor/UTIF.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
 const transforms=[],rawData=[];class Canvas{constructor(w,h){this.width=w;this.height=h}getContext(){return {putImageData:image=>rawData.push([...image.data]),drawImage(){},setTransform:(...m)=>transforms.push(m)}}}
 Object.assign(context,{OffscreenCanvas:Canvas,ImageData:class{constructor(data,w,h){this.data=data;this.width=w;this.height=h}},createImageBitmap:async c=>({width:c.width,height:c.height,close(){}})});
 vm.runInContext(fs.readFileSync(path.join(root,'decoder.js'),'utf8'),context);
 const pixels=new Uint8Array([255,0,0,255,0,0,255,255]);const buffer=context.UTIF.encodeImage(pixels,2,1,{t274:[6]});
 const result=await context.decodeLocalImage({name:'sample.TIFF',arrayBuffer:async()=>buffer},true);assert.equal(result.w,1);assert.equal(result.h,2);assert.deepEqual(rawData[0],[...pixels]);assert.deepEqual(transforms[0],[0,1,-1,0,1,0]);
});
