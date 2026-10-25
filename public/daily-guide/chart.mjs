export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// A separate illustration: never used as a data series or included in comparisons.
export function trendIllustration({label='示意曲线 · 非你的记录'}={}){
 return '<svg class="trend-illustration" viewBox="0 0 240 82" role="img" aria-label="'+escapeHtml(label)+'"><path class="illustration-wash" d="M10 16C45 9 50 47 85 36S127 57 156 49 187 67 230 65L230 80H10Z"/><path class="illustration-line" d="M10 16C45 9 50 47 85 36S127 57 156 49 187 67 230 65"/><circle cx="10" cy="16" r="5"/><circle cx="230" cy="65" r="5"/></svg>';
}
// Always show the same axes. Missing days have no data marks or connecting line.
export function trendSvg(values,{title,missing='未记录',score='分',compact=typeof window!=='undefined'&&window.innerWidth<=540}={}){
 const label=values.map(v=>v.day+' '+(v.score===null?missing:v.score+' '+score)).join('; ');
 const width=compact?360:660,right=compact?350:640,step=compact?50:99;
 let out='<svg class="'+(compact?'chart-compact':'chart-wide')+'" viewBox="0 0 '+width+' 180" role="img" aria-label="'+escapeHtml(title+': '+label)+'">';
 for(const n of [0,5,10]){const y=132-n*11;out+='<line x1="28" x2="'+right+'" y1="'+y+'" y2="'+y+'"/><text x="5" y="'+(y+4)+'">'+n+'</text>';}
 out+='<line class="chart-axis" x1="28" x2="28" y1="22" y2="132"/>';
 let path='';values.forEach((v,i)=>{if(v.score===null)return;path+=(i&&values[i-1].score!==null?'L':'M')+(35+i*step)+' '+(132-v.score*11)+' ';});
 if(path)out+='<path d="'+path+'"/>';
 values.forEach((v,i)=>{const x=35+i*step;if(v.score!==null)out+='<circle cx="'+x+'" cy="'+(132-v.score*11)+'" r="5"/>';out+='<text x="'+x+'" y="159" text-anchor="middle">'+escapeHtml(v.day.slice(5))+'</text>';});
 return out+'</svg>';
}
