(() => {
  let language = window.FCLanguage?.get() || 'zh';
  function paint() {
    const english = language === 'en';
    document.documentElement.lang = english ? 'en' : 'zh-Hans';
    document.title = english ? 'Monthly chat allowance · FC' : '每月聊天额度 · FC';
    document.getElementById('pack-title').textContent = english ? 'Your monthly chat allowance' : '每月聊天额度';
    document.getElementById('pack-intro').textContent = english ? 'Keep making time for yourself.' : '照顾自己，慢慢来。';
    document.getElementById('back').textContent = english ? '← Care Chat' : '← 暖心聊聊';
    document.getElementById('back').href = '/care-chat.html?lang=' + language;
    document.getElementById('language').textContent = english ? 'Chinese' : 'English';
    document.querySelectorAll('[data-language]').forEach(section => { section.hidden = section.dataset.language !== language; });
  }
  document.getElementById('language').onclick = () => { language = language === 'zh' ? 'en' : 'zh'; window.FCLanguage?.set(language); paint(); };
  paint();
window.addEventListener('fc:language',e=>{if(e.detail?.language===language)return;language=e.detail.language;paint();});
})();
