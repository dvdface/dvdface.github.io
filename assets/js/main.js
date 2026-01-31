// 静态网站主脚本：首页文章卡片展开/收起
document.addEventListener('DOMContentLoaded', function () {
  var cards = document.querySelectorAll('.post-card[data-post-url]');
  cards.forEach(function (card) {
    var url = card.getAttribute('data-post-url');
    var preview = card.querySelector('.post-card-preview');
    var full = card.querySelector('.post-card-full');
    var expandBtn = card.querySelector('.post-card-expand');
    if (!url || !full || !expandBtn) return;

    expandBtn.addEventListener('click', function () {
      if (card.classList.contains('is-expanded')) {
        card.classList.remove('is-expanded');
        expandBtn.textContent = '展开';
        expandBtn.setAttribute('aria-expanded', 'false');
        full.setAttribute('aria-hidden', 'true');
        return;
      }

      if (full.querySelector('.article-body')) {
        card.classList.add('is-expanded');
        expandBtn.textContent = '收起';
        expandBtn.setAttribute('aria-expanded', 'true');
        full.setAttribute('aria-hidden', 'false');
        return;
      }

      expandBtn.disabled = true;
      expandBtn.textContent = '加载中…';
      fetch(url)
        .then(function (res) { return res.text(); })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var body = doc.querySelector('.article-body');
          if (body) {
            full.innerHTML = '';
            full.appendChild(body.cloneNode(true));
          }
          card.classList.add('is-expanded');
          expandBtn.disabled = false;
          expandBtn.textContent = '收起';
          expandBtn.setAttribute('aria-expanded', 'true');
          full.setAttribute('aria-hidden', 'false');
        })
        .catch(function () {
          expandBtn.disabled = false;
          expandBtn.textContent = '展开';
          full.innerHTML = '<p>加载失败，请<a href="' + url + '">点击阅读原文</a>。</p>';
        });
    });
  });
});
