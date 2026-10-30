const assert=require('node:assert/strict');
const G=require('../geometry.js');
const close=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-10,`${a} != ${b}`));
const f=G.frame(120,80),d=Math.hypot(120,80)*1.12;
close([f[0]*d,f[1]*d,f[2]*d,f[3]*d],[(d-120)/2,(d-80)/2,120,80]);
for(const c of [f,[.12,.22,.3,.4],[0,0,1,1]]){
  let out=c;for(let i=0;i<4;i++)out=G.quarter(out,90);close(out,c);
  close(G.quarter(G.quarter(c,90),-90),c);
}
const old={rotation:90,crop:[0,0,1,.5],done:false};
assert.equal(G.upgrade(old,120,80),true);
close(old.crop,[(d-80)/2/d,(d-120)/2/d,80/d,60/d]);
assert.equal(old.edited,true);assert.equal(old.done,undefined);
const saved=JSON.stringify(old);G.upgrade(old,120,80);assert.equal(JSON.stringify(old),saved);
const fresh={rotation:0,crop:null,done:false};G.upgrade(fresh,120,80);close(fresh.crop,f);assert.equal(fresh.edited,false);
assert.equal(G.angleDelta(-179,179),2);assert.equal(G.angleDelta(179,-179),-2);
assert.equal(G.norm(-.5),359.5);assert.equal(G.norm(720),0);
// A cursor at screen x=150 over image coordinate .4 stays at x=150 after zoom.
assert.equal(G.zoomScroll(.4,150,2000,500),650);
assert.equal(.4*2000-G.zoomScroll(.4,150,2000,500),150);
// Returning to fit and zooming at either boundary never produces invalid scroll.
assert.equal(G.zoomScroll(.4,150,500,500),0);
assert.equal(G.zoomScroll(0,150,2000,500),0);
assert.equal(G.zoomScroll(1,100,2000,500),1500);
// Free rotation changes the angle only; crop coordinates remain untouched.
for(const angle of [0,.1,37.4,90,180,270,359.9]){fresh.rotation=angle;close(fresh.crop,f)}
console.log('PASS: default frame, reversible frame quarter turns, progress migration, angle wrap, fixed crop');
// Independently inverse-transform every corner to source coordinates.
function assertInside(c,w,h,angle){const d=Math.hypot(w,h)*1.12,a=angle*Math.PI/180;for(const [x,y] of [[c[0],c[1]],[c[0]+c[2],c[1]],[c[0],c[1]+c[3]],[c[0]+c[2],c[1]+c[3]]]){const u=Math.cos(a)*(x-.5)+Math.sin(a)*(y-.5),v=-Math.sin(a)*(x-.5)+Math.cos(a)*(y-.5);assert.ok(Math.abs(u)<=w/d/2+1e-9);assert.ok(Math.abs(v)<=h/d/2+1e-9)}}
for(const [w,h]of [[120,80],[80,120],[900,40],[40,900],[100,100]])for(let angle=0;angle<360;angle+=3.7){const base=G.frame(w,h),c=G.fitCrop(base,w,h,angle);assertInside(c,w,h,angle);const moved=G.fitCrop([c[0]+.7,c[1]-.6,c[2],c[3]],w,h,angle);assertInside(moved,w,h,angle);assert.ok(Math.abs(moved[2]-c[2])<1e-9);assert.ok(Math.abs(moved[3]-c[3])<1e-9);const limited=G.limitCrop(c,[0,0,1,1],w,h,angle);assertInside(limited,w,h,angle);const fresh=G.limitCrop([.5,.5,0,0],[.5,.5,.5,.5],w,h,angle);assertInside(fresh,w,h,angle)}
const a={layout:'fixed-square-v2',rotation:0,crop:f.slice(),edited:false},b={...a,crop:f.slice()};
const initial=G.snapshot(a);a.rotation=37;a.crop=G.fitCrop(f,120,80,37);a.edited=true;G.record(a,initial);const rotated=G.snapshot(a);
assert.equal(G.restore(a,'undo'),true);assert.deepEqual(G.snapshot(a),initial);
assert.equal(G.restore(a,'redo'),true);assert.deepEqual(G.snapshot(a),rotated);
const persisted=JSON.parse(JSON.stringify(a));G.restore(persisted,'undo');assert.deepEqual(G.snapshot(persisted),initial);
assert.equal(b.history,undefined);G.restore(a,'undo');const before=G.snapshot(a);a.rotation=10;G.record(a,before);assert.equal(a.history.redo.length,0);
console.log('PASS: rotated image containment across aspect ratios, constrained moves/resizes/new frames, per-image undo/redo, persisted history, redo branch reset');
