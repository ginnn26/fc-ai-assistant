(function(){
'use strict';
const catalog=__FC_LANGUAGE_CATALOG__;
const pairs=[
 ['音疗说明','About this audio'],['正在载入音疗说明…','Loading description…'],['在新窗口阅读完整介绍','Open full description'],['暂时无法载入说明，请使用下方链接阅读。','Description unavailable. Please use the link below.'],
 ['聆听设置','Listening controls'],['聆听后按需慢慢饮水','Hydration after listening'],['饮水建议','Hydration guidance'],['吞咽安全','Swallowing safety'],['↻ 单曲循环：开','↻ Repeat on'],['↻ 单曲循环：关','↻ Repeat off'],['本首播放完毕后会重新播放。','This recording will repeat when it ends.'],['需要重复聆听时，开启单曲循环。','Turn on repeat to hear this recording again.'],
 ['能量与脉轮','Energy & Chakra'],['心理与情绪','Mind & Emotion'],['自信与动力','Confidence & Motivation'],['放松与睡眠','Relaxation & Sleep'],['呼吸与鼻咽喉','Breathing, Nose & Throat'],['血液与心脏','Blood & Heart'],['眼睛与听力','Eyes & Hearing'],['修复与免疫','Recovery & Immunity'],['其他身体主题','Other Body Topics'],['女性健康','Women’s Health'],['消化与泌尿','Digestion & Urinary'],['皮肤与过敏','Skin & Allergies'],['维他命与矿物质','Vitamins & Minerals'],['肌肉与关节','Muscles & Joints'],['口腔与牙齿','Mouth & Teeth'],['头部与头发','Head & Hair'],
 ['其他音疗','Other audio'],['集中版','Intensive'],['平稳版','Smooth'],['音乐版','BGM'],['版本待核对','Version to confirm'],['纯频率 · 声音强弱变化较明显','Frequency only · more noticeable changes in intensity'],['纯频率 · 声音较平稳柔和','Frequency only · steadier, gentler sounds'],['频率 + 背景音乐','Frequencies + background music'],['版本确认中，可照常播放。','Version being checked; playback is available.'],['此音疗','This audio'],
 ['收藏和最近播放保存在此浏览器，不会自动同步到其他设备。','Favourites and recent listening are saved in this browser and do not automatically sync to other devices.'],['此页面暂时无法识别会员，收藏和最近播放未启用。','Membership could not be identified here. Favourites and recent listening are unavailable.'],['浏览器未允许保存：收藏和记录目前只能在本页暂存。','Browser storage is unavailable. Favourites and history are temporary on this page.'],['★ 已收藏','★ Saved'],['☆ 收藏','☆ Favourite'],['取消收藏：','Remove favourite: '],['收藏：','Favourite: '],['播放页音疗','Player audio'],
 ['全部音疗','All audio'],['我的收藏','My favourites'],['最近播放','Recently played'],['原目录浏览','Original directory'],['按分类找音疗','Browse by category'],['全部版本','All versions'],['所有分类','All categories'],['关键词：','Keyword: '],['当前筛选：','Current filters: '],[' · 载入中…',' · Loading…'],[' · 正在载入其余音疗…',' · Loading more audio…'],[' · 部分音疗暂未载入，请刷新重试',' · Some audio could not load; please refresh'],[' · 可照常播放，版本正在核对',' · Playback available; version being checked'],
 ['还没有符合条件的收藏。点击音疗旁的「☆ 收藏」，下次就能在这里找到。','No matching favourites yet. Choose Favourite beside an audio to find it here next time.'],['还没有符合条件的播放记录。实际开始播放音疗后，会自动记录在这里。','No matching listening history yet. Start playing an audio to add it here.'],['没有找到符合条件的音疗。试试简短的中文或英文名称，或清除筛选。','No matching audio. Try a shorter name or clear the filters.'],['快速找音疗','Find your audio'],['按主题分类、搜索名称，或打开收藏和最近播放。','Browse by topic, search by name, or open favourites and recent listening.'],['搜索：睡眠、焦虑、sleep','Search: sleep, calm, focus'],['搜索音疗','Search audio'],['清除','Clear'],['按聆听偏好选择版本','Choose a listening version'],
 ['纯频率 · 强弱变化明显 · 多数约 15 分钟','Frequency only · changing intensity · mostly around 15 minutes'],['纯频率 · 声音较平稳 · 通常约 1 小时','Frequency only · steadier sounds · usually around 1 hour'],['频率配背景音乐 · 喜欢音乐伴听可选','Frequencies with background music'],['载入数量…','Loading counts…'],['选择版本，查看该版本的全部音疗（会清除关键词和分类筛选）。同名音疗可有不同版本。','Choose a version to view its audio, clearing keyword and category filters. A theme may have several versions.'],['音疗浏览方式','Browse audio'],['← 返回所有分类','← All categories'],['版本','Version'],['筛选音疗版本','Filter audio version'],['分类','Category'],['筛选音疗分类','Filter audio category'],['下拉选单可组合筛选版本与分类；只想看某一版本的全部音疗，请点上方版本按钮。','Combine version and category filters, or use a version button above to see that version’s full collection.'],['清除筛选','Clear filters'],['清空本音疗库记录','Clear this library’s history'],['撤销清空','Undo clear'],['先选主题，再选 Intensive、Smooth 或 BGM。','Choose a topic, then Intensive, Smooth or BGM.'],['也可以按版本找音疗','Browse by version'],['显示更多','Show more'],['音疗库','Audio library'],['收藏与最近播放','Favourites & recent listening'],['当前音疗','Current audio'],['同名其他版本 · 点击播放','Other versions · select to play'],
 ['会员音疗','The Sound Healing Journey'],['私人会员音疗','Private Sound Healing'],['试用会员音疗','Trial Sound Healing'],['目录','Library'],['会员','Members'],['讨论','Discuss'],['返回音疗页','Back to audio library'],['分组内按英文 A–Z 排列','A–Z within each section'],['音疗','Sound Healing'],['音乐版音疗','Sound Healing BGM'],['集中版音疗','Sound Healing (INTENSIVE)'],
 ['头部','Head'],['头部与五官','Head & senses'],['胸口','Chest'],['胸口 · 心脏与呼吸','Chest · heart & breathing'],['腹部','Abdomen'],['腹部与泌尿','Abdomen & urinary topics'],['手臂','Arms & hands'],['手臂、手部与关节','Arms, hands & joints'],['腿脚','Legs & feet'],['腿部、脚部与关节','Legs, feet & joints'],['选择分类显示方式','Choose a browsing view'],['人体找音疗','Browse by body area'],['分类卡片','Topic cards'],['跟着身体，找到适合的音疗','Find audio by body area'],['点身体上的圆点或旁边的标签，再选择想浏览的分类。','Select a body point or label, then choose a related category.'],['柔和多彩的人体部位插画，标示头部、胸口、腹部、手臂和腿脚','Body illustration showing the head, chest, abdomen, arms and legs'],['选择身体部位','Choose a body area'],['选择下方分类，查看全部版本的音疗。','Choose a category below to see its audio versions.'],['载入中…','Loading…'],['请查看全部分类','Browse all categories'],['← 重新选择身体部位','← Choose another body area'],['人体图示用于按部位浏览分类','Explore categories by body area'],['全身与生活主题','Whole-body & everyday themes'],['也可以从这些主题开始','Or start with a theme'],['情绪、睡眠、能量与全身照顾，直接点选即可。','Explore emotion, sleep, energy and whole-body care.'],['人体图暂未载入','Body illustration unavailable'],
 ['顾客体验分享','Customer experiences'],['查看 Facebook 原帖','View original Facebook post'],['观看示范视频','Watch the demonstration'],['研究参考','Research background'],['阅读研究','Read the study'],['阅读综述','Read the review'],['关于 Frequency Clinic','About Frequency Clinic'],['重要说明','Important information'],['个人体验','Personal experience'],['首页','Home'],['我的音疗','My audio'],['每日身心指南','Daily wellbeing guide'],['七色自我探索','Seven-colour reflection (Chinese)'],['会员方案','Membership plans'],['暖心聊聊','Care Chat'],['会员社区','Community'],['更多','More'],['我的账户','My account'],['退出','Sign out'],['上一首','previous'],['下一首','next'],
 ['首页','Home'],['欢迎回来','Welcome back'],['我的个人资料','My profile'],['今天，想听什么？','What would you like to hear today?'],['订阅会员','Subscription membership'],['长期／私人会员','Long-term / private membership'],['免费试用','Free trial'],['适用于月度、半年及年度方案。','For monthly, half-year and annual plans.'],['进入与你的长期或私人方案对应的音疗库。','Open the library included with your long-term or private plan.'],['首次体验，从试用音疗库开始。','New here? Start with the trial audio library.'],['进入订阅会员音疗库','Open subscription audio library'],['进入长期／私人音疗库','Open long-term / private audio library'],['进入免费试用音疗库','Open trial audio library'],['正在核对会员权限 · Checking…','Checking membership access…'],['未开通此入口 · Not included','Not included'],['可进入 · Available','Available'],['请使用付费会员入口 · Use your paid entrance','Use your paid membership entrance'],['无法进入？请先确认登录账号及会员方案是否正确。','Cannot open a library? Check your sign-in account and membership plan.'],['进入你的会员音疗库，可搜索名称、按主题分类，或筛选 Intensive 集中版、Smooth 平稳版和 BGM 音乐版。点击封面或标题即可播放。','Open your membership library. Search by name or topic, or filter Intensive, Smooth and BGM. Select a cover or title to play.'],
 ["免费身心状态评估", "Free mind–body wellbeing check-in"],
 ["从情绪、睡眠到身体感受，整理最近两周的状态。", "Reflect on your emotions, sleep and physical comfort over the past two weeks."],
 ["约 5–8 分钟，完成后即可查看六个观察方向、日常照顾建议及可选音疗主题。", "In about 5–8 minutes, explore six areas, everyday self-care ideas and optional listening themes."],
 ["无需等待人工回复，也不用 WhatsApp 索取报告。", "Your report is available immediately, without waiting for a reply or requesting it on WhatsApp."],
 ["开始评估", "Begin your check-in"],
 ["先看清感受，再选择下一步", "Understand your feelings, then choose a next step"],
 ["有时很难说清自己是累了、睡不好，还是最近承受了太多。", "It can be hard to tell whether you are tired, sleeping poorly, or carrying too much lately."],
 ["这份自评把你的回答整理成六个观察方向：", "This check-in organizes your responses into six areas:"],
 ["情绪与心理感受", "Emotional wellbeing"],
 ["紧张相关的身体反应", "Tension-related physical responses"],
 ["睡眠与日常节奏", "Sleep and daily rhythms"],
 ["身体不适", "Physical discomfort"],
 ["饮食与生活影响", "Food and everyday influences"],
 ["整体主观感受", "Overall personal wellbeing"],
 ["回顾最近两周，按自己的真实感受回答。没有标准答案，也不需要刻意提高或降低分数。", "Answer honestly about the past two weeks. There are no right answers, and no need to raise or lower your scores."],
 ["你的自动报告包括：", "Your automatic report includes:"],
 ["六个部分的平均分与计算说明", "Average scores for six areas and how they are calculated"],
 ["本次相对较突出的感受", "Feelings that stand out in this check-in"],
 ["适合尝试的日常照顾建议", "Everyday self-care ideas to try"],
 ["可选的 FC 聆听主题", "Optional FC listening themes"],
 ["经你单独同意后，加入 AI 补充解读", "Additional AI explanation only with your separate consent"],
 ["分数用于整理自述感受，不用于诊断疾病、推断病因或判断神经系统损伤。", "Scores organize your self-reported feelings. They do not diagnose conditions, identify causes or assess nervous system damage."],
 ["给想了解自己的你", "For those who want to understand themselves"],
 ["适合希望梳理日常情绪、睡眠、压力感受与生活节奏的成年人。", "For adults who want to reflect on everyday emotions, sleep, stress and daily rhythms."],
 ["37 项自评，约 5–8 分钟；背景问题可选填。血压没有测量或不确定时，可以如实选择“不确定”。", "37 reflection items, about 5–8 minutes; background questions are optional. If you have not measured your blood pressure or are unsure, choose “Not sure”."],
 ["如有急性胸痛、严重呼吸困难或其他紧急情况，请先寻求医疗帮助，不要等待完成问卷。", "For acute chest pain, severe breathing difficulties or another emergency, seek medical help first. Do not wait to complete this questionnaire."],
 ["即时报告，清楚呈现", "An immediate, clear report"],
 ["提交后，系统按固定规则计算六个部分的分数，直接在页面显示报告，无需等待治疗师逐份处理。", "After submission, fixed rules calculate scores for six areas and display your report directly, without waiting for a therapist to process it."],
 ["AI 补充说明由你单独选择是否开启。开启后，系统只发送计算后的分数及固定选项标签给 OpenAI，不发送姓名、联系方式或自由填写的背景文字。", "You choose separately whether to enable additional AI explanation. If enabled, only calculated scores and fixed-choice labels go to OpenAI. Your name, contact details and freely written background are not sent."],
 ["AI 暂时无法回应时，固定规则报告仍可查看；AI 不会改动你的分数。", "If AI is unavailable, the fixed-rule report is still available. AI does not change your scores."],
 ["报告由你掌握", "Your report stays in your hands"],
 ["完成后即可查看，并可打印或保存为 PDF。报告无需通过 WhatsApp 领取，也不会自动发给治疗师。", "View your report immediately, then print or save it as a PDF. There is no need to request it on WhatsApp, and it is not automatically sent to a therapist."],
 ["若希望进一步交流，你可以自行联系 FC 团队并选择分享哪些内容。", "For further discussion, you may contact the FC team and choose what to share."],
 ["这是一份日常身心觉察工具，不是经过临床验证的量表，也不能替代医生的诊断、检查或治疗。", "This tool supports everyday wellbeing awareness. It is not a clinically validated scale and cannot replace medical diagnosis, examination or treatment."],
 ["从了解此刻的自己开始。", "Start by noticing yourself today."],
 ["按自己的节奏，带走一个照顾自己的小方向。", "Go at your own pace, and take a small step towards caring for yourself."],
 ["开始评估", "Begin your check-in"],
 ["从这里开始", "Start here"],
 ["其他会员", "Other members"],
 ["消息", "Messages"],
 ["个人资料", "Profile"],
 ["账户设置", "Account settings"],
 ["我的每日身心指南 · My Daily Guide", "My daily wellbeing guide"],
 ["音疗资料与研究 · 点击展开", "Audio information & research · expand"],
 ["正在核对你的会员权限", "Checking your membership access…"],
 ["请稍候，不需要重新购买。", "Please wait. You do not need to purchase again."],
 ["暂时未能核实会员权限", "We could not verify your access right now."],
 ["这个入口不属于你当前的会员权限", "This entrance is not included in your current membership access."],
 ["可能是连接暂时中断。请重试；这不代表你的会员资格已失效。", "Please retry. This does not mean your membership has expired."],
 ["你的账号已有付费音疗库权限。免费试用用于首次体验，请从下方的付费会员入口进入。", "Your account already has paid-library access. Please use your paid membership entrance below."],
 ["请使用下方已开通的入口。如果你已购买此方案，请确认登录的是购买时使用的账号，或联系客服核对。", "Use an available entrance below. Already purchased this plan? Check your login account or contact support."],
 ["订阅会员音疗库", "Subscription audio library"],
 ["长期／私人会员音疗库", "Long-term / private audio library"],
 ["免费试用音疗库", "Free trial audio library"],
 ['选择','Select '],['查看','View '],['播放','Play '],['最近播放：','Last played: ']
];
const exact=new Map();for(const[z,e]of pairs){exact.set(z,[z,e]);exact.set(e,[z,e]);exact.set(z+' · '+e,[z,e]);exact.set(e+' · '+z,[z,e]);exact.set(z+' '+e,[z,e]);exact.set(z+'\n'+e,[z,e]);}
for(const r of catalog){for(const key of[r.en,r.zh,r.en+' '+r.zh,r.zh+' / '+r.en,...r.aliases])exact.set(key,[r.zh,r.en]);}
for(const[raw,z,e]of[
 ['↻ 单曲循环：开 · Repeat on','↻ 单曲循环：开','↻ Repeat on'],['↻ 单曲循环：关 · Repeat off','↻ 单曲循环：关','↻ Repeat off'],['聆听后按需慢慢饮水 · Hydration','聆听后按需慢慢饮水','Hydration after listening'],['按分类找音疗 · Categories','按分类找音疗','Browse by category'],['按分类找音疗 · Browse by category','按分类找音疗','Browse by category'],['按分类找音疗 Browse by category','按分类找音疗','Browse by category'],['人体找音疗 · Body','人体找音疗','Browse by body area'],['分类卡片 · Categories','分类卡片','Topic cards'],['选择身体部位 / BODY AREA','选择身体部位','Choose a body area'],['人体图示用于按部位浏览分类 · Explore by body area','人体图示用于按部位浏览分类','Explore categories by body area'],['中英文目录 · 分组内按英文 A–Z 排列 / Bilingual titles · A–Z within each section','分组内按英文 A–Z 排列','A–Z within each section'],['Learn More · 音疗说明','音疗说明','About this audio'],['在新窗口阅读完整介绍 · Open original','在新窗口阅读完整介绍','Open full description'],['版本待核对 · To confirm','版本待核对','Version to confirm']
])exact.set(raw,[z,e]);
for(const[z,e]of[['每日身心指南','Daily guide'],['七色自我探索','Chakra reflection (Chinese)'],['会员方案','Membership']])exact.set(z,[z,e]);
for(const[raw,z,e]of[
 ['首页 Home','首页','Home'],["重新核对 · Retry", "重新核对", "Retry"],["返回我的音疗 · My Audio", "返回我的音疗", "My audio"],["关闭提示 · Close", "关闭提示", "Close"],["联系客服 · Contact support", "联系客服", "Contact support"],["点击重新核对 · Click to check", "点击重新核对", "Click to check"],["进入订阅会员音疗库 · Enter", "进入订阅会员音疗库", "Open subscription audio library"],["进入长期／私人会员音疗库 · Enter", "进入长期／私人会员音疗库", "Open long-term / private audio library"],["进入免费试用音疗库 · Enter", "进入免费试用音疗库", "Open free trial audio library"],['未开通此入口 · Not included','未开通此入口','Not included'],['可进入 · Available','可进入','Available'],['请使用付费会员入口 · Use your paid entrance','请使用付费会员入口','Use your paid entrance'],['聆听主题','聆听主题','Listening themes'],['全屏聊天 / Open full screen ↗','全屏聊天 ↗','Open full screen ↗'],
 ['返回音疗页 · Back to course page','返回音疗页','Back to audio library'],['也可以按版本找音疗 · Versions','也可以按版本找音疗','Browse by version'],['暂时无法载入说明，请使用下方链接阅读。 Please use the link below.','暂时无法载入说明，请使用下方链接阅读。','Description unavailable. Please use the link below.'],['呼吸与咳嗽 Breathing & Cough','呼吸与咳嗽','Breathing & Cough'],['血液与循环 Blood & Circulation','血液与循环','Blood & Circulation'],['眼部 Eyes','眼部','Eyes'],['肝脏与关节 Liver & Joints','肝脏与关节','Liver & Joints']
])exact.set(raw,[z,e]);
const mixedEntries=Array.from(exact.entries()).filter(([k])=>/[\u3400-\u9fff]/.test(k)&&/[A-Za-z]/.test(k)).sort((a,b)=>b[0].length-a[0].length);
const foldedExact=new Map(Array.from(exact.entries()).map(([k,v])=>[k.toLowerCase(),v]));
const dynamic=[[/^全部音疗 \((\d+)\)$/,(m,l)=>l==='en'?`All audio (${m[1]})`:m[0]],[/^我的收藏 \((\d+)\)$/,(m,l)=>l==='en'?`My favourites (${m[1]})`:m[0]],[/^最近播放 \((\d+)\)$/,(m,l)=>l==='en'?`Recently played (${m[1]})`:m[0]],[/^查看 (\d+) 个音疗(?: →)?$/,(m,l)=>l==='en'?`View ${m[1]} audios →`:m[0]],[/^查看全部 (\d+) 首(.*)$/,(m,l)=>l==='en'?`View all ${m[1]} recordings${m[2]?' · Loading…':''}`:m[0]]];
function value(raw,lang){let s=String(raw??''),t=s.trim();const direct=exact.get(t)||foldedExact.get(t.toLowerCase());if(direct)return s.replace(t,direct[lang==='en'?1:0]);for(const[re,fn]of dynamic){const m=t.match(re);if(m)return fn(m,lang);}
 const bodyLabel=t.match(/^选择([\u3400-\u9fff]+) ([A-Za-z &]+)$/);if(bodyLabel)return lang==='en'?'Select '+bodyLabel[2]:'选择'+bodyLabel[1];
 if(lang==='en'){let m=t.match(/^(\d+) 个分类 · 共 (\d+) 个音疗（同名不同版本分别计算）(.*)$/);if(m)return `${m[1]} categories · ${m[2]} recordings (versions counted separately)${value(m[3],lang)}`;m=t.match(/^(共 |找到 )(\d+) 个音疗(.*)$/);if(m)return `${m[2]} ${m[1]==='找到 '?'matching audios':'audios'}${value(m[3],lang)}`;m=t.match(/^再显示 (\d+) 个（已显示 (\d+) \/ (\d+)）$/);if(m)return `Show ${m[1]} more (showing ${m[2]} / ${m[3]})`;m=t.match(/^ · 已显示 (\d+) \/ (\d+)，下方可继续加载(.*)$/);if(m)return ` · Showing ${m[1]} / ${m[2]}; load more below${value(m[3],lang)}`;}
 // Legacy catalog headings sometimes differ from the canonical catalog spelling.
 // Separate their existing English/Chinese title parts; do not invent a title.
 for(const[k,v]of mixedEntries)if(s.includes(k))s=s.replaceAll(k,v[lang==='en'?1:0]);
 s=s.split(/(\s*[·｜]\s*)/).map(part=>{const m=part.match(/^((?:播放\s*|收藏：\s*|取消收藏：\s*)?)([A-Za-z][\x20-\x7e]*?)\s*([\u3400-\u9fff][\s\S]*)$/);return m?m[1]+(lang==='en'?m[2].trim():m[3]):part;}).join('');
 // Version names and durations are metadata, not duplicated prose.
 for(const[z,e]of[['Intensive 集中版','Intensive'],['Smooth 平稳版','Smooth'],['BGM 音乐版','BGM']])s=s.replaceAll(z,lang==='en'?e:z.split(' ').slice(1).join(' '));
 if(lang==='zh')return s.replace(/^Learn More · /,'').replace(/^English\s*[·:：]\s*/,'').replace(/\s*·\s*To confirm$/,'');
 const chunks=pairs.filter(p=>p[0].length>1).sort((a,b)=>b[0].length-a[0].length);for(const[z,e]of chunks)s=s.replaceAll(z,e);
 s=s.replace(/(\d+) 个分类 · 共 (\d+) 个音疗（同名不同版本分别计算）/, '$1 categories · $2 recordings (versions counted separately)').replace(/共 (\d+) 个音疗/,'$1 audios').replace(/找到 (\d+) 个音疗/,'$1 matching audios').replace(/ · 已显示 (\d+) \/ (\d+)，下方可继续加载/,' · Showing $1 / $2; load more below').replace(/再显示 (\d+) 个（已显示 (\d+) \/ (\d+)）/,'Show $1 more (showing $2 / $3)').replace(/已选择(.+)，下方有(\d+)个相关分类。/,'Selected $1; $2 related categories below.').replace(/^English\s*[·:：]\s*/,'');
 return s;
}
function textParts(text,heading=false){const raw=String(text);if(/^(Intensive 集中版|Smooth 平稳版|BGM 音乐版)/.test(raw))return[{lang:'zh',text:value(raw,'zh')},{lang:'en',text:value(raw,'en').replace(/（约?\s*(\d+)\s*分钟）/g,'($1 min)')}];const direct=exact.get(raw.trim());if(direct&&/[\u3400-\u9fff]/.test(raw)&&/[A-Za-z]/.test(raw))return[{lang:'zh',text:direct[0]},{lang:'en',text:direct[1]}];if(heading&&/^[A-Za-z]/.test(raw)&&/[\u3400-\u9fff]/.test(raw))return[{lang:'zh',text:value(raw,'zh')},{lang:'en',text:value(raw,'en')}];
 const segments=raw.split(/(?<=[。！？])\s*(?=[A-Za-z“‘"(])/u);if(segments.length>1)return segments.flatMap(textParts);
 if(!raw.trim())return[{lang:'both',text:raw}];if(/^[\d\s:·/—–%(),.]+$/.test(raw)||/^(?:RM|US\$|USD|MYR)\s*[\d,.]+$/.test(raw.trim())||['Agnes','FC','Frequency Clinic','BGM','Intensive','Smooth'].includes(raw.trim()))return[{lang:'both',text:raw}];
 if(/RM\s*[\d,.]+\s*\/\s*month/i.test(raw))return[{lang:'zh',text:raw.replace(/\/\s*month/i,'／月')},{lang:'en',text:raw}];
 const divider=raw.split(/\s*[·｜|/]\s*/);if(divider.length===2&&divider.some(p=>/[\u3400-\u9fff]/.test(p))&&divider.some(p=>!/[\u3400-\u9fff]/.test(p)&&/[A-Za-z]{3}/.test(p)))return divider.map(text=>({lang:/[\u3400-\u9fff]/.test(text)?'zh':'en',text}));
 return[{lang:/[\u3400-\u9fff]/.test(raw)?'zh':'en',text:raw.replace(/^English\s*[·:：]\s*/,'')}];
}
function prepare(root){if(!root||root.hasAttribute('data-fc-language-prepared'))return;const doc=root.ownerDocument;const walker=doc.createTreeWalker(root,4);const texts=[];let node;while(node=walker.nextNode())if(!node.parentElement.closest('script,style,iframe,video,code,[data-fc-only]'))texts.push(node);
 for(const n of texts){const h=n.parentElement.closest('h1'),parts=textParts(n.textContent,!!h&&!h.querySelector('p,div,ul,ol'));if(parts.every(p=>p.lang==='both'))continue;const fragment=doc.createDocumentFragment();for(const p of parts){if(p.lang==='both'){fragment.append(doc.createTextNode(p.text));continue;}const span=doc.createElement('span');span.setAttribute('data-fc-only',p.lang);span.lang=p.lang==='zh'?'zh-Hans':'en';span.textContent=p.text;fragment.append(span);}n.replaceWith(fragment);}
 for(const block of Array.from(root.querySelectorAll('p,h1,h2,h3,h4,li,ul,ol,blockquote,div')).reverse()){if(block.querySelector('iframe,video,img'))continue;const langs=new Set(Array.from(block.querySelectorAll('[data-fc-only]')).map(n=>n.getAttribute('data-fc-only')));if(langs.size===1)block.setAttribute('data-fc-block',Array.from(langs)[0]);}
 root.setAttribute('data-fc-language-prepared','true');
}
if(typeof module!=='undefined'&&module.exports)module.exports={value,textParts,prepare};
if(typeof document==='undefined')return;
if(location.pathname.startsWith('/author/'))return;
let lang=window.FCLanguage?.get()||'zh';
const texts=new Map(),attrs=new Map(),reverse=new Map();
function translate(raw){const source=reverse.get(String(raw))??String(raw??''),out=value(source,lang);if(out!==source)reverse.set(out,source);return out;}
function assign(node,raw){const out=translate(raw);if(node.textContent!==out)node.textContent=out;if(node.childNodes.length===1&&node.firstChild.nodeType===3)texts.set(node.firstChild,String(raw??''));return out;}
function attr(node,key,raw){const out=translate(raw);if(node.getAttribute(key)!==out)node.setAttribute(key,out);if(!attrs.has(node))attrs.set(node,new Map());attrs.get(node).set(key,String(raw??''));return out;}
function paint(){document.documentElement.setAttribute('data-fc-language',lang);for(const[n,raw]of texts){if(!n.isConnected){texts.delete(n);continue;}const out=value(raw,lang);if(n.textContent!==out)n.textContent=out;}for(const[n,m]of attrs){if(!n.isConnected){attrs.delete(n);continue;}for(const[k,raw]of m){const out=value(raw,lang);if(n.getAttribute(k)!==out)n.setAttribute(k,out);}}
 const toggle=document.querySelector('#fc-language-switch button');if(toggle){toggle.textContent=lang==='zh'?'English':'Chinese';toggle.setAttribute('aria-label',lang==='zh'?'Switch to English':'Switch to Chinese');}
}
function set(next){lang=next==='en'?'en':'zh';window.FCLanguage?.set(lang);try{localStorage.setItem('fc-site-language',lang);localStorage.setItem('fc-testimonial-language',lang);}catch{}paint();window.dispatchEvent(new CustomEvent('fc:language',{detail:{language:lang}}));}
window.addEventListener('storage',e=>{if(e.key==='fc-site-language'&&['en','zh'].includes(e.newValue)&&e.newValue!==lang){lang=e.newValue;paint();window.dispatchEvent(new CustomEvent('fc:language',{detail:{language:lang}}));}});
window.FC_I18N={get:()=>lang,set,value:translate,assign,attr,prepare};
window.addEventListener('fc:language',e=>{if(['zh','en'].includes(e.detail?.language)&&lang!==e.detail.language){lang=e.detail.language;paint();}});
const style=document.createElement('style');style.id='fc-one-language-style';style.textContent=`html[data-fc-language="en"] [data-fc-only="zh"],html[data-fc-language="en"] [data-fc-block="zh"],html[data-fc-language="zh"] [data-fc-only="en"],html[data-fc-language="zh"] [data-fc-block="en"]{display:none!important}html[data-fc-language="en"] .fc-outline-zh,html[data-fc-language="zh"] .fc-outline-en{display:none!important}.fcl-category-en,.fcb-option-copy>small:not(.fcb-option-count),.fcb-body-label>span{display:none!important}html[data-fc-language="zh"] .fcb-region-en{display:none!important}#fc-language-switch{box-sizing:border-box;display:flex;align-items:center;justify-content:flex-end;padding:9px 18px;gap:12px;background:#f7f8f2;color:#254f43;font:15px/1.5 Arial,"Microsoft YaHei",sans-serif}#fc-language-switch button{min-height:42px;border:1px solid #b7c9bc;background:white;color:#254f43;padding:8px 17px;border-radius:22px;font:inherit;cursor:pointer}#fc-language-switch button:focus-visible{outline:3px solid #ba7d35;outline-offset:3px}`;document.head.append(style);paint();
function schoolCopy(){
 if(location.pathname==='/course/fc-daily-guide-pilot'||(location.pathname==='/path-player'&&new URL(location.href).searchParams.get('courseid')==='fc-daily-guide-pilot')){const title=lang==='en'?'FC Daily Wellbeing Guide':'FC 每日身心指南';if(document.title!==title)document.title=title;}
 if(location.pathname==='/course/assessment'){const title=lang==='en'?'FC Personal Wellbeing Check-in':'免费身心状态评估';if(document.title!==title)document.title=title;}
 const nav=document.getElementById('section_1564405797906_0');
 const roots=[nav,document.querySelector('.fcg-dialog')];if(location.pathname==='/course/assessment')roots.push(document.querySelector('#sectionsWrapper,.sectionsWrapper'));if(location.pathname==='/ai-assustant')roots.push(document.getElementById('fc-care-embed'),document.querySelector('summary'));if(location.pathname==='/start')roots.push(document.getElementById('history_1758239268946_738'));
 for(const root of roots){if(!root)continue;const walker=document.createTreeWalker(root,4);let n;while(n=walker.nextNode()){
  if(n.parentElement.closest('script,style,#fc-testimonial-reward,[data-fc-copy-root]'))continue;
  const raw=n.textContent,t=raw.trim();if(texts.has(n)&&raw===value(texts.get(n),lang))continue;
  if(exact.has(t)||(root===nav&&value(raw,lang)!==raw)){texts.set(n,raw);n.textContent=value(raw,lang);}
 }}
 // These are official theme captions already translated in the English home cards.
 const home=document.getElementById('fc-premium-home');if(home&&location.pathname==='/home-clone'){
  const walker=document.createTreeWalker(home,4);let n;while(n=walker.nextNode())if(!n.parentElement.closest('script,style')){const raw=n.textContent;if(/[\u3400-\u9fff]/.test(raw)&&exact.has(raw.trim())){if(n.parentElement.tagName==='P'&&n.parentElement.closest('#fcp-themes'))n.parentElement.hidden=true;else n.textContent=value(raw,'en');}}
 }
}
function mount(){schoolCopy();const legacy=document.getElementById('el_1761504169559_346');if(location.pathname==='/courseui-private'&&legacy)prepare(legacy);if(location.pathname==='/course/assessment'&&!document.getElementById('fc-language-switch')){const title=document.getElementById('el_1771027075771_355');if(title){const bar=document.createElement('div');bar.id='fc-language-switch';const button=document.createElement('button');button.type='button';button.onclick=()=>set(lang==='zh'?'en':'zh');bar.append(button);title.before(bar);paint();}}const player=location.pathname==='/path-player'&&['sound-healing','private-soundhealing','trial-soundhealing'].includes(new URL(location.href).searchParams.get('courseid')),detail=location.pathname.startsWith('/detail-'),library=location.pathname.startsWith('/courseui-');if(!player&&!detail&&!library)return;
 const target=player?document.getElementById('fc-player-tools'):detail?document.getElementById('el_1761234391437_607'):document.getElementById('fc-library');if(!target)return;
 if(!document.getElementById('fc-language-switch')){const bar=document.createElement('div');bar.id='fc-language-switch';const button=document.createElement('button');button.type='button';button.onclick=()=>set(lang==='zh'?'en':'zh');bar.append(button);target.before(bar);paint();}
 if(detail){prepare(target);const title=document.getElementById('el_1761234376531_579');if(title&&!title.hasAttribute('data-fc-language-prepared'))prepare(title);const intro=document.getElementById('el_1761234367074_567');if(intro&&!intro.hasAttribute('data-fc-language-prepared'))prepare(intro);const extra=document.getElementById('el_1791992999937_354');if(extra&&!extra.hasAttribute('data-fc-language-prepared'))prepare(extra);}
 // Only school navigation labels are handled here; never touch member comments.
 const nav=document.getElementById('section_1564405797906_0');if(nav){const walker=document.createTreeWalker(nav,4);let n;while(n=walker.nextNode()){if(texts.has(n))continue;const raw=n.textContent,t=raw.trim();if(exact.has(t)||(root===nav&&value(raw,lang)!==raw)){texts.set(n,raw);n.textContent=value(raw,lang);}}}
 if(library){document.querySelectorAll('.sectionsWrapper>section,#sectionsWrapper>section').forEach(section=>{if(section.contains(target)||section===nav||section.querySelector('form,input,textarea'))return;prepare(section);});}
}
style.textContent+='.fcg-dialog .fcg-en{display:none!important}';
style.textContent+='@media(min-width:1000px){html[data-fc-language="en"] #section_1564405797906_0 .lw-topbar-menu,html[data-fc-language="en"] #section_1564405797906_0 .lw-topbar-menu a,html[data-fc-language="en"] #section_1564405797906_0 .lw-topbar-menu span{font-size:15px!important}}';
function ready(){mount();new MutationObserver(schoolCopy).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();setInterval(mount,1500);
})();
