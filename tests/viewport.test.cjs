const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const controls=new Map();
const ctx={Geometry:require('../geometry.js'),document:{querySelector:s=>{if(!controls.has(s))controls.set(s,{content:'test'});return controls.get(s)}},window:{devicePixelRatio:1}};
vm.createContext(ctx);
const source=fs.readFileSync(__dirname+'/../app.js','utf8');
vm.runInContext(source.slice(0,source.indexOf("$('#exportEdited').onclick")),ctx);
function pane(left){const p={style:{},clientWidth:500,clientHeight:500,scrollLeft:0,scrollTop:0,getBoundingClientRect:()=>({left,top:100})};const stage={style:{width:'100%'},getBoundingClientRect:()=>({width:500*parseFloat(stage.style.width)/100,height:500*parseFloat(stage.style.width)/100,left:left-p.scrollLeft,top:100-p.scrollTop})};p.querySelector=()=>stage;return p}
const panes=[pane(0),pane(520)];ctx.row={dataset:{name:'a',zoom:100},querySelectorAll:()=>panes};
ctx.pane=panes[1];
vm.runInContext("state={folder:'test',progress:{items:{a:{crop:[.2,.2,.4,.4],rotation:12.3}}}};var before=JSON.stringify(state.progress);applyZoom(row,200,pane,[720,250])",ctx);
assert.equal(panes[1].scrollLeft,200);assert.equal(panes[1].scrollTop,150);
assert.equal(panes[0].scrollLeft,200);assert.equal(panes[0].scrollTop,150);
vm.runInContext('applyZoom(row,400,pane,[720,250])',ctx);
assert.equal(panes[1].scrollLeft,600);assert.equal(panes[1].scrollTop,450);
assert.equal(vm.runInContext('JSON.stringify(state.progress)===before',ctx),true);
vm.runInContext('applyZoom(row,100)',ctx);
assert.equal(panes[1].scrollLeft,0);assert.equal(panes[1].scrollTop,0);
assert.equal(ctx.row.dataset.zoom,100);
vm.runInContext('applyZoom(row,1200)',ctx);assert.equal(ctx.row.dataset.zoom,800);
console.log('PASS: pointer-anchored local zoom, synchronized original/editor, fit reset, zoom limit, crop and rotation unchanged');
for(const p of panes){p.dataset={};Object.defineProperty(p,'clientHeight',{get:()=>parseFloat(p.style.height)||500})}
vm.runInContext("applyZoom(row,100);item('a').rotation=0;compactViewport(row,{w:120,h:80})",ctx);
assert.ok(panes[0].clientHeight<500,'Landscape view should remove unused vertical canvas space');
assert.equal(panes[0].clientHeight,panes[1].clientHeight);
assert.ok(Math.abs(panes[1].scrollTop-(500-panes[1].clientHeight)/2)<1e-9,'Image must stay vertically centered');
const height=panes[1].clientHeight;
vm.runInContext("row.dataset.zoom=400;compactViewport(row,{w:80,h:120})",ctx);
assert.equal(panes[1].clientHeight,height,'Zoomed viewport must retain its height');
console.log('PASS: compact landscape viewport, paired heights, centered full image, stable height while zoomed');
