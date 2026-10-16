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

/* A focused mobile activation screen; the desktop screen and download logic stay intact. */
(function () {
  'use strict';
  var ua = navigator.userAgent || '';
  var hints = navigator.userAgentData;
  var macLike = /Mac/i.test(navigator.platform || '') || /Macintosh/i.test(ua) || (hints && /macOS/i.test(hints.platform || ''));
  var mobileDevice = /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(ua) ||
    (hints && hints.mobile === true) || (macLike && navigator.maxTouchPoints > 1);
  var narrow = window.matchMedia('(max-width: 767px)');
  var hero = document.querySelector('.hero');
  var qrImage = document.querySelector('.qr-card__img');
  var originalTitle = document.title;
  var originalAlt = qrImage ? qrImage.alt : '';

  function updateLayout() {
    var active = !!mobileDevice || narrow.matches;
    document.documentElement.classList.toggle('is-mobile-activation', active);
    document.title = active ? '添加微信，激活软件 · 云枢 Claw' : originalTitle;
    if (hero) hero.setAttribute('aria-labelledby', active ? 'activation-title' : 'hero-title');
    if (qrImage) {
      qrImage.alt = active ? '云龙虾客服微信二维码；在微信内长按识别，添加联系人后发送“激活软件”' : originalAlt;
      if (active) qrImage.setAttribute('aria-describedby', 'activation-press');
      else qrImage.removeAttribute('aria-describedby');
    }
  }

  updateLayout();
  if (narrow.addEventListener) narrow.addEventListener('change', updateLayout);
  else if (narrow.addListener) narrow.addListener(updateLayout);

  var save = document.getElementById('mobile-save-qr');
  var saveHint = document.getElementById('mobile-save-hint');
  if (save && saveHint) save.addEventListener('click', function () {
    saveHint.textContent = '若未弹出保存，请长按二维码图片保存，再从微信“扫一扫”的相册中识别。';
  });
  // No touch/contextmenu handlers: recognition is a native WeChat action, not a web API.
})();

/* Desktop downloads are isolated from the existing mobile/QR interactions. */
(function () {
  'use strict';

  var panel = document.getElementById('desktop-download');
  if (!panel) return;

  var ua = navigator.userAgent || '';
  var platform = navigator.platform || '';
  var hints = navigator.userAgentData;
  var hintPlatform = hints && typeof hints.platform === 'string' ? hints.platform : '';
  var macLike = /Mac/i.test(platform) || /Macintosh/i.test(ua) || /macOS/i.test(hintPlatform);
  var mobile = /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(ua) ||
    (hints && hints.mobile === true) || (macLike && navigator.maxTouchPoints > 1);
  if (mobile) return;

  var select = document.getElementById('download-platform');
  var primary = document.getElementById('download-primary');
  var label = document.getElementById('download-label');
  var status = document.getElementById('download-status');
  var desktop = window.matchMedia('(min-width: 768px)');
  var manual = false;
  var started = false;
  var settled = false;
  var timer = null;
  var selected = '';

  function choose(key, source) {
    var option = Array.prototype.find.call(select.options, function (item) { return item.value === key; });
    if (!option || !option.getAttribute('data-url')) return;
    selected = key;
    select.value = key;
    primary.href = option.getAttribute('data-url');
    primary.target = '_blank';
    primary.rel = 'noopener noreferrer';
    label.textContent = option.getAttribute('data-label');
    status.textContent = (source === 'manual' ? '已手动选择：' : '为你推荐：') + option.getAttribute('data-detail');
    panel.setAttribute('data-download-state', source);
  }

  function needsChoice(message) {
    selected = '';
    select.value = '';
    primary.setAttribute('href', '#download-platform');
    primary.removeAttribute('target');
    primary.removeAttribute('rel');
    label.textContent = '选择版本后下载';
    status.textContent = message;
    panel.setAttribute('data-download-state', 'choose');
  }

  select.addEventListener('change', function () {
    // Changing a selection never starts a download. Late detection cannot override it.
    manual = true;
    settled = true;
    if (timer !== null) window.clearTimeout(timer);
    if (select.value) choose(select.value, 'manual');
    else needsChoice('请选择版本，再点击下载按钮。');
  });

  primary.addEventListener('click', function (event) {
    if (selected) return; // A normal link handles the large cross-origin file; no fetch/blob.
    event.preventDefault();
    select.focus();
    if (typeof select.showPicker === 'function') {
      try { select.showPicker(); } catch (err) { /* Native keyboard selection still works. */ }
    }
  });

  function finishMacDetection(values) {
    if (settled || manual) return;
    settled = true;
    if (timer !== null) window.clearTimeout(timer);
    var architecture = values && typeof values.architecture === 'string' ? values.architecture.toLowerCase() : '';
    var bitness = values && typeof values.bitness === 'string' ? values.bitness : '';
    var reportedPlatform = values && typeof values.platform === 'string' ? values.platform : '';
    if (reportedPlatform && !/^macOS$/i.test(reportedPlatform)) {
      needsChoice('浏览器提供的系统信息不一致，请手动选择版本。');
    } else if (/^(arm|arm64|aarch64)$/.test(architecture) && bitness === '64') {
      choose('mac-arm64', 'detected');
    } else if (/^(x86|x64|x86_64|amd64)$/.test(architecture) && bitness === '64') {
      choose('mac-x64', 'detected');
    } else {
      // Intel-looking Safari/Firefox UAs and MacIntel also occur on Apple Silicon.
      needsChoice('已识别 macOS，但无法可靠判断芯片。请选择 Apple 芯片或 Intel 版。');
    }
  }

  function startDetection() {
    if (started || !desktop.matches) return;
    started = true;
    var os = hintPlatform ? (/^Windows$/i.test(hintPlatform) ? 'windows' : /^macOS$/i.test(hintPlatform) ? 'mac' : 'other') :
      /Windows|Win32|Win64/i.test(ua + ' ' + platform) ? 'windows' : macLike ? 'mac' : 'other';
    if ((os === 'mac' && /Windows|Win32|Win64/i.test(ua + ' ' + platform)) ||
        (os === 'windows' && macLike)) {
      needsChoice('浏览器提供的系统信息不一致，请手动选择版本。');
      return;
    }
    if (os === 'windows') {
      if (/ARM|aarch64/i.test(ua + ' ' + platform)) {
        needsChoice('当前仅提供 Windows x64 包，请确认设备兼容性后手动选择。');
      } else {
        choose('windows-x64', 'detected');
      }
      return;
    }
    if (os !== 'mac') {
      needsChoice('未识别到支持的桌面系统。当前提供 Windows 和 macOS 版本，请手动选择。');
      return;
    }
    needsChoice('已识别 macOS，正在判断芯片；也可以直接手动选择。');
    if (!hints || typeof hints.getHighEntropyValues !== 'function') {
      finishMacDetection(null);
      return;
    }
    timer = window.setTimeout(function () { finishMacDetection(null); }, 1200);
    try {
      Promise.resolve(hints.getHighEntropyValues(['architecture', 'bitness'])).then(finishMacDetection, function () {
        finishMacDetection(null);
      });
    } catch (err) {
      finishMacDetection(null);
    }
  }

  panel.hidden = false; // CSS also gates visibility; landscape phones/iPads returned above.
  startDetection();
  if (desktop.addEventListener) desktop.addEventListener('change', startDetection);
  else if (desktop.addListener) desktop.addListener(startDetection);
})();
