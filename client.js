/* All selected images and crop settings stay on this device. No HTTP API. */
const Client=(()=>{
  const extensions=/\.(jpe?g|png|webp|bmp|gif|tiff?)$/i;
  let db=null,current={key:'empty',label:'No folder selected / 尚未選擇資料夾',entries:[],progress:{items:{},last:null}},worker=null,serial=0;
  const jobs=new Map();
  const clone=value=>structuredClone(value);
  function warning(message){const banner=document.querySelector('#storageNotice');if(banner){banner.hidden=false;banner.textContent=message}document.dispatchEvent(new CustomEvent('storagewarning',{detail:message}))}
  const ready=new Promise(resolve=>{
    let req;try{req=indexedDB.open('image-crop-studio',1)}catch(e){warning('Browser storage unavailable. Export a progress backup before closing.\n無法使用瀏覽器儲存，關閉前請匯出進度備份。');resolve();return}
    req.onupgradeneeded=()=>{for(const name of ['workspaces','progress','settings'])if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name)};
    req.onsuccess=()=>{db=req.result;db.onversionchange=()=>{db.close();db=null};resolve()};
    req.onerror=()=>{warning('Browser storage unavailable. Use progress backups.\n無法使用瀏覽器儲存，請使用進度備份。');resolve()};
    req.onblocked=()=>warning('Close older tabs to enable local saving.\n請關閉舊分頁以啟用本機儲存。');
  });
  function get(store,key){if(!db)return Promise.resolve(undefined);return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
  function write(stores,fn){if(!db)return Promise.reject(Error('Local storage unavailable / 本機儲存無法使用'));return new Promise((resolve,reject)=>{let tx;try{tx=db.transaction(stores,'readwrite');fn(tx)}catch(e){reject(e);return}tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||Error('Local save failed / 本機儲存失敗'))})}
  const initialized=ready.then(async()=>{const key=await get('settings','last');if(!key)return;const data=await get('workspaces',key);if(!data)return;current={...data,entries:data.entries||[],progress:await get('progress',key)||{items:{},last:null}};if(!current.entries.length)warning('Reselect the same image folder to continue. Your crop settings are retained.\n請重新選取同一個圖片資料夾，裁切設定仍有保留。')}).catch(e=>warning('Unable to restore local session.\n無法還原本機進度：'+e.message));
  function chooseInput(input){return new Promise(resolve=>{input.value='';let done=false;const finish=()=>{if(done)return;done=true;input.removeEventListener('change',finish);input.removeEventListener('cancel',finish);resolve([...input.files])};input.addEventListener('change',finish,{once:true});input.addEventListener('cancel',finish,{once:true});input.click()})}
  async function fingerprint(entries){const data=JSON.stringify(entries.map(({name,file})=>[name,file.size,file.lastModified]));const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data));return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('')}
  function validateProgress(value){if(!value||typeof value!=='object'||!value.items||Array.isArray(value.items))throw Error('Invalid progress file / 無效的進度檔');const clean={items:Object.create(null),last:typeof value.last==='string'?value.last:null};
    const shot=s=>{if(!s||!Number.isFinite(s.rotation))throw Error('Invalid rotation / 旋轉角度無效');if(s.crop&&(!Array.isArray(s.crop)||s.crop.length!==4||!s.crop.every(Number.isFinite)||s.crop[0]<0||s.crop[1]<0||s.crop[2]<=0||s.crop[3]<=0||s.crop[0]+s.crop[2]>1.00001||s.crop[1]+s.crop[3]>1.00001))throw Error('Invalid crop / 裁切範圍無效');return {layout:s.layout==='fixed-square-v2'?s.layout:undefined,rotation:Geometry.norm(s.rotation),crop:s.crop?.slice()||null,edited:!!s.edited}};
    for(const [name,s]of Object.entries(value.items)){if(['__proto__','prototype','constructor'].includes(name))throw Error('Invalid image name / 圖片名稱無效');const it=shot(s);if(s.history)it.history={undo:(s.history.undo||[]).slice(-50).map(shot),redo:(s.history.redo||[]).slice(-50).map(shot)};clean.items[name]=it}return clean;
  }
  async function choose(mode='folder'){
    await initialized;const selected=await chooseInput(document.querySelector(mode==='files'?'#filePicker':'#folderPicker'));if(!selected.length)return {changed:false};
    const directory=mode==='folder',entries=selected.filter(f=>extensions.test(f.name)&&!(f.webkitRelativePath||'').split('/').slice(0,-1).some(p=>p==='裁切結果'||/^cropped-results(?:-|$)/.test(p))).map(file=>({file,name:directory?file.webkitRelativePath.split('/').slice(1).join('/')||file.name:file.name})).sort((a,b)=>a.name.localeCompare(b.name,'en',{numeric:true}));
    if(!entries.length)throw Error('No supported images selected / 所選資料夾沒有支援的圖片');
    if(new Set(entries.map(e=>e.name)).size!==entries.length)throw Error('Duplicate filenames. Choose a folder to retain subfolder names.\n圖片名稱重複，請選資料夾以保留子資料夾名稱。');
    const key=await fingerprint(entries),label=directory?selected[0].webkitRelativePath.split('/')[0]:`${entries.length} selected images / 張所選圖片`;
    const progress=await get('progress',key)||{items:{},last:null};current={key,label,entries,progress};
    try{await write(['workspaces','settings'],tx=>{tx.objectStore('workspaces').put({key,label,entries},key);tx.objectStore('settings').put(key,'last')})}
    catch(e){try{await write(['workspaces','settings'],tx=>{tx.objectStore('workspaces').put({key,label,entries:[]},key);tx.objectStore('settings').put(key,'last')})}catch(_){}warning('Images could not be cached. Reselect the same folder next time; save a progress backup.\n圖片無法完整快取，下次請重選同一資料夾，並匯出進度備份。')}
    navigator.storage?.persist?.().catch(()=>{});return {changed:true};
  }
  async function save(progress){const clean=validateProgress(progress);current.progress=clean;await write(['progress'],tx=>tx.objectStore('progress').put(clean,current.key))}
  function state(){return {folder:current.key,folderLabel:current.label,files:current.entries.map(e=>e.name),progress:clone(current.progress)}}
  async function preview(index,detail=false){const file=current.entries[index]?.file;if(!file)throw Error('Image unavailable; reselect the folder / 無法取得圖片，請重選資料夾');
    if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined')return decodeLocalImage(file,detail);
    if(!worker){worker=new Worker('./decode-worker.js');worker.onmessage=e=>{const {id,error,...result}=e.data,job=jobs.get(id);if(!job){result.bitmap?.close();return}jobs.delete(id);if(error)job.reject(Error(error));else job.resolve(result)};worker.onerror=()=>{for(const job of jobs.values())job.reject(Error('Image decoder failed. Reload the page. / 解碼失敗，請重新載入。'));jobs.clear();worker.terminate();worker=null}};
    return new Promise((resolve,reject)=>{const id=++serial;jobs.set(id,{resolve,reject});worker.postMessage({id,file,detail})});
  }
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
  const toBlob=(canvas,mime,quality)=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image too large to export / 圖片過大，無法輸出')),mime,quality));
  function outputName(name,format='original'){if(format==='png')return name+'.png';if(format==='jpeg')return name+'.jpg';if(/\.(jpe?g|png|webp)$/i.test(name))return name;return name+'.png'}
  const supportsFolder=()=>typeof window!=='undefined'&&typeof window.showDirectoryPicker==='function';
  function chooseOutputDirectory(){if(!supportsFolder())throw Error('Direct folder saving is unavailable in this browser. Open this page in desktop Chrome or Edge. / 此瀏覽器不支援直接儲存資料夾，請使用電腦版 Chrome 或 Edge。');return window.showDirectoryPicker({mode:'readwrite',id:'image-crop-output'})}
  async function createOutputDirectory(parent){
    const now=new Date(),pad=n=>String(n).padStart(2,'0'),base='cropped-results-'+now.getFullYear()+pad(now.getMonth()+1)+pad(now.getDate())+'-'+pad(now.getHours())+pad(now.getMinutes())+pad(now.getSeconds());
    for(let suffix=0;suffix<1000;suffix++){const name=base+(suffix?'-'+(suffix+1):'');try{await parent.getDirectoryHandle(name)}catch(e){if(e.name!=='NotFoundError')throw e;return parent.getDirectoryHandle(name,{create:true})}}
    throw Error('Unable to create a new results folder / 無法建立新的結果資料夾');
  }
  async function writeOutput(root,path,blob){const parts=path.split('/');if(parts.some(p=>!p||p==='.'||p==='..'||p.includes('\\')))throw Error('Invalid output path / 輸出路徑無效');let dir=root;for(const part of parts.slice(0,-1))dir=await dir.getDirectoryHandle(part,{create:true});const file=await dir.getFileHandle(parts.at(-1),{create:true}),stream=await file.createWritable();try{await stream.write(blob);await stream.close()}catch(e){try{await stream.abort?.()}catch(_){}throw e}}
  async function exportImages(onlyEdited,onProgress,options={}){if(options.mode==='folder'&&!options.directory)throw Error('No destination folder selected. No ZIP was created. / 尚未選取目的地資料夾，不會改成 ZIP 下載。');if(!current.entries.length)throw Error('Select images first / 請先選取圖片');const zip=options.directory?null:new JSZip(),errors=[];let count=0;const format=document.querySelector('#outputFormat').value;
    const entries=current.entries.slice(),progress=clone(current.progress);
    const wasEdited=it=>it&&(it.edited||(it.layout!=='fixed-square-v2'&&(it.rotation||it.crop)));
    if(onlyEdited&&!entries.some(e=>wasEdited(progress.items[e.name])))return {count:0,folder:'No edited images / 尚未有調整過的圖片',errors:[]};
    const output=options.directory?await createOutputDirectory(options.directory):null;
    for(let i=0;i<entries.length;i++){
      const {name}=entries[i],it=progress.items[name]||{rotation:0,crop:null};
      if(onlyEdited&&!(it.edited||(it.layout!=='fixed-square-v2'&&(it.rotation||it.crop))))continue;
      onProgress(`Rendering ${i+1} / ${entries.length}\n正在輸出圖片…`);let bitmap,canvas;
      try{const image=await preview(i,true);bitmap=image.bitmap;const w=image.w,h=image.h;
        Geometry.upgrade(it,w,h);const c=Geometry.fitCrop(it.crop,w,h,it.rotation),d=Math.hypot(w,h)*1.12;
        canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(c[2]*d));canvas.height=Math.max(1,Math.round(c[3]*d));
        const ctx=canvas.getContext('2d');if(!ctx)throw Error('Cannot create export canvas / 無法建立輸出畫布');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.translate(d/2-c[0]*d,d/2-c[1]*d);ctx.rotate(it.rotation*Math.PI/180);ctx.drawImage(bitmap,-w/2,-h/2,w,h);
        const out=outputName(name,format),mime=/\.jpe?g$/i.test(out)?'image/jpeg':/\.webp$/i.test(out)?'image/webp':'image/png',blob=await toBlob(canvas,mime,.95);
        if(blob.type!==mime)throw Error('This browser cannot encode '+mime+'; select PNG / 請改用 PNG 格式');
        if(output)await writeOutput(output,out,blob);else zip.file('cropped-results/'+out,await blob.arrayBuffer());count++;
      }catch(e){errors.push(name+': '+e.message)}finally{bitmap?.close();if(canvas)canvas.width=canvas.height=1}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(!count){if(errors.length)throw Error(errors.join('\n'));return {count:0,folder:'No edited images / 尚未有調整過的圖片',errors:[]}}
    if(output){
      if(errors.length)try{await writeOutput(output,'export-errors.txt',new Blob([errors.join('\n')],{type:'text/plain'}))}catch(_){}
      return {count,folder:options.directory.name+'/'+output.name,errors};
    }
    if(errors.length)zip.file('export-errors.txt',errors.join('\n'));
    const blob=await zip.generateAsync({type:'blob',compression:'STORE',streamFiles:true},m=>onProgress(`Building ZIP ${Math.round(m.percent)}%\n正在打包 ZIP…`));
    download(blob,'cropped-images-'+new Date().toISOString().replace(/[:.]/g,'-')+'.zip');return {count,folder:'ZIP download prepared / ZIP 下載已準備完成',errors};
  }
  async function backup(progress){await initialized;download(new Blob([JSON.stringify({app:'image-crop-studio',version:1,workspace:current.key,manifest:current.entries.map(({name,file})=>[name,file.size,file.lastModified]),progress},null,2)],{type:'application/json'}),'crop-progress.json')}
  async function importProgress(){await initialized;if(!current.entries.length)throw Error('Select the original images first / 請先選取原始圖片');const files=await chooseInput(document.querySelector('#progressPicker'));if(!files.length)return {changed:false};const raw=JSON.parse(await files[0].text());if(raw.workspace&&raw.workspace!==current.key)throw Error('This progress belongs to different images. Select the matching original folder.\n此進度對應其他圖片，請先選取相符的原始資料夾。');const clean=validateProgress(raw.progress||raw);const names=new Set(current.entries.map(e=>e.name));for(const name of Object.keys(clean.items))if(!names.has(name))delete clean.items[name];await save(clean);return {changed:true}}
  async function api(path,data){await initialized;if(path==='state')return state();if(path==='choose')return choose();if(path==='save'){if(data.folder!==current.key)throw Error('Folder changed; reload / 資料夾已改變');await save(data.progress);return {ok:true}}throw Error('Unsupported local operation')}
  return {api,choose,preview,exportImages,backup,importProgress,validateProgress,outputName,supportsFolder,chooseOutputDirectory};
})();
