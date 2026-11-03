import { useEffect, useRef, useState } from 'react';
import {
  Check,
  LoaderCircle,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Square,
  X,
} from 'lucide-react';
import type { Product } from '../../shared/types';
import type { DemoBridge } from './types';
import './DemoPlayer.css';

type Stage = 'ready' | 'running' | 'paused' | 'seeking' | 'done' | 'error';
type Scene = { title: string; chapter: string; run: () => Promise<void> };
type Checkpoint = { page: unknown; product?: Product; newPrice: number; focus?: string };

export default function DemoPlayer({ bridge }: { bridge: DemoBridge }) {
  const currentBridge = useRef(bridge);
  currentBridge.current = bridge;
  const [stage, setStage] = useState<Stage>('ready');
  const [index, setIndex] = useState(-1);
  const [title, setTitle] = useState('青禾 · 功能演示');
  const [chapter, setChapter] = useState('页面总览');
  const [target, setTarget] = useState('');
  const [rect, setRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [speed, setSpeed] = useState(1);
  const [waiting, setWaiting] = useState(false);
  const [labels, setLabels] = useState<string[]>([]);
  const paused = useRef(false);
  const pace = useRef(speed);
  pace.current = speed;
  const controller = useRef<AbortController | null>(null);
  const job = useRef<Promise<void> | null>(null);
  const navigation = useRef(0);
  const checkpoints = useRef(new Map<number, Checkpoint>());
  const mounted = useRef(true);
  const dock = useRef<HTMLElement>(null);

  useEffect(() => {
    mounted.current = true;
    document.body.classList.add('presentation-page');
    return () => {
      mounted.current = false;
      controller.current?.abort();
      document.body.classList.remove('presentation-page', 'presentation-playing', 'demo-preparing');
    };
  }, []);
  useEffect(() => {
    document.body.classList.toggle(
      'presentation-playing',
      stage === 'running' || stage === 'seeking',
    );
  }, [stage]);
  useEffect(() => {
    if (!target || !['running', 'paused', 'error'].includes(stage)) {
      setRect(null);
      return;
    }
    const update = () => {
      const element = document.querySelector(target);
      if (!element) {
        setRect(null);
        return;
      }
      const bounds = element.getBoundingClientRect();
      const bottom = Math.min(
        bounds.bottom + 8,
        (dock.current?.getBoundingClientRect().top ?? window.innerHeight - 90) - 14,
      );
      const top = Math.max(82, bounds.top - 8);
      setRect(
        bottom > top && bounds.width > 0
          ? {
              left: Math.max(8, bounds.left - 8),
              top,
              width: Math.min(
                bounds.width + 16,
                window.innerWidth - Math.max(8, bounds.left - 8) - 8,
              ),
              height: bottom - top,
            }
          : null,
      );
    };
    update();
    const timer = window.setInterval(update, 60);
    return () => window.clearInterval(timer);
  }, [target, stage]);

  const start = async (destination = 0, replay = false) => {
    if (!currentBridge.current.ready || !currentBridge.current.isolated) return;
    const request = ++navigation.current;
    controller.current?.abort();
    await job.current;
    if (!mounted.current || request !== navigation.current) return;
    const runController = new AbortController();
    controller.current = runController;
    const signal = runController.signal;
    paused.current = false;
    setStage('seeking');
    setTarget('');
    setWaiting(true);
    const b = () => currentBridge.current;
    let fastForward = true;
    let lastFocus = '';
    const wait = async (duration: number) => {
      signal.throwIfAborted();
      if (fastForward) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        signal.throwIfAborted();
        return;
      }
      let left = duration;
      while (left > 0 || paused.current) {
        signal.throwIfAborted();
        const before = performance.now();
        const wasPaused = paused.current;
        await new Promise((resolve) => setTimeout(resolve, 30));
        if (!wasPaused && !paused.current) left -= (performance.now() - before) * pace.current;
      }
      signal.throwIfAborted();
    };
    const until = async (predicate: () => boolean, message: string, timeout = 15000) => {
      let elapsed = 0;
      while (!predicate()) {
        const began = performance.now();
        await wait(100);
        elapsed += Math.min(150, performance.now() - began);
        if (!predicate() && elapsed > timeout) throw new Error(message);
      }
    };
    const scrollTo = async (position: number) => {
      signal.throwIfAborted();
      if (fastForward) return;
      const from = window.scrollY;
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const to = Math.max(0, Math.min(position, max));
      const duration = Math.min(2900, 1400 + Math.abs(to - from) * 0.28);
      if (Math.abs(to - from) < 3) return;
      let elapsed = 0,
        last = performance.now();
      while (elapsed < duration) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        signal.throwIfAborted();
        const now = performance.now();
        if (!paused.current) elapsed += Math.min(64, now - last) * Math.min(1, pace.current);
        last = now;
        const progress = Math.min(1, elapsed / duration);
        const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        window.scrollTo({ top: from + (to - from) * eased, behavior: 'instant' });
      }
    };
    const focus = async (selector: string) => {
      await until(
        () => !!document.querySelector(selector)?.getClientRects().length,
        '页面尚未就绪',
      );
      if (fastForward) return;
      lastFocus = selector;
      setTarget(selector);
      const element = document.querySelector(selector)!;
      const bounds = element.getBoundingClientRect();
      const available =
        (dock.current?.getBoundingClientRect().top ?? window.innerHeight - 90) - 105;
      const top = window.scrollY + bounds.top - 92 - Math.max(0, (available - bounds.height) / 2);
      await scrollTo(top);
      await wait(800);
    };
    const type = async (text: string, write: (text: string) => void) => {
      if (fastForward) {
        write(text);
        await wait(1);
        return;
      }
      write('');
      for (let end = 1; end <= text.length; end++) {
        await wait(90);
        write(text.slice(0, end));
      }
      await wait(900);
    };
    const chat = async (text: string) => {
      await b().customer();
      await until(() => !!b().chat(), '对话面板尚未就绪');
      await focus('[data-demo="chat"]');
      await type(text, (draft) => b().chat()?.draft(draft));
      setWaiting(true);
      try {
        const response = await b().chat()!.send(text, signal);
        signal.throwIfAborted();
        if (!response) throw new Error('操作未完成');
        await wait(2200);
        return response;
      } finally {
        if (!signal.aborted) setWaiting(false);
      }
    };
    let product: Product | undefined,
      newPrice = 0;
    const chosen = () => {
      if (!product) throw new Error('没有找到可展示的牛奶商品');
      return product;
    };
    const admin = () => {
      const value = b().admin();
      if (!value) throw new Error('超市端尚未就绪');
      return value;
    };
    const scenes: Scene[] = [
      {
        chapter: '00 / 页面总览',
        title: '青禾 · 功能演示',
        run: async () => {
          await until(() => !!b().chat(), '顾客页面未准备好。');
          await scrollTo(0);
          setTarget('');
          await wait(1200);
        },
      },
      {
        chapter: '00 / 页面总览',
        title: '小禾导购',
        run: async () => {
          await focus('[data-demo="chat"]');
          await wait(1800);
        },
      },
      {
        chapter: '00 / 页面总览',
        title: '卖场地图',
        run: async () => {
          await focus('#store-floor-viewport');
          await wait(1800);
        },
      },
      {
        chapter: '00 / 页面总览',
        title: '商品目录',
        run: async () => {
          await focus('[data-demo="products"] .section-heading');
          await wait(1800);
        },
      },
      {
        chapter: '00 / 页面总览',
        title: '购物清单',
        run: async () => {
          await b().customer('list');
          await focus('[data-demo="list"]');
          await wait(1600);
        },
      },
      {
        chapter: '01 / 逛店找货',
        title: '搜索牛奶',
        run: async () => {
          await b().customer();
          await focus('[data-demo="products"] .section-heading');
          await type('牛奶', (text) => b().catalog(text));
          product = b().pickProduct();
          await wait(4500);
        },
      },
      {
        chapter: '01 / 逛店找货',
        title: '商品详情',
        run: async () => {
          await b().openDetail(chosen());
          await until(() => b().detailReady(), '商品详情读取失败，请检查服务。');
          await focus('.detail-layout');
          await wait(3500);
          b().nextPhoto();
          await wait(3500);
        },
      },
      {
        chapter: '02 / 智能导购',
        title: '说出采购需求',
        run: async () => {
          await b().closeDetail();
          b().catalog('');
          await chat('推荐20美元以内的牛奶');
          await wait(4500);
        },
      },
      {
        chapter: '02 / 智能导购',
        title: '继续追问',
        run: async () => {
          await chat('只要10美元以下的');
          await wait(4000);
          await focus('[data-demo="products"] .section-heading');
          await wait(3500);
        },
      },
      {
        chapter: '03 / 从菜谱到采购',
        title: '双人早餐',
        run: async () => {
          const response = await chat('两个人的早餐，预算不限，想吃鸡蛋三明治');
          if (!response.mealPlan) throw new Error(response.text);
          await until(() => !!b().snapshot().plan, '菜谱尚未加载。');
          await wait(2500);
        },
      },
      {
        chapter: '03 / 从菜谱到采购',
        title: '做法与用量',
        run: async () => {
          await focus('#meal-plan .meal-recipes');
          await wait(6500);
        },
      },
      {
        chapter: '03 / 从菜谱到采购',
        title: '采购数量',
        run: async () => {
          await focus('#meal-plan .meal-ingredients');
          await wait(6500);
        },
      },
      {
        chapter: '04 / 购物清单',
        title: '加入清单',
        run: async () => {
          if (!b().snapshot().plan?.canApply)
            throw new Error(
              '当前菜谱仍有缺货或规格待确认条件，不能直接加入清单。请暂停查看菜谱提示。',
            );
          await chat('确认采购清单');
          if (!b().snapshot().list.length)
            throw new Error('采购清单未加入成功，请查看对话中的提示。');
          await b().customer('list');
          await focus('[data-demo="list"]');
          await wait(5500);
        },
      },
      {
        chapter: '04 / 购物清单',
        title: '撤销加入',
        run: async () => {
          await chat('撤销上一步');
          await b().customer('list');
          await focus('[data-demo="list"]');
          await wait(3000);
          await chat('确认采购清单');
          await wait(2000);
        },
      },
      {
        chapter: '05 / 店内导航',
        title: '规划路线',
        run: async () => {
          await chat('按清单规划采购路线');
          await until(
            () => !!b().snapshot().route?.shelfStops?.length,
            '当前清单未形成可达路线，请检查商品陈列位置。',
          );
          await focus('#store-floor-viewport');
          await wait(7000);
        },
      },
      {
        chapter: '05 / 店内导航',
        title: '前往下一站',
        run: async () => {
          await focus('#store-floor-viewport');
          const route = b().snapshot().route;
          const destination = route?.shelfStops?.[0]?.position;
          if (!route || !destination) throw new Error('没有可演示的下一站。');
          const end = route.points.findIndex(
            (point) => point.x === destination.x && point.y === destination.y,
          );
          if (end < 0) throw new Error('路线中缺少取货点。');
          for (const point of route.points.slice(0, end + 1)) {
            await wait(320);
            b().point(point);
          }
          b().arrive();
          await wait(4500);
        },
      },
      {
        chapter: '06 / 超市管理总览',
        title: '超市管理',
        run: async () => {
          await b().showAdmin();
          await until(() => !!b().admin()?.ready(), '超市端尚未就绪');
          await focus('.admin-main .page-heading');
          await wait(5500);
        },
      },
      {
        chapter: '06 / 超市管理总览',
        title: '批量导入导出',
        run: async () => {
          await focus('#sku-transfer');
          await wait(7000);
        },
      },
      {
        chapter: '06 / 超市管理总览',
        title: '调整货架布局',
        run: async () => {
          await focus('#merchandising .placement-map');
          await wait(7500);
        },
      },
      {
        chapter: '06 / 超市管理总览',
        title: '分类与分区',
        run: async () => {
          admin().section('categories');
          await focus('.organization-header');
          await wait(4000);
          admin().section('sections');
          await focus('#organization-sections');
          await wait(4500);
        },
      },
      {
        chapter: '06 / 超市管理总览',
        title: '新增货架',
        run: async () => {
          admin().section('facilities');
          await until(
            () => !!document.querySelector('#organization-facilities .management-create'),
            '货架表单尚未就绪',
          );
          document.querySelector<HTMLDetailsElement>(
            '#organization-facilities .management-create',
          )!.open = true;
          await focus('#organization-facilities .facility-create');
          await wait(6500);
        },
      },
      {
        chapter: '06 / 超市管理总览',
        title: '编辑货架',
        run: async () => {
          const details = document.querySelector<HTMLDetailsElement>(
            '#organization-facilities .facility-item',
          );
          if (details) details.open = true;
          await focus('#organization-facilities .facility-item');
          await wait(6500);
        },
      },
      {
        chapter: '06 / 超市管理',
        title: '查询库存',
        run: async () => {
          await b().showAdmin();
          await until(() => !!b().admin()?.ready(), '超市管理数据未准备好。');
          await focus('[data-demo="inventory"] .section-heading');
          await type('牛奶', (text) => admin().search(text));
          await wait(4500);
        },
      },
      {
        chapter: '06 / 超市管理',
        title: '修改售价',
        run: async () => {
          admin().edit(chosen().id);
          await focus('[data-demo="admin-form"] .intake-panel');
          await wait(2500);
          await focus('.final-pricing');
          newPrice = Math.round((chosen().price + 1) * 100) / 100;
          // The input is numeric; write valid numeric prefixes while visibly typing.
          const value = newPrice.toFixed(2);
          await type(value, (text) => admin().price(text));
          await wait(2500);
          setWaiting(true);
          const saved = await admin().save();
          setWaiting(false);
          if (!saved || saved.price !== newPrice)
            throw new Error('商品保存未成功，请查看表单错误。');
          await focus('[data-demo="inventory"] .section-heading');
          await wait(3000);
        },
      },
      {
        chapter: '06 / 超市管理',
        title: '查看新价格',
        run: async () => {
          const updated = b()
            .snapshot()
            .products.find((item) => item.id === chosen().id);
          if (!updated || updated.price !== newPrice)
            throw new Error('顾客数据尚未同步，请检查本地服务。');
          await b().customer();
          await b().openDetail(updated);
          await until(() => b().detailReady(), '商品详情未更新。');
          await focus('.detail-price-block');
          await wait(5000);
        },
      },
      {
        chapter: '07 / 陈列工作台',
        title: '定位商品',
        run: async () => {
          await b().closeDetail();
          await b().showAdmin();
          await until(() => !!b().admin()?.ready(), '陈列管理未准备好。');
          admin().selectShelf(chosen().id);
          await focus('#merchandising .merch-rack-target');
          await wait(5000);
        },
      },
      {
        chapter: '07 / 陈列工作台',
        title: '陈列与撤销',
        run: async () => {
          setWaiting(true);
          const moved = await admin().unplace(chosen().id);
          setWaiting(false);
          if (!moved) throw new Error('陈列移动失败');
          await wait(3500);
          setWaiting(true);
          const restored = await admin().undoPlacement();
          setWaiting(false);
          if (!restored) throw new Error('陈列撤销失败');
          admin().selectShelf(chosen().id);
          await wait(4500);
        },
      },
      {
        chapter: '展示完成',
        title: '演示完成',
        run: async () => {
          await b().customer('list');
          await focus('[data-demo="list"]');
          await wait(3500);
        },
      },
    ];
    setLabels(scenes.map((scene) => scene.title));
    const promise = (async () => {
      try {
        document.body.classList.add('demo-preparing');
        let first = 0;
        if (replay || !checkpoints.current.size) {
          checkpoints.current.clear();
          await b().reset(signal);
          await wait(1);
          checkpoints.current.set(0, { page: await b().capture(), newPrice: 0 });
        } else {
          // A completed scene can be shown immediately from its result. Do not
          // repeat a model call, a price change, or a placement write on seek.
          first = checkpoints.current.has(destination + 1)
            ? destination + 1
            : Math.max(
                ...[...checkpoints.current.keys()].filter((number) => number <= destination),
              );
          const saved = checkpoints.current.get(first)!;
          product = saved.product;
          newPrice = saved.newPrice;
          await b().restore(saved.page, signal);
          if (first === destination + 1) {
            fastForward = false;
            document.body.classList.remove('demo-preparing');
            setStage(paused.current ? 'paused' : 'running');
            setWaiting(false);
            setIndex(destination);
            setChapter(scenes[destination].chapter);
            setTitle(scenes[destination].title);
            if (saved.focus) await focus(saved.focus);
            else await scrollTo(0);
            await wait(6000);
          }
        }
        for (let number = first; number < scenes.length; number++) {
          signal.throwIfAborted();
          fastForward = number < destination;
          if (!fastForward) {
            document.body.classList.remove('demo-preparing');
            setStage(paused.current ? 'paused' : 'running');
            setWaiting(false);
            setIndex(number);
            setChapter(scenes[number].chapter);
            setTitle(scenes[number].title);
          }
          await wait(1);
          await scenes[number].run();
          signal.throwIfAborted();
          checkpoints.current.set(number + 1, {
            page: await b().capture(),
            product,
            newPrice,
            focus: lastFocus,
          });
        }
        setStage('done');
        setTarget('');
      } catch (error) {
        if (!signal.aborted && mounted.current) {
          setStage('error');
          setTitle(error instanceof Error ? error.message : '演示中断');
        }
      } finally {
        if (controller.current === runController && mounted.current) {
          setWaiting(false);
          document.body.classList.remove('demo-preparing');
        }
      }
    })();
    job.current = promise;
    await promise;
  };

  useEffect(() => {
    if (
      !bridge.ready ||
      !bridge.isolated ||
      new URLSearchParams(window.location.search).get('autoplay') !== '1'
    )
      return;
    const timer = setTimeout(() => {
      if (!controller.current) void start();
    }, 1200);
    return () => clearTimeout(timer);
  }, [bridge.ready, bridge.isolated]);
  const togglePause = () => {
    paused.current = !paused.current;
    setStage(paused.current ? 'paused' : 'running');
  };
  const stop = () => {
    ++navigation.current;
    controller.current?.abort();
    paused.current = false;
    setStage('ready');
    setTarget('');
    setWaiting(false);
    setTitle('已停止');
    document.body.classList.remove('demo-preparing');
  };
  const playing = stage === 'running' || stage === 'paused' || stage === 'seeking';
  return (
    <>
      {rect && (
        <div className="demo-spotlight" style={rect} aria-hidden="true">
          <span className="demo-pointer">
            <MousePointer2 size={24} fill="currentColor" />
          </span>
        </div>
      )}
      <aside ref={dock} className={`demo-player demo-${stage}`} aria-label="自动演示控制台">
        <nav className="demo-progress" aria-label="跳转演示步骤">
          {labels.map((label, number) => (
            <button
              key={number}
              type="button"
              className={`${number < index ? 'visited' : ''} ${number === index ? 'current' : ''}`}
              title={`${number + 1}. ${label}`}
              aria-label={`跳转到第${number + 1}步：${label}`}
              aria-current={number === index ? 'step' : undefined}
              onClick={() => {
                void start(number);
              }}
            >
              <i />
            </button>
          ))}
        </nav>
        <div className="demo-player-body">
          <div className="demo-scene-index">
            {stage === 'done' ? (
              <Check size={20} />
            ) : (
              String(Math.max(1, index + 1)).padStart(2, '0')
            )}
            <small>/ {labels.length || '—'}</small>
          </div>
          <div className="demo-narration" aria-live="polite">
            <span className="demo-eyebrow">{chapter}</span>
            <h2>{stage === 'seeking' ? '准备当前步骤…' : title}</h2>
          </div>
          <div className="demo-controls">
            {playing ? (
              <>
                <button
                  className="demo-primary"
                  onClick={togglePause}
                  disabled={stage === 'seeking'}
                  title={stage === 'paused' ? '继续演示' : '暂停演示'}
                >
                  {waiting || stage === 'seeking' ? (
                    <LoaderCircle size={15} className="demo-spinning" />
                  ) : stage === 'paused' ? (
                    <Play size={15} />
                  ) : (
                    <Pause size={15} />
                  )}
                  {stage === 'paused' ? '继续' : '暂停'}
                </button>
                <button onClick={stop} title="停止" aria-label="停止演示">
                  <Square size={14} />
                </button>
              </>
            ) : (
              <button
                className="demo-primary"
                disabled={!bridge.ready || !bridge.isolated}
                onClick={() => {
                  void start(0, true);
                }}
              >
                {stage === 'ready' ? <Play size={15} /> : <RotateCcw size={15} />}
                {stage === 'ready' ? '开始' : '重播'}
              </button>
            )}
            <select
              aria-label="演示速度"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
            >
              <option value={0.75}>0.75×</option>
              <option value={1}>1×</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2×</option>
            </select>
            <a
              href="/"
              title="退出演示"
              aria-label="退出演示"
              onClick={() => controller.current?.abort()}
            >
              <X size={15} />
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
