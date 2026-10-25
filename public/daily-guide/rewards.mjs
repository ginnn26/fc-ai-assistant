import {dayKey,validDay,cleanScores} from './core.mjs';
import {escapeHtml} from './chart.mjs';

export const REWARD_POLICY=Object.freeze({version:'FC-CHECKIN-2026-10-v1',starts:'2026-10-26',daysPerReward:10,caps:Object.freeze({annual:30,monthly12:30,halfYear:15}),renewalGraceDays:30});
// This browser calculation is a reference only. It grants no entitlement, does
// not verify membership/payment, and must never be used as a billing balance.
export function rewardReference(state,today=dayKey(),{native=false,demo=false}={}){
 const dates=[];
 if(native&&!demo&&validDay(today))for(const r of state?.checkins||[]){
  if(!r||!validDay(r.day)||r.day<REWARD_POLICY.starts||r.day>today||!['before','after'].includes(r.phase))continue;
  try{const created=new Date(r.at);if(!Number.isFinite(created.getTime())||dayKey(created)!==r.day)continue;cleanScores(r.scores,r.phase);}catch{continue;}
  dates.push(r.day);
 }
 const days=[...new Set(dates)].sort(),count=days.length;
 return{dates:days,count,progress:count%REWARD_POLICY.daysPerReward,next:REWARD_POLICY.daysPerReward-count%REWARD_POLICY.daysPerReward,status:demo?'example':!native?'account-required':'unverified'};
}
// Only for an authorised operator after checking the native account record and
// payment history. Caller must supply verified evidence, not browser input.
export function verifiedRewardDays(dates,{tier,start,end,today}){
 if(!Object.hasOwn(REWARD_POLICY.caps,tier)||![start,end,today].every(validDay)||start>end)throw Error('Invalid verified reward period');
 const valid=[...new Set(dates)].filter(d=>validDay(d)&&d>=REWARD_POLICY.starts&&d>=start&&d<=end&&d<=today);
 return Math.min(REWARD_POLICY.caps[tier],Math.floor(valid.length/REWARD_POLICY.daysPerReward));
}
export const CLAIM_URL='https://wa.me/60192143052?text='+encodeURIComponent('你好，我想申请「打卡赚免费天数 / Check In & Earn Free Days」。请协助核对我的 FC 会员期、打卡日期和续费订单，再确认赠送天数及到期日。谢谢。');

export const TERMS=[
 ['活动名称与开始日期','Programme and start date',
  '活动名称为「打卡赚免费天数」。自 2026 年 10 月 26 日起生效，以马来西亚时间（UTC+8）计算。开始日期以前的记录不追溯赠送；原有日历、星星和徽章不受影响。',
  'The programme is “Check In & Earn Free Days”, effective from 26 October 2026, using Malaysia time (UTC+8). Earlier check-ins do not earn free days retrospectively. Existing calendar entries, stars and badges are unaffected.'],
 ['谁可以赚取免费天数','Who can earn free days',
  '适用于 FC 已付款且有效的年度、半年及标准十二期月付订阅会员。免费试用、免费账户、长期／私人方案及无固定期满日的旧客 RM99 月付方案不在本活动兑换范围内；这些顾客仍可免费打卡和收集徽章。升级付费后，仅计算生效日期起、付费会员期内的有效打卡。会员类别以 FC 实际订单为准，不能通过自行选择音疗库改变。',
  'Available to customers with a paid, active FC annual, half-year or standard twelve-instalment monthly membership. Free trials, free accounts, long-term/private plans and legacy RM99 monthly plans without a fixed term are excluded from redemption; these customers may still check in and collect badges. After a paid upgrade, only qualifying check-ins within that paid term and on or after the programme start date count. Eligibility follows the actual FC order, not a self-selected audio library.'],
 ['什么是有效打卡','A qualifying check-in',
  '在付费会员有效期内，以本人 FC 账户于当天保存至少一项感受评分，每个马来西亚日历日最多计一次。重复记录、重复设备、聆听前后两次评分均不重复加天数。补填过去日期、只打开页面、手动补记聆听时间、示例数据及仅保存在独立浏览器的记录不计入兑换。没有改善也能打卡；无需提高或降低分数、提交健康证明或达到最低聆听时长。请如实记录，不要为奖励勉强聆听。',
  'Save at least one feeling score that day in your own FC account during an eligible paid term. Each Malaysia calendar day counts once, including across devices and before/after entries. Backdated entries, page visits, manual listening-duration entries, example data and standalone browser-only records do not qualify. Improvement is not required. No particular score, health evidence or minimum listening duration is required. Record honestly and do not force yourself to listen for rewards.'],
 ['怎样累积与每期上限','Earning rate and term caps',
  '同一付费会员期内，累计 10 个有效打卡日可申请 1 天免费使用；不要求连续，漏打不会清零当期进度。年度与标准十二期月付每期最多 30 天，半年每期最多 15 天。未满 10 天的零头不跨期；达到上限后仍可打卡、看趋势及收集徽章，但不再增加该期赠送天数。免费赠送使用期不额外产生新的免费天数。',
  'Within one paid term, every 10 qualifying check-in days can earn 1 free access day. Days need not be consecutive; a missed day does not reset progress within that term. The cap is 30 days per annual or standard twelve-instalment term, and 15 days per half-year term. Remainders below 10 days do not carry into another term. After the cap, check-ins, trends and badges continue without additional free days for that term. Bonus access periods do not themselves earn further free days.'],
 ['必须续费才可兑换','Paid renewal is required',
  '免费天数是续费赠送，不是当前可用的独立订阅。须在原付费会员期满后 30 天内完成同类方案的下一期付费续订并提交兑换申请；提前续订同样可以申请。未续费、续费付款失败或逾期申请，不会自动获得延期。每期奖励只可兑换一次，不能在不同订单重复使用。停订选择不受限制；不续费则该期未兑换奖励失效。',
  'Free days are a renewal bonus, not a separate subscription available immediately. Complete a paid renewal of the same plan type and submit the claim no later than 30 days after the original paid term expires. Early renewals also qualify. No extension is applied for a missing or failed renewal or a late claim. Each term’s reward can be redeemed once and cannot be reused on another order. You remain free to discontinue; unredeemed rewards expire if you do not renew.'],
 ['赠送怎样使用','How free days are applied',
  '年度或半年会员：在核实已付费的新一期会员期末追加已确认赠送天数。标准十二期月付会员：续费首期及其余十一期仍按订单约定付款，赠送安排在新一轮十二期全部付清且正常期满之后，不抵扣 RM299 首期或任何 RM99 分期。FC 须在兑换确认中写明新到期日；如涉及自动扣费，还须核对下一轮实际扣费日期，确保赠送期间不会因另一轮扣费而失去免费意义。赠送不会由本页面自动改变付款计划，最终日期以 FC 的书面兑换确认及相应后台设置为准。',
  'Annual and half-year members: confirmed free days are added to the end of the renewed paid term. Standard twelve-instalment members: the renewal’s first payment and eleven subsequent payments remain payable under the order; bonus days follow completion and normal expiry of that fully paid renewed term. They do not offset the RM299 first payment or any RM99 instalment. FC must confirm the new expiry date in writing and, where recurring billing applies, check the actual next-cycle billing date so a new charge does not defeat the free access period. This page does not automatically change payment schedules. Dates require FC’s written redemption confirmation and matching platform settings.'],
 ['怎样申请与核实','Claiming and verification',
  '点击「申请兑换／咨询」联系 FC Admin Support。当前采用人工核实：FC 将核对本人账户、原会员期、有效打卡日期、下一期续费订单及是否已兑换，再书面确认天数、对应订单、到期日及适用扣费安排。页面进度仅作参考，不是已确认余额；自行选择方案或更改浏览器资料不会增加权益。一般在 3 个工作日内回复申请，资料不足时会说明需要补充的非健康资料。不要发送密码、验证码、完整银行卡资料或健康评分；申请只需会员账户识别资料、订单编号及打卡日期。',
  'Use “Claim / ask us” to contact FC Admin Support. Claims are currently checked manually against the account, original paid term, qualifying dates, renewal order and prior redemptions. FC then confirms the days, order, expiry and relevant billing arrangements in writing. On-page progress is a reference, not a confirmed balance; changing browser data or selecting a plan cannot grant an entitlement. FC normally replies within 3 working days and explains any missing non-health information. Do not send passwords, verification codes, full payment-card details or feeling scores. Claims need only account identification, order references and check-in dates.'],
 ['不能折现与重复使用','No cash value or duplicate use',
  '赠送仅用于同一 FC 账户、同类续订方案的音疗会员使用时间，不可提现、退款、转让、出售、抵扣欠款或换取其他产品。星星与徽章继续属于纪念奖励，本身不兑换免费天数。免费赠送天数不另行计算销售佣金。与其他赠送天数优惠不重复叠加，除非相关活动明确允许。',
  'The bonus is access time for the same FC account and renewed plan type. It cannot be cashed out, refunded, transferred, sold, used against arrears or exchanged for another product. Stars and badges remain keepsakes and are not redeemable for free days. Bonus days generate no additional sales commission. They do not stack with another free-day offer unless that offer expressly allows it.'],
 ['取消、欠款及退款','Cancellation, unpaid instalments and refunds',
  '本活动不改变原订单的价格、分期责任、取消或退款条款。付费会员因欠款暂停的日期不计入；取消或退款的续费订单不能作为兑换依据，尚未使用且与该订单关联的赠送可撤销。已完成且真实有效的其他付费会员期不因此一并被作废。依法享有的消费者权利不受本活动限制。',
  'The programme does not change the original order’s price, instalment obligations, cancellation or refund terms. Dates during suspension for non-payment do not qualify. A cancelled or refunded renewal cannot support a claim, and unused bonus access linked to it may be withdrawn. Other genuine, completed paid terms are not automatically invalidated. Statutory consumer rights are unaffected.'],
 ['记录错误、故障与争议','Errors, outages and review',
  '请在发现差异后尽快联系 FC，最好在 30 天内提出，并保留非健康的日期或订单凭据。FC 会核对原始账户记录并提供计算说明，不会仅凭页面数字拒绝或确认申请。经确认由 FC 系统故障导致的漏记可人工更正；一般补签不计奖励。涉嫌伪造或重复兑换时，FC 可暂缓相关申请并说明原因及复核方式，不会仅因评分没有改善而拒绝奖励。',
  'Contact FC promptly about discrepancies, preferably within 30 days of discovery, retaining non-health date or order evidence. FC reviews original account records and explains the calculation rather than relying solely on the on-page figure. Confirmed FC system failures may be corrected manually; ordinary backdated entries do not qualify. Suspected fabrication or duplicate claims may be held with an explanation and a route to review. Lack of improvement is never a reason to refuse a reward.'],
 ['个人资料与自主选择','Privacy and choice',
  '兑换核实只需账户、打卡日期、会员期、订单参考及兑换处理记录，不要求顾客提供评分内容，也不会为了本活动将健康评分发送给 AI。原有感受记录的保存选择与隐私说明继续适用。不参加活动不影响已购买音疗的正常使用。删除打卡记录前请先处理待核实申请，以免无法核对；已确认的兑换记录仍按适用的账户及交易资料政策保管。',
  'Verification needs account identification, check-in dates, membership periods, order references and claim-handling records, not the scores themselves. The programme does not send feeling scores to AI. Existing storage choices and privacy information continue to apply. Participation is optional and does not affect purchased audio access. Resolve a pending claim before deleting check-in records to avoid losing verification evidence; confirmed redemption records follow the applicable account and transaction-data policies.'],
 ['条款更新与联系','Changes and contact',
  'FC 如调整或结束活动，会至少提前 30 天在活动页通知；已在有效会员期按当时规则取得、可核实的权益按原规则处理，不追溯减少。中英文版本均用于帮助理解；如表述有差异，请联系 FC 取得解释，不以语言差异减少法定权利。任何活动说明均不构成医疗诊断或保证疗效。联系：页面「申请兑换／咨询」的 FC Admin Support WhatsApp 按钮。条款版本：FC-CHECKIN-2026-10-v1。',
  'FC will give at least 30 days’ notice on this page before changing or ending the programme. Verifiable entitlements earned during an eligible paid term under the then-current rules are honoured without retrospective reduction. Chinese and English versions aid understanding; contact FC about any discrepancy, without limiting statutory rights. Programme materials are not a medical diagnosis or a guarantee of results. Contact FC Admin Support using this page’s WhatsApp claim button. Terms version: FC-CHECKIN-2026-10-v1.']
];
export function termsHtml(lang='zh'){
 const en=lang==='en';return TERMS.map((s,i)=>'<section class="reward-term"><h3>'+(i+1)+'. '+escapeHtml(s[en?1:0])+'</h3><p>'+escapeHtml(s[en?3:2])+'</p></section>').join('');
}
