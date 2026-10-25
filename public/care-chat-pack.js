(() => {
  let language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'zh';
  function paint() {
    const english = language === 'en';
    document.documentElement.lang = english ? 'en' : 'zh-Hans';
    document.title = english ? 'Extra Chat Pack · FC' : '聊天加额包 · FC';
    document.getElementById('pack-title').textContent = english ? 'Extra Chat Pack' : '聊天加额包';
    document.getElementById('pack-intro').textContent = english ? 'A little more time to talk, whenever you choose.' : '想多聊一会儿，由你自己选择。';
    document.getElementById('back').textContent = english ? '← Care Chat' : '← 暖心聊聊';
    document.getElementById('back').href = '/care-chat.html?lang=' + language;
    document.getElementById('language').textContent = english ? '中文' : 'English';
    document.querySelectorAll('[data-language]').forEach(section => { section.hidden = section.dataset.language !== language; });
  }
  document.getElementById('language').onclick = () => { language = language === 'zh' ? 'en' : 'zh'; paint(); };
  paint();
})();
