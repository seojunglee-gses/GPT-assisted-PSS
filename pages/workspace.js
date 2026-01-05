import { useEffect } from 'react';
import Sidebar from '../components/Sidebar';

export default function Workspace() {
  useEffect(() => {
    const STORAGE_PREFIX = 'ppss';
    const ACTIVE_WORKSPACE_KEY = `${STORAGE_PREFIX}-active-code`;

    const params = new URLSearchParams(window.location.search);
    let workspaceId = params.get('code');
    if (workspaceId) {
      workspaceId = workspaceId.trim();
      if (workspaceId) {
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
      }
    }

    if (!workspaceId) {
      const stored = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
      workspaceId = stored ? stored.trim() : '';
    }

    if (!workspaceId) {
      window.location.replace('/?login=required');
      return;
    }

    if (params.has('code')) {
      params.delete('code');
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', newUrl);
    }

    const workspaceKeySegment = encodeURIComponent(workspaceId);
    const WORKSPACE_PREFIX = `${STORAGE_PREFIX}-workspace-${workspaceKeySegment}`;
    const CONVERSATION_KEY = (stage) => `${WORKSPACE_PREFIX}-conversation-${stage}`;
    const SUMMARY_KEY = (stage) => `${WORKSPACE_PREFIX}-summary-${stage}`;
    const STATUS_KEY = `${WORKSPACE_PREFIX}-stage-status`;
    const RANKING_KEY = `${WORKSPACE_PREFIX}-evaluation-rankings`;
    const CHAT_COMPLETIONS_ENDPOINT = '/api/chat';
    const API_KEYS_KEY = `${WORKSPACE_PREFIX}-api-keys`;
    const ACTIVE_PROVIDER_KEY = `${WORKSPACE_PREFIX}-api-provider`;

    const workspaceMeta = document.getElementById('workspace-meta');
    const workspaceCodeDisplay = document.getElementById('workspace-code-display');
    if (workspaceCodeDisplay) {
      workspaceCodeDisplay.textContent = workspaceId;
    }
    if (workspaceMeta) {
      workspaceMeta.hidden = false;
    }

    const stageConfig = {
      'problem-definition': {
        title: 'Problem Definition',
        systemPrompt:
          'You are a facilitation assistant guiding a proactive product-service system team. Ask clarifying questions, suggest sustainability levers, and provide structured prompts that help define the strategic challenge.',
        summaryPrompt:
          'Summarize the core problem definition, stakeholder needs, and sustainability ambitions. Keep the summary under 120 words.'
      },
      'data-analysis': {
        title: 'Data Analysis',
        systemPrompt:
          'You are an analytical assistant. Help interpret qualitative and quantitative data, highlight insights, and propose hypotheses for PPSS innovation.',
        summaryPrompt:
          'Summarize the key findings, trends, and implications captured in the data analysis discussion. Keep the summary under 120 words.'
      },
      'design-alternatives': {
        title: 'Design/Plan Alternatives',
        systemPrompt:
          'You are a co-creation assistant. Offer alternative service concepts, test assumptions, and synthesize emerging options.',
        summaryPrompt:
          'Summarize the alternative concepts discussed, including differentiating features and evaluation criteria. Keep the summary under 120 words.'
      },
      'design-evaluation': {
        title: 'Design/Plan Evaluation',
        systemPrompt:
          'You are an evaluation assistant. Compare alternatives, identify trade-offs, and highlight insights to support decision-making.',
        summaryPrompt:
          'Summarize the evaluation insights, trade-offs, and recommended refinements. Keep the summary under 120 words.'
      },
      'design-decision': {
        title: 'Design/Plan Decision',
        systemPrompt:
          'You are a decision-support assistant. Assist with synthesis, scoring rationales, and crisp recommendations.',
        summaryPrompt:
          'Summarize the decision criteria, selected direction, and next steps. Keep the summary under 120 words.'
      }
    };

    const stageButtons = Array.from(document.querySelectorAll('.stage-step'));
    const stageContents = Array.from(document.querySelectorAll('.stage-content'));
    const tabButtons = Array.from(document.querySelectorAll('.data-tab'));
    const tabPanels = Array.from(document.querySelectorAll('.data-tab-content'));
    const completeButtons = Array.from(document.querySelectorAll('.complete-stage'));
    const progressFill = document.querySelector('.stage-progress__fill');
    const progressLabel = document.querySelector('.stage-progress__label');
    const stageCount = stageButtons.length;

    function parseStoredJSON(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (error) {
        console.warn('Unable to parse storage for', key, error);
        return fallback;
      }
    }

    function getActiveProvider() {
      const stored = localStorage.getItem(ACTIVE_PROVIDER_KEY);
      return stored ? stored.trim() : 'chatgpt';
    }

    function getApiKey(provider) {
      const keys = parseStoredJSON(API_KEYS_KEY, {});
      return keys[provider] ? keys[provider].trim() : '';
    }

    const stageStatus = parseStoredJSON(STATUS_KEY, {});
    const rankingStore = parseStoredJSON(RANKING_KEY, {});

    function persistStatus(stage, completed) {
      stageStatus[stage] = completed;
      localStorage.setItem(STATUS_KEY, JSON.stringify(stageStatus));
      updateStageCompletionStyles();
    }

    function updateStageCompletionStyles() {
      stageButtons.forEach((button) => {
        const { stage } = button.dataset;
        const isComplete = Boolean(stageStatus[stage]);
        button.classList.toggle('completed', isComplete);
      });
    }

    function showStage(index) {
      stageButtons.forEach((btn, idx) => {
        const isActive = idx === index;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      stageContents.forEach((panel, idx) => {
        const shouldShow = idx === index;
        panel.classList.toggle('active', shouldShow);
        panel.toggleAttribute('hidden', !shouldShow);
      });

      if (progressFill) {
        const percent = stageCount > 1 ? (index / (stageCount - 1)) * 100 : 100;
        progressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
      }

      if (progressLabel) {
        progressLabel.textContent = `Stage ${index + 1} of ${stageCount}`;
      }
    }

    stageButtons.forEach((button, index) => {
      button.addEventListener('click', () => showStage(index));
    });

    const evaluationPhotos = Array.from(document.querySelectorAll('.evaluation-photo'));
    const lightbox = document.querySelector('.evaluation-lightbox');
    const lightboxImg = lightbox?.querySelector('.lightbox-image');
    const lightboxCaption = lightbox?.querySelector('.lightbox-caption');

    function openLightbox(img, caption) {
      if (!lightbox || !lightboxImg || !lightboxCaption) return;
      lightboxImg.src = img.currentSrc || img.src;
      lightboxImg.alt = img.alt || '';
      lightboxCaption.textContent = caption || '';
      lightbox.classList.add('open');
      lightbox.removeAttribute('hidden');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-open');
    }

    function closeLightbox() {
      if (!lightbox || !lightboxImg || !lightboxCaption) return;
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      lightbox.setAttribute('hidden', '');
      lightboxImg.src = '';
      lightboxImg.alt = '';
      lightboxCaption.textContent = '';
      document.body.classList.remove('lightbox-open');
    }

    evaluationPhotos.forEach((figure) => {
      const img = figure.querySelector('img');
      const caption = figure.querySelector('figcaption')?.textContent || '';
      const zoomButton = figure.querySelector('.photo-zoom');

      function handleOpen() {
        if (img) {
          openLightbox(img, caption);
        }
      }

      if (img) {
        img.addEventListener('click', handleOpen);
      }

      if (zoomButton) {
        zoomButton.addEventListener('click', handleOpen);
      }
    });

    if (lightbox) {
      lightbox.addEventListener('click', (event) => {
        if (event.target instanceof HTMLElement && event.target.dataset.close === 'true') {
          closeLightbox();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && lightbox.classList.contains('open')) {
          closeLightbox();
        }
      });
    }

    function updateRankingBadge(figure, value) {
      const badge = figure.querySelector('.ranking-badge');
      if (!badge) return;
      if (!value) {
        badge.textContent = '';
        badge.hidden = true;
        figure.classList.remove('is-ranked');
        return;
      }
      const label = `Rank ${value}`;
      badge.textContent = label;
      badge.hidden = false;
      figure.classList.add('is-ranked');
    }

    function persistRankings() {
      localStorage.setItem(RANKING_KEY, JSON.stringify(rankingStore));
    }

    const rankingSelects = Array.from(document.querySelectorAll('.ranking-select'));
    const decisionRows = Array.from(document.querySelectorAll('.decision-table tbody tr[data-image-id]'));

    function computePreference(rankValue) {
      const rankNumber = Number(rankValue);
      if (!rankValue || Number.isNaN(rankNumber)) {
        return {
          label: 'Awaiting evaluation',
          width: '0%',
          rankText: 'Unranked'
        };
      }

      const bounded = Math.max(1, Math.min(7, rankNumber));
      const preferencePercent = Math.round(((8 - bounded) / 7) * 100);
      const qualitative =
        bounded === 1
          ? 'Priority candidate'
          : bounded <= 3
          ? 'Preferred direction'
          : bounded <= 5
          ? 'Viable alternative'
          : 'Limited alignment';

      return {
        label: `${qualitative} · ${preferencePercent}% affinity`,
        width: `${preferencePercent}%`,
        rankText: `Rank ${bounded}`
      };
    }

    function updateDecisionTable() {
      decisionRows.forEach((row) => {
        const { imageId } = row.dataset;
        const rankCell = row.querySelector('.decision-rank');
        const preferenceCell = row.querySelector('.decision-preference');
        if (!imageId || !rankCell || !preferenceCell) return;

        const storedRank = rankingStore[imageId];
        const preferenceInfo = computePreference(storedRank);
        rankCell.textContent = preferenceInfo.rankText;

        const meter = preferenceCell.querySelector('.preference-meter span');
        const label = preferenceCell.querySelector('.preference-label');

        if (meter) {
          meter.style.width = preferenceInfo.width;
        }

        if (label) {
          label.textContent = preferenceInfo.label;
        }
      });
    }

    rankingSelects.forEach((select) => {
      const { imageId } = select.dataset;
      if (!imageId) return;
      const figure = document.querySelector(`.evaluation-photo[data-image-id="${imageId}"]`);
      const storedValue = rankingStore[imageId];
      if (storedValue) {
        select.value = storedValue;
        if (figure) {
          updateRankingBadge(figure, storedValue);
        }
      }

      select.addEventListener('change', () => {
        const value = select.value;
        if (value) {
          rankingStore[imageId] = value;
        } else {
          delete rankingStore[imageId];
        }
        if (figure) {
          updateRankingBadge(figure, value);
        }
        persistRankings();
        updateDecisionTable();
      });
    });

    updateDecisionTable();

    function showTab(id) {
      tabButtons.forEach((btn) => {
        const isActive = btn.dataset.tab === id;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      tabPanels.forEach((panel) => {
        const shouldShow = panel.id === id;
        panel.classList.toggle('active', shouldShow);
        panel.toggleAttribute('hidden', !shouldShow);
      });
    }

    tabButtons.forEach((button) => {
      button.addEventListener('click', () => showTab(button.dataset.tab));
    });

    function loadConversation(stage) {
      return parseStoredJSON(CONVERSATION_KEY(stage), []);
    }

    function saveConversation(stage, conversation) {
      localStorage.setItem(CONVERSATION_KEY(stage), JSON.stringify(conversation));
    }

    function appendMessage(chatLog, role, content, options = {}) {
      const message = document.createElement('div');
      message.className = `message ${role}${options.pending ? ' pending' : ''}`;
      const roleLabel = role === 'assistant' ? 'Assistant' : role === 'system' ? 'System' : 'You';
      const roleSpan = document.createElement('span');
      roleSpan.className = 'role';
      roleSpan.textContent = roleLabel;
      const body = document.createElement('p');
      body.textContent = content;
      message.append(roleSpan, body);
      chatLog.appendChild(message);
      chatLog.scrollTop = chatLog.scrollHeight;
      return message;
    }

    function renderStoredConversation(stage) {
      const chatLog = document.querySelector(`.chat-log[data-stage="${stage}"]`);
      if (!chatLog) return;
      const stored = loadConversation(stage);
      stored.forEach((entry) => {
        appendMessage(chatLog, entry.role, entry.content);
      });
    }

    Object.keys(stageConfig).forEach(renderStoredConversation);

    function setStageStatus(stage, message, statusClass = '') {
      const container = document.querySelector(`.stage-content#${stage} .stage-status`);
      if (!container) return;
      container.textContent = message;
      container.className = `stage-status ${statusClass}`.trim();
    }

    async function callChatGPT(messages, options = {}) {
      try {
        const provider = options.provider || getActiveProvider();
        const apiKey = getApiKey(provider);

        if (!apiKey) {
          return {
            role: 'assistant',
            content: 'No API key is configured for this workspace. Add a key in Settings to resume chat.',
            error: true
          };
        }

        const response = await fetch(CHAT_COMPLETIONS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Provider': provider,
            'X-API-Key': apiKey
          },
          body: JSON.stringify({
            provider,
            apiKey,
            model: options.model || 'gpt-4o',
            messages,
            temperature: 0.4
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI error: ${response.status}`);
        }

        const data = await response.json();
        const choice = data.choices && data.choices[0];
        if (!choice) throw new Error('No completion choices returned');
        return {
          role: choice.message.role || 'assistant',
          content: choice.message.content
        };
      } catch (error) {
        console.error('ChatGPT call failed', error);
        return {
          role: 'assistant',
          content:
            'The platform could not reach the ChatGPT API. Ensure the backend proxy injects valid credentials and try again.',
          error: true
        };
      }
    }

    function fallbackSummary(stage, conversation) {
      const stageInfo = stageConfig[stage];
      if (!conversation.length) {
        return `No dialogue captured yet for the ${stageInfo.title} stage.`;
      }
      const userHighlights = conversation
        .filter((entry) => entry.role === 'user')
        .slice(-3)
        .map((entry, index) => `${index + 1}. ${entry.content}`);
      if (!userHighlights.length) {
        return `Dialogue was recorded, but only assistant responses are stored for the ${stageInfo.title} stage.`;
      }
      return [`Highlights from ${stageInfo.title}:`, ...userHighlights].join('\n');
    }

    async function summarizeStage(stage) {
      const conversation = loadConversation(stage);
      const stageInfo = stageConfig[stage];
      if (!stageInfo) return;

      if (!conversation.length) {
        setStageStatus(stage, 'Start a dialogue before requesting a summary.', 'warning');
        return;
      }

      const conversationTranscript = conversation
        .map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`)
        .join('\n');
      const messages = [
        {
          role: 'system',
          content:
            'You are a report automation assistant who condenses PPSS design conversations into concise, insight-rich summaries.'
        },
        {
          role: 'user',
          content: `${stageInfo.summaryPrompt}\n\nDialogue:\n${conversationTranscript}`
        }
      ];
      const completion = await callChatGPT(messages, { model: 'gpt-4o-mini' });
      const summaryText = completion.error ? fallbackSummary(stage, conversation) : completion.content;

      localStorage.setItem(
        SUMMARY_KEY(stage),
        JSON.stringify({
          summary: summaryText,
          stage: stageInfo.title,
          timestamp: new Date().toISOString()
        })
      );
      persistStatus(stage, true);
      setStageStatus(stage, 'Stage summary saved to the report dashboard.', 'success');
    }

    function handleChatSubmit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const input = form.querySelector('.chat-input');
      const message = input.value.trim();
      if (!message) return;
      input.value = '';

      const stage = form.dataset.stage;
      const stageInfo = stageConfig[stage];
      const chatLog = document.querySelector(`.chat-log[data-stage="${stage}"]`);
      const conversation = loadConversation(stage);

      appendMessage(chatLog, 'user', message);
      conversation.push({ role: 'user', content: message });
      saveConversation(stage, conversation);

      const pending = appendMessage(chatLog, 'assistant', 'Awaiting response from the ChatGPT API...', { pending: true });

      (async () => {
        const messages = [{ role: 'system', content: stageInfo.systemPrompt }, ...conversation];
        const completion = await callChatGPT(messages);
        pending.remove();
        const assistantRole = completion.role || 'assistant';
        appendMessage(chatLog, assistantRole, completion.content);
        conversation.push({ role: assistantRole, content: completion.content });
        saveConversation(stage, conversation);
      })();
    }

    document.querySelectorAll('.chat-form').forEach((form) => {
      form.addEventListener('submit', handleChatSubmit);
    });

    completeButtons.forEach((button) => {
      button.addEventListener('click', () => summarizeStage(button.dataset.stage));
    });

    updateStageCompletionStyles();
    const defaultIndex = stageButtons.findIndex((button) => button.classList.contains('active'));
    showStage(defaultIndex >= 0 ? defaultIndex : 0);
    Object.keys(stageConfig).forEach((stage) => {
      const summaryInfo = parseStoredJSON(SUMMARY_KEY(stage), null);
      if (summaryInfo && summaryInfo.summary) {
        setStageStatus(stage, 'Summary ready for the report dashboard.', 'success');
      }
    });
  }, []);

  return (
    <div className="page">
      <Sidebar active="workspace" />
      <main className="content workspace-main">
        <header className="workspace-header">
          <h1>Collaborative Workspace</h1>
          <p>
            Progress through the proactive product-service system strategy with guided prompts, evidence-rich visuals, and
            real-time dialogue powered by the ChatGPT API. Each stage below mirrors the workflow documented in the research
            article and captures the evolving intelligence of the design team.
          </p>
          <p className="workspace-meta" id="workspace-meta" hidden>
            Active workspace code: <span className="workspace-code-emphasis" id="workspace-code-display"></span>
          </p>
        </header>

        <section className="workflow">
          <div className="stage-navigation" role="tablist" aria-label="Workspace stages">
            <button
              type="button"
              className="stage-step active"
              data-stage="problem-definition"
              data-index="0"
              role="tab"
              aria-selected="true"
            >
              <span className="step-icon">🧭</span>
              <span className="step-label">Problem Definition</span>
            </button>
            <button type="button" className="stage-step" data-stage="data-analysis" data-index="1" role="tab" aria-selected="false">
              <span className="step-icon">📊</span>
              <span className="step-label">Data Analysis</span>
            </button>
            <button
              type="button"
              className="stage-step"
              data-stage="design-alternatives"
              data-index="2"
              role="tab"
              aria-selected="false"
            >
              <span className="step-icon">🛠️</span>
              <span className="step-label">Design/Plan Alternatives</span>
            </button>
            <button
              type="button"
              className="stage-step"
              data-stage="design-evaluation"
              data-index="3"
              role="tab"
              aria-selected="false"
            >
              <span className="step-icon">🔍</span>
              <span className="step-label">Design/Plan Evaluation</span>
            </button>
            <button
              type="button"
              className="stage-step"
              data-stage="design-decision"
              data-index="4"
              role="tab"
              aria-selected="false"
            >
              <span className="step-icon">📑</span>
              <span className="step-label">Design/Plan Decision</span>
            </button>
          </div>

          <div className="stage-progress" aria-hidden="true">
            <div className="stage-progress__track">
              <div className="stage-progress__fill" style={{ width: '0%' }}></div>
            </div>
            <span className="stage-progress__label">Stage 1 of 5</span>
          </div>

          <div className="stage-container">
            <article id="problem-definition" className="stage-content active" role="tabpanel">
              <div className="stage-grid">
                <div className="stage-panel narrative-panel">
                  <figure className="hero-figure">
                    <img
                      src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=60"
                      alt="Designers collaborating with post-it notes"
                    />
                    <figcaption>Mapping stakeholder ambitions, constraints, and sustainability mandates for the PPSS vision.</figcaption>
                  </figure>
                  <div className="panel-copy">
                    <h2>Clarify the Strategic Challenge</h2>
                    <p>
                      Capture the drivers behind the proactive product-service system initiative. Articulate the socio-technical
                      problem, define the service boundary, and document the organizational commitments that underpin the
                      program.
                    </p>
                    <p>
                      Summarize stakeholder archetypes, targeted customer experiences, and the resilience indicators emphasized in
                      the article's case study to frame the design conversation.
                    </p>
                  </div>
                </div>
                <div className="stage-panel chat-panel">
                  <header>
                    <h2>ChatGPT Facilitation</h2>
                    <p className="chat-description">
                      Live conversation through the ChatGPT API to expand the shared understanding of the PPSS challenge.
                    </p>
                  </header>
                  <div className="chat-log" aria-live="polite" data-stage="problem-definition">
                    <div className="message assistant">
                      <span className="role">ChatGPT Assistant</span>
                      <p>
                        Welcome to the proactive product-service system workspace. How would you describe the core sustainability
                        goal driving this project?
                      </p>
                    </div>
                    <div className="message user">
                      <span className="role">You — Designer</span>
                      <p>
                        We want to reduce the energy footprint of our mobility service while improving accessibility for commuters.
                      </p>
                    </div>
                  </div>
                  <form className="chat-form" aria-label="Send a message to ChatGPT" data-stage="problem-definition">
                    <label className="visually-hidden" htmlFor="message-stage-1">
                      Message
                    </label>
                    <div className="chat-composer">
                      <input
                        id="message-stage-1"
                        className="chat-input"
                        type="text"
                        name="message"
                        placeholder="Compose your prompt..."
                        required
                      />
                      <button type="submit" className="chat-send" aria-label="Send message">
                        Send
                      </button>
                    </div>
                  </form>
                  <div className="stage-actions">
                    <button type="button" className="complete-stage" data-stage="problem-definition">
                      Complete Stage
                    </button>
                    <p className="stage-status" aria-live="polite"></p>
                  </div>
                </div>
              </div>
            </article>

            <article id="data-analysis" className="stage-content" role="tabpanel" hidden>
              <div className="stage-grid">
                <div className="stage-panel analysis-panel">
                  <h2>Evidence Canvases</h2>
                  <p>Select a tab to review the synthesized evidence captured for the data analysis stage.</p>
                  <div className="data-tabs" role="tablist" aria-label="Data analysis evidence tabs">
                    <button type="button" className="data-tab active" data-tab="patterns" role="tab" aria-selected="true">
                      Usage Patterns
                    </button>
                    <button type="button" className="data-tab" data-tab="painpoints" role="tab" aria-selected="false">
                      Pain Points
                    </button>
                    <button type="button" className="data-tab" data-tab="opportunities" role="tab" aria-selected="false">
                      Emerging Opportunities
                    </button>
                  </div>
                  <div className="data-tab-content active" id="patterns" role="tabpanel">
                    <img
                      src="https://images.unsplash.com/photo-1517148815978-75f6acaaf32c?auto=format&fit=crop&w=900&q=60"
                      alt="Commuters boarding eco-friendly buses"
                    />
                    <p>
                      Demand clusters reveal peak travel loads across transit corridors. ChatGPT assists by explaining latent
                      correlations between commuter behaviors and service downtimes extracted from the case study dataset.
                    </p>
                  </div>
                  <div className="data-tab-content" id="painpoints" role="tabpanel" hidden>
                    <img
                      src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=60"
                      alt="A commuter struggling with a ticketing kiosk"
                    />
                    <p>
                      Incident narratives expose accessibility barriers and energy-intensive detours. The assistant recommends
                      service blueprints that minimize waiting time while improving the carbon performance of the fleet.
                    </p>
                  </div>
                  <div className="data-tab-content" id="opportunities" role="tabpanel" hidden>
                    <img
                      src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=60"
                      alt="Aerial view of a smart mobility hub"
                    />
                    <p>
                      Emerging mobility hubs introduce modular charging nodes and predictive maintenance. ChatGPT highlights
                      partnerships that can co-create regenerative value propositions aligned with the PPSS platform.
                    </p>
                  </div>
                </div>
                <div className="stage-panel chat-panel">
                  <header>
                    <h2>Analytical Dialogue</h2>
                    <p className="chat-description">
                      Interrogate datasets with contextual prompts and retrieve quantitative or qualitative insights generated via
                      the ChatGPT API.
                    </p>
                  </header>
                  <div className="chat-log" aria-live="polite" data-stage="data-analysis">
                    <div className="message assistant">
                      <span className="role">ChatGPT Assistant</span>
                      <p>
                        I can summarize the variance in ridership across weekdays versus weekends. Would you like a chart-ready
                        breakdown?
                      </p>
                    </div>
                  </div>
                  <form className="chat-form" aria-label="Send a message to ChatGPT" data-stage="data-analysis">
                    <label className="visually-hidden" htmlFor="message-stage-2">
                      Message
                    </label>
                    <div className="chat-composer">
                      <input
                        id="message-stage-2"
                        className="chat-input"
                        type="text"
                        name="message"
                        placeholder="Ask about anomalies, clusters, or correlations..."
                        required
                      />
                      <button type="submit" className="chat-send" aria-label="Send message">
                        Send
                      </button>
                    </div>
                  </form>
                  <div className="stage-actions">
                    <button type="button" className="complete-stage" data-stage="data-analysis">
                      Complete Stage
                    </button>
                    <p className="stage-status" aria-live="polite"></p>
                  </div>
                </div>
              </div>
            </article>

            <article id="design-alternatives" className="stage-content" role="tabpanel" hidden>
              <div className="stage-grid">
                <div className="stage-panel gallery-panel">
                  <h2>Concept Visualizations</h2>
                  <p>
                    Preview images generated through the ChatGPT image pipeline to provoke conversations on modular service
                    concepts.
                  </p>
                  <div className="image-strip">
                    <figure>
                      <img
                        src="https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=800&q=60"
                        alt="Futuristic eco-friendly shuttle design"
                      />
                      <figcaption>Autonomous shuttle concept with adaptive lighting.</figcaption>
                    </figure>
                    <figure>
                      <img
                        src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=800&q=60"
                        alt="Smart mobility service hub at dusk"
                      />
                      <figcaption>Service hub integrating micro-mobility drop-off points.</figcaption>
                    </figure>
                    <figure>
                      <img
                        src="https://images.unsplash.com/photo-1529429617124-aee5b8d711b5?auto=format&fit=crop&w=800&q=60"
                        alt="Interior of an accessible transit pod"
                      />
                      <figcaption>Universal design interior layout for inclusive commuting.</figcaption>
                    </figure>
                  </div>
                </div>
                <div className="stage-panel chat-panel">
                  <header>
                    <h2>Co-creation Dialogue</h2>
                    <p className="chat-description">
                      Iterate on alternative concepts, assess feasibility, and request synthesized design briefs from the ChatGPT
                      API.
                    </p>
                  </header>
                  <div className="chat-log" aria-live="polite" data-stage="design-alternatives">
                    <div className="message assistant">
                      <span className="role">ChatGPT Assistant</span>
                      <p>Shall I compare the lifecycle emissions for the three proposed shuttle configurations?</p>
                    </div>
                    <div className="message user">
                      <span className="role">You — Engineer</span>
                      <p>Yes, prioritize recycled materials and modular upgrades for long-term adaptability.</p>
                    </div>
                  </div>
                  <form className="chat-form" aria-label="Send a message to ChatGPT" data-stage="design-alternatives">
                    <label className="visually-hidden" htmlFor="message-stage-3">
                      Message
                    </label>
                    <div className="chat-composer">
                      <input
                        id="message-stage-3"
                        className="chat-input"
                        type="text"
                        name="message"
                        placeholder="Describe a new alternative..."
                        required
                      />
                      <button type="submit" className="chat-send" aria-label="Send message">
                        Send
                      </button>
                    </div>
                  </form>
                  <div className="stage-actions">
                    <button type="button" className="complete-stage" data-stage="design-alternatives">
                      Complete Stage
                    </button>
                    <p className="stage-status" aria-live="polite"></p>
                  </div>
                </div>
              </div>
            </article>

            <article id="design-evaluation" className="stage-content" role="tabpanel" hidden>
              <div className="stage-grid">
                <div className="stage-panel evaluation-panel">
                  <h2>Prototype Snapshots</h2>
                  <p>Review the captured evidence from service pilots to determine the viability of shortlisted alternatives.</p>
                  <div className="photo-grid">
                    <figure className="evaluation-photo" data-image-id="prototype-shuttle">
                      <div className="photo-wrapper">
                        <img
                          src="https://images.unsplash.com/photo-1529429617124-aee5b8d711b5?auto=format&fit=crop&w=1400&q=80"
                          alt="Passengers boarding a prototype shuttle"
                        />
                        <button type="button" className="photo-zoom" aria-label="View passengers boarding a prototype shuttle">
                          <span aria-hidden="true">🔍</span>
                        </button>
                        <span className="ranking-badge" hidden></span>
                      </div>
                      <figcaption>Live usability study on the adaptive shuttle entry sequence.</figcaption>
                      <label className="ranking-control" htmlFor="rank-prototype-shuttle">
                        <span>Assign a rank</span>
                        <select id="rank-prototype-shuttle" className="ranking-select" data-image-id="prototype-shuttle">
                          <option value="">Unranked</option>
                          <option value="1">Rank 1 — Leading Concept</option>
                          <option value="2">Rank 2 — Strong Contender</option>
                          <option value="3">Rank 3 — Needs Refinement</option>
                          <option value="4">Rank 4 — Backup Option</option>
                          <option value="5">Rank 5 — Limited Fit</option>
                          <option value="6">Rank 6 — Low Alignment</option>
                          <option value="7">Rank 7 — Retire Concept</option>
                        </select>
                      </label>
                    </figure>
                    <figure className="evaluation-photo" data-image-id="telemetry-dashboard">
                      <div className="photo-wrapper">
                        <img
                          src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80"
                          alt="Designers reviewing analytics on a large screen"
                        />
                        <button type="button" className="photo-zoom" aria-label="View designers reviewing analytics on a large screen">
                          <span aria-hidden="true">🔍</span>
                        </button>
                        <span className="ranking-badge" hidden></span>
                      </div>
                      <figcaption>Integrated telemetry dashboard tracking energy consumption.</figcaption>
                      <label className="ranking-control" htmlFor="rank-telemetry-dashboard">
                        <span>Assign a rank</span>
                        <select id="rank-telemetry-dashboard" className="ranking-select" data-image-id="telemetry-dashboard">
                          <option value="">Unranked</option>
                          <option value="1">Rank 1 — Leading Concept</option>
                          <option value="2">Rank 2 — Strong Contender</option>
                          <option value="3">Rank 3 — Needs Refinement</option>
                          <option value="4">Rank 4 — Backup Option</option>
                          <option value="5">Rank 5 — Limited Fit</option>
                          <option value="6">Rank 6 — Low Alignment</option>
                          <option value="7">Rank 7 — Retire Concept</option>
                        </select>
                      </label>
                    </figure>
                    <figure className="evaluation-photo" data-image-id="accessibility-trials">
                      <div className="photo-wrapper">
                        <img
                          src="https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=1400&q=80"
                          alt="Facilitators testing accessibility features"
                        />
                        <button type="button" className="photo-zoom" aria-label="View facilitators testing accessibility features">
                          <span aria-hidden="true">🔍</span>
                        </button>
                        <span className="ranking-badge" hidden></span>
                      </div>
                      <figcaption>Accessibility trials focusing on seamless transfers.</figcaption>
                      <label className="ranking-control" htmlFor="rank-accessibility-trials">
                        <span>Assign a rank</span>
                        <select id="rank-accessibility-trials" className="ranking-select" data-image-id="accessibility-trials">
                          <option value="">Unranked</option>
                          <option value="1">Rank 1 — Leading Concept</option>
                          <option value="2">Rank 2 — Strong Contender</option>
                          <option value="3">Rank 3 — Needs Refinement</option>
                          <option value="4">Rank 4 — Backup Option</option>
                          <option value="5">Rank 5 — Limited Fit</option>
                          <option value="6">Rank 6 — Low Alignment</option>
                          <option value="7">Rank 7 — Retire Concept</option>
                        </select>
                      </label>
                    </figure>
                    <figure className="evaluation-photo" data-image-id="mobility-hub-render">
                      <div className="photo-wrapper">
                        <img
                          src="https://images.unsplash.com/photo-1529429617124-95b38d21fc4d?auto=format&fit=crop&w=1400&q=80"
                          alt="Rendering of a modular mobility hub"
                        />
                        <button type="button" className="photo-zoom" aria-label="View rendering of a modular mobility hub">
                          <span aria-hidden="true">🔍</span>
                        </button>
                        <span className="ranking-badge" hidden></span>
                      </div>
                      <figcaption>Regenerative mobility hub with modular charging canopies.</figcaption>
                      <label className="ranking-control" htmlFor="rank-mobility-hub-render">
                        <span>Assign a rank</span>
                        <select id="rank-mobility-hub-render" className="ranking-select" data-image-id="mobility-hub-render">
                          <option value="">Unranked</option>
                          <option value="1">Rank 1 — Leading Concept</option>
                          <option value="2">Rank 2 — Strong Contender</option>
                          <option value="3">Rank 3 — Needs Refinement</option>
                          <option value="4">Rank 4 — Backup Option</option>
                          <option value="5">Rank 5 — Limited Fit</option>
                          <option value="6">Rank 6 — Low Alignment</option>
                          <option value="7">Rank 7 — Retire Concept</option>
                        </select>
                      </label>
                    </figure>
                    <figure className="evaluation-photo" data-image-id="service-app-ui">
                      <div className="photo-wrapper">
                        <img
                          src="https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1400&q=80"
                          alt="Prototype mobile service application"
                        />
                        <button type="button" className="photo-zoom" aria-label="View prototype mobile service application">
                          <span aria-hidden="true">🔍</span>
                        </button>
                        <span className="ranking-badge" hidden></span>
                      </div>
                      <figcaption>Service orchestration app highlighting multimodal journeys.</figcaption>
                      <label className="ranking-control" htmlFor="rank-service-app-ui">
                        <span>Assign a rank</span>
                        <select id="rank-service-app-ui" className="ranking-select" data-image-id="service-app-ui">
                          <option value="">Unranked</option>
                          <option value="1">Rank 1 — Leading Concept</option>
                          <option value="2">Rank 2 — Strong Contender</option>
                          <option value="3">Rank 3 — Needs Refinement</option>
                          <option value="4">Rank 4 — Backup Option</option>
                          <option value="5">Rank 5 — Limited Fit</option>
                          <option value="6">Rank 6 — Low Alignment</option>
                          <option value="7">Rank 7 — Retire Concept</option>
                        </select>
                      </label>
                    </figure>
                    <figure className="evaluation-photo" data-image-id="energy-dashboard">
                      <div className="photo-wrapper">
                        <img
                          src="https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1400&q=80"
                          alt="Energy monitoring dashboard"
                        />
                        <button type="button" className="photo-zoom" aria-label="View energy monitoring dashboard">
                          <span aria-hidden="true">🔍</span>
                        </button>
                        <span className="ranking-badge" hidden></span>
                      </div>
                      <figcaption>Energy intelligence overlay for service fleet dispatch.</figcaption>
                      <label className="ranking-control" htmlFor="rank-energy-dashboard">
                        <span>Assign a rank</span>
                        <select id="rank-energy-dashboard" className="ranking-select" data-image-id="energy-dashboard">
                          <option value="">Unranked</option>
                          <option value="1">Rank 1 — Leading Concept</option>
                          <option value="2">Rank 2 — Strong Contender</option>
                          <option value="3">Rank 3 — Needs Refinement</option>
                          <option value="4">Rank 4 — Backup Option</option>
                          <option value="5">Rank 5 — Limited Fit</option>
                          <option value="6">Rank 6 — Low Alignment</option>
                          <option value="7">Rank 7 — Retire Concept</option>
                        </select>
                      </label>
                    </figure>
                    <figure className="evaluation-photo" data-image-id="community-lab">
                      <div className="photo-wrapper">
                        <img
                          src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80"
                          alt="Community co-design lab"
                        />
                        <button type="button" className="photo-zoom" aria-label="View community co-design lab">
                          <span aria-hidden="true">🔍</span>
                        </button>
                        <span className="ranking-badge" hidden></span>
                      </div>
                      <figcaption>Community co-design lab capturing inclusive feedback.</figcaption>
                      <label className="ranking-control" htmlFor="rank-community-lab">
                        <span>Assign a rank</span>
                        <select id="rank-community-lab" className="ranking-select" data-image-id="community-lab">
                          <option value="">Unranked</option>
                          <option value="1">Rank 1 — Leading Concept</option>
                          <option value="2">Rank 2 — Strong Contender</option>
                          <option value="3">Rank 3 — Needs Refinement</option>
                          <option value="4">Rank 4 — Backup Option</option>
                          <option value="5">Rank 5 — Limited Fit</option>
                          <option value="6">Rank 6 — Low Alignment</option>
                          <option value="7">Rank 7 — Retire Concept</option>
                        </select>
                      </label>
                    </figure>
                  </div>
                </div>
                <div className="stage-panel chat-panel">
                  <header>
                    <h2>Evaluation Dialogue</h2>
                    <p className="chat-description">
                      Deploy the ChatGPT API to quantify trade-offs, narrate customer journeys, and prioritize refinements.
                    </p>
                  </header>
                  <div className="chat-log" aria-live="polite" data-stage="design-evaluation">
                    <div className="message assistant">
                      <span className="role">ChatGPT Assistant</span>
                      <p>I can simulate the service level impact if we scale the adaptive shuttle fleet. Should I run the scenario?</p>
                    </div>
                  </div>
                  <form className="chat-form" aria-label="Send a message to ChatGPT" data-stage="design-evaluation">
                    <label className="visually-hidden" htmlFor="message-stage-4">
                      Message
                    </label>
                    <div className="chat-composer">
                      <input
                        id="message-stage-4"
                        className="chat-input"
                        type="text"
                        name="message"
                        placeholder="Request comparative evaluations or metrics..."
                        required
                      />
                      <button type="submit" className="chat-send" aria-label="Send message">
                        Send
                      </button>
                    </div>
                  </form>
                  <div className="stage-actions">
                    <button type="button" className="complete-stage" data-stage="design-evaluation">
                      Complete Stage
                    </button>
                    <p className="stage-status" aria-live="polite"></p>
                  </div>
                </div>
              </div>
            </article>

            <article id="design-decision" className="stage-content" role="tabpanel" hidden>
              <div className="stage-grid">
                <div className="stage-panel report-panel">
                  <h2>Design/Plan Decision Narrative</h2>
                  <p>
                    Consolidate insight streams into a transparent recommendation for the proactive product-service system
                    strategy.
                  </p>
                  <div className="report-body">
                    <h3>Executive Summary</h3>
                    <p>
                      The integrated mobility service reduces per-passenger emissions by 28% compared to the baseline. Customer
                      satisfaction improves through predictive scheduling and inclusive design touchpoints.
                    </p>
                    <h3>Decision Criteria</h3>
                    <ul>
                      <li>Adaptive routing lowers congestion events by 18% during peak windows.</li>
                      <li>Energy-efficient materials extend vehicle lifecycles by 22%.</li>
                      <li>Service partnerships unlock three new regenerative revenue streams.</li>
                    </ul>
                    <h3>Next Steps</h3>
                    <p>
                      Scale the telemetry stack across partner fleets, finalize stakeholder governance, and prepare a policy
                      briefing aligned with the article's recommendations.
                    </p>
                  </div>
                </div>
                <div className="stage-panel decision-panel">
                  <h2>Design Preference Table</h2>
                  <p>Rank each concept in the evaluation gallery to build a transparent preference profile for final selection.</p>
                  <div className="decision-table-wrapper">
                    <table className="decision-table">
                      <thead>
                        <tr>
                          <th scope="col">Concept</th>
                          <th scope="col">Contributor</th>
                          <th scope="col">Assigned Rank</th>
                          <th scope="col">Preference Index</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr data-image-id="prototype-shuttle">
                          <th scope="row">Adaptive Shuttle Entry</th>
                          <td>Team Aurora</td>
                          <td className="decision-rank">Unranked</td>
                          <td className="decision-preference">
                            <div className="preference-meter" aria-hidden="true">
                              <span style={{ width: '0%' }}></span>
                            </div>
                            <span className="preference-label">Awaiting evaluation</span>
                          </td>
                        </tr>
                        <tr data-image-id="telemetry-dashboard">
                          <th scope="row">Telemetry Intelligence Wall</th>
                          <td>Data Studio Kilo</td>
                          <td className="decision-rank">Unranked</td>
                          <td className="decision-preference">
                            <div className="preference-meter" aria-hidden="true">
                              <span style={{ width: '0%' }}></span>
                            </div>
                            <span className="preference-label">Awaiting evaluation</span>
                          </td>
                        </tr>
                        <tr data-image-id="accessibility-trials">
                          <th scope="row">Inclusive Boarding Trials</th>
                          <td>Accessibility Guild</td>
                          <td className="decision-rank">Unranked</td>
                          <td className="decision-preference">
                            <div className="preference-meter" aria-hidden="true">
                              <span style={{ width: '0%' }}></span>
                            </div>
                            <span className="preference-label">Awaiting evaluation</span>
                          </td>
                        </tr>
                        <tr data-image-id="mobility-hub-render">
                          <th scope="row">Regenerative Mobility Hub</th>
                          <td>Studio Meridian</td>
                          <td className="decision-rank">Unranked</td>
                          <td className="decision-preference">
                            <div className="preference-meter" aria-hidden="true">
                              <span style={{ width: '0%' }}></span>
                            </div>
                            <span className="preference-label">Awaiting evaluation</span>
                          </td>
                        </tr>
                        <tr data-image-id="service-app-ui">
                          <th scope="row">Service Orchestration UI</th>
                          <td>Transit Studio</td>
                          <td className="decision-rank">Unranked</td>
                          <td className="decision-preference">
                            <div className="preference-meter" aria-hidden="true">
                              <span style={{ width: '0%' }}></span>
                            </div>
                            <span className="preference-label">Awaiting evaluation</span>
                          </td>
                        </tr>
                        <tr data-image-id="energy-dashboard">
                          <th scope="row">Energy Intelligence Overlay</th>
                          <td>Fleet Ops</td>
                          <td className="decision-rank">Unranked</td>
                          <td className="decision-preference">
                            <div className="preference-meter" aria-hidden="true">
                              <span style={{ width: '0%' }}></span>
                            </div>
                            <span className="preference-label">Awaiting evaluation</span>
                          </td>
                        </tr>
                        <tr data-image-id="community-lab">
                          <th scope="row">Community Co-design Lab</th>
                          <td>Outreach Collective</td>
                          <td className="decision-rank">Unranked</td>
                          <td className="decision-preference">
                            <div className="preference-meter" aria-hidden="true">
                              <span style={{ width: '0%' }}></span>
                            </div>
                            <span className="preference-label">Awaiting evaluation</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
      <div className="evaluation-lightbox" aria-hidden="true" hidden>
        <div className="lightbox-overlay" data-close="true"></div>
        <figure className="lightbox-content">
          <img className="lightbox-image" src="" alt="" />
          <figcaption className="lightbox-caption"></figcaption>
          <button type="button" className="lightbox-close" data-close="true" aria-label="Close image viewer">
            ✕
          </button>
        </figure>
      </div>
    </div>
  );
}
