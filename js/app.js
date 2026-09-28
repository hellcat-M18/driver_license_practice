(function () {
  "use strict";

  var QUIZ = window.QUIZ;
  var STORAGE_KEY = "riyu-gakka-v1";
  var EXAM_SIZE = 50;
  var EXAM_PASS_RATE = 0.9;
  var QUICK_SIZE = 10;

  var catName = {};
  QUIZ.categories.forEach(function (c) { catName[c.id] = c.name; });
  var byId = {};
  QUIZ.questions.forEach(function (q) { byId[q.id] = q; });

  // 法令名 → e-Gov法令検索のページ
  var LAW_LINKS = [
    { prefix: "道路交通法施行令", url: "https://laws.e-gov.go.jp/law/335CO0000000270" },
    { prefix: "道路交通法 ", url: "https://laws.e-gov.go.jp/law/335AC0000000105" },
  ];

  /* ---------- 学習記録（この端末のブラウザにだけ保存） ---------- */

  function loadStats() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : null;
      return data && data.stats ? data.stats : {};
    } catch (e) {
      return {};
    }
  }
  var stats = loadStats();

  function saveStats() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ stats: stats }));
    } catch (e) { /* 保存できない環境でも出題は続ける */ }
  }

  function record(id, correct) {
    var s = stats[id] || { n: 0, ok: 0 };
    s.n += 1;
    if (correct) s.ok += 1;
    s.last = correct;
    stats[id] = s;
    saveStats();
  }

  /* ---------- 画面 ---------- */

  var $ = function (id) { return document.getElementById(id); };
  var screens = ["home", "quiz", "result"];
  function show(name) {
    screens.forEach(function (s) { $(s).hidden = s !== name; });
    $("next-bar").hidden = true;
    window.scrollTo(0, 0);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "className") node.className = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function wrongIds() {
    return QUIZ.questions.filter(function (q) { return stats[q.id] && stats[q.id].last === false; })
      .map(function (q) { return q.id; });
  }

  function renderHome() {
    var total = QUIZ.questions.length;
    var answered = 0, attempts = 0, corrects = 0;
    QUIZ.questions.forEach(function (q) {
      var s = stats[q.id];
      if (!s) return;
      answered += 1;
      attempts += s.n;
      corrects += s.ok;
    });
    var wrong = wrongIds().length;
    var rate = attempts ? Math.round((corrects / attempts) * 100) + "%" : "—";

    var box = $("stats");
    box.textContent = "";
    [
      ["解いた問題", answered, " / " + total],
      ["正答率", rate, ""],
      ["要復習", wrong, "問"],
    ].forEach(function (item) {
      var value = el("span", { className: "stat-value", text: String(item[1]) });
      if (item[2]) value.appendChild(el("small", { text: item[2] }));
      box.appendChild(el("div", { className: "stat" }, [el("span", { className: "stat-label", text: item[0] }), value]));
    });

    $("mode-review").disabled = wrong === 0;
    $("mode-review-desc").textContent = wrong ? "前回まちがえた " + wrong + " 問" : "まだありません";

    var list = $("cats");
    list.textContent = "";
    QUIZ.categories.forEach(function (c) {
      var qs = QUIZ.questions.filter(function (q) { return q.cat === c.id; });
      var ok = 0, ng = 0;
      qs.forEach(function (q) {
        var s = stats[q.id];
        if (s && s.last === true) ok += 1;
        else if (s && s.last === false) ng += 1;
      });
      var bar = el("span", { className: "cat-bar", "aria-hidden": "true" }, [
        el("span", { className: "ok", style: "width:" + (ok / qs.length) * 100 + "%" }),
        el("span", { className: "ng", style: "width:" + (ng / qs.length) * 100 + "%" }),
      ]);
      var btn = el("button", { type: "button", className: "cat" }, [
        el("span", { className: "cat-name", text: c.name }),
        el("span", { className: "cat-count", text: ok + " / " + qs.length + " 正解" }),
        bar,
      ]);
      btn.addEventListener("click", function () {
        start(shuffle(qs.map(function (q) { return q.id; })), { label: c.name, exam: false });
      });
      list.appendChild(el("li", null, [btn]));
    });
  }

  /* ---------- 出題 ---------- */

  var session = null;

  function start(ids, opts) {
    if (!ids.length) return;
    session = { ids: ids, index: 0, answers: [], label: opts.label, exam: !!opts.exam };
    show("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    var q = byId[session.ids[session.index]];
    $("quiz-mode").textContent = session.label;
    $("quiz-count").textContent = session.index + 1 + " / " + session.ids.length;
    $("progress-fill").style.width = (session.index / session.ids.length) * 100 + "%";

    var chips = $("chips");
    chips.textContent = "";
    chips.appendChild(el("span", { className: "chip", text: catName[q.cat] }));
    if (q.tag) chips.appendChild(el("span", { className: "chip chip-new", text: "新ルール " + q.tag }));

    $("scene").hidden = !q.scene;
    $("scene").textContent = q.scene || "";
    $("question").textContent = q.q;

    ["ans-true", "ans-false"].forEach(function (id) {
      var b = $(id);
      b.disabled = false;
      b.className = "answer";
    });
    $("feedback").hidden = true;
    $("feedback").textContent = "";
    $("next-bar").hidden = true;
    window.scrollTo(0, 0);
  }

  function answer(value) {
    if (!session) return;
    var q = byId[session.ids[session.index]];
    if (session.answers.length > session.index) return; // 二度押し防止
    var correct = value === q.a;
    session.answers.push({ id: q.id, chosen: value, correct: correct });
    record(q.id, correct);

    var chosenBtn = value ? $("ans-true") : $("ans-false");
    var otherBtn = value ? $("ans-false") : $("ans-true");
    chosenBtn.disabled = true;
    otherBtn.disabled = true;

    var last = session.index === session.ids.length - 1;
    $("next").textContent = last ? "結果を見る" : "次の問題へ";

    if (session.exam) {
      // 模擬テストは本番と同じく、その場では正誤を出さない
      chosenBtn.classList.add("is-chosen");
      otherBtn.classList.add("is-dim");
      next();
      return;
    }

    var correctBtn = q.a ? $("ans-true") : $("ans-false");
    correctBtn.classList.add("is-correct");
    if (!correct) chosenBtn.classList.add("is-wrong");
    else otherBtn.classList.add("is-dim");

    var fb = $("feedback");
    fb.textContent = "";
    fb.appendChild(verdict(q, correct));
    fb.appendChild(explanation(q));
    fb.hidden = false;
    $("next-bar").hidden = false;
    fb.firstChild.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }

  function next() {
    if (!session) return;
    if (session.answers.length <= session.index) return;
    if (session.index < session.ids.length - 1) {
      session.index += 1;
      renderQuestion();
    } else {
      renderResult();
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function mark(value) { return value ? "○" : "✕"; }

  function verdict(q, correct) {
    var node = el("div", { className: "verdict " + (correct ? "ok" : "ng"), role: "status" });
    node.appendChild(el("span", { text: correct ? "正解" : "不正解" }));
    node.appendChild(el("small", { text: "答えは「" + mark(q.a) + "」" }));
    return node;
  }

  function block(kind, title, body) {
    return el("section", { className: "block block-" + kind }, [
      el("div", { className: "block-head" }, [
        el("span", { className: "sign sign-" + kind, "aria-hidden": "true" }),
        el("h4", { className: "block-title", text: title }),
      ]),
      body,
    ]);
  }

  function sourceItem(text) {
    var li = el("li");
    var link = null;
    for (var i = 0; i < LAW_LINKS.length; i++) {
      if (text.indexOf(LAW_LINKS[i].prefix) === 0) { link = LAW_LINKS[i].url; break; }
    }
    if (link) {
      li.appendChild(el("a", { href: link, target: "_blank", rel: "noopener", text: text }));
    } else {
      li.textContent = text;
    }
    return li;
  }

  function explanation(q) {
    var wrap = el("div", { className: "explain" });
    wrap.appendChild(block("rule", "正解のルール", el("p", { text: q.rule })));
    wrap.appendChild(block("why", "なぜこのルール？", el("p", { text: q.why })));
    wrap.appendChild(block("if", "もし逆だったら？", el("p", { text: q.ifNot })));
    if (q.num) wrap.appendChild(block("num", "数字の意味", el("p", { text: q.num })));
    if (q.trap) wrap.appendChild(block("trap", "ひっかけ注意", el("p", { text: q.trap })));
    wrap.appendChild(block("src", "根拠", el("ul", { className: "src-list" }, q.src.map(sourceItem))));
    wrap.appendChild(el("p", {
      className: "explain-note",
      text: "「正解のルール」「根拠」は法令・教則の内容です。「なぜ」「もし逆だったら」「数字の意味」は理解のための解説です。",
    }));
    return wrap;
  }

  /* ---------- 結果 ---------- */

  function renderResult() {
    var answers = session.answers;
    var ok = answers.filter(function (a) { return a.correct; }).length;
    var total = answers.length;
    $("progress-fill").style.width = "100%";

    var score = $("score");
    score.textContent = "";
    var main = el("div", { className: "score-main", text: String(ok) });
    main.appendChild(el("small", { text: " / " + total + " 問正解" }));
    score.appendChild(main);
    if (session.exam) {
      var pass = ok >= Math.ceil(total * EXAM_PASS_RATE);
      score.appendChild(el("div", {
        className: "score-pass " + (pass ? "ok" : "ng"),
        text: pass ? "合格ライン（9割）に届いています" : "合格ライン（9割＝" + Math.ceil(total * EXAM_PASS_RATE) + "問）まであと " + (Math.ceil(total * EXAM_PASS_RATE) - ok) + " 問",
      }));
      score.appendChild(el("p", {
        className: "score-note",
        text: "本番は文章問題90問＋イラスト問題5問の100点満点で、90点以上が合格です。",
      }));
    } else {
      score.appendChild(el("p", { className: "score-note", text: session.label }));
    }

    var wrong = answers.filter(function (a) { return !a.correct; });
    $("retry-wrong").hidden = wrong.length === 0;

    var list = $("review");
    list.textContent = "";
    // 間違えた問題を先に並べる
    var ordered = wrong.concat(answers.filter(function (a) { return a.correct; }));
    ordered.forEach(function (a) {
      var q = byId[a.id];
      var summary = el("summary", null, [
        el("span", { className: "mark " + (a.correct ? "ok" : "ng"), text: a.correct ? "正解" : "不正解" }),
        el("span", { className: "review-q", text: (q.scene ? "【場面】" + q.scene + " " : "") + q.q }),
      ]);
      var body = el("div", null, [
        el("p", { className: "review-ans", text: "あなたの答え「" + mark(a.chosen) + "」／ 正解「" + mark(q.a) + "」" }),
        explanation(q),
      ]);
      var details = el("details", null, [summary, body]);
      list.appendChild(el("li", null, [details]));
    });

    show("result");
  }

  /* ---------- 操作 ---------- */

  $("ans-true").addEventListener("click", function () { answer(true); });
  $("ans-false").addEventListener("click", function () { answer(false); });
  $("next").addEventListener("click", next);
  $("quit").addEventListener("click", function () { session = null; renderHome(); show("home"); });
  $("to-home").addEventListener("click", function () { session = null; renderHome(); show("home"); });
  $("retry-wrong").addEventListener("click", function () {
    var ids = session.answers.filter(function (a) { return !a.correct; }).map(function (a) { return a.id; });
    start(shuffle(ids), { label: "間違えた問題をもう一度", exam: false });
  });

  $("mode-quick").addEventListener("click", function () {
    start(shuffle(Object.keys(byId)).slice(0, QUICK_SIZE), { label: "おまかせ10問", exam: false });
  });
  $("mode-exam").addEventListener("click", function () {
    start(shuffle(Object.keys(byId)).slice(0, EXAM_SIZE), { label: "模擬テスト50問", exam: true });
  });
  $("mode-review").addEventListener("click", function () {
    start(shuffle(wrongIds()), { label: "間違えた問題", exam: false });
  });
  $("mode-new").addEventListener("click", function () {
    var ids = QUIZ.questions.filter(function (q) { return q.tag; }).map(function (q) { return q.id; });
    start(shuffle(ids), { label: "2026年の新ルール", exam: false });
  });

  $("reset").addEventListener("click", function () { $("reset-confirm").hidden = false; });
  $("reset-no").addEventListener("click", function () { $("reset-confirm").hidden = true; });
  $("reset-yes").addEventListener("click", function () {
    stats = {};
    saveStats();
    $("reset-confirm").hidden = true;
    renderHome();
  });

  // キーボード: O/1 = ○、X/2 = ✕、Enter = 次へ
  document.addEventListener("keydown", function (e) {
    if ($("quiz").hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (k === "o" || k === "1") answer(true);
    else if (k === "x" || k === "2") answer(false);
    else if (k === "enter" && !$("next-bar").hidden && document.activeElement !== $("next")) next();
  });

  renderHome();
  show("home");
})();
