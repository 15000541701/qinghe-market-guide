import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import { makeSeedProducts } from '../shared/catalog.ts';
import { buildMealPlan, createMealPreferences } from '../shared/meal-planner.ts';
const require=createRequire(import.meta.url);
const domain=require('../miniprogram/lib/domain.js');

const zoneCategories=domain.zones.map(zone=>({id:zone.id,name:zone.name,active:true,kind:'food'}));
const usd=products=>products.map(product=>({...product,currency:'USD'}));
async function runtime(options={}) {
  const storage=new Map(options.storage||[]);const products=makeSeedProducts();const requests=[];let app;
  globalThis.App=definition=>{app=definition;};
  globalThis.wx={getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,JSON.parse(JSON.stringify(value))),setTabBarBadge(){},removeTabBarBadge(){},showToast(){},showModal(){},
    request(request){queueMicrotask(()=>{
      const endpoint=new URL(request.url).pathname;requests.push({endpoint,timeout:request.timeout,data:request.data});
      if(options.fail){request.fail({errMsg:options.errMsg||'request:fail network'});return;}
      if(endpoint==='/api/status')request.success({statusCode:200,data:{ai:true}});
      else if(endpoint==='/api/products')request.success({statusCode:200,data:options.products||products});
      else if(endpoint==='/api/categories')request.success({statusCode:200,data:options.categories||zoneCategories});
      else if(endpoint==='/api/assistant')request.success({statusCode:200,data:options.answer||{text:'已查询',products:[products[0]],filters:{categories:['vegetables']},engine:'model'}});
      else request.success({statusCode:400,data:{error:'测试接口未配置'}});
    });}
  };
  delete require.cache[require.resolve('../miniprogram/app.js')];require('../miniprogram/app.js');app.onLaunch();
  try{await app.refresh();}catch{}
  return {app,products,storage,requests};
}
// Loads a page definition against the given app, with a setData that understands 'a.b' paths.
function loadPage(name,app){
  let definition;globalThis.getApp=()=>app;globalThis.Page=value=>{definition=value;};
  const file='../miniprogram/pages/'+name+'/index.js';delete require.cache[require.resolve(file)];require(file);
  return {...definition,data:JSON.parse(JSON.stringify(definition.data)),setData(change,callback){
    for(const [key,value] of Object.entries(change)){const parts=key.split('.');let target=this.data;
      for(const part of parts.slice(0,-1))target=target[part]=target[part]&&typeof target[part]==='object'?target[part]:{};
      target[parts.at(-1)]=value;}
    if(callback)callback();}};
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
  await assert.rejects(app.execute({type:'add',items:[{productId:'spinach',quantity:1}]}),/当前不可购买，清单未更改/);assert.deepEqual(app.globalData.cart,[]);
});
test('导购回执仅在清单操作成功后显示撤销',async()=>{
  const products=makeSeedProducts().map(p=>p.id==='spinach'?{...p,stock:0}:p);
  const {app}=await runtime({products,answer:{text:'准备加入',filters:{categories:[]},products:[],action:{type:'add',items:[{productId:'spinach',quantity:1}]}}});
  const result=await app.send('把菠菜加入清单');assert.equal(result.performed,null);assert.equal(app.globalData.messages.at(-1).receipt,false);assert.match(app.globalData.messages.at(-1).text,/当前不可购买，清单未更改/);
});
test('小程序导航可以规划路线并模拟到达',async()=>{
  const {app}=await runtime();await app.execute({type:'navigate',category:'vegetables'});assert.equal(app.globalData.route.stops[0],'vegetables');
  await app.execute({type:'next'});assert.equal(app.globalData.current,'vegetables');assert.equal(app.globalData.route,null);
});
test('服务未启动时显示可恢复的连接错误',async()=>{
  const {app}=await runtime({fail:true});assert.equal(app.globalData.connected,false);assert.equal(app.globalData.loading,false);assert.match(app.globalData.error,/连接不到/);
});

test('餐食条件被拒绝时清除旧方案，不能继续确认旧餐食',async()=>{
  const {app}=await runtime({answer:{text:'无法核实过敏原',products:[],filters:{categories:[]},engine:'rules',clearMealPlan:true}});
  app.globalData.meal={preferences:createMealPreferences(),recipeIds:['old']};
  await app.send('花生过敏');assert.equal(app.globalData.meal,null);assert.equal(app.globalData.cart.length,0);
});
test('连接错误区分超时、拒绝和域名校验，并附微信原始信息',async()=>{
  const cases=[['request:fail timeout',/超时.*设备互访.*request:fail timeout/],['request:fail errcode:-102 cronet_error_code:-102 error_msg:net::ERR_CONNECTION_REFUSED',/被拒绝.*后端已启动/],['request:fail url not in domain list',/域名未通过校验.*开发调试/]];
  for(const [errMsg,pattern] of cases){const {app}=await runtime({fail:true,errMsg});assert.match(app.globalData.error,pattern);assert.match(app.globalData.error,errMsg.includes('domain')?/微信返回/:/http:\/\/127\.0\.0\.1:3001/);}
});
test('连接设置用短超时测试，普通请求保持长超时',async()=>{
  const {app,requests}=await runtime();assert.ok(requests.every(r=>r.timeout===55000));
  requests.length=0;await app.refresh({timeout:6000});assert.equal(requests.length,3);assert.ok(requests.every(r=>r.timeout===6000));
});
test('扫码填写门店地址后自动连接，非地址二维码给出提示',async()=>{
  const {app,storage,requests}=await runtime();let page;const alerts=[];let scanned='http://192.168.173.166:3001/';
  globalThis.getApp=()=>app;globalThis.Page=definition=>{page=definition;};
  Object.assign(globalThis.wx,{scanCode:o=>o.success({result:scanned}),showModal:o=>alerts.push(o.content),showToast(){}});
  delete require.cache[require.resolve('../miniprogram/pages/settings/index.js')];require('../miniprogram/pages/settings/index.js');
  const ctx={...page,data:{...page.data},setData(d){Object.assign(this.data,d);}};
  requests.length=0;ctx.scan();await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(storage.get('qinghe-api-base'),'http://192.168.173.166:3001');assert.equal(ctx.data.base,'http://192.168.173.166:3001');
  assert.ok(requests.length===3&&requests.every(r=>r.timeout===6000));assert.equal(alerts.length,0);
  scanned='WIFI:S:Redmi;;';ctx.scan();assert.match(alerts[0],/不是门店地址/);assert.equal(storage.get('qinghe-api-base'),'http://192.168.173.166:3001');
});

test('目录币种优先美元；美元商品都已归档或售罄时改用人民币',()=>{
  const cny=makeSeedProducts();const dollars=usd(makeSeedProducts()).map(p=>({...p,id:'usd-'+p.id}));
  assert.equal(domain.catalogCurrency([...cny,...dollars]),'USD');
  assert.equal(domain.catalogCurrency([...cny,...dollars.map(p=>({...p,status:'archived'}))]),'CNY');
  assert.equal(domain.catalogCurrency([...cny,...dollars.map(p=>({...p,stock:0}))]),'CNY');
  assert.equal(domain.catalogCurrency(cny),'CNY');assert.equal(domain.catalogCurrency([]),'USD');
});
test('导购请求带上目录币种：美元目录不再按人民币查询',async()=>{
  for(const [currency,products] of [['USD',usd(makeSeedProducts())],['CNY',makeSeedProducts()]]){
    const {app,requests}=await runtime({products});assert.equal(app.globalData.currency,currency);
    await app.send('推荐便宜的蔬菜');
    const body=requests.find(r=>r.endpoint==='/api/assistant').data;assert.equal(body.currency,currency);
  }
});
test('价格符号跟随商品币种，聊天记录中的商品再次渲染不丢币种',async()=>{
  const products=usd(makeSeedProducts());const {app}=await runtime({products,categories:[{id:'vegetables',name:'新鲜蔬菜',active:true,kind:'food'}]});
  const view=require('../miniprogram/utils/view.js');const item=view.product(products[0]);
  assert.equal(item.priceSymbol,'US$');assert.equal(view.product(item).priceSymbol,'US$');
  assert.equal(view.product(makeSeedProducts()[0]).priceSymbol,'¥');
  assert.equal(item.categoryName,'新鲜蔬菜','store category names come from /api/categories');
  assert.equal(app.symbol(),'US$');
});
test('清单只合计当前目录币种，其他目录的条目可以移出并撤销',async()=>{
  const cny=makeSeedProducts();const dollars=usd(makeSeedProducts()).map(p=>({...p,id:'usd-'+p.id}));
  const cart=[{productId:'spinach',quantity:1,checked:false},{productId:'usd-spinach',quantity:1,checked:false}];
  const {app}=await runtime({products:[...cny,...dollars],storage:[['qinghe-mini-state',{version:1,cart,messages:[]}]]});
  assert.deepEqual(app.currencyCart().map(i=>i.productId),['usd-spinach']);
  const page=loadPage('cart',app);page.onLoad();
  assert.equal(page.data.symbol,'US$');assert.equal(page.data.items.length,1);assert.equal(page.data.others,1);
  const usdSpinach=dollars.find(p=>p.id==='usd-spinach');assert.equal(page.data.total,(domain.lineCents(usdSpinach,1)/100).toFixed(2));
  page.clearOthers();assert.deepEqual(app.globalData.cart.map(i=>i.productId),['usd-spinach']);
  await app.execute({type:'undo'});assert.equal(app.globalData.cart.length,2);
});
test('商品页分批显示在售商品，单次页面数据远低于 1MB 限制',async()=>{
  const base=usd(makeSeedProducts())[0];const description='Club detail text for the product page. '.repeat(30);
  const products=Array.from({length:1800},(_,i)=>({...base,id:'sku-'+i,name:'Item '+i,description,status:i%10===0?'archived':'active'}));
  const {app}=await runtime({products});const page=loadPage('products',app);page.onLoad();
  assert.equal(page.data.total,1620);assert.equal(page.data.items.length,48);assert.ok(page.data.hasMore);
  assert.ok(page.data.items.every(i=>i.priceSymbol==='US$'&&i.description.length<=60));
  page.more();assert.equal(page.data.items.length,96);
  assert.ok(Buffer.byteLength(JSON.stringify(page.data))<256*1024);
});
test('导购示例和拍照找货使用目录币种',async()=>{
  const {app}=await runtime({products:usd(makeSeedProducts())});const uploads=[];
  Object.assign(globalThis.wx,{getWindowInfo:()=>({windowHeight:700,windowWidth:375}),
    chooseMedia:o=>o.success({tempFiles:[{tempFilePath:'/tmp/item.jpg',size:1000}]}),
    uploadFile:o=>{uploads.push(o.formData);o.success({statusCode:200,data:JSON.stringify({candidates:[],notice:'请确认图片里的商品。'})});}});
  const page=loadPage('guide',app);page.onLoad();
  assert.ok(page.data.starters.every(text=>text.includes('美元')));
  await page.photo();assert.deepEqual(uploads,[{currency:'USD'}]);
});
test('简图未标注的分类明确提示，已标注的分区照常规划',async()=>{
  const chips={...makeSeedProducts()[0],id:'chips',name:'薯片',category:'snacks'};
  const {app}=await runtime({products:[...makeSeedProducts(),chips],categories:[...zoneCategories,{id:'snacks',name:'零食',active:true,kind:'food'}]});
  await assert.rejects(app.execute({type:'navigate',category:'snacks'}),/零食暂未画进小程序简图，请在网页端地图查看货架位置/);assert.equal(app.globalData.route,null);
  await app.execute({type:'add',items:[{productId:'spinach',quantity:1},{productId:'chips',quantity:1}]});
  const text=await app.execute({type:'navigate'});
  assert.deepEqual(app.globalData.route.stops,['vegetables']);assert.match(text,/零食暂未画进小程序简图/);
});
test('超市端编辑美元商品时隐藏人民币行情与建议价，新商品仍按人民币录入',async()=>{
  const {app,requests}=await runtime({products:usd(makeSeedProducts())});Object.assign(globalThis.wx,{pageScrollTo(){}});
  const page=loadPage('store',app);page.onLoad();
  assert.equal(page.data.usd,false);assert.deepEqual(page.data.baselines,['新商品 / 暂无历史']);
  assert.equal(page.data.inventory[0].priceSymbol,'US$');
  requests.length=0;page.edit({currentTarget:{dataset:{id:'spinach'}}});await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(page.data.usd,true);assert.match(page.data.sourcePrice,/^US\$\d+\.\d{2}\//);
  assert.equal(page.data.marketQuery,'');assert.equal(page.data.advice,null);
  assert.ok(!requests.some(r=>r.endpoint==='/api/pricing'));
  page.reset();assert.equal(page.data.usd,false);assert.equal(page.data.sourcePrice,'');
});
