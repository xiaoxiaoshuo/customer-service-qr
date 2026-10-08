(function () {
  'use strict';

  var yearNode = document.getElementById('year');
  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }

  var hint = document.getElementById('save-hint');
  var hintTimer = null;

  function toast(message, ok) {
    if (!hint) return;
    hint.textContent = message;
    hint.style.color = ok === false ? '#ffb4b4' : '#79e6a6';
    if (hintTimer) window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(function () {
      hint.textContent = '';
    }, 4000);
  }

  function legacyCopy(text) {
    var input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', 'readonly');
    input.style.position = 'fixed';
    input.style.top = '-1000px';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, input.value.length);
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(input);
    return ok;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        /* 退回下面的兜底方案 */
      }
    }
    return legacyCopy(text);
  }

  var copyBtn = document.getElementById('copy-link');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      copyText(window.location.href).then(function (ok) {
        toast(ok ? '页面链接已复制，发给同事即可一起扫码' : '复制失败，请手动复制浏览器地址栏链接', ok);
      });
    });
  }

  var saveBtn = document.getElementById('save-qr');
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      var isTouch = window.matchMedia('(hover: none)').matches;
      toast(
        isTouch
          ? '已开始保存图片；若未自动下载，请长按二维码图片 → 保存图片'
          : '已开始下载二维码图片',
        true
      );
    });
  }

  var fab = document.getElementById('fab');
  var qrPanel = document.getElementById('qr-panel');
  if (fab && qrPanel && 'IntersectionObserver' in window) {
    var qrObserver = new IntersectionObserver(
      function (entries) {
        var visible = entries[0].isIntersecting;
        fab.style.opacity = visible ? '0' : '1';
        fab.style.pointerEvents = visible ? 'none' : 'auto';
      },
      { rootMargin: '-90px 0px -6% 0px', threshold: 0.35 }
    );
    qrObserver.observe(qrPanel);
  }

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.topbar__nav a'));
  if (navLinks.length && 'IntersectionObserver' in window) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (link) {
            link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    navLinks
      .map(function (link) {
        return document.querySelector(link.getAttribute('href'));
      })
      .filter(Boolean)
      .forEach(function (section) {
        sectionObserver.observe(section);
      });
  }
})();
