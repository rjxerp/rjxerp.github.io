/* AI先知局 · 个人作品集 — 共享交互脚本
   原则：JS 只做增强。内容与链接在无 JS 时必须完整可用。
   动效三保险：no-js 兜底 + 3 秒强制显示 + prefers-reduced-motion */
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  /* ---------- 移动端导航抽屉 ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var mobileNav = document.querySelector(".mobile-nav");

  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("is-open");
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // 点击抽屉内链接后自动收起
    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileNav.classList.remove("is-open");
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- 滚动揭示 ---------- */
  var revealEls = document.querySelectorAll(".reveal");

  if (revealEls.length) {
    var reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if ("IntersectionObserver" in window && !reduceMotion) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );

      revealEls.forEach(function (el) {
        io.observe(el);
      });
    } else {
      revealEls.forEach(function (el) {
        el.classList.add("is-in");
      });
    }

    // 兜底：3 秒后强制全部显示，杜绝内容永久隐藏
    setTimeout(function () {
      revealEls.forEach(function (el) {
        if (!el.classList.contains("is-in")) {
          el.classList.add("is-in");
        }
      });
    }, 3000);
  }

  /* ---------- 当前导航高亮 ---------- */
  var page = document.body.getAttribute("data-page");
  if (page) {
    document.querySelectorAll('[data-nav="' + page + '"]').forEach(function (el) {
      el.classList.add("is-active");
      el.setAttribute("aria-current", "page");
    });
  }

  /* ---------- 联系表单：本地校验 + mailto 兜底 ---------- */
  var form = document.getElementById("contact-form");

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var nameEl = document.getElementById("cf-name");
      var contactEl = document.getElementById("cf-contact");
      var messageEl = document.getElementById("cf-message");
      var statusEl = document.getElementById("form-status");

      var name = (nameEl.value || "").trim();
      var contact = (contactEl.value || "").trim();
      var message = (messageEl.value || "").trim();

      if (!name || !contact || !message) {
        statusEl.textContent = "请填写完整姓名、联系方式与留言内容。";
        statusEl.className = "form-note form-note--error";
        return;
      }

      statusEl.textContent =
        "正在为你打开邮件客户端… 若未自动弹出，请直接发送邮件至 1988271@qq.com。";
      statusEl.className = "form-note form-note--ok";

      var subject = encodeURIComponent("作品集网站咨询 · " + name);
      var body = encodeURIComponent(
        "姓名：" + name + "\n联系方式：" + contact + "\n\n留言：\n" + message
      );
      window.location.href =
        "mailto:1988271@qq.com?subject=" + subject + "&body=" + body;
    });
  }

  /* ---------- 当前年份 ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
