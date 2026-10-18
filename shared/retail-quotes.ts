export type RetailQuote = { price: number; image: string; url: string; checkedAt: string; note: string; sourceSku?: string; itemUrl?: string };
const quote = (price: number, image: string, query: string): RetailQuote => ({ price, image,
  url: `https://search.jd.com/Search?keyword=${encodeURIComponent(query)}&enc=utf-8`,
  checkedAt: '2026-10-12', note: '京东列表标示价（优惠前）；学生、会员、优惠券和活动到手价另计。' });
export const retailQuotes: Record<string, RetailQuote> = {
  'JD-1032860': quote(49.9, 'https://img10.360buyimg.com/n2/s480x480_jfs/t1/504864/36/11903/108230/6a951a6cFb422c4ec/0083320320e552f4.jpg', '蓝月亮 洗衣液'),
  'JD-100118905927': { price: 9.9, image: 'https://img10.360buyimg.com/pcpubliccms/s1440x1440_jfs/t1/238325/14/27475/77590/66f14246F9be7ff92/b5dfa363f764d1f1.png.avif', url: 'https://item.jd.com/100414501764.html', itemUrl: 'https://item.jd.com/100414501764.html', sourceSku: '100414501764', checkedAt: '2026-10-12', note: '京东同规格商品页标示价（优惠前），不采用尚未开始的活动到手价。' },
  'JD-100014512908': quote(51.9, 'https://img13.360buyimg.com/n2/s480x480_jfs/t20271010/541967/8/5076/299860/6aca0919F1475c020/09443203202d2777.jpg', '维达 抽纸'),
  'JD-100105592146': quote(9.89, 'https://img11.360buyimg.com/n2/s480x480_jfs/t1/505839/36/11849/141947/6a8e4978F6c3e1faf/0083320320fbe5ac.jpg', '维达 抽纸'),
  'JD-1190594': quote(9.9, 'https://img14.360buyimg.com/n2/s480x480_jfs/t1/504352/3/10451/179411/6a8d6ec9F68a193f2/0083320320c1013a.jpg', '维达 手帕纸 18包'),
  'JD-876744': quote(24.8, 'https://img14.360buyimg.com/n2/s480x480_jfs/t1/506628/21/15102/118480/6a96367dF38bb419f/00833203209eabac.jpg', '蓝月亮 洗衣液'),
  'JD-1131251': quote(29.9, 'https://img11.360buyimg.com/n2/s480x480_jfs/t1/506847/35/12612/134160/6a96367fF3e3edaa3/00833203206ed270.jpg', '蓝月亮 婴儿洗衣液 洋甘菊 1kg'),
  'SAM-10122567542957': quote(71.88, 'https://img12.360buyimg.com/n2/s480x480_jfs/t1/243893/7/21267/74379/67249e72F2bed67a1/e6c41d62d26ac23c.jpg.avif', "Member's Mark"),
  'JD-709682': quote(130, 'https://img12.360buyimg.com/n2/s480x480_jfs/t1/531987/25/9344/146177/6aca129fFcb8ee503/00833203201a6afb.jpg.avif', '皇家 F32 2kg'),
  'JD-715780': quote(145, 'https://img10.360buyimg.com/n2/s480x480_jfs/t1/539887/20/7457/143878/6aca12adFb6b0bcaa/0083320320d53178.jpg.avif', '皇家 I27 2kg'),
  'JD-721703': quote(170, 'https://img13.360buyimg.com/n2/s480x480_jfs/t1/543886/26/2999/153785/6aca12b8Fea90bec2/0083320320bb20cc.jpg.avif', '皇家 BS34 2kg'),
  'SAM-10118109367917': quote(51.36, 'https://img12.360buyimg.com/n2/s480x480_jfs/t1/221742/20/48359/67393/67347199F93a9079e/8322f7e0c4e74bea.jpg.avif', '山姆 低糖蛋黄酥 660g'),
  'SAM-10145236930157': quote(59.88, 'https://img12.360buyimg.com/n2/s480x480_jfs/t1/312981/39/26670/67254/689edf3cFb3030d33/3051534cc82dd3f6.jpg.avif', '山姆 黄油华夫饼 1.02kg'),
  'QH-HADAY-SOY500': { ...quote(15.5, 'https://img10.360buyimg.com/n2/s480x480_jfs/t1/444758/19/9127/73503/6a1e3a2eF5e2a369d/0083320320369707.jpg', '海天 有机生抽 500ml'), sourceSku: '100121310685', itemUrl: 'https://item.jd.com/100121310685.html' },
  'QH-HADAY-DARK500': { ...quote(19.9, 'https://img14.360buyimg.com/n2/s480x480_jfs/t1/231111/6/37411/137431/67c63634Fbef9eb11/3d98bcc460fbdec1.jpg', '海天 有机老抽 500ml'), sourceSku: '100045853544', itemUrl: 'https://item.jd.com/100045853544.html' },
  'QH-VIDA-KITCHEN108': { ...quote(6.9, 'https://img10.360buyimg.com/n2/s480x480_jfs/t20270930/537412/4/3771/252647/6abcb37dF8ac6059a/09443203200737dd.jpg', '维达 厨房用纸 108抽'), sourceSku: '100315395850', itemUrl: 'https://item.jd.com/100315395850.html' },
};
