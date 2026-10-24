export const VERSION = 'fc-checkin-2026-10-v1';
export const RULES = 'fc-reflection-0.1.0';
export const pair = (zh, en) => ({ zh, en });
export const domains = [
  {id:'emotion', start:1, end:7, title:pair('情绪与心理感受','Emotions & thoughts'), subtitle:pair('留意最近心里发生的事。','Notice what has been on your mind.'), color:'#6f8a7c'},
  {id:'tension', start:8, end:13, title:pair('紧张相关的身体反应','Tension-related sensations'), subtitle:pair('这些回答反映感受，不是神经系统检查。','These are self-reported feelings, not a nervous-system examination.'),color:'#aa8564'},
  {id:'sleep', start:14, end:19, title:pair('睡眠与日常节奏','Sleep & daily rhythm'), subtitle:pair('从入睡到醒来，回顾自己的节奏。','Reflect on your rhythm, from falling asleep to waking up.'),color:'#81859a'},
  {id:'body', start:20, end:27, title:pair('身体不适','Physical discomfort'), subtitle:pair('感受值得被注意，原因需要专业判断。','Your experiences matter; identifying their cause may need professional advice.'),color:'#a47c73'},
  {id:'life', start:28, end:34, title:pair('饮食与生活影响','Food & everyday life'), subtitle:pair('看看这些感受如何影响日常。','Consider how these feelings affect everyday life.'),color:'#9a9673'},
  {id:'overall', start:35, end:37, title:pair('整体主观感受','Your overall experience'), subtitle:pair('这几题只记录你的感受，不代表疾病风险。','These questions reflect your experience, not your risk of disease.'),color:'#638b91'}
];
const rows = [
 ['感觉到焦虑、紧张、心里不安的感觉','Feeling anxious, tense or unsettled'],
 ['情绪容易被触发（生气、烦躁、火气上升）','Easily feeling angry, irritable or emotionally triggered'],
 ['情绪一来，很难靠自己冷静下来','Finding it difficult to calm down once emotions arise'],
 ['压力感很重，心里像被压着','Feeling weighed down by stress'],
 ['Overthinking（脑袋停不下来、想很多）','Overthinking or finding it hard to switch off your thoughts'],
 ['情绪压抑、忍着、不太表达','Holding feelings in rather than expressing them'],
 ['情绪波动对身体有明显影响（心跳、胸口、头晕）','Noticing bodily sensations with emotional changes, such as heartbeat, chest sensations or dizziness'],
 ['心跳容易加快（无明显运动时）','Noticing a faster heartbeat without obvious physical exertion'],
 ['血压容易升高或波动','Noticing elevated or changing blood pressure'],
 ['胸口闷、紧、压、痛','Chest tightness, pressure or pain'],
 ['被触发时会有“火往上冲”的感觉','Feeling a rush of heat when emotionally triggered'],
 ['紧张时会头晕、旋转感、轻飘感','Feeling dizzy, spinning or light-headed when tense'],
 ['身体很难真正放松','Finding it difficult to relax your body'],
 ['入睡困难','Difficulty falling asleep'],
 ['半夜容易醒','Waking during the night'],
 ['夜尿（半夜起床上厕所）','Waking during the night to pass urine'],
 ['半夜起床后很难再入眠','Difficulty returning to sleep after waking at night'],
 ['睡醒后仍然觉得累','Still feeling tired after waking'],
 ['白天精神不稳、容易疲惫','Variable energy or tiredness during the day'],
 ['头痛','Headaches'], ['头晕','Dizziness'], ['肩颈痛','Shoulder or neck pain'], ['胸痛','Chest pain'], ['背痛','Back pain'],
 ['身体紧绷/疼痛','Body tension or pain'], ['胃部不适、胃紧、胃胀','Stomach discomfort, tightness or bloating'],
 ['身体恢复力慢（休息了也恢复不多）','Feeling slow to recover even after rest'],
 ['食欲不稳（吃不下或乱吃）','Variable appetite, eating little or eating irregularly'],
 ['饮食后容易不舒服','Discomfort after eating'], ['情绪会影响我想吃什么、怎么吃','My emotions affect what and how I eat'],
 ['情绪状态影响工作表现','My emotional state affects my work'], ['情绪状态影响家庭或人际关系','My emotional state affects family or relationships'],
 ['身体状态影响工作表现','My physical state affects my work'], ['身体状态影响家庭或人际关系','My physical state affects family or relationships'],
 ['我觉得目前的状态已经影响生活品质','I feel my current state affects my quality of life'],
 ['我担心如果不调整，身体会出问题','I worry about my health if things do not change'],
 ['我觉得自己已经“撑很久了”','I feel I have been pushing through for a long time']
];
export const questions = rows.map(([zh,en],i)=>({id:`q${i+1}`,number:i+1,text:pair(zh,en)}));
export const goals = [
 {id:'sleep',label:pair('睡眠与休息','Sleep & rest')},
 {id:'emotion',label:pair('情绪与压力','Emotions & stress')},
 {id:'work',label:pair('工作与生活节奏','Work & daily rhythm')},
 {id:'relationships',label:pair('人际关系','Relationships')},
 {id:'body',label:pair('身体感受','Physical comfort')},
 {id:'other',label:pair('其他方向','Something else')}
];
export const phases = [
 {id:'stable',label:pair('生活稳定，想多了解自己','Life is stable; I want to understand myself')},
 {id:'transition',label:pair('正在过渡期，有点迷茫','In a transition and feeling unsure')},
 {id:'pressure',label:pair('正在经历压力或挑战','Facing stress or challenges')},
 {id:'growth',label:pair('状态还不错，想进一步提升','Doing reasonably well and seeking growth')}
];
export const recentStates = [
 {id:'sometimes',label:pair('大多时候还好，偶尔觉得卡住','Mostly okay, sometimes feeling stuck')},
 {id:'often',label:pair('常觉得疲惫或紧绷','Often tired or tense')},
 {id:'drained',label:pair('明显有消耗感','Noticeably feeling drained')},
 {id:'unclear',label:pair('说不清楚，但感觉不太对','Hard to describe, but something feels off')}
];
export const aims = [
 {id:'understand',label:pair('看清近期感受','Understand recent feelings')},
 {id:'patterns',label:pair('整理值得注意的地方','Notice patterns worth paying attention to')},
 {id:'next',label:pair('找到一个日常调整方向','Find a practical next step')}
];
