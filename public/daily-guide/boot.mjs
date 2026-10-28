// Loaded by a stable SCORM shell. Public presentation assets only are fetched here.
// Self-reported scores stay in the authenticated LearnWorlds runtime.
const base=new URL('./',import.meta.url);
try{
 await import(new URL('../fc-language.js',base).href);
 const response=await fetch(new URL('index.html',base),{credentials:'same-origin',cache:'no-store',referrerPolicy:'strict-origin-when-cross-origin'});
 if(!response.ok)throw Error('暂时无法载入页面');
 const parsed=new DOMParser().parseFromString(await response.text(),'text/html');
 parsed.querySelectorAll('script').forEach(s=>s.remove());
 for(const image of parsed.querySelectorAll('img[src]'))image.src=new URL(image.getAttribute('src').replace(/^\//,''),new URL('../',base)).href;
 // Keep the native account bridge on the FC origin; no second authentication.
 document.body.replaceChildren(...parsed.body.childNodes);document.body.dataset.storage='scorm';
 document.title='FC · 每日身心指南 · Daily wellbeing guide';
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('daily.css',base).href;document.head.append(css);
 await import(new URL('daily.mjs',base).href);
}catch(error){
 console.error('FC guide boot failed:',error.name,String(error.message).replace(/https?:\/\/\S+/g,'[asset]'));
 document.body.replaceChildren();const p=document.createElement('p');p.textContent='页面暂时没有载入。你的账户记录没有被更改，请稍后重新进入。';document.body.append(p);
}
