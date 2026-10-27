(function(){
 'use strict';
 const api=FCChakraAccount.findApi(window);if(!api)return;
 const banner=document.createElement('section');banner.className='account-bar no-print';banner.setAttribute('aria-label','FC 账户保存');
 document.querySelector('.brand').after(banner);
 let store=null,enabled=false,prior=[],timer=null,failed=false,restored=false;
 const oldHome=home,oldQuiz=quiz,oldReport=report,oldPersist=persist,oldClear=clearAll;
 function status(message,error=false){const el=banner.querySelector('[data-account-status]');if(el){el.textContent=message;el.setAttribute('role',error?'alert':'status');}}
 function draw(message){banner.innerHTML='<strong>我的 FC 问卷记录</strong><p data-account-status role="status"></p><label><input type="checkbox" data-account-consent> 我同意将本问卷答案和最多六份近期报告保存在自己的 FC 账户。平台管理员仍按原有权限访问；不影响每日打卡记录。</label><div class="actions"><button type="button" data-account-save>保存到账户</button><button type="button" data-account-leave>保存并返回 FC</button></div><p class="small">共享设备请退出 FC；同一时间建议只用一个页面编辑。提交成功后正常返回 FC，再次进入可确认是否恢复。</p>';
  const consent=banner.querySelector('[data-account-consent]');consent.checked=enabled;consent.disabled=failed;consent.onchange=()=>{enabled=consent.checked;status(enabled?'已允许账户保存；作答后会提交草稿。':'账户自动保存已暂停；现有账户记录不会因此删除。');};
  banner.querySelector('[data-account-save]').onclick=()=>save(false);
  banner.querySelector('[data-account-leave]').onclick=()=>{if(enabled&&!save(false))return;if(!enabled&& !confirm('当前未开启账户保存。返回 FC 后，本次未保存答案可能丢失。仍要返回吗？'))return;try{store.finish();window.top.location.assign(FC_LINKS.home);}catch(e){status(e.message,true);}};
  status(message,failed);
 }
 function snapshot(){return {schema:1,version:DATA.version,consent:true,answers:[...answers],concerns:concerns.filter(id=>NEEDS.some(n=>n[0]===id)),reports:prior,updatedAt:new Date().toISOString()};}
 function save(completed=false){clearTimeout(timer);if(demoMode){status('虚构示例不写入个人账户。');return false;}if(failed||!store){status('账户连接未就绪，请先下载报告保留本次内容。',true);return false;}if(!enabled){status('请先勾选同意保存到账户；未上传答案。',true);return false;}
  if(completed&&answers.every(v=>v!==null)){const key=JSON.stringify([answers,concerns]);if(!prior[0]||JSON.stringify([prior[0].answers,prior[0].concerns])!==key)prior=[{at:new Date().toISOString(),answers:[...answers],concerns:[...concerns]},...prior].slice(0,6);}
  try{store.save(snapshot());status('已提交至 FC 账户。请使用「保存并返回 FC」正常离开，避免强制关闭。');return true;}catch(e){status(e.message,true);return false;}
 }
 home=function(){oldHome();if(restored){const note=document.createElement('p');note.className='notice';note.textContent='已恢复此 FC 账户上次保存的问卷。点「开始我的探索」继续；可随时检查或修改回答。';app.prepend(note);}draw(failed?'账户记录未载入；为保护原资料，暂未开启保存。':restored?'已恢复此前的账户记录。':enabled?'账户保存已开启。':'可自愿保存到 FC 账户，未勾选前答案只在本页。');};
 quiz=function(){oldQuiz();const b=document.getElementById('save');if(b)b.textContent='保存到 FC 账户';};
 report=function(a,focus){oldReport(a,focus);if(!demoMode){const b=document.createElement('button');b.className='primary';b.textContent='保存这次报告到 FC 账户';b.onclick=()=>save(true);const actions=app.querySelector('.actions');if(actions)actions.appendChild(b);if(prior.length){const history=document.createElement('details');history.className='card no-print';const summary=document.createElement('summary');summary.textContent='我的近期报告（最多六份）';history.appendChild(summary);for(const item of prior){const row=document.createElement('p');row.textContent=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Kuala_Lumpur',dateStyle:'medium',timeStyle:'short'}).format(new Date(item.at))+' · ';const link=document.createElement('button');link.textContent='查看这次报告';link.onclick=()=>{const own=concerns;concerns=[...item.concerns];oldReport([...item.answers]);concerns=own;const selector=document.getElementById("focusSelect");if(selector)selector.disabled=true;const clear=document.getElementById("clear");if(clear)clear.remove();const back=document.getElementById('back');if(back){back.textContent='回到当前报告';back.onclick=()=>report([...answers]);}};row.appendChild(link);history.appendChild(row);}app.appendChild(history);}}};
 persist=function(){if(!api)return oldPersist();save(false);return false;};
 clearAll=function(){if(!confirm('清除这份脉轮问卷在 FC 账户中保存的草稿和近期报告？不会删除原有音疗或每日打卡资料。'))return;try{clearTimeout(timer);store.clear();answers=Array(63).fill(null);concerns=[];prior=[];enabled=false;restored=false;home();status('本问卷账户记录已清空并提交。');}catch(e){status(e.message,true);}};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-q],[data-need]');if(b&&enabled&&!demoMode){clearTimeout(timer);timer=setTimeout(()=>save(false),350);}});
 try{store=FCChakraAccount.create(api);const value=store.load();if(value){answers=[...value.answers];concerns=value.concerns.filter(id=>NEEDS.some(n=>n[0]===id));prior=value.reports;enabled=true;restored=true;}}catch(e){failed=true;}
 home();
})();

