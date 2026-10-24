// Conservative routing for content selection; this is not clinical triage.
const fields = {
  onset: [
    "什么时候开始的？持续多久、多久出现一次？",
    "When did it start, how long has it lasted, and how often does it happen?",
  ],
  impact: [
    "它怎样影响睡眠、工作或日常活动？",
    "How does it affect sleep, work or daily activities?",
  ],
  detail: [
    "除了累，还会困、睡不好、情绪低落，还是身体不舒服？",
    "Alongside tiredness, is there sleepiness, poor sleep, low mood or physical discomfort?",
  ],
  medical: [
    "有没有受伤、看医生或确诊？正在用药吗？不知道也可以说明。",
    "Any injury, medical assessment, diagnosis or current medication? It is fine to say you do not know.",
  ],
  goal: [
    "你希望探索睡眠、压力、专注、情绪，还是日常放松？",
    "Would you like to explore sleep, stress, focus, mood or everyday relaxation?",
  ],
};
function validateIntake(value) {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("invalid_intake");
  const out = {};
  for (const [key, text] of Object.entries(value)) {
    if (
      !Object.hasOwn(fields, key) ||
      typeof text !== "string" ||
      text.length > 400
    )
      throw Error("invalid_intake");
    if (text.trim()) out[key] = text.trim();
  }
  return out;
}
function screenInLanguage(message, intake = {}, language = "zh") {
  const zh = language !== "en",
    text = [message, ...Object.values(intake)]
      .join("\n")
      .normalize("NFKC")
      .toLowerCase();
  if (/自杀|自殺|伤害自己|傷害自己|kill myself|suicid|self.harm/i.test(text))
    return {
      status: "safety",
      recommendations: [],
      questions: [],
      message: zh
        ? "你现在的安全最重要。如果可能马上伤害自己，请立即联系当地急救，尽量不要独处，并联系一个你信任的人陪着你。先把可能伤害你的物品移远，不要等待音疗推荐。即使没有立即危险，也请尽快联系心理健康专业人员获得支持。"
        : "Your safety matters most. If you might hurt yourself now, contact local emergency services, avoid being alone and ask someone you trust to stay with you. Move away from things you could use to hurt yourself rather than waiting for audio. Even without immediate danger, reach out to a mental health professional for support.",
    };
  // Do not treat a reassuring checkbox or a reported old injury as clearance.
  const chest =
    /胸.{0,4}(痛|闷|悶|压迫|壓迫)|chest.{0,15}(pain|tight|pressure)/i.test(
      text,
    );
  const breathing =
    /呼吸(困难|困難)|喘不过气|喘不過氣|不能呼吸|无法呼吸|無法呼吸|can.?t breathe|cannot breathe|short(ness)? of breath|difficulty breathing/i.test(
      text,
    );
  const otherUrgent =
    /突然.{0,8}(无力|無力|说不清|說不清|看不见|看不見|剧烈头痛|劇烈頭痛)|脸.{0,3}(歪|下垂)|face droop|sudden.{0,15}(weakness|vision loss|severe headache)|喉咙.{0,3}肿|喉嚨.{0,3}腫|throat.{0,8}swell|吐血|呕血|嘔血|便血|昏倒|晕倒|暈倒|faint(ed|ing)|overdose|自杀|自殺|伤害自己|傷害自己|kill myself|suicid|self.harm/i.test(
      text,
    );
  if (chest || breathing || otherUrgent)
    return {
      status: "safety",
      recommendations: [],
      questions: [],
      message: zh
        ? "先处理安全：你提到了可能需要及时医疗评估的症状。若症状正在发生、突然出现、持续或加重，尤其伴呼吸困难、冷汗、晕厥或突然无力，请立即联系当地急救，不要等待音疗。即使已经缓解或曾经受伤，也请让医生核查原因。"
        : "Please put safety first. You mentioned symptoms that may need prompt medical assessment. If they are happening now, sudden, persistent or worsening, especially with breathlessness, sweating, fainting or sudden weakness, contact local emergency services immediately rather than waiting for audio. Even if symptoms have settled or followed an injury, ask a clinician to assess the cause.",
    };
  const physical =
    /疼|痛|受伤|受傷|发炎|發炎|发烧|發燒|头晕|頭暈|肿|腫|咳|哮喘|血压|血壓|血糖|糖尿|心脏|心臟|癌|疫苗|pain|injur|inflamm|fever|dizz|asthma|diabet|blood pressure|cancer|vaccine|detox/i.test(
      text,
    );
  const fatigue = /很累|太累|疲惫|疲憊|疲劳|疲勞|tired|fatigue|exhaust/i.test(
    message,
  );
  const specific =
    /睡|压力|壓力|焦虑|焦慮|工作|读书|讀書|情绪|情緒|专注|專注|sleep|stress|work|study|focus|mood/i.test(
      text,
    );
  let needed = [];
  if (physical) needed = ["onset", "impact", "medical", "goal"];
  else if (fatigue && !specific) needed = ["onset", "detail", "impact"];
  else if (message.trim().length < 8) needed = ["goal", "impact"];
  needed = needed.filter((id) => !intake[id]);
  if (needed.length)
    return {
      status: "clarify",
      recommendations: [],
      message: zh
        ? "先补充几句，让我们更清楚你的需要。不知道的地方可以写「不确定」，不用提供姓名或联系方式。"
        : "Please add a little context so we understand your needs. You can say ‘not sure’; please omit names and contact details.",
      questions: needed.map((id) => ({ id, label: fields[id][zh ? 0 : 1] })),
    };
  // Completing questions never establishes that an unexplained physical symptom is safe.
  if (
    physical &&
    !/放松|放鬆|平静|平靜|relax|calm|sleep routine|睡前习惯|睡前習慣/i.test(
      intake.goal || "",
    )
  )
    return {
      status: "medical",
      recommendations: [],
      questions: [],
      message: zh
        ? "身体不适的原因需要医护人员评估，不能靠音疗选择来判断病情或替代治疗。请继续医生安排的治疗；症状持续或加重时及时求医。如果你另外希望探索日常放松，可以在「想关注的主题」中说明。"
        : "A clinician needs to assess the cause of physical symptoms. Choosing audio cannot establish a diagnosis or replace treatment. Continue prescribed care and seek help for persistent or worsening symptoms. If you also want everyday relaxation, say so in your listening goal.",
    };
  return null;
}
function screen(message, intake = {}, language = "zh") {
  const result = screenInLanguage(message, intake, language);
  if (!result) return null;
  const zh = language !== "en",
    other = screenInLanguage(message, intake, zh ? "en" : "zh");
  result.translations = {
    [result.message]: {
      zh: zh ? result.message : other.message,
      en: zh ? other.message : result.message,
    },
  };
  result.questions = result.questions.map((q) => ({
    ...q,
    zh: fields[q.id][0],
    en: fields[q.id][1],
  }));
  return result;
}
module.exports = { screen, validateIntake, fields };
