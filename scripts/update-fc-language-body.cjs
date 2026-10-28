// Refresh only the existing first language block. Preserve all other live code.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Input backup and output paths required');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/assistant-catalog.json'),'utf8')).items.map(r=>({en:r.name_en,zh:r.name_zh,aliases:r.aliases||[]}));
const language=fs.readFileSync(path.join(root,'integrations/testimonial-rewards/language-source.js'),'utf8').replace('__FC_LANGUAGE_CATALOG__',JSON.stringify(catalog));
const common=fs.readFileSync(path.join(root,'public/fc-language.js'),'utf8');
new vm.Script(common);new vm.Script(language);
fs.writeFileSync(path.join(root,'integrations/testimonial-rewards/language.js'),language);
const before=fs.readFileSync(input,'utf8');
if(!/^<!-- FC single-language (display|public descriptions) v1/.test(before))throw Error('Expected backed-up live language installation');
const first=before.indexOf('<script>'),end=before.indexOf('</script>',first);
if(first<0||end<0)throw Error('Missing language block');
let after=before.slice(0,first)+'<script>\n'+common+'\n'+language+'\n'+before.slice(end);
if(before.includes('<!-- FC testimonial rewards v1')){
 const start=after.indexOf('<!-- FC testimonial rewards v1'),finish=after.indexOf('</script>',after.indexOf('<script',start))+9;
 if(finish<9)throw Error('Missing rewards script');
 const reward=fs.readFileSync(path.join(root,'integrations/testimonial-rewards/LEARNWORLDS-BODY.html'),'utf8');
 after=after.slice(0,start)+reward+after.slice(finish);
}
fs.writeFileSync(output,after);console.log('Prepared preserved site body:',after.length,'characters');
