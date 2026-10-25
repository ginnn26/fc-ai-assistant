export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Always show the same axes. Missing days have no data marks or connecting line.
export function trendSvg(values,{title,missing='未记录',score='分'}={}){
 const label=values.map(v=>v.day+' '+(v.score===null?missing:v.score+' '+score)).join('; ');
 let out='<svg viewBox="0 0 660 180" role="img" aria-label="'+escapeHtml(title+': '+label)+'">';
 for(const n of [0,5,10]){const y=132-n*11;out+='<line x1="28" x2="640" y1="'+y+'" y2="'+y+'"/><text x="5" y="'+(y+4)+'">'+n+'</text>';}
 out+='<line class="chart-axis" x1="28" x2="28" y1="22" y2="132"/>';
 let path='';values.forEach((v,i)=>{if(v.score===null)return;path+=(i&&values[i-1].score!==null?'L':'M')+(35+i*99)+' '+(132-v.score*11)+' ';});
 if(path)out+='<path d="'+path+'"/>';
 values.forEach((v,i)=>{const x=35+i*99;if(v.score!==null)out+='<circle cx="'+x+'" cy="'+(132-v.score*11)+'" r="4"/>';out+='<text x="'+x+'" y="159" text-anchor="middle">'+escapeHtml(v.day.slice(5))+'</text>';});
 return out+'</svg>';
}
