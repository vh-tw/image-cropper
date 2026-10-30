importScripts('./vendor/pako.min.js','./vendor/UTIF.js','./decoder.js');
onmessage=async e=>{const {id,file,detail}=e.data;try{const result=await decodeLocalImage(file,detail);postMessage({id,...result},[result.bitmap])}catch(error){postMessage({id,error:error.message||String(error)})}};
