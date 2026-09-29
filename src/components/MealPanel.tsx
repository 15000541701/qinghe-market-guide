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
import type { MealPlan, PlannedRecipe } from '../../shared/types';
import { ingredientNames, defaultHomePantry } from '../../shared/recipes';
import { categoryLabels } from '../../shared/catalog';
import { productLocationLabel } from '../../shared/layout';
import { money } from '../lib';
import { amountLabel, isWeighed, packageSize } from '../../shared/shopping';

const pantryLabel: Record<string, string> = {
  oil: '食用油',
  salt: '盐',
  sugar: '糖',
  'soy-sauce': '生抽',
  'dark-soy': '老抽',
  vinegar: '醋',
  'cooking-wine': '料酒',
};

function purchaseText(item: MealPlan['items'][number]) {
  if (item.quantity <= 0) return item.purchasedQuantity ? '已购覆盖' : '原清单已覆盖';
  if (item.listedQuantity && item.additionalQuantity === 0)
    return `原清单已有 ${item.packageAmount}`;
  if (isWeighed(item.product)) return amountLabel(item.product, item.quantity);
  const size = packageSize(item.product);
  const count = Math.round(item.quantity);
  const noun =
    size.unit === 'ml' ? '瓶' : size.unit === 'piece' ? '盒' : size.unit === 'g' ? '袋' : '份';
  return `买${count}${noun}（${item.product.unit}）`;
}

function groupMeals(recipes: PlannedRecipe[]) {
  const days = new Map<number, Map<string, PlannedRecipe[]>>();
  for (const recipe of recipes) {
    const day = recipe.day || 1;
    const meal = recipe.meal || '餐食';
    if (!days.has(day)) days.set(day, new Map());
    const dayMeals = days.get(day)!;
    if (!dayMeals.has(meal)) dayMeals.set(meal, []);
    dayMeals.get(meal)!.push(recipe);
  }
  return [...days]
    .sort(([a], [b]) => a - b)
    .map(([day, meals]) => ({
      day,
      meals: [...meals].map(([meal, dishes]) => ({ meal, dishes })),
    }));
}

export default function MealPanel({
  plan,
  categoryNames,
  busy,
  onSend,
}: {
  plan: MealPlan;
  categoryNames: Record<string, string>;
  busy: boolean;
  onSend: (text: string) => void;
}) {
  const over = plan.remaining !== null && plan.remaining < 0;
  const completeBudget = plan.budgetComplete !== false;
  const canConfirm = !over && completeBudget && !plan.missing.length && plan.recipes.length > 0;
  const menus = groupMeals(plan.recipes);
  const mealCount = menus.reduce((sum, day) => sum + day.meals.length, 0);
  return (
    <section className="meal-panel" id="meal-plan" aria-label="菜谱与整单预算方案">
      <div className="panel-heading">
        <div>
          <span className="heading-icon">
            <ChefHat size={21} />
          </span>
          <h2>
            {plan.preferences.people} 人 · {plan.preferences.days} 天 · 每天{' '}
            {plan.preferences.mealsPerDay} 餐
          </h2>
        </div>
        <span className="small-tag">{mealCount} 餐 · 确认后加入清单</span>
      </div>
      <div className="meal-content">
        <div className={`meal-budget ${over ? 'over-budget' : ''}`}>
          <div>
            <span>{completeBudget ? '计划食材新增' : '本店可购部分'}</span>
            <strong>
              ¥{money(completeBudget ? (plan.newlyAddedCost ?? plan.addedCost) : plan.total)}
            </strong>
          </div>
          <div>
            <span>原购物清单</span>
            <strong>¥{money(plan.existingCost)}</strong>
          </div>
          <div>
            <span>
              {completeBudget
                ? '合并待购金额'
                : `未计价 ${plan.unpriced?.length || 0} 项 · 另有 ${Math.max(0, (plan.unresolved?.length || 0) - (plan.unpriced?.length || 0))} 项待处理`}
            </span>
            <strong>{completeBudget ? `¥${money(plan.total)}` : '预算暂无法核算'}</strong>
          </div>
          <div>
            <span>
              {plan.preferences.budget === null
                ? '未设置预算上限'
                : `预算 ¥${money(plan.preferences.budget)}`}
            </span>
            <strong>
              {plan.remaining === null
                ? completeBudget
                  ? '可继续调整'
                  : '缺价项目未计入'
                : over
                  ? `超出 ¥${money(-plan.remaining)}`
                  : `还余 ¥${money(plan.remaining)}`}
            </strong>
          </div>
        </div>

        <div className="meal-recipes">
          {menus.map(({ day, meals }) => (
            <section className="meal-day-group" key={day}>
              <h3>第 {day} 天</h3>
              {meals.map(({ meal, dishes }) => (
                <div className="meal-slot" key={`${day}-${meal}`}>
                  <h4>{meal}</h4>
                  <div className="meal-dishes">
                    {dishes.map((recipe) => (
                      <details key={recipe.id} className="recipe-detail">
                        <summary>
                          <CookingPot size={18} />
                          <span>
                            <strong>{recipe.title}</strong>
                            <small>
                              <Clock size={12} />约 {recipe.minutes} 分钟
                            </small>
                          </span>
                          <ChevronDown size={16} />
                        </summary>
                        <div className="recipe-method">
                          <p>
                            用料：
                            {recipe.ingredientAmounts
                              ?.map((item) => `${item.name} ${item.amount}`)
                              .join('、') || recipe.ingredients.join('、')}
                          </p>
                          <ol>
                            {recipe.steps.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                          <p>份量按人数估算；肉、鱼和蛋请充分加热至熟透。</p>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>

        <details className="household-pantry">
          <summary>
            家庭常备调味（可修改）
            <ChevronDown size={15} />
          </summary>
          <p>默认家中已有；切换后会在本设备保存，并按用量重新核算。</p>
          <div className="pantry-options">
            {defaultHomePantry.map((key) => {
              const available = plan.preferences.homePantry?.includes(key) ?? true;
              const name = pantryLabel[key] || ingredientNames[key] || key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`pantry-option ${available ? 'selected' : ''}`}
                  aria-pressed={available}
                  disabled={busy}
                  onClick={() => onSend(available ? `家里没有${name}` : `家里有${name}`)}
                >
                  {available ? <Check size={14} /> : <span className="pantry-empty-mark" />}
                  {name}
                </button>
              );
            })}
          </div>
        </details>

        <div className="meal-shopping-heading">
          <h3>采购计划</h3>
          <span>{plan.items.length} 种本店商品</span>
        </div>
        <div className="meal-ingredients">
          {plan.items.map((item) => {
            const unavailable = plan.unresolved?.some(
              (entry) => entry.ingredient === item.product.name && entry.status === 'out_of_stock',
            );
            return (
              <details className="meal-ingredient" key={item.product.id}>
                <summary>
                  <strong>{item.product.name}</strong>
                  <span>
                    全周需 {item.recipeAmount || item.amount}｜
                    {unavailable ? '本店库存不足' : purchaseText(item)}｜
                    {unavailable
                      ? `标价 ¥${money(item.product.price)}（未计入可购小计）`
                      : `¥${money(item.cost)}`}
                    {item.matchStatus === 'substitute' ? ' · 可替代' : ''}
                  </span>
                  <ChevronDown size={15} />
                </summary>
                <div className="meal-ingredient-detail">
                  <span>用途：{[...new Set(item.dishes)].join('、')}</span>
                  <span>
                    家中已购：
                    {item.purchasedQuantity
                      ? amountLabel(item.product, item.purchasedQuantity)
                      : '无'}
                  </span>
                  <span>
                    原清单：
                    {item.listedQuantity ? amountLabel(item.product, item.listedQuantity) : '无'}
                  </span>
                  <span>
                    采购后覆盖：
                    {item.remainingQuantity
                      ? amountLabel(item.product, item.remainingQuantity)
                      : '已覆盖'}
                  </span>
                  <span>规格与公式：{item.calculation}</span>
                  <span>
                    <MapPin size={12} />
                    {categoryNames[item.product.category] ||
                      categoryLabels[item.product.category] ||
                      item.product.category}{' '}
                    · {productLocationLabel(item.product)}
                  </span>
                </div>
              </details>
            );
          })}
          {!plan.items.length && (
            <p className="field-note">主要食材已备齐，或当前没有可采购的匹配商品。</p>
          )}
        </div>

        {!!plan.unresolved?.length && (
          <div className="unresolved-ingredients">
            <strong>本店暂无或暂不能核价</strong>
            {plan.unresolved.map((item, index) => (
              <p key={`${item.ingredient}-${index}`}>
                {item.ingredient} {item.amount} ·{' '}
                {item.status === 'out_of_stock'
                  ? '库存不足'
                  : item.status === 'unit_mismatch'
                    ? '规格单位无法换算'
                    : '本店暂无匹配商品'}
                <small>用途：{[...new Set(item.dishes)].join('、')}</small>
              </p>
            ))}
            <p>保留在食谱中，可另行购买；未计入本店可购金额，也不能据此判断是否符合预算。</p>
          </div>
        )}
        {!!plan.owned.length && (
          <details className="meal-owned">
            <summary>已购或家中已有 {plan.owned.length} 项</summary>
            <p>{plan.owned.join('、')}</p>
          </details>
        )}
        {!!plan.missing.length && (
          <div className="inline-error" role="status">
            {plan.missing.join('；')}。目前不能确认完整采购。
          </div>
        )}
        {over && (
          <p className="inline-error" role="status">
            超过整单预算 ¥{money(-plan.remaining!)}，可以换便宜一点或调整预算；目前不能一键加入。
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
            onClick={() => onSend('确认清单')}
          >
            <ShoppingBag size={16} />
            补齐购物清单
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
