(() => {
  "use strict";
  const world = document.getElementById("technology-world");
  if (!world) return;
  const root = document.documentElement;
  const scene = document.getElementById("technology-scene");
  const video = document.getElementById("technology-video");
  const toggle = document.getElementById("technology-video-toggle");
  const buttons = [...world.querySelectorAll("[data-tech]")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const category = document.getElementById("technology-category");
  const name = document.getElementById("technology-name");
  const description = document.getElementById("technology-description");
  const related = document.getElementById("technology-related");
  const technologies = {
    java: ["01 / BACKEND", "Java", "后端开发的主线。围绕 Spring 生态，关注接口设计、业务边界、并发处理与服务之间的数据流转。", ["Spring Boot", "Spring Cloud", "Spring Security"]],
    go: ["01 / BACKEND", "Go", "用更直接的语言组织服务与 Web API。关注 goroutine、并发协作，以及清晰、易追踪的执行链路。", ["Web API", "并发", "服务开发"]],
    python: ["01 / BACKEND & TOOLING", "Python", "把重复工作交给脚本。用于工具编写、任务自动化与 AI 应用周边探索，连接零散的数据和工作步骤。", ["脚本与工具", "自动化", "AI 应用"]],
    spring: ["01 / BACKEND", "Spring Boot", "Java 服务的应用框架。围绕 Web 接口、配置、鉴权与服务协作，把业务逻辑组织成可维护的应用。", ["Spring", "Spring Cloud", "Spring Security"]],
    mysql: ["01 / DATA", "MySQL", "关系型数据的基础。关注表结构、查询、索引与事务，让业务数据的读写和边界更清楚。", ["SQL", "索引", "事务"]],
    redis: ["01 / DATA", "Redis", "围绕缓存与共享状态，思考性能、过期、并发与一致性。让快速访问与正确的数据边界一起成立。", ["缓存", "过期策略", "一致性"]],
    langchain: ["02 / AI & AGENT EXPLORATION", "LangChain4j", "探索 Java 生态的 AI 应用与 Agent。连接模型、检索与工具，让一次回答逐步成为能执行、能反馈的任务。", ["Tool Calling", "LangGraph4j", "Multi-Agent"]],
    springai: ["02 / AI & AGENT EXPLORATION", "Spring AI", "探索把模型能力接入熟悉的 Spring 应用：从模型接口、提示词与向量检索，到有业务上下文的 AI 功能。", ["模型接入", "Prompt", "检索增强"]],
    rag: ["02 / CONTEXT", "RAG", "先检索，再生成。把与问题相关的资料补进上下文，让回答有依据，并持续关注检索质量和上下文的组织。", ["检索增强生成", "Context", "Memory"]],
    mcp: ["02 / TOOLS & AGENT", "MCP", "探索模型与工具、资源之间的连接方式。同时关注 Agent 的工具编排、执行边界、反馈与可观测性。", ["Tool Calling", "Agent Harness", "Evals"]],
    vue: ["03 / FRONTEND", "Vue", "用组件与状态组织界面。把后端能力连接到页面，让加载、输入、反馈与交互都有清楚的表达。", ["组件化", "界面状态", "响应式交互"]],
    javascript: ["03 / FRONTEND", "JavaScript", "连接页面结构与用户动作。围绕 DOM、事件与状态，把静态页面变成可以操作、会给出反馈的体验。", ["DOM", "事件", "状态"]],
    htmlcss: ["03 / FRONTEND", "HTML / CSS", "用结构建立信息层级，用样式、响应式布局与动效表达界面。在不同屏幕上保持清楚、舒适和可用。", ["语义结构", "响应式布局", "样式与动效"]]
  };
  let selected = "java";
  let visible = false;
  let userPaused = false;
  let blocked = false;
  let playPending = false;
  let destroyed = false;
  const motionPaused = () => reduced.matches || root.dataset.motion === "reduced" || root.dataset.suspended === "true";

  function selectTechnology(key) {
    if (!technologies[key] || key === selected) return;
    selected = key;
    const data = technologies[key];
    buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.tech === key)));
    category.textContent = data[0];
    name.textContent = data[1];
    description.textContent = data[2];
    related.replaceChildren(...data[3].map(text => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    }));
    world.dataset.selected = key;
  }
  buttons.forEach(button => button.addEventListener("click", () => selectTechnology(button.dataset.tech)));

  function syncButton() {
    const paused = motionPaused() || userPaused || blocked;
    const label = motionPaused() ? "已跟随页面暂停" : blocked ? "播放人物视频" : userPaused ? "播放视频" : "暂停视频";
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("aria-disabled", String(motionPaused()));
    toggle.querySelector(".technology-play-label").textContent = label;
    toggle.querySelector(".technology-play-icon").textContent = paused ? "▷" : "Ⅱ";
    world.dataset.playback = motionPaused() ? "reduced" : blocked ? "blocked" : userPaused ? "paused" : visible && !document.hidden ? "playing" : "offscreen";
  }
  function shouldPlay() {
    return !destroyed && visible && !document.hidden && !motionPaused() && !userPaused;
  }
  async function syncPlayback(explicit = false) {
    if (!shouldPlay()) {
      video.pause();
      syncButton();
      return;
    }
    if (blocked && !explicit) { syncButton(); return; }
    if (!video.getAttribute("src")) {
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute("src", video.dataset.src);
      video.load();
    }
    if (!video.paused || playPending) { syncButton(); return; }
    playPending = true;
    try {
      await video.play();
      blocked = false;
      if (!shouldPlay()) video.pause();
    } catch (error) {
      if (shouldPlay() && error.name !== "AbortError") blocked = true;
    } finally {
      playPending = false;
      if (shouldPlay() && video.paused && !blocked) queueMicrotask(() => syncPlayback());
      syncButton();
    }
  }
  video.addEventListener("playing", () => {
    scene.dataset.videoReady = "true";
    syncButton();
  });
  video.addEventListener("error", () => {
    blocked = true;
    scene.dataset.videoReady = "false";
    syncButton();
  });
  toggle.addEventListener("click", () => {
    if (motionPaused()) return;
    userPaused = blocked ? false : !userPaused;
    syncPlayback(true);
  });
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    syncPlayback();
  }, { threshold: 0, rootMargin: "80px" });
  observer.observe(scene);
  const rootObserver = new MutationObserver(() => syncPlayback());
  rootObserver.observe(root, { attributes: true, attributeFilter: ["data-motion", "data-suspended"] });
  reduced.addEventListener("change", () => syncPlayback());
  document.addEventListener("visibilitychange", () => syncPlayback());
  addEventListener("pagehide", event => {
    video.pause();
    if (!event.persisted) {
      destroyed = true;
      observer.disconnect();
      rootObserver.disconnect();
    }
  });
  addEventListener("pageshow", event => { if (event.persisted) syncPlayback(); });
  world.dataset.selected = selected;
  syncButton();
})();
