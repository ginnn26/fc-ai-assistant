(function(root){
 'use strict';
 const PREFIX='FC_CHAKRA_V1:',MAX=50000;
 function findApi(w){for(let i=0;i<12&&w;i++){try{if(w.API_1484_11)return w.API_1484_11;if(w.parent===w)break;w=w.parent;}catch{break;}}return null;}
 function valid(s){return s&&s.schema===1&&s.consent===true&&Array.isArray(s.answers)&&s.answers.length===63&&s.answers.every(v=>v===null||Number.isInteger(v)&&v>=0&&v<=5)&&Array.isArray(s.concerns)&&s.concerns.length<=12&&s.concerns.every(v=>typeof v==='string'&&/^[a-z_]{1,30}$/.test(v))&&Array.isArray(s.reports)&&s.reports.length<=6&&s.reports.every(r=>Array.isArray(r.answers)&&r.answers.length===63&&r.answers.every(v=>v===null||Number.isInteger(v)&&v>=0&&v<=5)&&Array.isArray(r.concerns)&&r.concerns.length<=12&&r.concerns.every(v=>typeof v==='string'&&/^[a-z_]{1,30}$/.test(v))&&typeof r.at==='string'&&r.at.length<=40);}
 function create(api){
  if(!api||String(api.Initialize(''))!=='true')throw Error('账户保存连接未就绪，请从 FC 问卷课程重新进入。');
  let last=null,closed=false,pending=null;
  function read(){const v=String(api.GetValue('cmi.suspend_data')||'');if(api.GetLastError&&String(api.GetLastError())!=='0')throw Error('暂时无法读取账户记录，请勿关闭页面。');return v;}
  function load(){const raw=read();last=raw;if(!raw)return null;if(!raw.startsWith(PREFIX))throw Error('原记录格式不同，未覆盖任何资料。');let s;try{s=JSON.parse(raw.slice(PREFIX.length));}catch{throw Error('原记录暂时无法读取，未覆盖任何资料。');}if(!valid(s))throw Error('原记录未通过完整性检查，未覆盖任何资料。');return s;}
  function commit(payload){if(closed)throw Error('保存连接已关闭，请重新进入。');if(last===null)throw Error('请先读取账户记录。');const current=read();if(current!==last&&current!==pending)throw Error('记录已被另一个页面更新，请先导出本页报告，再重新进入。');if(payload===last&&pending===null)return true;if(String(api.SetValue('cmi.suspend_data',payload))!=='true')throw Error('FC 暂未接受记录，请保持页面并重试。');pending=payload;if(String(api.SetValue('cmi.exit','suspend'))!=='true'||String(api.Commit(''))!=='true')throw Error('FC 暂未确认提交，请保持页面并重试保存。');if(read()!==payload)throw Error('本次提交未通过回读，请先导出并重试。');last=payload;pending=null;return true;}
  return {load,save(state){if(!valid(state))throw Error('记录格式不完整，未提交。');const payload=PREFIX+JSON.stringify(state);if(payload.length>MAX)throw Error('账户记录接近容量上限，请先导出历史报告。');return commit(payload);},clear(){return commit('');},finish(){if(closed)return true;if(String(api.SetValue('cmi.exit','suspend'))!=='true'||String(api.Commit(''))!=='true'||String(api.Terminate(''))!=='true')throw Error('账户保存尚未确认结束，请稍后重试。');closed=true;return true;}};
 }
 const exports={PREFIX,MAX,valid,findApi,create};if(typeof module!=='undefined'&&module.exports)module.exports=exports;else root.FCChakraAccount=exports;
})(typeof window==='undefined'?globalThis:window);
