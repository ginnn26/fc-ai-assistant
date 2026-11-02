const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),dir=path.join(root,'public/chakra');
const cn=fs.readFileSync(path.join(dir,'chakra.js'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(dir,'content-en.json'),'utf8'));
const audio=JSON.parse(cn.match(/const AUDIO_CATALOG=(\[.*?\]);/s)[1]).map(({name_zh,...a})=>a);
let ui=fs.readFileSync(path.join(dir,'english-ui.js'),'utf8');
ui=ui.replace('<div class="quiz-content">','').replace('class="progress" role="progressbar"','class="bar" role="progressbar"').replace('<div class="seven">','<div class="grid">');
// Keep the existing scene grid: questions are siblings of the sticky art stage.
ui=ui.replace('Clear answers and local draft</button></div></div></section>','Clear answers and local draft</button></div></section>');
const css=fs.readFileSync(path.join(dir,'chakra.css'),'utf8').replaceAll('场景暂未载入，仍可继续作答','Scene not loaded. You can still answer.');
fs.writeFileSync(path.join(dir,'chakra-en.js'),'const REPORT_CSS='+JSON.stringify(css)+';\nconst DATA='+JSON.stringify(data)+';\nconst AUDIO_CATALOG='+JSON.stringify(audio)+';\n'+ui);
const errors={
 '账户保存连接未就绪，请从 FC 问卷课程重新进入。':'Account saving is not ready. Reopen the questionnaire from its FC course.',
 '暂时无法读取账户记录，请勿关闭页面。':'Account records could not be read. Keep this page open.',
 '原记录格式不同，未覆盖任何资料。':'The existing record has a different format. No data was overwritten.',
 '原记录暂时无法读取，未覆盖任何资料。':'The existing record could not be read. No data was overwritten.',
 '原记录未通过完整性检查，未覆盖任何资料。':'The existing record did not pass integrity checks. No data was overwritten.',
 '保存连接已关闭，请重新进入。':'The saving connection is closed. Reopen the questionnaire.',
 '请先读取账户记录。':'Load account records before saving.',
 '记录已被另一个页面更新，请先导出本页报告，再重新进入。':'Another page updated this record. Export this report before reopening.',
 'FC 暂未接受记录，请保持页面并重试。':'FC has not accepted the record. Keep this page open and retry.',
 'FC 暂未确认提交，请保持页面并重试保存。':'FC has not confirmed submission. Keep this page open and retry saving.',
 '本次提交未通过回读，请先导出并重试。':'Submission could not be verified by readback. Export a copy and retry.',
 '记录格式不完整，未提交。':'The record format is incomplete. Nothing was submitted.',
 '账户记录接近容量上限，请先导出历史报告。':'Account records are near the capacity limit. Export your report history first.',
 '账户保存尚未确认结束，请稍后重试。':'The saving session has not confirmed completion. Please retry.'
};
let store=fs.readFileSync(path.join(dir,'account-store.js'),'utf8');for(const [a,b] of Object.entries(errors))store=store.replaceAll(a,b);
if(/[\u4e00-\u9fff]/.test(store))throw Error('Untranslated account-store text');
fs.writeFileSync(path.join(dir,'account-store-en.js'),store);
const index='<!doctype html><html lang="zh-Hans"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FC Chakra Reflection</title><link rel="stylesheet" href="chakra.css"><div class="wrap"><header class="brand"><b>FC · FREQUENCIES CLINIC</b><span>SEVEN-COLOUR REFLECTION</span><button id="motionToggle" class="no-print" aria-pressed="false">Light effects</button></header><main id="app" aria-live="polite"></main><footer class="foot"></footer></div><script src="language-loader.js" defer></script></html>';
fs.writeFileSync(path.join(dir,'index.html'),index);
console.log('Built complete English presentation and bilingual package loader.');
