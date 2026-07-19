
(function () {
  const FAIL_MSG = "Not yet \u2014 check your answers and try again.";
  const OK_MSG = "Room unlocked!";

  function storageKey(room, challengeId) {
    return `room${room}.ch${challengeId}`;
  }
  function unlockedKey(room) {
    return `room${room}.unlocked`;
  }

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function burstConfetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "confetti";
    document.body.appendChild(layer);
    const colors = ["#F18F01", "#3BB273", "#6C63FF", "#E67E22", "#2980B9"];
    for (let i = 0; i < 28; i++) {
      const bit = document.createElement("i");
      bit.style.left = Math.random() * 100 + "%";
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 0.25) + "s";
      layer.appendChild(bit);
    }
    setTimeout(() => layer.remove(), 1200);
  }

  function paintProgress(root) {
    if (!root) return;
    const room = root.dataset.room;
    const ids = JSON.parse(root.dataset.challengeIds || "[]");
    const current = root.dataset.current || "";
    root.querySelectorAll(".dot").forEach((dot, i) => {
      const id = ids[i];
      const saved = sessionStorage.getItem(storageKey(room, id));
      dot.classList.toggle("filled", !!saved);
      dot.classList.toggle("current", id === current);
    });
  }

  function initChoices() {
    const box = document.querySelector("[data-choices]");
    if (!box) return;
    const room = box.dataset.room;
    const challengeId = box.dataset.challengeId;
    const key = storageKey(room, challengeId);
    const buttons = [...box.querySelectorAll(".choice")];
    const saved = sessionStorage.getItem(key);
    if (saved) {
      buttons.forEach((b) => b.classList.toggle("selected", b.dataset.letter === saved));
    }
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        sessionStorage.setItem(key, btn.dataset.letter);
        paintProgress(document.querySelector("[data-progress]"));
      });
    });
  }

  function initUnlock() {
    const panel = document.querySelector("[data-unlock]");
    if (!panel) return;
    const room = panel.dataset.room;
    const expected = panel.dataset.unlockHash;
    const ids = JSON.parse(panel.dataset.challengeIds || "[]");
    const roomCode = panel.dataset.roomCode || "";
    const nextHref = panel.dataset.nextHref || "";
    const msg = panel.querySelector(".msg");
    const codeEl = panel.querySelector(".room-code");
    const btn = panel.querySelector("[data-unlock-btn]");
    const continueWrap = panel.querySelector(".continue-wrap");
    const celebrate = panel.querySelector("[data-celebrate]");

    function showCelebrate(on) {
      if (!celebrate) return;
      if (on) celebrate.removeAttribute("hidden");
      else celebrate.setAttribute("hidden", "");
    }

    function applySuccess() {
      panel.classList.remove("fail");
      panel.classList.add("success");
      if (msg) { msg.textContent = OK_MSG; msg.className = "msg ok"; }
      if (codeEl) codeEl.textContent = roomCode;
      if (continueWrap && nextHref) {
        continueWrap.innerHTML = `<a class="btn success" href="${nextHref}">Continue</a>`;
      }
      showCelebrate(true);
    }

    if (sessionStorage.getItem(unlockedKey(room)) === "1") {
      applySuccess();
    }

    btn?.addEventListener("click", async () => {
      const trail = ids.map((id) => sessionStorage.getItem(storageKey(room, id)) || "").join("");
      if (ids.some((id) => !sessionStorage.getItem(storageKey(room, id)))) {
        panel.classList.remove("success");
        panel.classList.add("fail");
        showCelebrate(false);
        if (msg) { msg.textContent = "Answer every challenge first."; msg.className = "msg bad"; }
        setTimeout(() => panel.classList.remove("fail"), 450);
        return;
      }
      const digest = await sha256Hex(trail);
      if (digest === expected) {
        sessionStorage.setItem(unlockedKey(room), "1");
        applySuccess();
        burstConfetti();
      } else {
        panel.classList.remove("success");
        panel.classList.add("fail");
        showCelebrate(false);
        if (msg) { msg.textContent = FAIL_MSG; msg.className = "msg bad"; }
        setTimeout(() => panel.classList.remove("fail"), 450);
      }
    });
  }

  function initFinal() {
    const root = document.querySelector("[data-final]");
    if (!root) return;
    const rooms = JSON.parse(root.dataset.rooms || "[]");
    const allOk = rooms.every((n) => sessionStorage.getItem(unlockedKey(n)) === "1");
    const gate = root.querySelector("[data-final-gate]");
    const win = root.querySelector("[data-final-win]");
    if (allOk) {
      root.classList.add("success");
      if (gate) gate.hidden = true;
      if (win) win.hidden = false;
      burstConfetti();
    } else if (gate) {
      gate.hidden = false;
      if (win) win.hidden = true;
    }
  }

  document.querySelectorAll(".card").forEach((c) => c.classList.add("enter"));
  paintProgress(document.querySelector("[data-progress]"));
  initChoices();
  initUnlock();
  initFinal();
})();
