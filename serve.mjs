import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const root=fileURLToPath(new URL('./dist/',import.meta.url));
const url='http://127.0.0.1:4173/';
const shouldOpen=process.argv.includes('--open');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml'};

function openBrowser(){
  const command=process.platform==='win32'?'rundll32.exe':process.platform==='darwin'?'open':'xdg-open';
  const args=process.platform==='win32'?['url.dll,FileProtocolHandler',url]:[url];
  const browser=spawn(command,args,{detached:true,stdio:'ignore',windowsHide:true});
  browser.on('error',()=>console.log(`Open ${url} in your browser.`));
  browser.unref();
}

const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Potato-Club','local');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  try{
    const name=decodeURIComponent(new URL(req.url,url).pathname);
    const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
    const relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end();return;}
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end('Not found');}
});

server.on('error',async error=>{
  if(error.code==='EADDRINUSE'&&shouldOpen){
    try{
      const response=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(2000)});
      if(response.headers.get('X-Potato-Club')==='local'){openBrowser();return;}
    }catch{}
  }
  console.error(error.code==='EADDRINUSE'?'Port 4173 is already in use. Close the other server and try again.':error.message);
  process.exitCode=1;
});
server.listen(4173,'127.0.0.1',()=>{
  console.log(`Potato Club is running at ${url}\nKeep this window open while playing. Press Ctrl+C to stop.`);
  if(shouldOpen)openBrowser();
});
