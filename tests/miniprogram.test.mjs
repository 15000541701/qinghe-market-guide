import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import { makeSeedProducts } from '../shared/catalog.ts';
import { buildMealPlan, createMealPreferences } from '../shared/meal-planner.ts';
const require=createRequire(import.meta.url);
const domain=require('../miniprogram/lib/domain.js');

async function runtime(options={}) {
  const storage=new Map(options.storage||[]);const products=makeSeedProducts();const requests=[];let app;
  globalThis.App=definition=>{app=definition;};
  globalThis.wx={getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,JSON.parse(JSON.stringify(value))),setTabBarBadge(){},removeTabBarBadge(){},
    request(request){queueMicrotask(()=>{
      const endpoint=new URL(request.url).pathname;requests.push({endpoint,timeout:request.timeout});
      if(options.fail){request.fail({errMsg:options.errMsg||'request:fail network'});return;}
      if(endpoint==='/api/status')request.success({statusCode:200,data:{ai:true}});
      else if(endpoint==='/api/products')request.success({statusCode:200,data:options.products||products});
      else if(endpoint==='/api/assistant')request.success({statusCode:200,data:options.answer||{text:'已查询',products:[products[0]],filters:{categories:['vegetables']},engine:'model'}});
      else request.success({statusCode:400,data:{error:'测试接口未配置'}});
    });}
  };
  delete require.cache[require.resolve('../miniprogram/app.js')];require('../miniprogram/app.js');app.onLaunch();
  try{await app.refresh();}catch{}
  return {app,products,storage,requests};
}

test('小程序 AppID、打包目录及七个原生页面完整',async()=>{
  const config=JSON.parse(await readFile('project.config.json','utf8'));assert.equal(config.appid,'wx82bc6c6723a17943');assert.equal(config.miniprogramRoot,'miniprogram/');
  const app=JSON.parse(await readFile('miniprogram/app.json','utf8'));assert.equal(app.pages.length,7);
  for(const page of app.pages)for(const ext of ['js','json','wxml','wxss'])assert.ok((await stat('miniprogram/'+page+'.'+ext)).isFile());
});
test('打包后的预算与路径逻辑复用现有实现',()=>{
  const products=makeSeedProducts();const prefs={...createMealPreferences(),people:2,budget:50,wants:['fish','greens'],owned:['ginger','scallion','oil','salt']};
  assert.deepEqual(domain.buildMealPlan(prefs,products,[]),buildMealPlan(prefs,products,[]));
  const route=domain.buildRoute(['vegetables','seafood']);assert.equal(route.stops.length,2);assert.ok(route.distance>0);
});
test('小程序清单支持预计重量、持久化与撤销',async()=>{
  const {app,storage}=await runtime();await app.execute({type:'add',items:[{productId:'spinach',quantity:1.5}]});
  assert.equal(app.globalData.cart[0].quantity,1.5);assert.equal(storage.get('qinghe-mini-state').cart[0].quantity,1.5);
  await app.execute({type:'undo'});assert.equal(app.globalData.cart.length,0);
});
test('缺货时操作失败，原清单保持不变',async()=>{
  const products=makeSeedProducts().map(p=>p.id==='spinach'?{...p,stock:0}:p);const {app}=await runtime({products});
  await assert.rejects(app.execute({type:'add',items:[{productId:'spinach',quantity:1}]}),/库存/);assert.deepEqual(app.globalData.cart,[]);
});
test('导购回执仅在清单操作成功后显示撤销',async()=>{
  const products=makeSeedProducts().map(p=>p.id==='spinach'?{...p,stock:0}:p);
  const {app}=await runtime({products,answer:{text:'准备加入',filters:{categories:[]},products:[],action:{type:'add',items:[{productId:'spinach',quantity:1}]}}});
  const result=await app.send('把菠菜加入清单');assert.equal(result.performed,null);assert.equal(app.globalData.messages.at(-1).receipt,false);assert.match(app.globalData.messages.at(-1).text,/库存/);
});
test('小程序导航可以规划路线并模拟到达',async()=>{
  const {app}=await runtime();await app.execute({type:'navigate',category:'vegetables'});assert.equal(app.globalData.route.stops[0],'vegetables');
  await app.execute({type:'next'});assert.equal(app.globalData.current,'vegetables');assert.equal(app.globalData.route,null);
});
test('服务未启动时显示可恢复的连接错误',async()=>{
  const {app}=await runtime({fail:true});assert.equal(app.globalData.connected,false);assert.equal(app.globalData.loading,false);assert.match(app.globalData.error,/连接不到/);
});
test('连接错误区分超时、拒绝和域名校验，并附微信原始信息',async()=>{
  const cases=[['request:fail timeout',/超时.*设备互访.*request:fail timeout/],['request:fail errcode:-102 cronet_error_code:-102 error_msg:net::ERR_CONNECTION_REFUSED',/被拒绝.*后端已启动/],['request:fail url not in domain list',/域名未通过校验.*开发调试/]];
  for(const [errMsg,pattern] of cases){const {app}=await runtime({fail:true,errMsg});assert.match(app.globalData.error,pattern);assert.match(app.globalData.error,errMsg.includes('domain')?/微信返回/:/http:\/\/127\.0\.0\.1:3001/);}
});
test('连接设置用短超时测试，普通请求保持长超时',async()=>{
  const {app,requests}=await runtime();assert.ok(requests.every(r=>r.timeout===55000));
  requests.length=0;await app.refresh({timeout:6000});assert.equal(requests.length,2);assert.ok(requests.every(r=>r.timeout===6000));
});
test('扫码填写门店地址后自动连接，非地址二维码给出提示',async()=>{
  const {app,storage,requests}=await runtime();let page;const alerts=[];let scanned='http://192.168.173.166:3001/';
  globalThis.getApp=()=>app;globalThis.Page=definition=>{page=definition;};
  Object.assign(globalThis.wx,{scanCode:o=>o.success({result:scanned}),showModal:o=>alerts.push(o.content),showToast(){}});
  delete require.cache[require.resolve('../miniprogram/pages/settings/index.js')];require('../miniprogram/pages/settings/index.js');
  const ctx={...page,data:{...page.data},setData(d){Object.assign(this.data,d);}};
  requests.length=0;ctx.scan();await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(storage.get('qinghe-api-base'),'http://192.168.173.166:3001');assert.equal(ctx.data.base,'http://192.168.173.166:3001');
  assert.ok(requests.length===2&&requests.every(r=>r.timeout===6000));assert.equal(alerts.length,0);
  scanned='WIFI:S:Redmi;;';ctx.scan();assert.match(alerts[0],/不是门店地址/);assert.equal(storage.get('qinghe-api-base'),'http://192.168.173.166:3001');
});
