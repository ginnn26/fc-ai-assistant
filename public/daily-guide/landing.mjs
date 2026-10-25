// Presentation-only language switching on the FC welcome and member home pages.
// No account data, scores, payments or membership changes are read or submitted.
let language='zh';
try{language=new URLSearchParams(location.search).get('lang')||localStorage.getItem('fc-guide-language')||'zh';}catch{}
language=language==='en'?'en':'zh';
const roots=new Set();
function apply(root){
 root.lang=language==='en'?'en':'zh-Hans';
 for(const e of root.querySelectorAll('[data-fc-zh],[data-fc-en]'))e.hidden=language==='en'?e.hasAttribute('data-fc-zh'):e.hasAttribute('data-fc-en');
 for(const e of root.querySelectorAll('[data-fc-language-toggle]')){
  e.textContent=language==='en'?'中文':'English';
  e.setAttribute('aria-label',language==='en'?'切换到中文':'Switch to English');
 }
 // Preserve LearnWorlds' own enrollment action; only change its visible free CTA.
 if(root.hasAttribute('data-fc-enroll-copy'))for(const e of root.querySelectorAll('.product-enroll-template .v-bottom')){
  const text=e.textContent.trim();
  if(!e.dataset.fcEnrolled){
   if(text==='Continue')e.dataset.fcEnrolled='yes';
   else if(text==='Register for free!')e.dataset.fcEnrolled='no';
   else continue;
  }
  const next=e.dataset.fcEnrolled==='yes'?(language==='en'?'Open my guide ↗':'进入我的指南 ↗'):(language==='en'?'Start for free ↗':'免费开通指南 ↗');
  if(e.textContent!==next)e.textContent=next;
 }
}
export function mountLanding(root){
 if(roots.has(root))return;roots.add(root);apply(root);
 for(const button of root.querySelectorAll('[data-fc-language-toggle]'))button.addEventListener('click',()=>{
  language=language==='en'?'zh':'en';
  try{localStorage.setItem('fc-guide-language',language);}catch{}
  for(const item of roots)apply(item);
 });
 if(root.hasAttribute('data-fc-enroll-copy'))new MutationObserver(()=>apply(root)).observe(root,{childList:true,subtree:true});
}
for(const root of document.querySelectorAll('[data-fc-copy-root]'))mountLanding(root);
