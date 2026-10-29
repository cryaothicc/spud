(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./assets/matter.min.js'));else root.PotatoPhysics=factory(root.Matter)})(typeof globalThis!=='undefined'?globalThis:this,function(Matter){
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
  class Patch{
    constructor(options={}){
      this.onMerge=options.onMerge||(()=>{});this.onEnd=options.onEnd||(()=>{});this.onDrop=options.onDrop||(()=>{});
      this.engine=Matter.Engine.create({enableSleeping:true,positionIterations:10,velocityIterations:8});
      this.engine.gravity.y=1.35;this.engine.gravity.scale=.001;
      this.bodies=[];this.queue=[];this.reserved=new Set();this.time=0;this.aim=220;this.tilt=0;this.mode='classic';
      this.score=0;this.merges=0;this.energy=100;this.current=0;this.next=1;this.lastDrop=-1000;this.lastMerge=-5000;this.combo=0;this.danger=0;this.ended=false;this.paused=false;
      Matter.Composite.add(this.engine.world,[Matter.Bodies.rectangle(-25,300,70,850,{isStatic:true,friction:.45,label:'wall'}),Matter.Bodies.rectangle(465,300,70,850,{isStatic:true,friction:.45,label:'wall'}),Matter.Bodies.rectangle(220,591,500,70,{isStatic:true,friction:.6,label:'floor'})]);
      const collide=event=>{for(const pair of event.pairs){const a=pair.bodyA,b=pair.bodyB;if(a.plugin.tier===undefined||b.plugin.tier===undefined||a.plugin.tier!==b.plugin.tier||a.plugin.lockUntil>this.time||b.plugin.lockUntil>this.time||this.reserved.has(a.id)||this.reserved.has(b.id))continue;this.reserved.add(a.id);this.reserved.add(b.id);this.queue.push([a,b]);}};
      Matter.Events.on(this.engine,'collisionStart',collide);Matter.Events.on(this.engine,'collisionActive',collide);
    }
    randomTier(){const n=Math.random();return n<.35?0:n<.65?1:n<.88?2:3;}
    add(tier,x,y,opts={}){const type=TYPES[tier];const b=Matter.Bodies.circle(Math.max(10+type.r,Math.min(430-type.r,x)),y,type.r,{restitution:this.mode==='bouncy'?.55:.19,friction:.42,frictionStatic:.65,frictionAir:.008,density:.0018,slop:.035,sleepThreshold:70,angle:opts.angle||0,plugin:{tier,born:this.time,lockUntil:this.time+160,entered:y-type.r>=110,squish:opts.squish||0}});if(opts.velocity)Matter.Body.setVelocity(b,opts.velocity);Matter.Composite.add(this.engine.world,b);this.bodies.push(b);return b;}
    reset(seed=true){for(const b of this.bodies)Matter.Composite.remove(this.engine.world,b);this.bodies=[];this.queue=[];this.reserved.clear();this.time=0;this.score=0;this.merges=0;this.energy=100;this.current=0;this.next=this.randomTier();this.lastDrop=-1000;this.lastMerge=-5000;this.combo=0;this.danger=0;this.ended=false;this.paused=false;this.tilt=0;this.aim=220;if(seed){[[2,55],[0,131],[1,205],[3,296],[0,386]].forEach(([t,x])=>this.add(t,x,548-TYPES[t].r,{angle:(Math.random()-.5)*.35}));}}
    setMode(mode){this.mode=mode==='bouncy'?'bouncy':'classic';for(const b of this.bodies){b.restitution=this.mode==='bouncy'?.55:.19;Matter.Sleeping.set(b,false);}}
    setAim(x){this.aim=Math.max(14+TYPES[this.current].r,Math.min(426-TYPES[this.current].r,x));}
    drop(){if(this.paused||this.ended||this.time-this.lastDrop<460)return false;this.setAim(this.aim);const body=this.add(this.current,this.aim,48,{velocity:{x:0,y:.65}});this.lastDrop=this.time;this.current=this.next;this.next=this.randomTier();this.onDrop(body);return true;}
    shake(){if(this.energy<30||this.paused||this.ended)return false;this.energy-=30;for(const b of this.bodies){Matter.Sleeping.set(b,false);Matter.Body.setVelocity(b,{x:(Math.random()-.5)*8,y:-4-Math.random()*5});Matter.Body.setAngularVelocity(b,(Math.random()-.5)*.14);}return true;}
    processMerges(){for(const [a,b] of this.queue){if(!this.bodies.includes(a)||!this.bodies.includes(b))continue;const tier=a.plugin.tier;const x=(a.position.x+b.position.x)/2,y=(a.position.y+b.position.y)/2;for(const body of [a,b]){Matter.Composite.remove(this.engine.world,body);this.bodies.splice(this.bodies.indexOf(body),1);}this.combo=this.time-this.lastMerge<1650?this.combo+1:1;this.lastMerge=this.time;this.merges++;this.energy=Math.min(100,this.energy+8);const points=tier===10?5000:Math.round(10*Math.pow(1.7,tier))*Math.min(this.combo,5);this.score+=points;const nextTier=tier===10?null:tier+1;let body=null;if(nextTier!==null){body=this.add(nextTier,x,Math.min(y,554-TYPES[nextTier].r),{velocity:{x:(a.velocity.x+b.velocity.x)*.23,y:-1.1},squish:1});}this.onMerge({tier:nextTier,x,y,points,combo:this.combo,body,jackpot:tier===10});}this.queue=[];this.reserved.clear();}
    step(dt=1000/60){if(this.paused||this.ended)return;this.time+=dt;this.energy=Math.min(100,this.energy+dt*.0011);this.engine.gravity.x=this.tilt*.62;if(this.tilt)for(const b of this.bodies)if(b.isSleeping)Matter.Sleeping.set(b,false);Matter.Engine.update(this.engine,dt);this.processMerges();let unsafe=false;for(const b of this.bodies){const r=TYPES[b.plugin.tier].r;b.plugin.squish*=.92;if(b.position.y-r>112)b.plugin.entered=true;const aged=this.time-b.plugin.born>2200;if(aged&&b.position.y-r<109&&(b.plugin.entered||b.speed<1.5))unsafe=true;}this.danger=unsafe?this.danger+dt:Math.max(0,this.danger-dt*2);if(this.danger>=3200){this.ended=true;this.onEnd();}}
    snapshot(){return{version:1,score:this.score,merges:this.merges,energy:this.energy,current:this.current,next:this.next,mode:this.mode,ended:this.ended,bodies:this.bodies.map(b=>({tier:b.plugin.tier,x:b.position.x,y:b.position.y,angle:b.angle}))};}
    restore(data){if(!data||data.version!==1||data.ended||!Array.isArray(data.bodies)||data.bodies.length>150)return false;const finite=n=>typeof n==='number'&&Number.isFinite(n);if(![data.score,data.merges,data.energy,data.current,data.next].every(finite)||![data.current,data.next].every(n=>Number.isInteger(n)&&n>=0&&n<=3)||data.score<0||data.merges<0)return false;if(!data.bodies.every(b=>Number.isInteger(b.tier)&&b.tier>=0&&b.tier<TYPES.length&&[b.x,b.y,b.angle].every(finite)&&b.y>-200&&b.y<650))return false;this.reset(false);this.score=data.score;this.merges=data.merges;this.energy=Math.max(0,Math.min(100,data.energy));this.current=data.current;this.next=data.next;this.setMode(data.mode);data.bodies.forEach(b=>this.add(b.tier,b.x,b.y,{angle:b.angle}));return true;}
  }
  return{Patch,TYPES,Matter};
});
