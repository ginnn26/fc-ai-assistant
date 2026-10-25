import {validDay,sameDayComparison,dailyComparison} from './core.mjs';

// Gifts are derived from existing records, never a separate balance or a clinical score.
// Every recorded day earns exactly one star regardless of symptoms or repeats.
export function journey(state,today){
 const days=[...new Set(state.checkins.filter(r=>validDay(r.day)&&r.day<=today).map(r=>r.day))].sort();
 const count=days.length,checked=days.includes(today);
 const listened=state.sessions.some(s=>s.day===today&&s.seconds>=60);
 const reflected=state.checkins.some(r=>r.day===today&&r.phase==='after');
 const milestones=[{at:1,name:'初见星光',note:'为自己留下第一份感受',kind:'sun'},
  {at:3,name:'温柔萌芽',note:'累计记录 3 天',kind:'leaf'},
  {at:7,name:'一周的陪伴',note:'累计记录 7 天',kind:'gem'},
  {at:14,name:'慢慢发光',note:'累计记录 14 天',kind:'sun'},
  {at:30,name:'自己的节奏',note:'累计记录 30 天',kind:'gem'}];
 const next=milestones.find(b=>count<b.at)||null;
 const comparison=sameDayComparison(state.checkins,today);
 const positive=comparison.filter(i=>i.change<0);
 const longer=dailyComparison(state.checkins,today,3).items.filter(i=>i.change<0);
 return{count,checked,listened,reflected,next,milestones:milestones.map(b=>({...b,earned:count>=b.at})),positive:positive.length?positive:longer};
}
