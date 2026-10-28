/* FC presentation preference only. Never reads or changes member records. */
(function () {
  'use strict';
  const SCHOOL='https://frequencies-clinic.learnworlds.com', APP='https://fc-ai-assistant.onrender.com';
  const valid=x=>x==='zh'||x==='en';
  const homes=new Set(['/','/home','/pages/home','/home-clone']);
  function initial(href,stored,legacy){
    const u=new URL(href),q=u.searchParams.get('lang');
    // The two home URLs are explicit language choices, including old bookmarks.
    return valid(q)?q:u.origin===SCHOOL&&u.pathname==='/home-clone'?'en':u.origin===SCHOOL&&u.pathname==='/pages/home'?'zh':valid(stored)?stored:valid(legacy)?legacy:'zh';
  }
  function link(href,base,language,intent){
    let u;try{u=new URL(href,base);}catch{return href;}
    if(![SCHOOL,APP,new URL(base).origin].includes(u.origin)||!/^https?:$/.test(u.protocol))return href;
    const school=u.origin===SCHOOL;
    // Never alter auth, billing, signed media, external sites or staff routes.
    const safe=school?homes.has(u.pathname)||/^\/(?:start|courses|social|profile|ai-assustant|course\/|courseui-|detail-|path-player)/.test(u.pathname):/^\/(?:$|index\.html$|assessment(?:\/|$)|daily-guide(?:\/|$)|care-chat(?:\.html|-pack\.html)|testimonial-rewards\/(?:member\.html|index\.html|$))/.test(u.pathname);
    if(!safe)return href;
    const next=valid(intent)?intent:language;
    if(school&&homes.has(u.pathname))u.pathname=next==='en'?'/home-clone':'/pages/home';
    u.searchParams.set('lang',next);return u.href;
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={initial,link};
  if(typeof window==='undefined'||window.FCLanguage||location.pathname.startsWith('/author/'))return;
  let stored,legacy;try{stored=localStorage.getItem('fc-site-language');legacy=localStorage.getItem('fc-guide-language');}catch{}
  let language=initial(location.href,stored,legacy);
  function persist(){try{for(const k of ['fc-site-language','fc-guide-language','fc-testimonial-language'])localStorage.setItem(k,language);}catch{}}
  function post(target,origin,type){target?.postMessage({type,language},origin);}
  function notifyFrames(){for(const f of document.querySelectorAll('iframe[src]')){try{const u=new URL(f.src,location.href);if([SCHOOL,APP,location.origin].includes(u.origin))post(f.contentWindow,u.origin,'fc:language:set');}catch{}}}
  function set(next,remote=false){if(!valid(next))return;const changed=language!==next;language=next;persist();document.documentElement.dataset.fcLanguage=language;
    if(!location.pathname.startsWith('/scorm'))try{const u=new URL(location.href);u.searchParams.set('lang',language);history.replaceState(history.state,'',u);}catch{}
    refresh();if(changed)window.dispatchEvent(new CustomEvent('fc:language',{detail:{language}}));
    notifyFrames();if(!remote&&window.parent!==window)for(const origin of [SCHOOL,APP,location.origin])post(window.parent,origin,'fc:language:changed');
  }
  function refresh(){for(const a of document.querySelectorAll('a[href]')){
    if(a.hasAttribute('download'))continue;
    const label=(a.getAttribute('aria-label')||a.textContent||'').trim();
    if(!a.dataset.fcLanguageIntent&&/^(English|中文|Chinese)$/.test(label))a.dataset.fcLanguageIntent=label==='English'?'en':'zh';
    if(a.dataset.fcLanguageIntent==='zh'&&language==='en'&&label==='中文')a.textContent='Chinese';
    const next=link(a.getAttribute('href'),location.href,language,a.dataset.fcLanguageIntent);if(next!==a.href)a.setAttribute('href',next);
  }}
  window.FCLanguage={get:()=>language,set,link:(href,intent)=>link(href,location.href,language,intent),refresh};persist();document.documentElement.dataset.fcLanguage=language;
  document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(!a)return;if(valid(a.dataset.fcLanguageIntent))set(a.dataset.fcLanguageIntent);const next=link(a.getAttribute('href'),location.href,language,a.dataset.fcLanguageIntent);if(next!==a.href)a.href=next;},true);
  window.addEventListener('message',e=>{
    if(![SCHOOL,APP,location.origin].includes(e.origin)||!valid(e.data?.language))return;
    const parent=e.source===window.parent&&window.parent!==window;
    const child=Array.from(document.querySelectorAll('iframe')).some(f=>f.contentWindow===e.source);
    if((parent&&e.data.type==='fc:language:set')||(child&&e.data.type==='fc:language:changed'))set(e.data.language,parent);
  });
  window.addEventListener('storage',e=>{if(e.key==='fc-site-language'&&valid(e.newValue)&&e.newValue!==language)set(e.newValue,true);});
  document.addEventListener('load',e=>{if(e.target.tagName==='IFRAME')notifyFrames();},true);
  function start(){set(language,true);new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  if(window.parent!==window)for(const origin of [SCHOOL,APP,location.origin])post(window.parent,origin,'fc:language:ready');
})();
