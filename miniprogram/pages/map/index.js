const domain = require('../../lib/domain');
const view = require('../../utils/view');
function box(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}
Page({
  data: {
    zones: domain.zones,
    positions: [{ id: 'entrance', name: '超市入口' }].concat(domain.zones),
    positionIndex: 0,
    route: null,
    target: '',
    steps: [],
    expanded: false,
    zoom: 1,
    canvasWidth: 340,
    canvasHeight: 260,
    viewportHeight: 260,
  },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.baseWidth = info.windowWidth - 32;
    this.setData({
      canvasWidth: this.baseWidth,
      canvasHeight: (this.baseWidth * 700) / 924,
      viewportHeight: (this.baseWidth * 700) / 924,
    });
    this.off = getApp().subscribe(() => this.sync());
    this.sync();
  },
  onReady() {
    this.ready = true;
    this.draw();
  },
  onShow() {
    this.sync();
  },
  onUnload() {
    if (this.off) this.off();
  },
  sync() {
    const state = getApp().globalData;
    this.setData(
      {
        positionIndex: this.data.positions.findIndex((p) => p.id === state.current),
        route: state.route,
        target: state.route ? domain.categoryLabels[state.route.stops[0]] : '',
        steps: state.route ? domain.routeInstructions(state.route.points) : [],
      },
      () => {
        if (this.ready) this.draw();
      },
    );
  },
  draw() {
    wx.createSelectorQuery()
      .in(this)
      .select('#store-map')
      .fields({ node: true, size: true })
      .exec((result) => {
        if (!result[0] || !result[0].node || !result[0].width) return;
        const canvas = result[0].node;
        const width = result[0].width;
        const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const dpr = info.pixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = ((width * 700) / 924) * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale((dpr * width) / 924, (dpr * width) / 924);
        ctx.fillStyle = '#f5f7ee';
        ctx.fillRect(0, 0, 924, 700);
        box(ctx, 16, 15, 894, 664, 18, '#f8f9f4', '#d9dfd1');
        ctx.strokeStyle = '#e8e9df';
        ctx.lineWidth = 0.7;
        for (let x = 28; x < 896; x += 28) {
          ctx.beginPath();
          ctx.moveTo(x, 28);
          ctx.lineTo(x, 666);
          ctx.stroke();
        }
        for (let y = 28; y < 667; y += 28) {
          ctx.beginPath();
          ctx.moveTo(28, y);
          ctx.lineTo(896, y);
          ctx.stroke();
        }
        const route = getApp().globalData.route;
        domain.zones.forEach((zone) => {
          const r = zone.rect;
          const active = route && route.stops.includes(zone.id);
          box(
            ctx,
            r.x * 28,
            r.y * 28,
            r.w * 28,
            r.h * 28,
            12,
            zone.tint,
            active ? zone.color : '#ffffff',
          );
          ctx.textAlign = 'center';
          ctx.fillStyle = zone.color;
          ctx.font = '20px sans-serif';
          ctx.fillText(zone.code, r.x * 28 + r.w * 14, r.y * 28 + 27);
          ctx.font = 'bold 32px sans-serif';
          ctx.fillText(zone.name, r.x * 28 + r.w * 14, r.y * 28 + 62);
          ctx.globalAlpha = 0.2;
          for (let i = 0; i < Math.floor(r.w / 2); i++)
            box(ctx, r.x * 28 + 12 + i * 51, r.y * 28 + r.h * 28 - 35, 40, 22, 4, zone.color);
          ctx.globalAlpha = 1;
        });
        domain.extraObstacles.forEach((r, index) => {
          box(ctx, r.x * 28, r.y * 28, r.w * 28, r.h * 28, 9, '#e7e9df');
          ctx.fillStyle = '#606f56';
          ctx.textAlign = 'center';
          ctx.font = '23px sans-serif';
          ctx.fillText(index ? '收银台' : '当季展示', r.x * 28 + r.w * 14, r.y * 28 + r.h * 14 + 8);
        });
        const scale = (p) => ({ x: p.x * 28 + 14, y: p.y * 28 + 14 });
        if (route && route.points.length > 1) {
          const drawLine = (color, lineWidth, dash) => {
            ctx.beginPath();
            route.points.forEach((point, index) => {
              const p = scale(point);
              index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
            });
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.setLineDash(dash);
            ctx.stroke();
          };
          drawLine('#ffffff', 12, []);
          drawLine('#315443', 6, [10, 8]);
          ctx.setLineDash([]);
          route.stops.forEach((id, index) => {
            const p = scale(domain.zones.find((z) => z.id === id).location);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
            ctx.fillStyle = '#315443';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'white';
            ctx.stroke();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText(String(index + 1), p.x, p.y + 8);
          });
        }
        const current = getApp().globalData.current;
        const p = scale(
          current === 'entrance'
            ? domain.entrance
            : domain.zones.find((z) => z.id === current).location,
        );
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#315443';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'white';
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.font = '22px sans-serif';
        ctx.fillStyle = '#526343';
        ctx.fillText('入口 / 出口', 435, 696);
      });
  },
  zoom(e) {
    const zoom = Math.max(1, Math.min(1.8, this.data.zoom + Number(e.currentTarget.dataset.delta)));
    this.setData(
      {
        zoom: Math.round(zoom * 10) / 10,
        canvasWidth: this.baseWidth * zoom,
        canvasHeight: (this.baseWidth * zoom * 700) / 924,
      },
      () => this.draw(),
    );
  },
  position(e) {
    const app = getApp();
    app.globalData.current = this.data.positions[Number(e.detail.value)].id;
    if (app.globalData.route)
      app.globalData.route = domain.buildRoute(
        app.globalData.route.stops,
        app.globalData.current === 'entrance'
          ? domain.entrance
          : domain.zones.find((z) => z.id === app.globalData.current).location,
      );
    app.notify();
  },
  async select(e) {
    try {
      await getApp().execute({ type: 'navigate', category: e.currentTarget.dataset.id });
    } catch (error) {
      view.alert(error);
    }
  },
  async plan() {
    try {
      await getApp().execute({ type: 'navigate' });
    } catch (error) {
      view.alert(error);
    }
  },
  async next() {
    try {
      view.toast(await getApp().execute({ type: 'next' }));
    } catch (error) {
      view.alert(error);
    }
  },
  toggle() {
    this.setData({ expanded: !this.data.expanded });
  },
  guide() {
    wx.switchTab({ url: '/pages/guide/index' });
  },
});
