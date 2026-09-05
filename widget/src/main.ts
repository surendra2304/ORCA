import stylesText from './style.css?raw';
import { VoiceSession } from './voice';

(function () {
  // 1. Locate script tag and read public key
  const scriptEl = document.currentScript || document.querySelector('script[data-key]');
  const workspacePublicKey = scriptEl?.getAttribute('data-key') || '';

  if (!workspacePublicKey) {
    console.error('[KaliGanWidget] Missing data-key attribute on the script tag.');
    return;
  }

  // Parse mode and agent parameter (supports attributes as well as query fallback)
  const urlParams = new URLSearchParams(window.location.search);
  const agentId = scriptEl?.getAttribute('data-agent') || urlParams.get('agent') || '';
  const mode = scriptEl?.getAttribute('data-mode') || urlParams.get('mode') || 'bubble';

  // 2. Resolve backend API base URL
  const scriptSrc = scriptEl?.getAttribute('src') || '';
  let apiBaseUrl = 'http://localhost:3005/api/v1'; // Local default
  if (scriptSrc.startsWith('http')) {
    const url = new URL(scriptSrc);
    if (url.port === '3000') {
      apiBaseUrl = 'http://localhost:3005/api/v1';
    } else {
      apiBaseUrl = `${url.origin}/api/v1`;
    }
  }

  let conversationId: string | null = sessionStorage.getItem('kg_convo_id');
  let activeConfig: any = null;
  let voiceSession: VoiceSession | null = null;

  // 3. Ping backend to record installation load-time
  fetch(`${apiBaseUrl}/public/widget/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspacePublicKey }),
  }).catch((err) => console.warn('[KaliGanWidget] Ping failed:', err));

  // 4. Fetch configuration
  const configUrl = `${apiBaseUrl}/public/widget/config?workspacePublicKey=${workspacePublicKey}${agentId ? `&agentId=${agentId}` : ''}`;
  fetch(configUrl)
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch config');
      return res.json();
    })
    .then((config) => {
      activeConfig = config;
      initializeWidget(config, mode, agentId);
    })
    .catch((err) => {
      console.error('[KaliGanWidget] Initialization failed:', err);
    });

  function initializeWidget(config: any, mode: string, initialAgentId?: string) {
    // Create host element and Shadow Root
    const container = document.createElement('div');
    container.id = 'kaligan-widget-container';
    document.body.appendChild(container);

    const shadow = container.attachShadow({ mode: 'open' });

    // Inject stylesheet
    const style = document.createElement('style');
    style.textContent = stylesText;
    shadow.appendChild(style);

    // Apply primary color from configuration
    if (config.brandColor) {
      container.style.setProperty('--primary-color', config.brandColor);
      // Derive a slightly darker version for hover (quick approximation)
      container.style.setProperty('--primary-hover', adjustColor(config.brandColor, -20));
    }

    const chatAgentName = config.chatAgent?.name || 'AI Assistant';
    const chatAgentGreeting = config.chatAgent?.greeting || 'Hello! How can I help you today?';

    // Build DOM structure inside shadow
    const widgetRoot = document.createElement('div');
    widgetRoot.className = 'kg-widget-root';
    if (mode === 'inline') {
      widgetRoot.setAttribute('mode', 'inline');
    }
    
    widgetRoot.innerHTML = `
      <!-- Launcher Bubble -->
      <button class="kg-launcher ${mode === 'inline' ? 'kg-hidden' : ''}" aria-label="Open chat" id="kg-launcher-btn">
        <!-- Chat Icon -->
        <svg id="kg-icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
        <!-- Close Icon -->
        <svg id="kg-icon-close" class="kg-hidden" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>

      <!-- Chat Panel -->
      <div class="kg-panel ${mode === 'inline' ? '' : 'kg-hidden'}" id="kg-chat-panel">
        <!-- Header -->
        <div class="kg-header">
          <div class="kg-header-info">
            <div class="kg-avatar">${chatAgentName.substring(0, 2)}</div>
            <div>
              <div class="kg-agent-name">${chatAgentName}</div>
              <div class="kg-agent-status">Online</div>
            </div>
          </div>
          ${config.voice?.enabled ? `
            <button class="kg-call-btn" id="kg-start-call-btn" aria-label="Start voice call">
              <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            </button>
          ` : ''}
        </div>

        <!-- Messages list -->
        <div class="kg-messages" id="kg-messages-list">
          <div class="kg-message kg-message-agent">${chatAgentGreeting}</div>
        </div>

        <!-- Input Footer -->
        <form class="kg-footer" id="kg-chat-form">
          <input type="text" class="kg-input" id="kg-chat-input" placeholder="Type a message..." required autocomplete="off" />
          <button type="submit" class="kg-send-btn" aria-label="Send message">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </form>

        <!-- Voice Call Overlay -->
        <div class="kg-voice-overlay kg-hidden" id="kg-voice-panel">
          <div class="kg-voice-header">
            <div class="kg-voice-agent-name">Voice Call</div>
            <div class="kg-voice-status" id="kg-voice-status-label">Connecting...</div>
          </div>
          
          <!-- Pulse Orb animation -->
          <div class="kg-orb-container">
            <div class="kg-orb-pulse kg-pulse-1"></div>
            <div class="kg-orb-pulse kg-pulse-2"></div>
            <div class="kg-orb-pulse kg-pulse-3"></div>
            <div class="kg-orb"></div>
          </div>

          <!-- Realtime Speech Transcript Snippet -->
          <div id="kg-voice-transcript" style="font-size: 13.5px; max-width: 85%; min-height: 48px; text-align: center; color: #cbd5e1; font-style: italic; line-height: 1.5;">
            Listening...
          </div>

          <button class="kg-end-call-btn" id="kg-end-call-btn">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            End Call
          </button>
        </div>
      </div>
    `;

    shadow.appendChild(widgetRoot);

    // Grab elements
    const launcherBtn = shadow.getElementById('kg-launcher-btn')!;
    const iconChat = shadow.getElementById('kg-icon-chat')!;
    const iconClose = shadow.getElementById('kg-icon-close')!;
    const chatPanel = shadow.getElementById('kg-chat-panel')!;
    const chatForm = shadow.getElementById('kg-chat-form')! as HTMLFormElement;
    const chatInput = shadow.getElementById('kg-chat-input')! as HTMLInputElement;
    const messagesList = shadow.getElementById('kg-messages-list')!;
    const startCallBtn = shadow.getElementById('kg-start-call-btn');
    const voicePanel = shadow.getElementById('kg-voice-panel')!;
    const voiceStatusLabel = shadow.getElementById('kg-voice-status-label')!;
    const voiceTranscript = shadow.getElementById('kg-voice-transcript')!;
    const endCallBtn = shadow.getElementById('kg-end-call-btn')!;

    // Toggle panel view
    launcherBtn.addEventListener('click', () => {
      const isHidden = chatPanel.classList.toggle('kg-hidden');
      if (isHidden) {
        iconChat.classList.remove('kg-hidden');
        iconClose.classList.add('kg-hidden');
        // Stop active voice session if panel is closed
        if (voiceSession) {
          voiceSession.stop();
        }
      } else {
        iconChat.classList.add('kg-hidden');
        iconClose.classList.remove('kg-hidden');
        scrollMessages();
      }
    });

    // Chat form submit
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const messageText = chatInput.value.trim();
      if (!messageText) return;

      chatInput.value = '';

      // Append user message to UI
      appendMessage('user', messageText);
      scrollMessages();

      // Show typing indicator
      const typingIndicator = showTypingIndicator();
      scrollMessages();

      // Send to backend public chat turn
      try {
        const payload: any = {
          workspacePublicKey,
          message: messageText,
          visitorMeta: getVisitorMeta(),
        };
        if (config.chatAgent?.agentId) {
          payload.agentId = config.chatAgent.agentId;
        }
        if (conversationId) {
          payload.conversationId = conversationId;
        }

        const res = await fetch(`${apiBaseUrl}/public/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('Network reply error');
        const data = await res.json();

        // Remove indicator
        typingIndicator.remove();

        if (data.reply) {
          appendMessage('agent', data.reply);
          scrollMessages();
        }

        if (data.conversationId) {
          conversationId = data.conversationId;
          sessionStorage.setItem('kg_convo_id', conversationId);
        }
      } catch (err) {
        console.error('[KaliGanWidget] Chat turn failed:', err);
        typingIndicator.remove();
        appendMessage('agent', "I'm sorry, I encountered an error connecting to my server. Please try again.");
        scrollMessages();
      }
    });

    // Voice Call Logic
    if (startCallBtn) {
      startCallBtn.addEventListener('click', () => {
        voicePanel.classList.remove('kg-hidden');
        voiceTranscript.textContent = 'Connecting...';
        voiceStatusLabel.textContent = 'Connecting...';

        const visitorMeta = getVisitorMeta();

        voiceSession = new VoiceSession({
          apiBaseUrl,
          onStateChange: (state) => {
            voiceStatusLabel.textContent = state === 'CONNECTED' ? 'Active Call' : state;
          },
          onTranscriptUpdate: (transcript) => {
            // Render last spoken turn in voice overlay
            if (transcript.length > 0) {
              const last = transcript[transcript.length - 1];
              const speaker = last.role === 'user' ? 'You' : (config.voice?.voiceName || 'Agent');
              voiceTranscript.textContent = `${speaker}: ${last.content}`;
            }
          },
          onEnd: async (transcript) => {
            voicePanel.classList.add('kg-hidden');
            voiceSession = null;

            if (transcript.length === 0) return;

            // Transcribe speech into chat view as final call log
            appendMessage('agent', `[Voice call ended. Saved transcript of ${transcript.length} turns]`);
            scrollMessages();

            // Post voice finalization to database
            try {
              const finalizePayload: any = {
                workspacePublicKey,
                agentId: config.voice.agentId,
                transcript,
                visitorMeta,
              };
              if (conversationId) {
                finalizePayload.conversationId = conversationId;
              }

              const res = await fetch(`${apiBaseUrl}/public/voice/finalize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalizePayload),
              });

              if (res.ok) {
                const finalizeData = await res.json();
                if (finalizeData.conversationId) {
                  conversationId = finalizeData.conversationId;
                  sessionStorage.setItem('kg_convo_id', conversationId);
                }
              }
            } catch (err) {
              console.warn('[KaliGanWidget] Voice call finalization failed:', err);
            }
          },
        });

        voiceSession.start(config.voice.agentId, workspacePublicKey);
      });

      endCallBtn.addEventListener('click', () => {
        if (voiceSession) {
          voiceSession.stop();
        }
      });
    }

    // Helper functions
    function appendMessage(sender: 'user' | 'agent', text: string) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `kg-message kg-message-${sender}`;
      msgDiv.textContent = text;
      messagesList.appendChild(msgDiv);
    }

    function showTypingIndicator() {
      const indicator = document.createElement('div');
      indicator.className = 'kg-typing-indicator';
      indicator.innerHTML = `
        <div class="kg-dot"></div>
        <div class="kg-dot"></div>
        <div class="kg-dot"></div>
      `;
      messagesList.appendChild(indicator);
      return indicator;
    }

    function scrollMessages() {
      messagesList.scrollTop = messagesList.scrollHeight;
    }

    function getVisitorMeta() {
      return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        referrer: document.referrer,
        originUrl: window.location.href,
      };
    }
  }

  // Adjusts colors for primary hover effect
  function adjustColor(hex: string, percent: number) {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = Math.max(0, Math.min(255, R + percent));
    G = Math.max(0, Math.min(255, G + percent));
    B = Math.max(0, Math.min(255, B + percent));

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }
})();
