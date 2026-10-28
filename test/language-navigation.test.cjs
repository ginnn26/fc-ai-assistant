const {test}=require('node:test'),assert=require('node:assert/strict');
const {initial,link}=require('../public/fc-language');
const SCHOOL='https://frequencies-clinic.learnworlds.com',APP='https://fc-ai-assistant.onrender.com';
test('explicit home choices and valid query win over old page preferences',()=>{
 assert.equal(initial(SCHOOL+'/pages/home','en','en'),'zh');
 assert.equal(initial(SCHOOL+'/home-clone','zh','zh'),'en');
 assert.equal(initial(SCHOOL+'/start?lang=en','zh','zh'),'en');
 assert.equal(initial(SCHOOL+'/start?lang=bogus','en','zh'),'en');
 assert.equal(initial(APP+'/assessment/','en','zh'),'en');
});
test('home links and logo return to the selected language in both directions',()=>{
 for(const home of ['/','/home','/home-clone','/pages/home']){
  assert.equal(link(home,SCHOOL+'/start','zh'),SCHOOL+'/pages/home?lang=zh');
  assert.equal(link(home,SCHOOL+'/start','en'),SCHOOL+'/home-clone?lang=en');
 }
 assert.equal(link('/pages/home',SCHOOL+'/home-clone','en','zh'),SCHOOL+'/pages/home?lang=zh');
 assert.equal(link('/courses',SCHOOL+'/start','zh'),SCHOOL+'/courses-clone?lang=zh');
 assert.equal(link('/courses-clone',SCHOOL+'/start','en'),SCHOOL+'/courses?lang=en');
});
test('player identity, bookmark position and embedded app language survive navigation',()=>{
 const u=new URL(link('/path-player?courseid=private-soundhealing&unit=abcUnit#player',SCHOOL+'/start','en'));
 assert.equal(u.searchParams.get('courseid'),'private-soundhealing');assert.equal(u.searchParams.get('unit'),'abcUnit');assert.equal(u.hash,'#player');assert.equal(u.searchParams.get('lang'),'en');
 assert.equal(link(APP+'/testimonial-rewards/member.html?lang=zh',SCHOOL+'/start','en'),APP+'/testimonial-rewards/member.html?lang=en');
 assert.equal(link(SCHOOL+'/start',APP+'/care-chat.html?lang=en','en'),SCHOOL+'/start?lang=en');
});
test('language navigation never touches sign-out, author, payment, signed resources or external links',()=>{
 for(const href of ['/signout','/author/pageseditor?page=x','/payment?product=x','/scorm-server/play/x?jwt=private','https://wa.me/123?text=hello','javascript:void(0)','mailto:hello@example.com',APP+'/testimonial-rewards/staff.html'])assert.equal(link(href,SCHOOL+'/start','en'),href);
});
test('embedded language accepts only the expected frame and origin; persists no member data',()=>{
 const vm=require('node:vm'),fs=require('node:fs');
 const listeners={},saved=new Map(),child={},frame={contentWindow:child},root={dataset:{}};
 const location=new URL(SCHOOL+'/start?lang=en');
 const document={documentElement:root,readyState:'loading',querySelectorAll:s=>s==='iframe'?[frame]:[],addEventListener:(type,fn)=>listeners['dom:'+type]=fn};
 const window={addEventListener:(type,fn)=>listeners[type]=fn,dispatchEvent(){},parent:null};window.parent=window;
 const context={window,document,location,URL,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},history:{},CustomEvent:class{},MutationObserver:class{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/fc-language'),'utf8'),context);
 const send=(origin,source,type,language)=>listeners.message({origin,source,data:{type,language}});
 send('https://example.com',child,'fc:language:changed','zh');assert.equal(window.FCLanguage.get(),'en');
 send(SCHOOL,{},'fc:language:changed','zh');assert.equal(window.FCLanguage.get(),'en');
 send(SCHOOL,child,'fc:language:changed','xx');assert.equal(window.FCLanguage.get(),'en');
 send(SCHOOL,child,'fc:language:changed','zh');assert.equal(window.FCLanguage.get(),'zh');
 assert.deepEqual([...saved.keys()].sort(),['fc-guide-language','fc-site-language','fc-testimonial-language']);
 let destination='',stopped=false;location.assign=href=>destination=href;
 const a={href:SCHOOL+'/pages/home?lang=zh',dataset:{},target:'',getAttribute:k=>k==='href'?a.href:k==='data-interactive-link-type'?'pagelink':null};
 listeners['dom:click']({target:{closest:()=>a},button:0,preventDefault(){},stopImmediatePropagation(){stopped=true;}});
 assert.equal(destination,SCHOOL+'/pages/home?lang=zh');assert.equal(stopped,true,'native stale-slug navigation must not override localized href');
});
