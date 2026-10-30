/* Shared normalized geometry. The workspace never changes with rotation. */
(function(root){
  const norm=a=>{const v=a%360;return v===0?0:v<0?v+360:v};
  const frame=(w,h)=>{const d=Math.hypot(w,h)*1.12;return [(1-w/d)/2,(1-h/d)/2,w/d,h/d]};
  function upgrade(it,w,h){
    if(it.layout==='fixed-square-v2')return false;
    const oldCrop=it.crop,angle=norm(it.rotation||0),a=angle*Math.PI/180;
    const d=Math.hypot(w,h)*1.12;
    const rw=Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*h;
    const rh=Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*h;
    const c=oldCrop||[0,0,1,1];
    it.crop=[(d-rw)/2/d+c[0]*rw/d,(d-rh)/2/d+c[1]*rh/d,c[2]*rw/d,c[3]*rh/d];
    it.rotation=angle;it.edited=Boolean(it.edited||oldCrop||angle);it.layout='fixed-square-v2';delete it.done;
    return true;
  }
  function quarter(c,delta){let out=c.slice();for(let k=0;k<(norm(delta)/90);k++){const [x,y,w,h]=out;out=[Math.max(0,1-y-h),x,h,w]}return out}
  function angleDelta(a,b){return ((a-b+540)%360)-180}
  function zoomScroll(anchor,screen,size,viewport){return Math.max(0,Math.min(Math.max(0,size-viewport),anchor*size-screen))}
  function axes(w,h,angle){const d=Math.hypot(w,h)*1.12,a=angle*Math.PI/180;return {co:Math.cos(a),si:Math.sin(a),hw:w/d/2,hh:h/d/2}}
  function contains(c,w,h,angle,tolerance=1e-10){const a=axes(w,h,angle),cx=c[0]+c[2]/2-.5,cy=c[1]+c[3]/2-.5;return c[2]>=0&&c[3]>=0&&Math.abs(a.co*cx+a.si*cy)+Math.abs(a.co)*c[2]/2+Math.abs(a.si)*c[3]/2<=a.hw+tolerance&&Math.abs(-a.si*cx+a.co*cy)+Math.abs(a.si)*c[2]/2+Math.abs(a.co)*c[3]/2<=a.hh+tolerance}
  function fitCrop(c,w,h,angle){const a=axes(w,h,angle),ex=Math.abs(a.co)*c[2]/2+Math.abs(a.si)*c[3]/2,ey=Math.abs(a.si)*c[2]/2+Math.abs(a.co)*c[3]/2;const scale=Math.min(1,a.hw/(ex||1e-30),a.hh/(ey||1e-30));const cw=c[2]*scale,ch=c[3]*scale,cx=c[0]+c[2]/2-.5,cy=c[1]+c[3]/2-.5;const bx=Math.max(0,a.hw-ex*scale),by=Math.max(0,a.hh-ey*scale),u=Math.max(-bx,Math.min(bx,a.co*cx+a.si*cy)),v=Math.max(-by,Math.min(by,-a.si*cx+a.co*cy));return [.5+a.co*u-a.si*v-cw/2,.5+a.si*u+a.co*v-ch/2,cw,ch]}
  function limitCrop(old,next,w,h,angle){
    const a=axes(w,h,angle);let t=1;
    // Each corresponding corner travels on a line. Clip that line against
    // the four actual image edges, instead of repeatedly searching for a fit.
    for(let i=0;i<4;i++){
      const ox=old[0]+(i%2?old[2]:0)-.5,oy=old[1]+(i>1?old[3]:0)-.5;
      const nx=next[0]+(i%2?next[2]:0)-.5,ny=next[1]+(i>1?next[3]:0)-.5;
      for(const [u,v,bound]of [[a.co*ox+a.si*oy,a.co*nx+a.si*ny,a.hw],[-a.si*ox+a.co*oy,-a.si*nx+a.co*ny,a.hh]]){
        if(v>bound&&v>u)t=Math.min(t,Math.max(0,(bound-u)/(v-u)));
        if(v<-bound&&v<u)t=Math.min(t,Math.max(0,(-bound-u)/(v-u)));
      }
    }
    return t===1?next:old.map((v,j)=>v+(next[j]-v)*t);
  }
  const snapshot=it=>({layout:it.layout,rotation:it.rotation,crop:it.crop?.slice()||null,edited:Boolean(it.edited)});
  function record(it,before){if(JSON.stringify(snapshot(it))===JSON.stringify(before))return false;it.history??={undo:[],redo:[]};it.history.undo.push(before);if(it.history.undo.length>50)it.history.undo.shift();it.history.redo=[];return true}
  function restore(it,direction){it.history??={undo:[],redo:[]};const from=it.history[direction],to=it.history[direction==='undo'?'redo':'undo'];if(!from.length)return false;to.push(snapshot(it));Object.assign(it,from.pop());return true}
  const api={norm,frame,upgrade,quarter,angleDelta,zoomScroll,contains,fitCrop,limitCrop,snapshot,record,restore};
  if(typeof module!=='undefined')module.exports=api;else root.Geometry=api;
})(globalThis);
