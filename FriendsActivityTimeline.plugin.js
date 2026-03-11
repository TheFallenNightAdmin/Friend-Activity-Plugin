/**
 * @name Friend Activity Timeline
 * @author pagoni meow
 * @description A floating overlay showing a live scrollable feed of everything your friends do — games, status changes, voice, and streams.
 * @version 1.0.0
 */

module.exports = class FriendActivityTimeline {
  constructor() {
    this.events = [];
    this.maxEvents = 100;
    this.visible = true;
    this.dragging = false;
    this.dragOffX = 0;
    this.dragOffY = 0;
    this.snapshots = new Map();
    this.pollTimer = null;
    this.POLL_MS = 5000;
    this.settings = { x: null, y: null, opacity: 90, maxItems: 40, showGames: true, showStatus: true, showVoice: true, showStreams: true };
  }

  getName()        { return "FriendActivityTimeline"; }
  getAuthor()      { return "pagoni meow"; }
  getVersion()     { return "1.0.0"; }
  getDescription() { return "Live floating feed of your friends' activity — games, status, voice, streams."; }

  load() {
    try {
      const s = BdApi.getData("FriendActivityTimeline", "settings");
      if (s) Object.assign(this.settings, s);
    } catch (_) {}
  }

  save() {
    BdApi.saveData("FriendActivityTimeline", "settings", this.settings);
  }

  start() {
    this.load();
    this.injectCSS();
    this.buildOverlay();
    this.startPolling();
    this.addToggleButton();
  }

  stop() {
    this.stopPolling();
    this.removeOverlay();
    this.removeToggleButton();
    BdApi.clearCSS("FriendActivityTimeline");
  }

  getRelStore()    { return BdApi.findModuleByProps("getRelationships", "getFriendIDs"); }
  getUserStore()   { return BdApi.findModuleByProps("getUser", "getCurrentUser"); }
  getPresStore()   { return BdApi.findModuleByProps("getStatus", "getActivities"); }
  getVoiceStore()  { return BdApi.findModuleByProps("getVoiceStates", "getVoiceStateForUser"); }

  startPolling() {
    this.poll();
    this.pollTimer = setInterval(() => this.poll(), this.POLL_MS);
  }

  stopPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  poll() {
    try {
      const relStore  = this.getRelStore();
      const userStore = this.getUserStore();
      const presStore = this.getPresStore();
      const voiceStore= this.getVoiceStore();
      if (!relStore || !userStore || !presStore) return;

      const friendIds = relStore.getFriendIDs ? relStore.getFriendIDs() : [];

      friendIds.forEach(id => {
        const user = userStore.getUser(id);
        if (!user) return;
        const name = user.globalName || user.username;
        const avatar = user.avatar
          ? "https://cdn.discordapp.com/avatars/" + id + "/" + user.avatar + ".png?size=32"
          : "https://cdn.discordapp.com/embed/avatars/" + (parseInt(id) % 5) + ".png";

        const prev = this.snapshots.get(id) || {};
        const status    = presStore.getStatus ? presStore.getStatus(id) : null;
        const activities= presStore.getActivities ? presStore.getActivities(id) : [];
        const game      = activities.find(a => a.type === 0);
        const stream    = activities.find(a => a.type === 1);
        const vsState   = voiceStore && voiceStore.getVoiceStateForUser ? voiceStore.getVoiceStateForUser(id) : null;
        const voiceCh   = vsState ? vsState.channelId : null;

        if (this.settings.showStatus && status && status !== prev.status) {
          if (prev.status !== undefined) this.push({ type: "status", name, avatar, status, id });
        }

        if (this.settings.showGames) {
          const gameName = game ? game.name : null;
          if (gameName !== prev.game) {
            if (gameName) this.push({ type: "game_start", name, avatar, game: gameName, id });
            else if (prev.game) this.push({ type: "game_stop", name, avatar, game: prev.game, id });
          }
        }

        if (this.settings.showStreams) {
          const isStreaming = !!stream;
          if (isStreaming && !prev.streaming) this.push({ type: "stream_start", name, avatar, id });
          else if (!isStreaming && prev.streaming) this.push({ type: "stream_stop", name, avatar, id });
        }

        if (this.settings.showVoice) {
          if (voiceCh && voiceCh !== prev.voiceCh) this.push({ type: "voice_join", name, avatar, id });
          else if (!voiceCh && prev.voiceCh) this.push({ type: "voice_leave", name, avatar, id });
        }

        this.snapshots.set(id, { status, game: game ? game.name : null, streaming: !!stream, voiceCh });
      });
    } catch (e) {}
  }

  push(event) {
    event.ts = Date.now();
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) this.events.pop();
    this.renderFeed();
  }

  label(e) {
    const icons = {
      status:       { online: ["🟢", "came online"], idle: ["🌙", "went idle"], dnd: ["🔴", "set DND"], offline: ["⚫", "went offline"] },
      game_start:   ["🎮", "started playing " + e.game],
      game_stop:    ["🎮", "stopped playing " + e.game],
      stream_start: ["📡", "started streaming"],
      stream_stop:  ["📡", "stopped streaming"],
      voice_join:   ["🔊", "joined voice"],
      voice_leave:  ["🔇", "left voice"],
    };
    if (e.type === "status") {
      const s = icons.status[e.status] || ["⚪", "changed status to " + e.status];
      return { icon: s[0], text: s[1] };
    }
    const s = icons[e.type] || ["•", e.type];
    return { icon: s[0], text: s[1] };
  }

  timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)  return s + "s ago";
    if (s < 3600) return Math.floor(s/60) + "m ago";
    return Math.floor(s/3600) + "h ago";
  }

  renderFeed() {
    const feed = document.getElementById("fat-feed");
    if (!feed) return;
    const slice = this.events.slice(0, this.settings.maxItems);
    if (slice.length === 0) {
      feed.innerHTML = "<div class='fat-empty'>No activity yet\u2026<br><span>Waiting for friends to do stuff</span></div>";
      return;
    }
    feed.innerHTML = slice.map((e, i) => {
      const { icon, text } = this.label(e);
      return (
        "<div class='fat-row' style='animation-delay:" + (i * 0.03) + "s'>" +
          "<img class='fat-avatar' src='" + e.avatar + "' onerror=\"this.src='https://cdn.discordapp.com/embed/avatars/0.png'\">" +
          "<div class='fat-info'>" +
            "<span class='fat-name'>" + this.esc(e.name) + "</span>" +
            "<span class='fat-action'>" + icon + " " + this.esc(text) + "</span>" +
          "</div>" +
          "<span class='fat-time'>" + this.timeAgo(e.ts) + "</span>" +
        "</div>"
      );
    }).join("");
  }

  esc(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  buildOverlay() {
    const old = document.getElementById("fat-overlay");
    if (old) old.remove();

    const W = 300, H = 420;
    const x = this.settings.x !== null ? this.settings.x : window.innerWidth  - W - 20;
    const y = this.settings.y !== null ? this.settings.y : window.innerHeight - H - 60;

    const overlay = document.createElement("div");
    overlay.id = "fat-overlay";
    overlay.style.cssText = "left:" + x + "px;top:" + y + "px;opacity:" + (this.settings.opacity/100) + ";";

    overlay.innerHTML = (
      "<div id='fat-header'>" +
        "<div id='fat-title'><span id='fat-pulse'></span>Friend Activity</div>" +
        "<div id='fat-controls'>" +
          "<button class='fat-btn' id='fat-clear' title='Clear'>&#10005;</button>" +
          "<button class='fat-btn' id='fat-hide'  title='Hide'>\u2212</button>" +
        "</div>" +
      "</div>" +
      "<div id='fat-feed'><div class='fat-empty'>No activity yet\u2026<br><span>Waiting for friends to do stuff</span></div></div>" +
      "<div id='fat-footer'>" +
        "<span id='fat-count'>0 events</span>" +
        "<span id='fat-refresh'>Live \u2022 " + (this.POLL_MS/1000) + "s</span>" +
      "</div>"
    );

    document.body.appendChild(overlay);

    overlay.querySelector("#fat-header").addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("fat-btn")) return;
      this.dragging = true;
      const rect = overlay.getBoundingClientRect();
      this.dragOffX = e.clientX - rect.left;
      this.dragOffY = e.clientY - rect.top;
      overlay.style.transition = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.dragging) return;
      const nx = Math.max(0, Math.min(window.innerWidth  - overlay.offsetWidth,  e.clientX - this.dragOffX));
      const ny = Math.max(0, Math.min(window.innerHeight - overlay.offsetHeight, e.clientY - this.dragOffY));
      overlay.style.left = nx + "px";
      overlay.style.top  = ny + "px";
    });

    document.addEventListener("mouseup", () => {
      if (!this.dragging) return;
      this.dragging = false;
      overlay.style.transition = "";
      const rect = overlay.getBoundingClientRect();
      this.settings.x = Math.round(rect.left);
      this.settings.y = Math.round(rect.top);
      this.save();
    });

    overlay.querySelector("#fat-clear").addEventListener("click", () => {
      this.events = [];
      this.renderFeed();
      this.updateFooter();
    });

    overlay.querySelector("#fat-hide").addEventListener("click", () => {
      const feed   = document.getElementById("fat-feed");
      const footer = document.getElementById("fat-footer");
      const btn    = document.getElementById("fat-hide");
      const collapsed = feed.style.display === "none";
      feed.style.display   = collapsed ? "" : "none";
      footer.style.display = collapsed ? "" : "none";
      btn.innerHTML = collapsed ? "\u2212" : "\u25A1";
    });

    setInterval(() => this.updateFooter(), 10000);
    this.updateFooter();
  }

  updateFooter() {
    const el = document.getElementById("fat-count");
    if (el) el.textContent = this.events.length + " event" + (this.events.length !== 1 ? "s" : "");
    const feed = document.getElementById("fat-feed");
    if (feed && this.events.length > 0) {
      feed.querySelectorAll(".fat-time").forEach((el, i) => {
        if (this.events[i]) el.textContent = this.timeAgo(this.events[i].ts);
      });
    }
  }

  removeOverlay() {
    const el = document.getElementById("fat-overlay");
    if (el) el.remove();
  }

  addToggleButton() {
    const old = document.getElementById("fat-toggle");
    if (old) old.remove();
    const btn = document.createElement("div");
    btn.id = "fat-toggle";
    btn.title = "Friend Activity Timeline";
    btn.innerHTML = "<svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 3.6-7 8-7s8 3 8 7'/></svg>";
    btn.addEventListener("click", () => {
      const overlay = document.getElementById("fat-overlay");
      if (!overlay) return this.buildOverlay();
      overlay.style.display = overlay.style.display === "none" ? "" : "none";
    });
    const toolbar = document.querySelector("[class*='toolbar']") || document.querySelector("[class*='guilds']");
    if (toolbar) toolbar.prepend(btn);
    else document.body.appendChild(btn);
  }

  removeToggleButton() {
    const el = document.getElementById("fat-toggle");
    if (el) el.remove();
  }

  injectCSS() {
    BdApi.injectCSS("FriendActivityTimeline", `
      #fat-overlay {
        position: fixed;
        width: 300px;
        background: rgba(10, 10, 14, 0.93);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 12px;
        box-shadow: 0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset;
        z-index: 9999;
        font-family: 'gg sans', 'Noto Sans', sans-serif;
        overflow: hidden;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        transition: box-shadow 0.2s, opacity 0.2s;
        user-select: none;
      }
      #fat-overlay:hover {
        box-shadow: 0 28px 70px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08) inset;
      }
      #fat-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px 9px;
        cursor: grab;
        background: rgba(255,255,255,0.03);
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      #fat-header:active { cursor: grabbing; }
      #fat-title {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        color: rgba(255,255,255,0.5);
      }
      #fat-pulse {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #3ba55d;
        box-shadow: 0 0 8px #3ba55d;
        animation: fat-pulse 2s ease-in-out infinite;
      }
      @keyframes fat-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
      #fat-controls { display: flex; gap: 4px; }
      .fat-btn {
        background: rgba(255,255,255,0.06);
        border: none;
        border-radius: 4px;
        color: rgba(255,255,255,0.4);
        cursor: pointer;
        font-size: 11px;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, color 0.15s;
        padding: 0;
      }
      .fat-btn:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.85); }
      #fat-feed {
        max-height: 340px;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 6px 0;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.1) transparent;
      }
      #fat-feed::-webkit-scrollbar { width: 4px; }
      #fat-feed::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      .fat-empty {
        padding: 28px 16px;
        text-align: center;
        color: rgba(255,255,255,0.2);
        font-size: 12px;
        line-height: 1.8;
      }
      .fat-empty span { font-size: 11px; opacity: 0.6; }
      .fat-row {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 6px 12px;
        transition: background 0.12s;
        animation: fat-slide 0.25s ease both;
        cursor: default;
      }
      @keyframes fat-slide { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
      .fat-row:hover { background: rgba(255,255,255,0.04); }
      .fat-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
        border: 1px solid rgba(255,255,255,0.08);
      }
      .fat-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .fat-name {
        font-size: 12px;
        font-weight: 700;
        color: rgba(255,255,255,0.85);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fat-action {
        font-size: 11px;
        color: rgba(255,255,255,0.38);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fat-time {
        font-size: 10px;
        color: rgba(255,255,255,0.2);
        white-space: nowrap;
        flex-shrink: 0;
      }
      #fat-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        border-top: 1px solid rgba(255,255,255,0.06);
        background: rgba(255,255,255,0.02);
      }
      #fat-count { font-size: 10px; color: rgba(255,255,255,0.2); }
      #fat-refresh { font-size: 10px; color: rgba(59,165,93,0.5); }
      #fat-toggle {
        position: fixed;
        bottom: 72px;
        left: 12px;
        width: 36px;
        height: 36px;
        background: rgba(10,10,14,0.9);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 9998;
        color: rgba(255,255,255,0.4);
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        backdrop-filter: blur(10px);
      }
      #fat-toggle:hover { background: rgba(59,165,93,0.2); color: #3ba55d; border-color: rgba(59,165,93,0.4); }
    `);
  }

  getSettingsPanel() {
    const wrap = document.createElement("div");
    wrap.style.cssText = "padding:16px;color:var(--text-normal);font-family:var(--font-primary);max-width:460px;";

    const section = (t) => {
      const el = document.createElement("div");
      el.textContent = t;
      el.style.cssText = "font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#3ba55d;margin:16px 0 8px;border-bottom:1px solid rgba(59,165,93,.25);padding-bottom:4px;";
      wrap.appendChild(el);
    };

    const toggle = (label, key) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;";
      const lbl = document.createElement("span");
      lbl.textContent = label;
      lbl.style.fontSize = "14px";
      const btn = document.createElement("button");
      const refresh = () => {
        btn.textContent = this.settings[key] ? "ON" : "OFF";
        btn.style.background = this.settings[key] ? "#3ba55d" : "#555";
      };
      btn.style.cssText = "padding:4px 14px;border:none;border-radius:3px;cursor:pointer;font-weight:700;font-size:12px;color:#fff;";
      refresh();
      btn.addEventListener("click", () => { this.settings[key] = !this.settings[key]; this.save(); refresh(); });
      row.appendChild(lbl); row.appendChild(btn); wrap.appendChild(row);
    };

    section("Activity Types");
    toggle("Games played / stopped", "showGames");
    toggle("Status changes", "showStatus");
    toggle("Voice channel joins / leaves", "showVoice");
    toggle("Streams started / stopped", "showStreams");

    section("Display");
    const opRow = document.createElement("div");
    opRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;";
    const opLbl = document.createElement("span");
    opLbl.textContent = "Opacity";
    opLbl.style.fontSize = "14px";
    const opVal = document.createElement("span");
    opVal.textContent = this.settings.opacity + "%";
    opVal.style.cssText = "font-size:12px;color:#3ba55d;min-width:36px;text-align:right;";
    const opSlider = document.createElement("input");
    opSlider.type = "range"; opSlider.min = 20; opSlider.max = 100; opSlider.value = this.settings.opacity;
    opSlider.style.cssText = "width:120px;accent-color:#3ba55d;";
    opSlider.addEventListener("input", () => {
      this.settings.opacity = parseInt(opSlider.value);
      opVal.textContent = this.settings.opacity + "%";
      const overlay = document.getElementById("fat-overlay");
      if (overlay) overlay.style.opacity = this.settings.opacity / 100;
      this.save();
    });
    const opRight = document.createElement("div");
    opRight.style.cssText = "display:flex;align-items:center;gap:8px;";
    opRight.appendChild(opSlider); opRight.appendChild(opVal);
    opRow.appendChild(opLbl); opRow.appendChild(opRight);
    wrap.appendChild(opRow);

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset Position";
    resetBtn.style.cssText = "margin-top:4px;padding:7px 14px;background:rgba(255,255,255,0.07);color:var(--text-normal);border:1px solid rgba(255,255,255,0.1);border-radius:4px;cursor:pointer;font-size:13px;";
    resetBtn.addEventListener("click", () => {
      this.settings.x = null; this.settings.y = null; this.save();
      this.removeOverlay(); this.buildOverlay();
      BdApi.showToast("Position reset.", { type: "info" });
    });
    wrap.appendChild(resetBtn);

    return wrap;
  }
};
