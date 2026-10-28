// Produce both the self-hosted rules page script and the LearnWorlds body-code
// installation. The latter needs no remote request and no member data access.
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(base,'public/daily-guide/catalog.json'),'utf8'));
const records=catalog.map(r=>({u:r.unit,c:r.course,n:(r.title.split(' / ')[1]||r.title)+' · '+r.version.toUpperCase(),z:r.title.split(' / ')[0]}));
const source=fs.readFileSync(path.join(base,'public/testimonial-rewards/embed-source.js'),'utf8');
const built=source.replace('__FC_RECORDINGS__',JSON.stringify(records));
new(require('node:vm').Script)(built);
fs.writeFileSync(path.join(base,'public/testimonial-rewards/embed.js'),built);
fs.mkdirSync(path.join(base,'integrations/testimonial-rewards'),{recursive:true});
fs.writeFileSync(path.join(base,'integrations/testimonial-rewards/LEARNWORLDS-BODY.html'),'<!-- FC testimonial rewards v1: append to logged-in BODY custom code -->\n<script>\n'+built+'\n</script>\n');
console.log('Built testimonial panel for '+records.length+' catalogued audio activities.');
