/* Select one complete presentation before loading the questionnaire. */
(function(){
 'use strict';
 function language(){
  let w=window;for(let i=0;i<12&&w;i++){try{const q=new URL(w.location.href).searchParams.get('lang');if(q==='en'||q==='zh')return q;if(w.parent===w)break;w=w.parent;}catch{break;}}
  try{const q=new URL(document.referrer).searchParams.get('lang');if(q==='en'||q==='zh')return q;}catch{}
  try{const q=localStorage.getItem('fc-site-language');if(q==='en'||q==='zh')return q;}catch{}
  return 'zh';
 }
 const en=language()==='en';window.FC_CHAKRA_EN=en;document.documentElement.lang=en?'en':'zh-Hans';
 document.title=en?'FC Seven-Colour Chakra Reflection':'FC 七脉轮自我探索';
 document.querySelector('.brand span').textContent=en?'SEVEN-COLOUR SELF-REFLECTION':'CHAKRA REFLECTION / 七色自我探索';
 document.getElementById('motionToggle').textContent=en?'Turn off light effects':'关闭动态光效';
 document.querySelector('.foot').textContent=en?'FC Chakra Reflection · Original self-reflection questionnaire, not a validated clinical instrument. Account saving is optional. Audio and check-ins use FC’s existing access rules.':'FC 七色自我探索 · 原创反思问卷，尚未进行信效度验证。账户保存由你选择；音疗与每日打卡沿用 FC 原有入口。';
 const files=en?['chakra-en.js','account-store-en.js','account-bridge-en.js']:['chakra.js','account-store.js','account-bridge.js'];
 function load(i){if(i>=files.length)return;const script=document.createElement('script');script.src=files[i];script.onload=()=>load(i+1);script.onerror=()=>{document.getElementById('app').textContent=en?'The questionnaire could not load. Please refresh or return to FC and try again.':'问卷未能载入，请刷新或返回 FC 后重试。';};document.head.appendChild(script);}
 load(0);
})();
