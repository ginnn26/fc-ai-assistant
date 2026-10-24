export const METRICS = [
 {id:'pain',name:'疼痛与不适',short:'疼痛',icon:'body',color:'#b47d66',hint:'0 = 没有疼痛；10 = 非常严重'},
 {id:'sleep',name:'睡眠困扰',short:'睡眠',icon:'moon',color:'#7e86a4',hint:'回顾上一晚：0 = 睡得很好；10 = 非常不好'},
 {id:'mood',name:'情绪困扰',short:'情绪',icon:'heart',color:'#ae867a',hint:'0 = 平稳舒适；10 = 非常困扰'},
 {id:'tension',name:'紧绷与压力',short:'紧绷',icon:'leaf',color:'#78937c',hint:'0 = 很放松；10 = 非常紧绷'},
 {id:'fatigue',name:'疲倦与乏力',short:'疲倦',icon:'sun',color:'#b4945b',hint:'0 = 精力充足；10 = 非常疲倦'},
 {id:'focus',name:'专注困难',short:'专注',icon:'spark',color:'#71928c',hint:'0 = 很容易专注；10 = 非常难专注'},
];
export function dayKey(date = new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function validDay(day){try{return typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day;}catch{return false;}}
export function shiftDay(day,amount){if(!validDay(day))throw Error('日期不正确');const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);}
export function cleanScores(scores,phase){if(!scores||typeof scores!=='object'||Array.isArray(scores))throw Error('请选择至少一个感受');const out={};for(const [k,v]of Object.entries(scores)){if(!METRICS.some(m=>m.id===k)||!Number.isInteger(v)||v<0||v>10)throw Error('评分须为 0–10 的整数');if(phase==='after'&&k==='sleep')throw Error('睡眠请在次日回顾，不能用即时评分比较');out[k]=v;}if(!Object.keys(out).length)throw Error('请选择至少一个感受并评分');return out;}
export function makeCheckin({day,phase,scores,now=new Date(),id=crypto.randomUUID()}){if(!validDay(day)||day>dayKey(now)||!['before','after'].includes(phase))throw Error('记录日期或类型不正确');return{id,day,phase,scores:cleanScores(scores,phase),at:now.toISOString()};}
export function latestCheckin(records,day,phase){return records.filter(r=>r.day===day&&r.phase===phase).sort((a,b)=>a.at.localeCompare(b.at)).at(-1)||null;}
export function compareScores(first,last){return METRICS.filter(m=>Number.isInteger(first?.[m.id])&&Number.isInteger(last?.[m.id])).map(m=>({id:m.id,name:m.name,from:first[m.id],to:last[m.id],change:last[m.id]-first[m.id]}));}
export function dailyComparison(records,day,offset){const baseline=shiftDay(day,-offset);return{baseline,day,items:compareScores(latestCheckin(records,baseline,'before')?.scores,latestCheckin(records,day,'before')?.scores)};}
export function sameDayComparison(records,day){return compareScores(latestCheckin(records,day,'before')?.scores,latestCheckin(records,day,'after')?.scores).filter(m=>m.id!=='sleep');}
export function trend(records,day,days,metric){return Array.from({length:days},(_,i)=>{const date=shiftDay(day,i-days+1);return{day:date,score:latestCheckin(records,date,'before')?.scores[metric]??null};});}
export function reviewPrompts(comparison){return comparison.some(m=>m.change>=0)?['这几天的睡眠、工作量或生活安排，有没有变化？','记录的时间是否相近？不同时间的感受可能不同。','如果不适持续、加重或影响日常，请寻求专业医疗建议。']:['留意哪些日常习惯让你感觉更舒服，也继续按相近时间记录。'];}
export function validateSession(s,catalog){const track=catalog.find(t=>t.course===s.course&&t.unit===s.unit);if(!track||!validDay(s.day)||!Number.isFinite(s.seconds)||s.seconds<0||s.seconds>86400||!['manual','player'].includes(s.source))throw Error('聆听记录不正确');return{id:s.id,day:s.day,course:track.course,unit:track.unit,title:track.title,version:track.version,seconds:Math.round(s.seconds),source:s.source,at:s.at};}
// Listening duration requires BOTH advancing media and elapsed wall time. Navigation is never playback.
export class ListeningClock{
 constructor(){this.seconds=0;this.previous=null;}
 sample({wall,position,paused,seeking=false,rate=1}){if(!Number.isFinite(wall)||!Number.isFinite(position)||!Number.isFinite(rate)||rate<=0)return this.seconds;const p=this.previous;this.previous={wall,position,paused,seeking,rate};if(!p||p.paused||paused||p.seeking||seeking||rate!==p.rate)return this.seconds;const elapsed=(wall-p.wall)/1000,progress=(position-p.position)/rate;if(elapsed>0&&elapsed<=30&&progress>=0&&progress<=elapsed+1)this.seconds+=Math.min(elapsed,progress);return this.seconds;}
 reset(){this.previous=null;}
}
export function emptyState(){return{version:1,checkins:[],sessions:[],storageConsent:false};}
export function parseState(raw,catalog){try{const s=JSON.parse(raw);if(s?.version!==1||!Array.isArray(s.checkins)||!Array.isArray(s.sessions))throw Error();const checkins=s.checkins.slice(-1500).filter(r=>{try{return validDay(r.day)&&['before','after'].includes(r.phase)&&typeof r.at==='string'&&Number.isFinite(Date.parse(r.at))&&!!cleanScores(r.scores,r.phase);}catch{return false;}});const sessions=s.sessions.slice(-3000).flatMap(r=>{try{return[validateSession(r,catalog)];}catch{return[];}});return{version:1,storageConsent:s.storageConsent===true,checkins,sessions};}catch{return emptyState();}}
