const catalog = require('../data/assistant-catalog.json');
const { selectCandidates } = require('./assistant-recommendation');
const HOST = 'frequencies-clinic.learnworlds.com';
const SCHEMA = { type: 'object', additionalProperties: false,
  properties: { reply: { type: 'string' }, ids: { type: 'array', items: { type: 'string' }, maxItems: 3 } },
  required: ['reply', 'ids'] };
function safeUrl(value, player = false) {
  try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === HOST && !u.username && !u.password &&
    (player ? u.pathname === '/path-player' && !!u.searchParams.get('courseid') && !!u.searchParams.get('unit') : /^\/detail-[a-z0-9-]+$/.test(u.pathname)); }
  catch { return false; }
}
function candidatesFor(history) {
  // Only the current validated user context is searched locally; no second AI call.
  const text = history.filter(t => t.role === 'user').map(t => t.content).join('\n');
  const last = history.at(-1).content;
  if (/不要.{0,6}(建议|建議|推荐|推薦)|只想.{0,8}(说|說|聊|倾诉|傾訴)|no advice|just.{0,12}(listen|talk)|only.{0,12}(listen|talk)/i.test(last)) return [];
  return selectCandidates(text).filter(item => safeUrl(item.description_url) &&
    item.recordings.some(r => safeUrl(r.url, true))).slice(0, 6);
}
function parseSelection(raw, candidates, language) {
  let data;
  try { data = JSON.parse(raw); } catch { throw Error('invalid_chat_response'); }
  if (!data || typeof data.reply !== 'string' || !data.reply.trim() || data.reply.length > 1200 ||
      !Array.isArray(data.ids) || data.ids.length > 3 || data.ids.some(id => typeof id !== 'string') ||
      Object.keys(data).some(key => !['reply', 'ids'].includes(key))) throw Error('invalid_chat_response');
  const zh = language === 'zh', seen = new Set();
  const recommendations = data.ids.flatMap(id => {
    const item = candidates.find(candidate => candidate.id === id);
    // Reject invented IDs rather than quietly mapping them to another track.
    if (!item) throw Error('invalid_chat_response');
    if (!safeUrl(item.description_url) || !Array.isArray(item.recordings) || !item.recordings.some(r => safeUrl(r.url, true))) throw Error('invalid_chat_response');
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ id: item.id, name: zh ? item.name_zh || item.name_en : item.name_en, nameZh: item.name_zh || item.name_en, nameEn: item.name_en,
      reason: zh ? '与你刚才谈到的主题相近，可以按自己的感受选择。' : 'A listening theme related to what you shared; choose what feels comfortable.',
      usage: zh ? '先看这首音疗的使用说明，选择你会员可用的版本，按舒适音量聆听。' : 'Read this recording’s instructions, choose a version available to your membership and listen at a comfortable volume.',
      descriptionUrl: item.description_url,
      recordings: item.recordings.filter(r => safeUrl(r.url, true)).map(r => ({ label: r.label, version: r.version, course: r.course, url: r.url })),
      source: 'catalog-theme', catalogVersion: catalog.version }];
  });
  return { reply: data.reply.trim(), recommendations };
}
module.exports = { SCHEMA, candidatesFor, parseSelection, safeUrl };
