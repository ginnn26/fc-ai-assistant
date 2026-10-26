(() => {
 'use strict';const $=id=>document.getElementById(id);
 let token='',ready=false,busy=false,selected='',member=null,offset=0,more=false,pending=null,reviewing=null,lastActivity=Date.now(),resendAt=0,epoch=0;
 const names={activate:'新会员开通',renew:'确认续费',cancel_at_end:'取消下期续费',revoke:'立即停用',restore:'撤销误停用',correct:'更正期限',confirm_audio:'核对 FC 音疗权限'};
 const errors={admin_not_ready:'工作人员后台尚未连接完成，目前不能保存。',staff_login_required:'请重新登录工作人员账户。',staff_reauthentication_required:'为保护后台，请重新验证工作人员邮箱。',staff_access_denied:'此邮箱没有工作人员权限，请联系负责人核对名单。',auth_please_wait:'请稍候再发送验证码，不必连续点击。',invalid_or_expired_code:'验证码不正确或已过期，请使用最新邮件的验证码。',revision_conflict:'其他工作人员刚更新了这份记录。请重新查询，核对后再处理。',duplicate_payment_reference:'这个付款参考编号已经登记过。请先核对原有记录，不要换编号重复开通。',idempotency_conflict:'这笔请求内容不一致，请联系负责人核对。',invalid_membership_transition:'当前状态不适合这项操作，请重新查询核对。',invalid_dates:'日期不正确，请核对开始日和最后使用日。',payment_confirmation_required:'请先确认付款及使用期限。',payment_reference_required:'请填写可核对的付款参考编号。',manager_approval_required:'立即停用需要负责人批准及批准记录编号。',invalid_email:'请填写正确的完整邮箱。',please_wait:'现在正在处理其他请求，请稍候再试。'};
 const errorText=error=>errors[error.message]||'连接暂时未能完成。请先重新查询结果，不要重复建立另一笔记录。';
 const node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
 const day=(value,end=false)=>{if(!value)return '';const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(Date.parse(value)-(end?1:0)));return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');};
 const stamp=value=>value?new Intl.DateTimeFormat('zh-MY',{timeZone:'Asia/Kuala_Lumpur',dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'';
 function paint(){
  $('login').hidden=!!token;$('workspace').hidden=!token;$('logout').hidden=!token;
  for(const id of ['save','search','refresh-tasks','audio-on','audio-off','retry','verify'])$(id).disabled=!ready||busy||!!reviewing;
  $('send-code').disabled=!ready||busy||Date.now()<resendAt;
  $('previous').disabled=busy||offset===0;$('next').disabled=busy||!more;
  const money=['activate','renew','correct'].includes($('action').value);
  $('coverage').hidden=!money;$('approval').hidden=!['revoke','restore'].includes($('action').value);
  for(const id of ['plan','start','last','reference','payment-confirmed','action','approval-reference','manager-approved'])$(id).disabled=busy||!!pending||!!reviewing;
  $('save').disabled=!ready||busy||!!pending||!!reviewing;
  $('retry').hidden=!pending;
  for(const id of ['member-email','staff-email','staff-code'])$(id).disabled=busy||!!reviewing;
  $('review').hidden=!reviewing;$('review-confirm').disabled=busy;$('review-cancel').disabled=busy;
 }
 async function post(path,body,authenticated=true){
  lastActivity=Date.now();
  const response=await fetch('/care-admin/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const result=await response.json();
  if(!response.ok){if(response.status===401){token='';wipe();paint();}throw Error(result.error);}
  return result;
 }
 function wipe(){epoch++;selected='';member=null;pending=null;reviewing=null;$('member-email').value='';$('reference').value='';$('staff-code').value='';$('record-status').textContent='';$('save-status').textContent='';$('tasks-status').textContent='';$('record-summary').replaceChildren();$('audit').replaceChildren();$('tasks').replaceChildren();$('change-form').hidden=true;$('audio-confirm').hidden=true;}
 async function logout(){const old=token;token='';wipe();$('global-status').textContent='已退出工作人员账户。再次操作前请重新验证。';paint();if(old)try{await fetch('/care-admin/auth/logout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+old},body:'{}',signal:AbortSignal.timeout(10000)});}catch{} }
 function showRecord(data){
  member=data.member;pending=null;$('record-summary').replaceChildren();$('audit').replaceChildren();$('change-form').hidden=false;$('audio-confirm').hidden=!member;
  for(const option of $('action').options)option.disabled=member?option.value==='activate':option.value!=='activate';
  $('action').value=member?'renew':'activate';$('payment-confirmed').checked=false;$('manager-approved').checked=false;$('reference').value='';$('approval-reference').value='';
  if(member){
   $('plan').value=member.plan;$('start').value=day(member.paid_from);$('last').value=day(member.paid_until,true);
   $('record-summary').append(node('p','聊天资格：'+(member.chat_active?'当前可用':member.state==='revoked'?'已立即停用':'当前不在有效期内')),
    node('p','已付款期限：'+day(member.paid_from)+' 至 '+day(member.paid_until,true)+'（最后一天仍有效）'),
    node('p','续费状态：'+(member.state==='nonrenewing'?'不再续费；保留已付期限':member.state==='revoked'?'已停用':'正常')),
    node('p','FC 音疗最后确认：'+(member.audio_active_confirmed?'可用':'停用／尚未确认可用')));
   if(member.audio_active_confirmed!==member.chat_active){const p=node('p',member.chat_active?'待办：请核对并开通 FC 音疗，再确认。':'待办：请核对 FC 音疗是否也应停用，再确认。');p.className='attention';$('record-summary').append(p);}
  }else{$('start').value='';$('last').value='';$('record-summary').append(node('p','此邮箱尚未登记聊天会员资格。确认付款后才可开通。'));}
  for(const event of data.events||[]){const el=node('article','');el.className='audit-entry';el.append(node('p',stamp(event.created_at)+' · '+event.actor_label+' · '+(names[event.action]||event.action)),node('p','处理编号：'+event.request_id),node('p','期限：'+day(event.after_state?.paid_from)+' 至 '+day(event.after_state?.paid_until,true)));if(event.reference_hint)el.append(node('p','付款编号末位：'+event.reference_hint));$('audit').append(el);}
  paint();
 }
 async function query(){
  const email=$('member-email').value.trim().toLowerCase();if(!$('member-email').reportValidity())return;
  const before=epoch;busy=true;paint();$('record-status').textContent='正在查询…';
  try{const data=await post('query',{email});if(before!==epoch)return;selected=email;showRecord(data);$('record-status').textContent='已查询。请核对会员邮箱及到期日。';}catch(error){if(before===epoch)$('record-status').textContent=errorText(error);}finally{busy=false;paint();}
 }
 async function tasks(){const before=epoch;busy=true;paint();try{
  const result=await post('tasks',{offset});if(before!==epoch)return;more=result.hasMore===true;$('tasks').replaceChildren();
  for(const item of result.items||[]){const row=node('article','');row.className='task';row.append(node('p',item.email_hint+' · 最后使用日 '+day(item.paid_until,true)),node('p',item.audio_pending?'待核对 FC 音疗权限':item.state==='nonrenewing'?'已取消续费，即将到期':'七天内到期，请核对续费'));$('tasks').append(row);}
  $('tasks-status').textContent=`共 ${result.total} 项待办；本页从第 ${result.total?offset+1:0} 项开始。${more?'还有下一页，请继续检查。':''} 请用会员完整邮箱查询处理。`;
 }catch(error){$('tasks-status').textContent=errorText(error);}finally{busy=false;paint();}}
 async function save(payload){
  const before=epoch;pending=payload;busy=true;paint();$('save-status').textContent='正在保存，请不要重复点击…';
  try{
   await post('save',payload);if(before!==epoch)return;pending=null;
   const data=await post('query',{email:selected});if(before!==epoch)return;showRecord(data);
   $('save-status').textContent='已保存聊天资格及处理记录。请继续核对 FC 音疗权限；聊天已有用量未重置。';
   offset=0;await tasks();
  }catch(error){
   if(before!==epoch)return;
   if(['revision_conflict','duplicate_payment_reference','invalid_membership_transition','manager_approval_required','payment_confirmation_required','invalid_dates','payment_reference_required'].includes(error.message))pending=null;
   $('save-status').textContent=errorText(error);
  }finally{busy=false;paint();}
 }
 $('search-form').onsubmit=event=>{event.preventDefault();if(!busy)query();};
 $('member-email').oninput=()=>{selected='';member=null;pending=null;$('change-form').hidden=true;$('audio-confirm').hidden=true;$('record-summary').replaceChildren();$('audit').replaceChildren();};
 $('action').onchange=paint;
 $('change-form').onsubmit=event=>{
  event.preventDefault();if(busy||pending||!selected)return;
  const payload={email:selected,action:$('action').value,expectedVersion:member?.version||0,requestId:crypto.randomUUID(),plan:$('plan').value,startDay:$('start').value,lastDay:$('last').value,paymentReference:$('reference').value,paymentConfirmed:$('payment-confirmed').checked,managerApproved:$('manager-approved').checked,approvalReference:$('approval-reference').value};
  const detail=['activate','renew','correct'].includes(payload.action)?`\n已付款期限：${payload.startDay} 至 ${payload.lastDay}（当天有效）`:payload.action==='cancel_at_end'?'\n保留现有已付期限，不会立刻停用。':payload.action==='restore'?'\n仅恢复原有仍有效的已付期限，不增加天数；必须已获负责人批准。':'\n这会立即停止聊天资格，必须已获负责人批准。';
  reviewing=payload;$('review-text').textContent=`请核对会员：${selected}\n操作：${names[payload.action]}${detail}\n不会自动操作 LearnWorlds 音疗权限。`;paint();
 };
 for(const [id,active] of [['audio-on',true],['audio-off',false]])$(id).onclick=()=>{
  if(busy||pending||!selected||!member)return;
  reviewing={email:selected,action:'confirm_audio',audioActive:active,expectedVersion:member.version,requestId:crypto.randomUUID()};$('review-text').textContent=`会员：${selected}\n你是否已在 FC 后台核实音疗${active?'可用':'已停用'}？这个按钮只记录结果。`;paint();
 };
 $('review-confirm').onclick=()=>{if(!busy&&reviewing){const payload=reviewing;reviewing=null;save(payload);}};
 $('review-cancel').onclick=()=>{reviewing=null;paint();};
 $('retry').onclick=()=>{if(pending&&!busy)save(pending);};
 $('refresh-tasks').onclick=()=>{offset=0;tasks();};$('previous').onclick=()=>{offset=Math.max(0,offset-50);tasks();};$('next').onclick=()=>{offset+=50;tasks();};
 $('logout').onclick=logout;
 $('send-code').onclick=async()=>{if(busy||Date.now()<resendAt||!$('staff-email').reportValidity())return;busy=true;paint();try{await post('auth/request-code',{email:$('staff-email').value.trim()},false);resendAt=Date.now()+60000;$('login-status').textContent='请查看已授权邮箱的最新验证码邮件。未收到时请联系负责人核对名单，不必连续重发。';}catch(error){$('login-status').textContent=errorText(error);}finally{busy=false;paint();}};
 $('login-form').onsubmit=async event=>{event.preventDefault();if(busy)return;busy=true;paint();try{
  const data=await post('auth/verify-code',{email:$('staff-email').value.trim(),code:$('staff-code').value},false);
  if(typeof data.accessToken!=='string'||!/^[A-Za-z0-9_.-]{30,8192}$/.test(data.accessToken))throw Error('invalid_session');
  token=data.accessToken;$('staff-code').value='';$('login-status').textContent='';$('global-status').textContent='工作人员已验证。请按 SOP 操作，完成工作后退出。';
 }catch(error){$('login-status').textContent=errorText(error);}finally{busy=false;paint();if(token)tasks();}};
 window.addEventListener('pagehide',()=>{token='';wipe();});
 for(const event of ['click','keydown'])document.addEventListener(event,()=>{lastActivity=Date.now();});
 setInterval(()=>{if(token&&Date.now()-lastActivity>20*60000){logout();$('global-status').textContent='已因长时间未操作而退出，请重新验证。';}paint();},1000);
 fetch('/care-admin/features').then(r=>r.json()).then(data=>{ready=data.available===true;$('global-status').textContent=ready?'连接已准备，可以由已授权工作人员登录。':'工作人员后台尚未开通，当前不能登录或保存。';paint();}).catch(()=>{$('global-status').textContent='暂时无法检查后台连接。';paint();});paint();
})();
