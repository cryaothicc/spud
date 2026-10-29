(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./assets/matter.min.js'),require('./shapes.js'));else root.PotatoPhysics=factory(root.Matter,root.PotatoShapes)})(typeof globalThis!=='undefined'?globalThis:this,function(Matter,SHAPES){
  'use strict';
  const TYPES=[
    {name:'Lil’ Spud',asset:10,r:22,color:'#e3d29c',desc:'No thoughts. Just potato. Every great friendship starts somewhere.'},
    {name:'Oh, Spud!',asset:6,r:29,color:'#e6c189',desc:'A little surprised to be here. Very happy you dropped by.'},
    {name:'Sad Fry',asset:9,r:36,color:'#b5cfca',desc:'A sensitive soul. Sometimes you just need a good cry and a friend.'},
    {name:'Couch Potato',asset:4,r:43,color:'#d4c39b',desc:'Professionally horizontal. Taking doing nothing very seriously.'},
    {name:'Good Vibes',asset:7,r:51,color:'#c9d09d',desc:'Your biggest little fan. Thinks you’re doing a really good job.'},
    {name:'Lo-fi Fry',asset:8,r:60,color:'#bcc9bf',desc:'Beats to sprout and relax to. Please do not disturb the groove.'},
    {name:'Hot Potato',asset:2,r:70,color:'#e6ac80',desc:'A tiny temper. A very warm heart. Handle with a little care.'},
    {name:'Royal Flush',asset:3,r:81,color:'#d1d3c0',desc:'The throne was occupied. Some moments are best left uninterrupted.'},
    {name:'Zen Master',asset:5,r:93,color:'#b9c9a6',desc:'One with the patch. Breathe in, breathe out, become potato.'},
    {name:'Tough Tater',asset:11,r:106,color:'#d3b082',desc:'Big bat energy. Protects the whole bunch, no questions asked.'},
    {name:'Love Supreme',asset:1,r:122,color:'#e5c2a4',desc:'The biggest feeling of all. A whole patch of little moments, grown into love.'}
  ];
  // Convex pieces trace the connected opaque silhouette, preserving transparent holes.
  const GEOMETRY=TYPES.map(type=>{
    const shape=SHAPES[type.asset],scale=type.r*1.95;
    const polygons=shape.parts.map(part=>Matter.Vertices.hull(part.map(([x,y])=>({x:x*scale,y:y*scale}))));
    let area=0,cx=0,cy=0;
    for(const vertices of polygons){const a=Matter.Vertices.area(vertices),c=Matter.Vertices.centre(vertices);area+=a;cx+=c.x*a;cy+=c.y*a;}
    const center={x:cx/area,y:cy/area};
    const parts=polygons.map(poly=>poly.map(v=>({x:v.x-center.x,y:v.y-center.y})));
    const vertices=parts.flat();
    return{parts,offset:{x:-center.x,y:-center.y},bounds:{min:{x:Math.min(...vertices.map(v=>v.x)),y:Math.min(...vertices.map(v=>v.y))},max:{x:Math.max(...vertices.map(v=>v.x)),y:Math.max(...vertices.map(v=>v.y))}}};
  });
  function makeBody(tier,x,y,options={}){
    const geometry=GEOMETRY[tier];
    const parts=geometry.parts.map(vertices=>{const center=Matter.Vertices.centre(vertices);return Matter.Bodies.fromVertices(center.x,center.y,[vertices],options);});
    const body=parts.length===1?parts[0]:Matter.Body.create({...options,parts});
    // Match shared vertices so internal triangulation edges do not catch other bodies.
    if(body.parts.length>1)for(let i=1;i<body.parts.length;i++)for(let j=i+1;j<body.parts.length;j++)for(const a of body.parts[i].vertices)for(const b of body.parts[j].vertices)if(Math.hypot(a.x-b.x,a.y-b.y)<.01){a.isInternal=true;b.isInternal=true;}
    body.plugin={...body.plugin,...options.plugin,offset:geometry.offset};
    Matter.Body.setPosition(body,{x,y});
    return body;
  }
  class Patch{
    constructor(options={}){
      this.onMerge=options.onMerge||(()=>{});this.onEnd=options.onEnd||(()=>{});this.onDrop=options.onDrop||(()=>{});
      this.engine=Matter.Engine.create({enableSleeping:true,positionIterations:10,velocityIterations:8});
      this.engine.gravity.y=1.2;this.engine.gravity.scale=.001;this.deform=options.deform!==false;
      this.bodies=[];this.queue=[];this.reserved=new Set();this.time=0;this.aim=220;this.tilt=0;this.mode='classic';
      this.score=0;this.merges=0;this.energy=100;this.current=0;this.next=1;this.lastDrop=-1000;this.lastMerge=-5000;this.combo=0;this.danger=0;this.ended=false;this.paused=false;
      Matter.Composite.add(this.engine.world,[Matter.Bodies.rectangle(-25,300,70,850,{isStatic:true,friction:.45,label:'wall'}),Matter.Bodies.rectangle(465,300,70,850,{isStatic:true,friction:.45,label:'wall'}),Matter.Bodies.rectangle(220,591,500,70,{isStatic:true,friction:.6,label:'floor'})]);
      const collide=event=>{for(const pair of event.pairs){const a=pair.bodyA.parent,b=pair.bodyB.parent;if(a===b||a.plugin.tier===undefined||b.plugin.tier===undefined||a.plugin.tier!==b.plugin.tier||a.plugin.lockUntil>this.time||b.plugin.lockUntil>this.time||this.reserved.has(a.id)||this.reserved.has(b.id))continue;this.reserved.add(a.id);this.reserved.add(b.id);this.queue.push([a,b]);}};
      Matter.Events.on(this.engine,'collisionStart',collide);Matter.Events.on(this.engine,'collisionActive',collide);
      Matter.Events.on(this.engine,'collisionStart',event=>{
        const impacts=new Map();
        for(const pair of event.pairs){const a=pair.bodyA.parent,b=pair.bodyB.parent,n=pair.collision.normal;const speed=Math.abs((a.velocity.x-b.velocity.x)*n.x+(a.velocity.y-b.velocity.y)*n.y);for(const body of [a,b])if(body.plugin.tier!==undefined&&speed>(impacts.get(body)?.speed||1.2))impacts.set(body,{speed,normal:n});}
        for(const [body,{speed,normal}] of impacts){const localY=-Math.sin(body.angle)*normal.x+Math.cos(body.angle)*normal.y;const sign=Math.abs(localY)>.55?1:-1;body.plugin.springV=Math.max(-4,Math.min(4,body.plugin.springV+sign*Math.min(3,speed*.24)));}
      });
    }
    randomTier(){const n=Math.random();return n<.35?0:n<.65?1:n<.88?2:3;}
    add(tier,x,y,opts={}){
      const b=makeBody(tier,x,y,{restitution:this.mode==='bouncy'?.68:.4,friction:.27,frictionStatic:.45,frictionAir:.009,density:.0018,slop:.05,sleepThreshold:95,plugin:{tier,born:this.time,lockUntil:this.time+80,entered:false,spring:0,springV:opts.squish?3.3:0,stretch:1}});
      if(opts.angle)Matter.Body.setAngle(b,opts.angle);
      if(b.bounds.min.x<12)Matter.Body.translate(b,{x:12-b.bounds.min.x,y:0});
      if(b.bounds.max.x>428)Matter.Body.translate(b,{x:428-b.bounds.max.x,y:0});
      if(b.bounds.max.y>554)Matter.Body.translate(b,{x:0,y:554-b.bounds.max.y});
      b.plugin.entered=b.bounds.min.y>=110;
      if(opts.velocity)Matter.Body.setVelocity(b,opts.velocity);
      Matter.Composite.add(this.engine.world,b);this.bodies.push(b);return b;
    }
    reset(seed=true){for(const b of this.bodies)Matter.Composite.remove(this.engine.world,b);this.bodies=[];this.queue=[];this.reserved.clear();this.time=0;this.score=0;this.merges=0;this.energy=100;this.current=0;this.next=this.randomTier();this.lastDrop=-1000;this.lastMerge=-5000;this.combo=0;this.danger=0;this.ended=false;this.paused=false;this.tilt=0;this.aim=220;if(seed){[[2,55],[0,131],[1,205],[3,296],[0,386]].forEach(([t,x])=>this.add(t,x,548-TYPES[t].r,{angle:(Math.random()-.5)*.35}));}}
    setMode(mode){this.mode=mode==='bouncy'?'bouncy':'classic';for(const b of this.bodies){for(const part of b.parts)part.restitution=this.mode==='bouncy'?.68:.4;Matter.Sleeping.set(b,false);}}
    setAim(x){const bounds=GEOMETRY[this.current].bounds;this.aim=Math.max(15-bounds.min.x,Math.min(425-bounds.max.x,x));}
    drop(){if(this.paused||this.ended||this.time-this.lastDrop<460)return false;this.setAim(this.aim);const body=this.add(this.current,this.aim,48,{velocity:{x:0,y:.65}});this.lastDrop=this.time;this.current=this.next;this.next=this.randomTier();this.setAim(this.aim);this.onDrop(body);return true;}
    shake(){if(this.energy<30||this.paused||this.ended)return false;this.energy-=30;for(const b of this.bodies){Matter.Sleeping.set(b,false);b.plugin.springV=2.8;Matter.Body.setVelocity(b,{x:(Math.random()-.5)*8,y:-4-Math.random()*5});Matter.Body.setAngularVelocity(b,(Math.random()-.5)*.14);}return true;}
    processMerges(){for(const [a,b] of this.queue){if(!this.bodies.includes(a)||!this.bodies.includes(b))continue;const tier=a.plugin.tier;const x=(a.position.x+b.position.x)/2,y=(a.position.y+b.position.y)/2;for(const body of [a,b]){Matter.Composite.remove(this.engine.world,body);this.bodies.splice(this.bodies.indexOf(body),1);}this.combo=this.time-this.lastMerge<1650?this.combo+1:1;this.lastMerge=this.time;this.merges++;this.energy=Math.min(100,this.energy+8);const points=tier===10?5000:Math.round(10*Math.pow(1.7,tier))*Math.min(this.combo,5);this.score+=points;const nextTier=tier===10?null:tier+1;let body=null;if(nextTier!==null){body=this.add(nextTier,x,Math.min(y,554-TYPES[nextTier].r),{velocity:{x:(a.velocity.x+b.velocity.x)*.23,y:-1.1},squish:1});}this.onMerge({tier:nextTier,x,y,points,combo:this.combo,body,jackpot:tier===10});}this.queue=[];this.reserved.clear();}
    updateSpring(b,dt){
      const p=b.plugin;if(!this.deform||b.isStatic)return;
      const seconds=dt/1000;
      p.springV+=(-185*p.spring-(this.mode==='bouncy'?9:12)*p.springV)*seconds;
      p.spring=Math.max(-.14,Math.min(.2,p.spring+p.springV*seconds));
      if(Math.abs(p.spring)<.0005&&Math.abs(p.springV)<.008){p.spring=0;p.springV=0;}
      const stretch=1+p.spring,ratio=stretch/p.stretch;
      if(Math.abs(ratio-1)>.0001){const angle=b.angle;Matter.Body.setAngle(b,0);Matter.Body.scale(b,ratio,1/ratio);Matter.Body.setAngle(b,angle);p.stretch=stretch;}
    }
    step(dt=1000/60){if(this.paused||this.ended)return;this.time+=dt;this.energy=Math.min(100,this.energy+dt*.0011);this.engine.gravity.x=this.tilt*.62;for(const b of this.bodies){if(this.tilt&&b.isSleeping)Matter.Sleeping.set(b,false);this.updateSpring(b,dt);}Matter.Engine.update(this.engine,dt);this.processMerges();let unsafe=false;for(const b of this.bodies){if(b.bounds.min.y>112)b.plugin.entered=true;const aged=this.time-b.plugin.born>2200;if(aged&&b.bounds.min.y<109&&(b.plugin.entered||b.speed<1.5))unsafe=true;}this.danger=unsafe?this.danger+dt:Math.max(0,this.danger-dt*2);if(this.danger>=3200){this.ended=true;this.onEnd();}}
    snapshot(){return{version:1,score:this.score,merges:this.merges,energy:this.energy,current:this.current,next:this.next,mode:this.mode,ended:this.ended,bodies:this.bodies.map(b=>({tier:b.plugin.tier,x:b.position.x,y:b.position.y,angle:b.angle}))};}
    restore(data){if(!data||data.version!==1||data.ended||!Array.isArray(data.bodies)||data.bodies.length>150)return false;const finite=n=>typeof n==='number'&&Number.isFinite(n);if(![data.score,data.merges,data.energy,data.current,data.next].every(finite)||![data.current,data.next].every(n=>Number.isInteger(n)&&n>=0&&n<=3)||data.score<0||data.merges<0)return false;if(!data.bodies.every(b=>Number.isInteger(b.tier)&&b.tier>=0&&b.tier<TYPES.length&&[b.x,b.y,b.angle].every(finite)&&b.y>-200&&b.y<650))return false;this.reset(false);this.score=data.score;this.merges=data.merges;this.energy=Math.max(0,Math.min(100,data.energy));this.current=data.current;this.next=data.next;this.setMode(data.mode);data.bodies.forEach(b=>this.add(b.tier,b.x,b.y,{angle:b.angle}));return true;}
  }
  return{Patch,TYPES,Matter,GEOMETRY,makeBody};
});
