import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// Local WeChat automation protocol. Uses Node's built-in WebSocket; no SDK dependencies.
export async function connectDevtools(endpoint = 'ws://127.0.0.1:9420') {
  const socket = new WebSocket(endpoint);
  const pending = new Map();
  const exceptions = [];
  await new Promise((resolve,reject) => {
    const timer=setTimeout(()=>{socket.close();reject(new Error('无法连接微信自动化端口，请先打开项目并运行 cli auto。'));},15000);
    socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
    socket.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('微信自动化端口尚未开启。'));},{once:true});
  });
  socket.addEventListener('message',event=>{
    let message;try{message=JSON.parse(String(event.data));}catch{return;}
    if(message.method==='App.exceptionThrown')exceptions.push(message.params);
    const request=pending.get(message.id);if(!request)return;
    clearTimeout(request.timer);pending.delete(message.id);
    if(message.error)request.reject(new Error(request.method+'：'+(message.error.message||'微信自动化调用失败')));else request.resolve(message.result);
  });
  socket.addEventListener('close',()=>{for(const request of pending.values()){clearTimeout(request.timer);request.reject(new Error('微信自动化连接已断开'));}pending.clear();});
  const call=(method,params={},timeout=65000)=>new Promise((resolve,reject)=>{
    const id=randomUUID();const timer=setTimeout(()=>{pending.delete(id);reject(new Error('微信调用超时：'+method));},timeout);
    pending.set(id,{method,resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
  });
  return {
    call,exceptions,
    async evaluate(fn,...args){return (await call('App.callFunction',{functionDeclaration:fn.toString(),args})).result;},
    async current(){return call('App.getCurrentPage');},
    async data(){const page=await call('App.getCurrentPage');return (await call('Page.getData',{pageId:page.pageId})).data;},
    async elements(selector){const page=await call('App.getCurrentPage');return (await call('Page.getElements',{pageId:page.pageId,selector})).elements;},
    async method(method,...args){const page=await call('App.getCurrentPage');return (await call('Page.callMethod',{pageId:page.pageId,method,args})).result;},
    async route(method,url){await call('App.callWxMethod',{method,args:[{url}]});await new Promise(resolve=>setTimeout(resolve,400));return call('App.getCurrentPage');},
    async screenshot(file){const result=await call('App.captureScreenshot');await mkdir(path.dirname(file),{recursive:true});await writeFile(file,Buffer.from(result.data,'base64'));},
    close(){socket.close();},
  };
}
