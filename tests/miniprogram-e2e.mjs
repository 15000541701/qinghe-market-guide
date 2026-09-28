import assert from 'node:assert/strict';
import { connectDevtools } from '../scripts/mini-devtools.mjs';

const client=await connectDevtools(process.env.MINI_WS_ENDPOINT||'ws://127.0.0.1:9420');
let snapshot;
const waitFor=async(predicate,label,timeout=20000)=>{
  const until=Date.now()+timeout;
  while(Date.now()<until){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,200));}
  throw new Error('等待超时：'+label);
};
const capture=async(name)=>{await new Promise(resolve=>setTimeout(resolve,400));await client.screenshot('.impeccable/review/mini/'+name+'.png');};
try{
  const info=await client.call('Tool.getInfo');console.log('微信基础库：',info.SDKVersion);
  await client.route('reLaunch','/pages/guide/index');
  await waitFor(()=>client.evaluate(()=>getApp().globalData.connected),'门店连接');
  await waitFor(async()=>!(await client.data()).loading,'连接状态呈现');
  assert.equal((await client.elements('.error')).length,0,'连接成功时不显示错误提示');
  snapshot=await client.evaluate(()=>{const s=getApp().globalData;if(s.busy)throw new Error('当前正在处理用户请求，请稍后测试。');return {cart:s.cart,messages:s.messages,meal:s.meal,filters:s.filters,current:s.current,route:s.route,undo:s.undo};});
  await client.evaluate(()=>{const app=getApp();app.globalData.cart=[];app.globalData.undo=[];app.globalData.current='entrance';app.globalData.route=null;app.clearConversation();});
  await capture('guide');
  await client.method('starter',{currentTarget:{dataset:{text:'两个人吃，预算50元，想吃鱼和绿叶菜，家里有葱姜'}}});
  await waitFor(()=>client.evaluate(()=>!getApp().globalData.busy),'生成采购方案',65000);
  const plan=await client.evaluate(()=>getApp().plan());assert.ok(plan&&plan.items.length>=2);assert.equal(plan.preferences.people,2);assert.equal(plan.preferences.budget,50);
  await client.route('navigateTo','/pages/meal/index');await capture('meal');
  await client.method('confirm');
  await waitFor(()=>client.evaluate(()=>!getApp().globalData.busy),'确认采购清单',65000);
  const cart=await client.evaluate(()=>getApp().globalData.cart);assert.ok(cart.length>=2);
  await client.route('switchTab','/pages/cart/index');const list=await client.data();assert.equal(list.count,cart.length);
  await waitFor(async()=>(await client.elements('.cart-item')).length===cart.length,'清单商品实际渲染');
  assert.equal((await client.elements('.empty')).length,0,'清单不为空时隐藏空状态');await capture('cart');
  await client.method('route');await client.route('switchTab','/pages/map/index');
  await waitFor(async()=>!!(await client.data()).route,'显示路线');await capture('map');
  const before=(await client.data()).canvasWidth;await client.method('zoom',{currentTarget:{dataset:{delta:0.2}}});assert.ok((await client.data()).canvasWidth>before);
  await client.method('next');assert.notEqual(await client.evaluate(()=>getApp().globalData.current),'entrance');
  await client.route('switchTab','/pages/products/index');assert.ok((await client.data()).items.length>0);await capture('products');
  const id=(await client.data()).items[0].id;
  await client.method('add',{currentTarget:{dataset:{id}}});await client.evaluate(()=>getApp().execute({type:'undo'}));
  await client.route('navigateTo','/pages/store/index');
  await client.method('edit',{currentTarget:{dataset:{id:'spinach'}}});
  await waitFor(async()=>{const s=await client.data();return !s.pricing&&!!s.advice;},'商品历史定价');
  assert.equal((await client.data()).editingId,'spinach');await capture('store');
  await client.call('App.callWxMethod',{method:'pageScrollTo',args:[{scrollTop:650,duration:0}]});await capture('store-pricing');
  await client.route('navigateTo','/pages/settings/index');assert.equal((await client.data()).connected,true);await capture('settings');
  assert.equal(client.exceptions.length,0,'小程序不应出现未处理的运行错误');
  console.log('PASS: 微信模拟器导购、采购方案、清单、导航缩放、商品操作、超市端定价、连接设置和截图。未修改商品库存。');
}finally{
  if(snapshot){await client.evaluate(saved=>{Object.assign(getApp().globalData,saved);getApp().notify();},snapshot).catch(()=>{});await client.route('switchTab','/pages/guide/index').catch(()=>{});}
  client.close();
}
