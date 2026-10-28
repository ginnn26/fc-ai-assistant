import {termsHtml,CLAIM_URL} from './rewards.mjs';
let en=window.FCLanguage?.get()==='en';
function render(){
 document.documentElement.lang=en?'en':'zh-Hans';
 document.title=en?'FC · Check In & Earn Free Days':'FC · 打卡赚免费天数';
 const labels={'terms-language':en?'Chinese':'English','terms-heading':en?'Check In & Earn Free Days':'打卡赚免费天数','terms-intro':en?'A little thank-you for showing up for yourself.':'每一次为自己出现，都值得一份小小的感谢。','terms-rate':en?'days = 1 free day':'天打卡 = 1 天赠送','terms-cap':en?'term caps':'每期赠送上限','terms-renew':en?'Paid renewal required':'续费后领取','terms-effective':en?'Starts 26 October 2026 · For eligible paid members':'2026 年 10 月 26 日开始 · 适用于合资格付费会员','terms-mode':en?'Claims are currently checked manually by FC. On-page progress is not a confirmed free-day balance. Read the conditions below before participating.':'当前由 FC 人工核实后兑换。页面进度不是已确认免费天数，请先阅读以下活动条款。','terms-claim':en?'Claim / ask FC Admin Support ↗':'申请兑换／咨询 FC Admin Support ↗'};
 for(const [id,text]of Object.entries(labels))document.getElementById(id).textContent=text;
 document.getElementById('terms-body').innerHTML=termsHtml(en?'en':'zh');
 document.getElementById('terms-claim').href=CLAIM_URL;
}
document.getElementById('terms-language').onclick=()=>{en=!en;window.FCLanguage?.set(en?'en':'zh');render();};render();
