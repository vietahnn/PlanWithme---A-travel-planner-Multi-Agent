/* ============================================
   PlanWithme — Client Logic
   ============================================ */

(function () {
  "use strict";

  // ── State ──────────────────────────────────
  let threadId = null;
  let isProcessing = false;

  // ── DOM References ─────────────────────────
  const chatArea = document.getElementById("chat-area");
  const welcomeScreen = document.getElementById("welcome-screen");
  const messageInput = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const newChatBtn = document.getElementById("btn-new-chat");
  const toastContainer = document.getElementById("toast-container");

  // ── Init ───────────────────────────────────
  function init() {
    sendBtn.addEventListener("click", handleSend);
    newChatBtn.addEventListener("click", handleNewChat);

    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Auto-resize textarea
    messageInput.addEventListener("input", () => {
      messageInput.style.height = "auto";
      messageInput.style.height =
        Math.min(messageInput.scrollHeight, 120) + "px";
    });

    // Suggestion chips
    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const query = chip.getAttribute("data-query");
        if (query) {
          messageInput.value = query;
          handleSend();
        }
      });
    });

    messageInput.focus();
  }

  // ── Send Message ───────────────────────────
  async function handleSend() {
    const message = messageInput.value.trim();
    if (!message || isProcessing) return;

    // Hide welcome
    if (welcomeScreen) {
      welcomeScreen.style.display = "none";
    }

    // Add user message
    appendMessage("user", message);
    messageInput.value = "";
    messageInput.style.height = "auto";
    setProcessing(true);

    // Show pipeline
    const pipelineEl = createPipeline();
    chatArea.appendChild(pipelineEl);
    scrollToBottom();

    // Animate pipeline steps
    const stepAnimation = animatePipeline(pipelineEl);

    try {
      const response = await fetch("/api/travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          thread_id: threadId,
        }),
      });

      const data = await response.json();
      stepAnimation.finish();

      // Remove pipeline
      pipelineEl.remove();

      if (!data.success) {
        throw new Error(data.error || "Something went wrong");
      }

      // Store thread id
      threadId = data.thread_id;

      // Show result cards
      renderResults(data);

      // Show AI answer
      if (data.answer) {
        appendMessage("ai", data.answer);
      }

      // LLM calls badge
      if (data.llm_calls) {
        appendLlmBadge(data.llm_calls);
      }
    } catch (err) {
      pipelineEl.remove();
      showToast("error", err.message || "Failed to plan your trip. Please try again.");
      appendMessage("ai", "Sorry, something went wrong. Please try again! 🙏");
    } finally {
      setProcessing(false);
      scrollToBottom();
    }
  }

  // ── New Chat ───────────────────────────────
  function handleNewChat() {
    threadId = null;
    chatArea.innerHTML = "";

    // Re-create welcome screen
    const welcome = document.createElement("div");
    welcome.className = "welcome-screen";
    welcome.id = "welcome-screen";
    welcome.innerHTML = `
      <div class="welcome-globe">🌏</div>
      <h2>Where to next?</h2>
      <p>Tell me about your dream trip and I'll find flights, hotels, and create the perfect itinerary for you.</p>
      <div class="suggestion-chips">
        <button class="chip" data-query="Plan a 5-day trip to Tokyo from Vietnam including flights and hotels">🗼 Tokyo 5 ngày</button>
        <button class="chip" data-query="Plan a budget trip to Bangkok from Vietnam for 3 days">🏖️ Bangkok 3 ngày</button>
        <button class="chip" data-query="Plan a 7-day trip to Paris from Vietnam with sightseeing">🗼 Paris 7 ngày</button>
        <button class="chip" data-query="Plan a 4-day trip to Singapore from Vietnam under $500">🌃 Singapore 4 ngày</button>
        <button class="chip" data-query="Plan a complete Korea trip from Vietnam for 6 days including hotel">🏯 Korea 6 ngày</button>
      </div>
    `;
    chatArea.appendChild(welcome);

    // Re-bind chip events
    welcome.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const query = chip.getAttribute("data-query");
        if (query) {
          messageInput.value = query;
          handleSend();
        }
      });
    });

    messageInput.focus();
    showToast("success", "New conversation started!");
  }

  // ── Message Rendering ─────────────────────
  function appendMessage(role, text) {
    const msgEl = document.createElement("div");
    msgEl.className = `message ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = role === "user" ? "👤" : "🤖";

    const content = document.createElement("div");
    content.className = "message-content";
    content.innerHTML = role === "ai" ? renderMarkdown(text) : escapeHtml(text);

    msgEl.appendChild(avatar);
    msgEl.appendChild(content);
    chatArea.appendChild(msgEl);
    scrollToBottom();
  }

  // ── Pipeline Visualization ─────────────────
  function createPipeline() {
    const container = document.createElement("div");
    container.className = "pipeline-container";
    container.innerHTML = `
      <div class="pipeline-card">
        <div class="pipeline-title">
          <span class="dot"></span>
          AI Agents Working
        </div>
        <div class="pipeline-steps">
          <div class="pipeline-step" data-step="0">
            <div class="step-icon">✈️</div>
            <div class="step-label">Flights</div>
          </div>
          <div class="step-connector" data-connector="0"></div>
          <div class="pipeline-step" data-step="1">
            <div class="step-icon">🏨</div>
            <div class="step-label">Hotels</div>
          </div>
          <div class="step-connector" data-connector="1"></div>
          <div class="pipeline-step" data-step="2">
            <div class="step-icon">📅</div>
            <div class="step-label">Itinerary</div>
          </div>
          <div class="step-connector" data-connector="2"></div>
          <div class="pipeline-step" data-step="3">
            <div class="step-icon">✅</div>
            <div class="step-label">Finalize</div>
          </div>
        </div>
      </div>
    `;
    return container;
  }

  function animatePipeline(pipelineEl) {
    const steps = pipelineEl.querySelectorAll(".pipeline-step");
    const connectors = pipelineEl.querySelectorAll(".step-connector");
    let currentStep = 0;
    let cancelled = false;

    function activateStep(index) {
      if (cancelled || index >= steps.length) return;

      // Mark previous as completed
      if (index > 0) {
        steps[index - 1].classList.remove("active");
        steps[index - 1].classList.add("completed");
        if (connectors[index - 1]) {
          connectors[index - 1].classList.remove("active");
          connectors[index - 1].classList.add("completed");
        }
      }

      // Mark current as active
      steps[index].classList.add("active");
      if (connectors[index]) {
        connectors[index].classList.add("active");
      }

      currentStep = index;
    }

    // Start first step immediately
    activateStep(0);

    // Animate through steps
    const interval = setInterval(() => {
      if (cancelled) {
        clearInterval(interval);
        return;
      }
      currentStep++;
      if (currentStep < steps.length) {
        activateStep(currentStep);
      } else {
        clearInterval(interval);
      }
    }, 4000);

    return {
      finish() {
        cancelled = true;
        clearInterval(interval);
        steps.forEach((s) => {
          s.classList.remove("active");
          s.classList.add("completed");
        });
        connectors.forEach((c) => {
          c.classList.remove("active");
          c.classList.add("completed");
        });
      },
    };
  }

  // ── Result Cards ───────────────────────────
  function renderResults(data) {
    const cardsContainer = document.createElement("div");
    cardsContainer.className = "result-cards";

    const cards = [];

    if (data.flight_results) {
      cards.push({
        type: "flights",
        icon: "✈️",
        title: "Flight Results",
        subtitle: "Live flight data from AviationStack",
        content: data.flight_results,
      });
    }

    if (data.hotel_result) {
      cards.push({
        type: "hotels",
        icon: "🏨",
        title: "Hotel Suggestions",
        subtitle: "Top-rated hotels via Tavily Search",
        content: data.hotel_result,
      });
    }

    if (data.itinerary) {
      cards.push({
        type: "itinerary",
        icon: "📅",
        title: "Travel Itinerary",
        subtitle: "AI-generated day-by-day plan",
        content: data.itinerary,
      });
    }

    cards.forEach((card, index) => {
      const cardEl = document.createElement("div");
      cardEl.className = `result-card ${card.type}`;
      // Auto-expand the itinerary card (last one)
      if (card.type === "itinerary") {
        cardEl.classList.add("expanded");
      }

      cardEl.innerHTML = `
        <div class="result-card-header">
          <div class="result-card-header-left">
            <div class="result-card-icon">${card.icon}</div>
            <div>
              <div class="result-card-title">${card.title}</div>
              <div class="result-card-subtitle">${card.subtitle}</div>
            </div>
          </div>
          <div class="result-card-toggle">▼</div>
        </div>
        <div class="result-card-body">
          <div class="result-card-body-content">${renderMarkdown(card.content)}</div>
        </div>
      `;

      // Toggle expand/collapse
      const header = cardEl.querySelector(".result-card-header");
      header.addEventListener("click", () => {
        cardEl.classList.toggle("expanded");
      });

      cardsContainer.appendChild(cardEl);
    });

    if (cards.length > 0) {
      chatArea.appendChild(cardsContainer);
      scrollToBottom();
    }
  }

  function appendLlmBadge(calls) {
    const badge = document.createElement("div");
    badge.className = "llm-badge";
    badge.style.alignSelf = "flex-start";
    badge.style.marginLeft = "44px";
    badge.innerHTML = `⚡ ${calls} LLM calls`;
    chatArea.appendChild(badge);
  }

  // ── Markdown Parser (basic) ────────────────
  function renderMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);

    // Headers
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Italic
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Horizontal rule
    html = html.replace(/^---$/gm, "<hr>");

    // Unordered lists
    html = html.replace(/^[•\-\*] (.+)$/gm, "<li>$1</li>");

    // Numbered lists
    html = html.replace(/^\d+\.\s(.+)$/gm, "<li>$1</li>");

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

    // Links
    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );

    // Plain URLs
    html = html.replace(
      /(?<!")(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener">$1</a>'
    );

    // Line breaks
    html = html.replace(/\n/g, "<br>");

    // Clean up double <br> after block elements
    html = html.replace(/(<\/h[123]>)<br>/g, "$1");
    html = html.replace(/(<hr>)<br>/g, "$1");
    html = html.replace(/(<\/ul>)<br>/g, "$1");

    return html;
  }

  // ── Utilities ──────────────────────────────
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatArea.scrollTop = chatArea.scrollHeight;
    });
  }

  function setProcessing(state) {
    isProcessing = state;
    sendBtn.disabled = state;
    messageInput.disabled = state;
    if (!state) {
      messageInput.focus();
    }
  }

  function showToast(type, message) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      toast.addEventListener("animationend", () => toast.remove());
    }, 4000);
  }

  // ── Start ──────────────────────────────────
  document.addEventListener("DOMContentLoaded", init);
})();
