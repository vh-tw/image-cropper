/* Native image decoding plus first-page TIFF, shared by main thread and worker. */
(function(root){
  async function decodeLocalImage(file,detail=false){
    let bitmap;
    if(/\.tiff?$/i.test(file.name)){
      const buffer=await file.arrayBuffer(),ifds=UTIF.decode(buffer),ifd=ifds[0];
      if(!ifd)throw Error('This TIFF has no readable image. / TIFF 沒有可讀取的影像。');
      UTIF.decodeImage(buffer,ifd);
      const w=ifd.width,h=ifd.height;
      if(!(w>0&&h>0))throw Error('Invalid TIFF dimensions. / TIFF 尺寸無效。');
      const make=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
      const raw=make(w,h);raw.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(UTIF.toRGBA8(ifd)),w,h),0,0);
      const o=ifd.t274?.[0]||1,swap=o>=5&&o<=8,out=make(swap?h:w,swap?w:h),ctx=out.getContext('2d');
      const transforms={2:[-1,0,0,1,w,0],3:[-1,0,0,-1,w,h],4:[1,0,0,-1,0,h],5:[0,1,1,0,0,0],6:[0,1,-1,0,h,0],7:[0,-1,-1,0,h,w],8:[0,-1,1,0,0,w]};
      if(transforms[o])ctx.setTransform(...transforms[o]);ctx.drawImage(raw,0,0);bitmap=await createImageBitmap(out);raw.width=raw.height=out.width=out.height=1;
    }else bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
    const w=bitmap.width,h=bitmap.height;
    if(!detail&&Math.max(w,h)>1600){const scale=1600/Math.max(w,h),small=await createImageBitmap(bitmap,{resizeWidth:Math.max(1,Math.round(w*scale)),resizeHeight:Math.max(1,Math.round(h*scale)),resizeQuality:'high'});bitmap.close();bitmap=small}
    return {bitmap,w,h};
  }
  root.decodeLocalImage=decodeLocalImage;
})(globalThis);
