import {
  ArrowRight,
  ChefHat,
  Check,
  ChevronDown,
  Clock,
  CookingPot,
  MapPin,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import type { MealPlan } from '../../shared/types';
import { ingredientNames } from '../../shared/recipes';
import { categoryLabels } from '../../shared/catalog';
import { money } from '../lib';

export default function MealPanel({
  plan,
  busy,
  onSend,
}: {
  plan: MealPlan;
  busy: boolean;
  onSend: (text: string) => void;
}) {
  const over = plan.remaining !== null && plan.remaining < 0;
  const canConfirm = !over && !plan.missing.length && plan.recipes.length > 0;
  const pantry = plan.pendingPantry.map((key) => ingredientNames[key] || key).join('、');
  return (
    <section className="meal-panel" id="meal-plan" aria-label="菜谱与整单预算方案">
      <div className="panel-heading">
        <div>
          <span className="heading-icon">
            <ChefHat size={21} />
          </span>
          <h2>{plan.preferences.people} 人的采购方案</h2>
        </div>
        <span className="small-tag">确认后加入清单</span>
      </div>
      <div className="meal-content">
        <div className={`meal-budget ${over ? 'over-budget' : ''}`}>
          <div>
            <span>{plan.pendingPantry.length ? '待购合计 · 调味备料待确认' : '整单待购合计'}</span>
            <strong>¥{money(plan.total)}</strong>
          </div>
          <div>
            <span>
              {plan.preferences.budget === null
                ? '未设置预算上限'
                : `预算 ¥${money(plan.preferences.budget)}`}
            </span>
            <strong>
              {plan.remaining === null
                ? '可继续调整'
                : over
                  ? `超出 ¥${money(-plan.remaining)}`
                  : `还余 ¥${money(plan.remaining)}`}
            </strong>
          </div>
        </div>
        {plan.existingCost > 0 && (
          <p className="meal-cost-note">
            包含当前待购清单 ¥{money(plan.existingCost)}；补齐本方案预计增加 ¥
            {money(plan.addedCost)}，已有数量不重复加入。
          </p>
        )}
        <div className="meal-recipes">
          {plan.recipes.map((recipe) => (
            <details key={recipe.id} className="recipe-detail">
              <summary>
                <CookingPot size={19} />
                <span>
                  <strong>{recipe.title}</strong>
                  <small>
                    <Clock size={12} />
                    参考做法约 {recipe.minutes} 分钟
                  </small>
                </span>
                <ChevronDown size={16} />
              </summary>
              <div className="recipe-method">
                <p>用料：{recipe.ingredients.join('、')}</p>
                <ol>
                  {recipe.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
                <p>做法为参考，份量按人数估算；确认肉、鱼和蛋充分熟透。</p>
              </div>
            </details>
          ))}
        </div>
        <div className="meal-shopping-heading">
          <h3>需要购买</h3>
          <span>{plan.items.length} 种食材</span>
        </div>
        <div className="meal-ingredients">
          {plan.items.map((item) => (
            <div className="meal-ingredient" key={item.product.id}>
              <img src={item.product.image} alt="" />
              <div>
                <strong>{item.product.name}</strong>
                <span>
                  {item.amount} · ¥{money(item.product.price)}/{item.product.unit}
                </span>
                <small>
                  <MapPin size={11} />
                  {categoryLabels[item.product.category]} · {item.product.shelf}
                </small>
              </div>
              <strong>¥{money(item.cost)}</strong>
            </div>
          ))}
          {!plan.items.length && (
            <p className="field-note">已确认的主要食材已备齐，或当前没有可采购的匹配商品。</p>
          )}
        </div>
        {!!plan.owned.length && (
          <p className="meal-owned">
            <Check size={15} />
            <span>家中已有 / 清单已购：{plan.owned.join('、')}，不重复购买。</span>
          </p>
        )}
        {!!plan.pendingPantry.length && (
          <div className="pantry-check">
            <strong>还需确认：{pantry}</strong>
            <p>这些基础调味暂未计价。若需要购买，请说“{pantry}也要买”，我们会核对库存与预算。</p>
          </div>
        )}
        {!!plan.missing.length && (
          <div className="inline-error" role="status">
            {plan.missing.join('；')}。请换菜或调整条件后重新搭配。
          </div>
        )}
        {over && (
          <p className="inline-error" role="status">
            超过整单预算 ¥{money(-plan.remaining!)}
            。可以换便宜一点，或告诉我新的预算；目前不能一键加入。
          </p>
        )}
        <div className="meal-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => onSend('换便宜一点，保持人数和份量')}
          >
            <RefreshCw size={15} />
            换便宜一点
          </button>
          <button
            className="button primary"
            disabled={busy || !canConfirm}
            onClick={() =>
              onSend(plan.pendingPantry.length ? `${pantry}也有，确认清单` : '确认清单')
            }
          >
            <ShoppingBag size={16} />
            {plan.pendingPantry.length ? '确认备料并加入清单' : '补齐购物清单'}
          </button>
        </div>
        <button
          className="text-button meal-route"
          disabled={busy}
          onClick={() => onSend('按购物清单规划采购路线')}
        >
          按清单开始导航
          <ArrowRight size={15} />
        </button>
        <div className="meal-notes">
          {plan.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
