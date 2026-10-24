import {VERSION,RULES,domains,questions,goals,phases,recentStates,aims,pair} from '../public/schema.mjs';
export class InputError extends Error { constructor(message,field){super(message);this.field=field;} }
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const options=(values,allowed,max,field)=>{
 if(!Array.isArray(values)||values.length>max||new Set(values).size!==values.length||values.some(x=>!allowed.includes(x))) throw new InputError('Invalid selection',field);
 return [...values];
};
const text=(value,field)=>{
 if(typeof value!=='string'||value.length>400) throw new InputError('Text must be at most 400 characters',field);
 return value.trim();
};
export function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new InputError('Invalid request','request');
 if(input.version!==VERSION)throw new InputError('Questionnaire version has changed','version');
 if(input.consent!==true)throw new InputError('Consent is required','consent');
 if(!['clear','urgent','unsure'].includes(input.safety))throw new InputError('Please complete the safety check','safety');
 if(!['zh','en'].includes(input.lang))throw new InputError('Unsupported language','lang');
 if(input.safety!=='clear')return {lang:input.lang,safety:input.safety};
 if(!input.answers||typeof input.answers!=='object'||Array.isArray(input.answers)||Object.keys(input.answers).length!==37)throw new InputError('Please answer all 37 items','answers');
 const answers={};
 for(const q of questions){const n=input.answers[q.id];if(q.id==='q9'&&own(input.answers,q.id)&&n===null){answers[q.id]=null;continue;}if(!own(input.answers,q.id)||!Number.isInteger(n)||n<1||n>10)throw new InputError('Choose an integer from 1 to 10',q.id);answers[q.id]=n;}
 const c=input.context;
 if(!c||typeof c!=='object'||Array.isArray(c))throw new InputError('Invalid context','context');
 const context={goals:options(c.goals,goals.map(x=>x.id),2,'goals'),aims:options(c.aims,aims.map(x=>x.id),3,'aims')};
 for(const [key,list] of [['phase',phases],['recentState',recentStates]]){if(c[key]!==''&&!list.some(x=>x.id===c[key]))throw new InputError('Invalid option',key);context[key]=c[key];}
 for(const key of ['other','difficulty','understand','previousSupport'])context[key]=text(c[key],key);
 if(!['none','smooth','bgm','intensive'].includes(c.preference))throw new InputError('Invalid preference','preference');
 context.preference=c.preference;
 return {lang:input.lang,safety:input.safety,answers,context};
}
const guidance={
 emotion:pair('留意最常触发情绪的时刻，先记录感受，再选择一件可做的小事。也可以和信任的人谈谈。','Notice situations that trigger feelings. Write down the experience and choose one manageable next step, or talk with someone you trust.'),
 tension:pair('给自己短暂的休息，放松肩膀，保持自然、舒适的呼吸。反复出现的心悸、胸部不适或头晕，值得请医生评估。','Take a short break, release shoulder tension and breathe comfortably. Recurring palpitations, chest discomfort or dizziness deserve medical assessment.'),
 sleep:pair('尝试稳定起床时间，留意晚间咖啡因与屏幕使用。记录睡眠情况；若持续影响白天生活，可寻求专业建议。','Try a consistent wake time and notice evening caffeine and screen use. Track your sleep; seek professional advice if difficulties persist or affect daily life.'),
 body:pair('记录不适的位置、出现时间和持续多久。持续、加重或原因不明的不适，请咨询医护人员，不用等待下次自评。','Record where discomfort occurs, when it starts and how long it lasts. Seek medical advice for persistent, worsening or unexplained symptoms.'),
 life:pair('先选一个容易维持的习惯，例如规律用餐、合适的活动与休息节奏。若身体状态影响工作或关系，可寻求实际支持。','Start with one sustainable habit, such as regular meals and a suitable balance of activity and rest. Ask for practical support when symptoms affect work or relationships.'),
 overall:pair('觉得撑了很久，不必独自承担。把目前最需要的支持具体写下来，选择一个可联系的人或专业服务。','You do not have to carry everything alone. Write down the support you need most and identify a person or professional service you can contact.')
};
const catalog={
 sleep:{id:'deep-relaxing-sleep',name:pair('深度放松睡眠','Deep Relaxing Sleep'),en:'Deep Relaxing Sleep',href:'https://frequencies-clinic.learnworlds.com/detail-deep-relaxing-sleep',tag:pair('REST · 放松与睡眠','REST · Relaxation & sleep'),reason:pair('对应你选择的睡眠方向，或本次较突出的睡眠感受，可作为休息时的聆听选择。','Matches your selected sleep goal or your sleep-related responses, as an optional listening choice while resting.')},
 emotion:{id:'be-positive',name:pair('正能量','Be Positive'),en:'Be Positive',href:'https://frequencies-clinic.learnworlds.com/detail-be-positive',tag:pair('BALANCE · 心理与情绪','BALANCE · Mind & emotion'),reason:pair('对应你想关注的情绪或日常节奏，提供一个温和的自我关怀聆听方向。','Matches your interest in emotions or everyday rhythm, offering an optional listening theme for gentle self-care.')}
};
// Conservative text check is an additional guard, never a diagnosis or a complete risk screen.
const urgentText=/(胸(?:口)?(?:痛|疼|闷)|呼吸困难|喘不过气|喘不過氣|不能呼吸|自杀|自殺|想死|不想活|伤害自己|傷害自己|chest\s+(?:pain|pressure|tight)|can[’']?t\s+breathe|cannot\s+breathe|suicid|kill\s+myself|harm\s+myself)/i;
export function createReport(raw){
 const data=validate(raw);
 const base={version:VERSION,rules:RULES,mode:'rules',language:data.lang};
 if(data.safety!=='clear')return {...base,status:'safety',reason:data.safety,scores:[],recommendations:[]};
 const combined=Object.values(data.context).filter(x=>typeof x==='string').join(' ');
 if(urgentText.test(combined))return {...base,status:'clarify-safety',scores:[],recommendations:[]};
 const scored=domains.map(d=>{
  const items=questions.filter(q=>q.number>=d.start&&q.number<=d.end);
  const valid=items.filter(q=>data.answers[q.id]!==null);
  const sum=valid.reduce((total,q)=>total+data.answers[q.id],0);
  const complete=valid.length===items.length;
  return {id:d.id,title:d.title,color:d.color,sum,count:valid.length,expectedCount:items.length,complete,mean:complete?sum/items.length:null,display:complete?(sum/items.length).toFixed(1):null,guidance:guidance[d.id]};
 });
 const completeScores=scored.filter(s=>s.complete);
 const max=Math.max(...completeScores.map(s=>Number(s.display)));
 // UI ranks displayed rounded means; ties stay ties. All equal => no singled-out area.
 const allEqual=completeScores.every(s=>Number(s.display)===max);
 const highlighted=allEqual?[]:completeScores.filter(s=>Number(s.display)===max).map(s=>s.id);
 const highest=Math.max(...Object.values(data.answers).filter(x=>x!==null));
 const entries=questions.filter(q=>data.answers[q.id]===highest).map(q=>({id:q.id,title:q.text,score:highest}));
 const topItems=highest===1?[]:entries.slice(0,4);
 const chosenGoals=data.context.goals.map(id=>goals.find(g=>g.id===id));
 const priority=[...highlighted,...data.context.goals.map(g=>g==='sleep'?'sleep':g==='body'?'body':'emotion')];
 const plan=[...new Set(priority.length?priority:['overall','life'])].slice(0,3).map(id=>({id,title:domains.find(d=>d.id===id).title,text:guidance[id]}));
 const recKeys=[];
 if(data.context.goals.includes('sleep')||highlighted.includes('sleep'))recKeys.push('sleep');
 if(data.context.goals.some(x=>['emotion','work','relationships'].includes(x))||highlighted.some(x=>['emotion','tension','life','overall'].includes(x)))recKeys.push('emotion');
 const chest=data.answers.q10>1||data.answers.q23>1;
 // Chest symptoms require medical context, not a product recommendation.
 const recommendations=chest?[]:recKeys.map(k=>catalog[k]);
 return {...base,status:'complete',scores:scored.map(({mean,...s})=>s),highlighted,allEqual,allMinimum:highest===1,topItems,moreTopItems:Math.max(0,entries.length-topItems.length),goals:chosenGoals,plan,recommendations,chestFollowup:chest,preference:data.context.preference,
  context:{...data.context},
  notice:pair('这是对你回答的整理，不是医学检查或诊断。各部分分数不能确定症状原因，也不能证明“能量不平衡”或神经系统受损。','This report organizes your answers; it is not a medical test or diagnosis. Scores cannot identify causes, establish an energy imbalance or show nervous-system damage.')};
}
