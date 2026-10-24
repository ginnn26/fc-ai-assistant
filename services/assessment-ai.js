const OpenAI = require('openai');

const PROMPT_VERSION = 'fc-reflection-narrative-1';
const bilingual={type:'object',additionalProperties:false,properties:{zh:{type:'string'},en:{type:'string'}},required:['zh','en']};
const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    reflection: bilingual,
    nextStep: bilingual,
    question: bilingual
  },
  required: ['reflection', 'nextStep', 'question']
};
// Only server-curated labels and numeric self-ratings leave this service.
// No free text, contacts, identity, IP address or FC account identifier is included.
function buildNarrativeInput(report) {
  const lang = report.language;
  return {
    language: lang,
    recall: 'past two weeks',
    scores: report.scores.map(s => ({area:s.title[lang],mean:s.display,complete:s.complete})),
    relativeHighlights: report.highlighted.map(id=>report.scores.find(s=>s.id===id).title[lang]),
    selectedGoals: report.goals.map(g=>g.label[lang]),
    prominentResponses: report.topItems.map(q=>({feeling:q.title[lang],rating:q.score})),
    approvedNextSteps: report.plan.map(p=>p.text[lang]),
    allEqual: report.allEqual,
    allMinimum: report.allMinimum
  };
}
function validateNarrative(value) {
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const keys=['reflection','nextStep','question'];
  if(Object.keys(value).some(k=>!keys.includes(k)))return null;
  // No diagnoses, physiological mechanisms, medical instructions, promises, links or new numbers.
  const prohibited=/(诊断|診斷|患有|治愈|治癒|治疗|治療|停药|停藥|改药|改藥|药物|藥物|病因|疗效|療效|神经系统|神經系統|脑波|腦波|量子|能量不平衡|毒素|排毒|百分之|保證|保证|diagnos|\bcure\b|\btreat(?:ment)?\b|medicat|nervous\s+system|brainwave|quantum|energy\s+imbalance|caused\s+by|root\s+cause|detox|guarantee|https?:|www\.|[0-9%<>])/i;
  for(const key of keys){
    const v=value[key];if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['zh','en'].includes(k)))return null;
    for(const l of ['zh','en'])if(typeof v[l]!=='string'||v[l].trim().length<8||v[l].length>700||prohibited.test(v[l]))return null;
  }
  return Object.fromEntries(keys.map(k=>[k,{zh:value[k].zh.trim(),en:value[k].en.trim()}]));
}
function createNarrator({apiKey=process.env.OPENAI_API_KEY,client,model=process.env.ASSESSMENT_MODEL||'gpt-5.4-nano',maxPerHour=20,maxConcurrent=2}={}){
  const sdk=client||(apiKey?new OpenAI({apiKey,timeout:8000,maxRetries:0}):null);
  let windowStart=Date.now(),count=0,active=0;
  return {
    available:!!sdk&&process.env.ASSESSMENT_AI_ENABLED!=='false',
    async narrate(report){
      if(!sdk||process.env.ASSESSMENT_AI_ENABLED==='false'||report.status!=='complete'||report.chestFollowup)return null;
      if(Date.now()-windowStart>=3_600_000){windowStart=Date.now();count=0;}
      if(count>=maxPerHour||active>=maxConcurrent)return null;
      count++;active++;
      try{
        const result=await sdk.responses.create({
          model,store:false,max_output_tokens:1100,
          instructions:[
            'Write a brief, kind everyday-wellbeing reflection in both Simplified Chinese (zh) and natural English (en), with the same meaning.',
            'The input is an unvalidated self-report, not a clinical test. Never diagnose, identify causes, infer biological mechanisms or predict health.',
            'Use only the supplied relative highlights, goals and approved next steps. Do not treat similarly rated areas as different.',
            'Do not claim that stress causes symptoms, that the nervous system is damaged, or that energy is imbalanced.',
            'Do not recommend products, medications, treatment, a therapy schedule, frequencies, amounts of water or medical decisions.',
            'Do not promise improvement. Do not introduce facts, scores, statistics, numbers, links or citations.',
            'reflection: two short sentences observing the supplied responses. nextStep: one gentle suggestion from approvedNextSteps. question: one reflective question.',
            'Avoid clinical labels and physiological jargon. Plain text only.'
          ].join('\n'),
          input:JSON.stringify(buildNarrativeInput(report)),
          text:{format:{type:'json_schema',name:'fc_reflection',strict:true,schema}}
        },{signal:AbortSignal.timeout(9000)});
        if(result.status!=='completed')return null;
        let value;try{value=JSON.parse(result.output_text);}catch{return null;}
        const narrative=validateNarrative(value);
        return narrative?{...narrative,promptVersion:PROMPT_VERSION}:null;
      }catch{
        // Do not log payloads, provider error bodies, identifiers or personal answers.
        return null;
      }finally{active--;}
    }
  };
}
module.exports={buildNarrativeInput,validateNarrative,createNarrator};
