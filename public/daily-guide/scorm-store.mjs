// SCORM 2004 storage stays inside the authenticated LMS session. No learner ID or credentials are read.
export function findScorm2004(root){let w=root;for(let i=0;i<12;i++){try{if(w.API_1484_11)return w.API_1484_11;if(w.parent===w)break;w=w.parent;}catch{break;}}return null;}
const prefix='FC_DAILY_V1:';
export async function encodeState(state){const raw=JSON.stringify(state);let value;if(typeof CompressionStream!=='undefined'){const bytes=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);value=prefix+'gzip:'+btoa(binary);}else value=prefix+'json:'+raw;if(value.length>60000)throw Error('记录已接近平台容量上限，未覆盖旧记录。请先导出，并联系 FC。');return value;}
export async function decodeState(value){if(!value)return null;if(!value.startsWith(prefix))throw Error('平台记录格式不同，未覆盖原资料。');let raw=value.slice(prefix.length);if(raw.startsWith('gzip:')){const b=Uint8Array.from(atob(raw.slice(5)),c=>c.charCodeAt(0)),reader=new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();let size=0,parts=[];for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2000000){await reader.cancel();throw Error('记录超过可读取大小');}parts.push(value);}raw=await new Blob(parts).text();}else if(raw.startsWith('json:'))raw=raw.slice(5);else throw Error('未知记录格式');return JSON.parse(raw);}
export async function createScormStore({root=typeof window==='undefined'?null:window,api=findScorm2004(root),now=()=>Date.now()}={}){if(!api)throw Error('请从 FC 账户内的每日指南进入。');if(String(api.Initialize(''))!=='true')throw Error('FC 保存连接未初始化，暂时不能写入。');let chain=Promise.resolve(),pending=0,latest=null,closed=false;const started=now();
 function commit(payload){if(closed)throw Error('保存连接已结束，请重新进入。');if(payload!==null&&String(api.SetValue('cmi.suspend_data',payload))!=='true')throw Error('FC 未接受这次记录，请保持页面并重试。');api.SetValue('cmi.exit','suspend');api.SetValue('cmi.session_time','PT'+Math.max(0,Math.floor((now()-started)/1000))+'S');if(String(api.Commit(''))!=='true')throw Error('尚未确认提交至 FC，请重试。');if(payload!==null)latest=payload;return true;}
 return{
 async load(){const raw=api.GetValue('cmi.suspend_data');if(api.GetLastError&&String(api.GetLastError())!=='0')throw Error('FC 暂时无法读取记录');return decodeState(raw);},
 save(state){const copy=JSON.parse(JSON.stringify(state)),plain=prefix+'json:'+JSON.stringify(copy);
 // Small updates are committed during the input event, before navigation can discard async compression.
 if(!pending&&plain.length<=60000){try{return Promise.resolve(commit(plain));}catch(error){return Promise.reject(error);}}
 pending++;const task=chain.catch(()=>{}).then(async()=>commit(await encodeState(copy))).finally(()=>pending--);chain=task;return task;},
 checkpoint(){if(latest!==null)return commit(latest);return false;},
 async settle(){await chain;},
 finish(){if(closed)return true;if(pending)throw Error('仍在提交记录，请稍等后再离开。');if(latest!==null)commit(latest);else api.SetValue('cmi.exit','suspend');if(String(api.Terminate(''))!=='true')throw Error('FC 尚未结束保存，请保持页面并重试。');closed=true;return true;}
 };}
