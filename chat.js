/* =========================================================
   Mahmoud Sallam · Portfolio chat widget
   Talks to the MS-chatbot API: POST {api}/chat streams Server-Sent Events
   (token / done / error, each data field is JSON).
   ========================================================= */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const island = $('#chat-island');
  if (!island) return;

  const API = (island.dataset.api || '').replace(/\/+$/, '');
  const panel = $('#chat-panel');
  const launcher = $('.chat-launcher', island);
  const closeBtn = $('.chat-close', panel);
  const log = $('.chat-log', panel);
  const form = $('.chat-form', panel);
  const input = $('.chat-input', form);
  const sendBtn = $('.chat-send', form);
  const FALLBACK = 'Sorry, the assistant is unavailable right now. You can email Mahmoud at mahmoudsallam233@gmail.com.';
  const SESSION_KEY = 'ms-chat-session';
  let busy = false;

  // sessionStorage can throw (private mode, blocked storage): the chat still works, just without memory.
  const store = {
    get() { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } },
    set(v) { try { sessionStorage.setItem(SESSION_KEY, v); } catch { /* ignore */ } },
  };

  /* ---------- Open / close ---------- */
  const setOpen = (open) => {
    island.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close chat' : 'Open chat');
    if (open) setTimeout(() => input.focus({ preventScroll: true }), 120);
    else launcher.focus({ preventScroll: true });
  };

  launcher.addEventListener('click', () => setOpen(!island.classList.contains('is-open')));
  closeBtn.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && island.classList.contains('is-open')) setOpen(false);
  });

  /* ---------- Minimal, safe markdown ----------
     Everything is HTML-escaped first; only bold, inline code, links and lists are re-added. */
  const escape = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const inline = (s) => escape(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+[^\s<).,;:!?])/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
    .replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.-]*\w)/g, '$1<a href="mailto:$2">$2</a>');

  const render = (md) => {
    const out = [];
    let list = null;
    const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
    md.split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      const bullet = line.match(/^[-*•]\s+(.*)/);
      const numbered = line.match(/^\d+[.)]\s+(.*)/);
      const heading = line.match(/^#{1,6}\s+(.*)/);
      if (bullet || numbered) {
        const type = bullet ? 'ul' : 'ol';
        if (list !== type) { closeList(); out.push(`<${type} dir="auto">`); list = type; }
        out.push(`<li>${inline((bullet || numbered)[1])}</li>`);
      } else if (!line) {
        closeList();
      } else {
        closeList();
        out.push(heading ? `<p dir="auto"><strong>${inline(heading[1])}</strong></p>` : `<p dir="auto">${inline(line)}</p>`);
      }
    });
    closeList();
    return out.join('');
  };

  /* ---------- Messages ---------- */
  const scrollDown = () => { log.scrollTop = log.scrollHeight; };

  const addMessage = (who, text) => {
    const el = document.createElement('div');
    el.className = `chat-msg is-${who}`;
    if (who === 'user') {
      const p = document.createElement('p');
      p.dir = 'auto';
      p.textContent = text;
      el.append(p);
    } else {
      el.innerHTML = text ? render(text) : '<span class="chat-typing" aria-label="Typing"><i></i><i></i><i></i></span>';
    }
    log.append(el);
    scrollDown();
    return el;
  };

  const setBusy = (on) => {
    busy = on;
    sendBtn.disabled = on;
    input.disabled = on;
    if (!on) input.focus({ preventScroll: true });
  };

  /* ---------- SSE over fetch ----------
     EventSource only does GET, so the POST body is read as a stream and split into events by blank lines. */
  const parseEvent = (block) => {
    let event = 'message';
    const data = [];
    block.split(/\r?\n/).forEach((line) => {
      if (!line || line.startsWith(':')) return;
      const i = line.indexOf(':');
      const field = i === -1 ? line : line.slice(0, i);
      const value = i === -1 ? '' : line.slice(i + 1).replace(/^ /, '');
      if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    });
    if (!data.length) return null;
    const raw = data.join('\n');
    try { return { event, data: JSON.parse(raw) }; } catch { return { event, data: raw }; }
  };

  const ask = async (question) => {
    if (busy || !question) return;
    $('.chat-suggestions', log)?.remove();
    addMessage('user', question);
    const bubble = addMessage('bot', '');
    setBusy(true);

    let answer = '';
    const fail = (msg) => {
      bubble.classList.add('is-error');
      bubble.innerHTML = render(answer ? `${answer}\n\n${msg}` : msg);
      scrollDown();
    };

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, session_id: store.get() || undefined }),
      });

      if (res.status === 429) { fail('Too many messages. Please wait a minute and try again.'); return; }
      if (!res.ok || !res.body) { fail(FALLBACK); return; }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      let finished = false;

      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop();
        for (const block of blocks) {
          const evt = parseEvent(block);
          if (!evt) continue;
          if (evt.event === 'token') {
            answer += evt.data;
            bubble.innerHTML = render(answer);
            scrollDown();
          } else if (evt.event === 'done') {
            store.set(evt.data);
            finished = true;
          } else if (evt.event === 'error') {
            fail(evt.data || FALLBACK);
            finished = true;
          }
        }
      }
      if (!answer && !bubble.classList.contains('is-error')) fail(FALLBACK);
    } catch {
      fail(FALLBACK);
    } finally {
      setBusy(false);
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    input.value = '';
    ask(q);
  });

  log.addEventListener('click', (e) => {
    const chip = e.target.closest('.chat-chip');
    if (chip) ask(chip.textContent.trim());
  });
})();
