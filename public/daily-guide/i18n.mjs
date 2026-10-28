let language=globalThis.FCLanguage?.get()||'zh';
try{if(!globalThis.FCLanguage){const q=new URLSearchParams(location.search).get('lang');language=['zh','en'].includes(q)?q:localStorage.getItem('fc-site-language')||localStorage.getItem('fc-guide-language')||'zh';}}catch{}
export const getLanguage=()=>language;
export const tx=(zh,en)=>language==='en'?en:zh;
export function setLanguage(next){language=next==='en'?'en':'zh';globalThis.FCLanguage?.set(language);try{localStorage.setItem('fc-guide-language',language);}catch{}return language;}
export function applyLanguage(root=document){root.documentElement?.setAttribute('lang',language==='en'?'en':'zh-Hans');for(const e of root.querySelectorAll('[data-zh]'))e.textContent=e.dataset[language];for(const e of root.querySelectorAll('[data-zh-label]'))e.setAttribute('aria-label',e.dataset[language+'Label']);for(const e of root.querySelectorAll('[data-zh-placeholder]'))e.setAttribute('placeholder',e.dataset[language+'Placeholder']);}
const names={pain:['疼痛与不适','Pain & discomfort'],sleep:['睡眠困扰','Sleep difficulties'],mood:['情绪困扰','Emotional distress'],tension:['紧绷与压力','Tension & stress'],fatigue:['疲倦与乏力','Fatigue & low energy'],focus:['专注困难','Difficulty focusing']};
const hints={pain:['0 = 没有疼痛；10 = 非常严重','0 = no pain; 10 = very severe'],sleep:['回顾上一晚：0 = 睡得很好；10 = 非常不好','Last night: 0 = slept well; 10 = very poorly'],mood:['0 = 平稳舒适；10 = 非常困扰','0 = settled; 10 = very distressed'],tension:['0 = 很放松；10 = 非常紧绷','0 = relaxed; 10 = very tense'],fatigue:['0 = 精力充足；10 = 非常疲倦','0 = energetic; 10 = very tired'],focus:['0 = 很容易专注；10 = 非常难专注','0 = easy to focus; 10 = very difficult']};
export const metricName=(id,lang=language)=>names[id]?.[lang==='en'?1:0]||id;
export const metricHint=id=>hints[id]?.[language==='en'?1:0]||'';
export function trackName(track,lang=language){if(lang!=='en')return track.title;const parts=track.title.split(/\s*\/\s*/);return parts.length>1&&/[\u3400-\u9fff]/.test(parts[0])?parts.slice(1).join(' / '):track.title;}
export const courseName=id=>id==='sound-healing'?tx('订阅会员','Subscription'):id==='private-soundhealing'?tx('长期／私人会员','Long-term / private'):tx('免费试用','Free trial');
export const phaseName=(phase,lang=language)=>phase==='after'?(lang==='en'?'After listening':'聆听后'):(lang==='en'?'Daily / before listening':'每日／聆听前');
const errors={
 '请选择至少一个感受':'Choose at least one feeling.',
 '评分须为 0–10 的整数':'Choose a whole-number score from 0 to 10.',
 '请选择至少一个感受并评分':'Choose at least one feeling and a score.',
 '睡眠请在次日回顾，不能用即时评分比较':'Review sleep the next morning, rather than immediately after listening.',
 '记录日期或类型不正确':'This record has an invalid date or type.',
 '记录日期不正确':'Choose a valid date.',
 '聆听记录不正确':'Please check the track and listening duration.',
 '曲目资料不完整':'This recording is missing required information.',
 '请从 FC 账户内的每日指南进入。':'Open the Daily Guide from your FC account.',
 'FC 保存连接未初始化，暂时不能写入。':'The account connection is not ready. Please re-enter the guide.',
 '保存连接已结束，请重新进入。':'This session has ended. Please re-enter the guide.',
 'FC 未接受这次记录，请保持页面并重试。':'FC did not accept this record. Keep the page open and retry.',
 'FC 未能读回刚提交的记录，请保持页面并重试。':'The submitted record could not be read back. Keep the page open and retry.',
 'FC 未接受保留记录的退出设置，请重试。':'FC could not prepare this record for your next visit. Please retry.',
 '尚未确认提交至 FC，请重试。':'Submission to FC has not been confirmed. Please retry.',
 'FC 暂时无法读取记录':'Your account records could not be loaded. Please re-enter.',
 '仍在提交记录，请稍等后再离开。':'Records are still being submitted. Please wait before leaving.',
 'FC 尚未结束保存，请保持页面并重试。':'FC has not finished this session. Keep the page open and retry.',
 '记录已接近平台容量上限，未覆盖旧记录。请先导出，并联系 FC。':'Your record storage is nearly full. Existing records were not overwritten. Download your report and contact FC.',
 '平台记录格式不同，未覆盖原资料。':'The stored format is different. Your existing records were not overwritten.',
 '记录超过可读取大小':'The stored record is too large to open. Please contact FC.',
 '未知记录格式':'The stored record format is not recognised. Please contact FC.',
 '账户记录格式需要确认，已暂停写入，原资料没有被覆盖。':'The stored format needs review. Saving is paused; existing records have not been overwritten.',
 '部分旧记录需要迁移，已暂停写入，请联系 FC；原资料没有被覆盖。':'Some older records need review. Saving is paused; please contact FC. Existing records were not overwritten.'
};
export function errorText(error){const message=typeof error==='string'?error:error?.message;return language==='en'?(errors[message]||'This action could not be completed. Keep the page open and try again.'):message||'暂时未能完成，请保持页面并重试。';}
