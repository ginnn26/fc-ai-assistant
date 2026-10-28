const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),acorn=require('acorn');
const base=path.join(__dirname,'..'),args=process.argv.slice(2);if(!args[0]||!args[1])throw Error('Input body backup and output installation paths are required.');
const catalog=JSON.parse(fs.readFileSync(path.join(base,'data/assistant-catalog.json'),'utf8')).items.map(r=>({en:r.name_en,zh:r.name_zh,aliases:r.aliases||[]}));
const runtime=fs.readFileSync(path.join(base,'integrations/testimonial-rewards/language-source.js'),'utf8').replace('__FC_LANGUAGE_CATALOG__',JSON.stringify(catalog));new vm.Script(runtime);
fs.writeFileSync(path.join(base,'integrations/testimonial-rewards/language.js'),runtime);
const body=fs.readFileSync(args[0],'utf8');if(body.includes('FC single-language display v1'))throw Error('This source already has a language installation. Use its preserved original for an explicit rebuild.');
let i=0,changed=[];
let result=body.replace(/<script([^>]*)>([\s\S]*?)<\/script>/g,(all,attrs,source)=>{
 const index=i++;const outline=/fc-bilingual-outline-script/.test(attrs);
 if(index!==0&&!/fc-library-script|fc-body-navigation-script/.test(attrs)&&!outline)return all;
 let s=source;
 if(outline){
  s=s.replace('if(e&&e.textContent!==text)e.textContent=text;','if(e)window.FC_I18N.assign(e,text);');
  s=s.replace("if(main.getAttribute('aria-label')!==label)main.setAttribute('aria-label',label);","window.FC_I18N.attr(main,'aria-label',label);");
  s=s.replace("sectionButton.setAttribute('aria-label',sectionAria)","window.FC_I18N.attr(sectionButton,'aria-label',sectionAria)");
 }else{
  const tree=acorn.parse(s,{ecmaVersion:'latest'}),edits=[];
  const walk=n=>{if(!n||typeof n!=='object')return;
   if(n.type==='AssignmentExpression'&&n.operator==='='&&n.left.type==='MemberExpression'&&!n.left.computed&&['textContent','placeholder','title','alt'].includes(n.left.property.name)){
    const obj=s.slice(n.left.object.start,n.left.object.end),rhs=s.slice(n.right.start,n.right.end),key=n.left.property.name;
    edits.push({start:n.start,end:n.end,text:key==='textContent'?`window.FC_I18N.assign(${obj},${rhs})`:`window.FC_I18N.attr(${obj},'${key}',${rhs})`});return;
   }
   if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&n.callee.property.name==='setAttribute'&&n.arguments[0]?.type==='Literal'&&['aria-label','title','alt'].includes(n.arguments[0].value)){
    edits.push({start:n.start,end:n.end,text:`window.FC_I18N.attr(${s.slice(n.callee.object.start,n.callee.object.end)},${s.slice(n.arguments[0].start,n.arguments[0].end)},${s.slice(n.arguments[1].start,n.arguments[1].end)})`});return;
   }
   for(const[k,v]of Object.entries(n))if(k!=='start'&&k!=='end'){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
  };walk(tree);for(const e of edits.sort((a,b)=>b.start-a.start))s=s.slice(0,e.start)+e.text+s.slice(e.end);
  if(index===0){s=s.replace('d.append(s,body);return d;','d.append(s,body);window.FC_I18N.prepare(body);return d;').replace('content.replaceChildren(cleanNode(source));','content.replaceChildren(cleanNode(source));window.FC_I18N.prepare(content);');}
 }
 new vm.Script(s);changed.push(outline?'outline':index===0?'listening tools':attrs.trim());return '<script'+attrs+'>'+s+'</script>';
});
const marker='<!-- FC testimonial rewards v1';const reward=result.indexOf(marker);if(reward<0)throw Error('Expected existing reward block not found; refusing to guess.');
result=result.slice(0,reward)+fs.readFileSync(path.join(base,'integrations/testimonial-rewards/LEARNWORLDS-BODY.html'),'utf8');
result='<!-- FC single-language display v1 | 2026-10-28 -->\n<script>\n'+fs.readFileSync(path.join(base,'public/fc-language.js'),'utf8')+'\n'+runtime+'\n</script>\n'+result;
for(const m of result.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
fs.writeFileSync(args[1],result);console.log('Prepared '+changed.join(', ')+'. All scripts parse.');
