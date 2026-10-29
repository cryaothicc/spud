// Read PNG alpha only. Original character artwork is never modified.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const earcut=require('./lib/earcut.cjs');
const root=path.resolve(__dirname,'..');
function pngAlpha(file){
 const bytes=fs.readFileSync(file);let width,height,color,depth,interlace;const chunks=[];
 for(let p=8;p<bytes.length;){const n=bytes.readUInt32BE(p),type=bytes.toString('ascii',p+4,p+8),data=bytes.subarray(p+8,p+8+n);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);depth=data[8];color=data[9];interlace=data[12];}if(type==='IDAT')chunks.push(data);p+=n+12;}
 if(depth!==8||color!==6||interlace!==0)throw Error('Expected non-interlaced 8-bit RGBA PNG');
 const raw=zlib.inflateSync(Buffer.concat(chunks)),stride=width*4,pixels=Buffer.alloc(width*height*4);
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=4?pixels[i-4]:0,b=y?pixels[i-stride]:0,c=y&&x>=4?pixels[i-stride-4]:0,v=raw[y*(stride+1)+1+x];pixels[i]=(v+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;}}
 return{width,height,alpha:(x,y)=>pixels[(y*width+x)*4+3]};
}
const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
function simplify(points,eps=1.15){
 const d=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
 const rdp=p=>{if(p.length<3)return p;let far=0,idx=0;for(let i=1;i<p.length-1;i++){const dist=d(p[i],p[0],p[p.length-1]);if(dist>far){far=dist;idx=i;}}if(far<=eps)return[p[0],p[p.length-1]];return rdp(p.slice(0,idx+1)).slice(0,-1).concat(rdp(p.slice(idx)));};
 let split=1;for(let i=2;i<points.length;i++)if(Math.hypot(points[i][0]-points[0][0],points[i][1]-points[0][1])>Math.hypot(points[split][0]-points[0][0],points[split][1]-points[0][1]))split=i;
 return rdp(points.slice(0,split+1)).slice(0,-1).concat(rdp(points.slice(split).concat([points[0]])).slice(0,-1));
}
function build(file){
 const png=pngAlpha(file),long=Math.max(png.width,png.height),w=Math.round(png.width/long*80),h=Math.round(png.height/long*80),mask=new Uint8Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let sum=0,count=0;for(let py=Math.floor(y*png.height/h);py<Math.floor((y+1)*png.height/h);py++)for(let px=Math.floor(x*png.width/w);px<Math.floor((x+1)*png.width/w);px++){sum+=png.alpha(px,py);count++;}mask[y*w+x]=sum/count>90?1:0;}
 // Keep the connected character. Detached tears and tiny alpha specks are decoration.
 const visited=new Uint8Array(mask.length);let largest=[];
 for(let i=0;i<mask.length;i++){if(!mask[i]||visited[i])continue;const component=[i];visited[i]=1;for(let j=0;j<component.length;j++){const n=component[j],x=n%w,y=Math.floor(n/w);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=ny*w+nx;if(nx<0||nx>=w||ny<0||ny>=h||visited[k]||!mask[k])continue;visited[k]=1;component.push(k);}}if(component.length>largest.length)largest=component;}
 mask.fill(0);largest.forEach(i=>mask[i]=1);
 const has=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&mask[y*w+x],edges=[],out=new Map(),key=p=>p.join(',');
 const edge=(a,b)=>{const e={a,b,used:false};edges.push(e);const k=key(a);if(!out.has(k))out.set(k,[]);out.get(k).push(e);};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(has(x,y)){if(!has(x,y-1))edge([x,y],[x+1,y]);if(!has(x+1,y))edge([x+1,y],[x+1,y+1]);if(!has(x,y+1))edge([x+1,y+1],[x,y+1]);if(!has(x-1,y))edge([x,y+1],[x,y]);}
 const loops=[];for(const first of edges){if(first.used)continue;const loop=[];let e=first;for(let guard=0;guard<edges.length;guard++){e.used=true;loop.push(e.a);if(key(e.b)===key(first.a))break;const candidates=(out.get(key(e.b))||[]).filter(e=>!e.used);if(!candidates.length)throw Error('Open alpha contour');const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1];const turn=c=>{const ex=c.b[0]-c.a[0],ey=c.b[1]-c.a[1];return dx*ey-dy*ex===1?3:dx*ex+dy*ey===1?2:1;};candidates.sort((a,b)=>turn(b)-turn(a));e=candidates[0];}if(Math.abs(area(loop))>3)loops.push(simplify(loop));}
 const outer=loops.filter(l=>area(l)>0).sort((a,b)=>area(b)-area(a))[0],holes=loops.filter(l=>area(l)<-5);if(!outer)throw Error('No silhouette');
 const contours=[outer,...holes],points=[],holeStarts=[];contours.forEach((loop,i)=>{if(i)holeStarts.push(points.length);points.push(...loop);});
 const tris=earcut(points.flat(),holeStarts),polys=[];for(let i=0;i<tris.length;i+=3){const poly=tris.slice(i,i+3);if(area(poly.map(j=>points[j]))<0)poly.reverse();polys.push(poly);}
 const convex=poly=>{for(let i=0;i<poly.length;i++){const a=points[poly[i]],b=points[poly[(i+1)%poly.length]],c=points[poly[(i+2)%poly.length]];if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])<-.001)return false;}return true;};
 let changed=true;while(changed){changed=false;search:for(let a=0;a<polys.length;a++)for(let b=a+1;b<polys.length;b++){const A=polys[a],B=polys[b];for(let i=0;i<A.length;i++)for(let j=0;j<B.length;j++)if(A[i]===B[(j+1)%B.length]&&A[(i+1)%A.length]===B[j]){const merged=[];for(let k=1;k<=A.length;k++)merged.push(A[(i+k)%A.length]);for(let k=2;k<B.length;k++)merged.push(B[(j+k)%B.length]);if(convex(merged)){polys[a]=merged;polys.splice(b,1);changed=true;break search;}}}}
 const normalize=p=>[+(p[0]/w*png.width/long-png.width/long/2).toFixed(5),+(p[1]/h*png.height/long-png.height/long/2).toFixed(5)];
 const parts=polys.map(p=>p.map(i=>normalize(points[i]))),outline=contours.map(p=>p.map(normalize));
 return{width:png.width,height:png.height,parts,contours:outline};
}
const shapes={};for(let i=1;i<=11;i++){shapes[i]=build(path.join(root,`dist/assets/potato-${i}.png`));console.log(`potato-${i}: ${shapes[i].parts.length} convex parts, ${shapes[i].contours.length-1} transparent holes`);}
fs.writeFileSync(path.join(root,'dist/shapes.js'),`// Generated from original PNG alpha by scripts/build-shapes.cjs.\n(function(r){const shapes=${JSON.stringify(shapes)};if(typeof module==='object'&&module.exports)module.exports=shapes;else r.PotatoShapes=shapes;})(globalThis);\n`);
