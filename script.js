// --- Synxverse improved client-only verification script ---
// NOTE: This improves your static-site flow. It is NOT foolproof.
// Save this as script.js and replace the old one.

const CONFIG = {
  lootlabsRefDomains: ['lootdest.org','lootlabs.net','linkvertise.com','linkvertisecode.com'],
  robloxEventUrl: "https://www.roblox.com/games/123456789/Event-Game",
  discordUrl: "https://discord.gg/ZJT3qKA7",
  sessionTTLms: 10 * 60 * 1000, // session validity (10 minutes)
  maxRefChecks: 60, // checks (3 min at 3s interval)
};

// small util
function now() { return Date.now(); }
function randId(len = 10) { return Math.random().toString(36).slice(2, 2 + len).toUpperCase(); }
function b64(s){ try{return btoa(unescape(encodeURIComponent(s))); } catch(e){return '';}}
function unb64(s){ try{return decodeURIComponent(escape(atob(s))); } catch(e){return '';}}
function setStatus(text){ const el=document.getElementById('statusText'); if(el) el.textContent=text; }

// ----------------- session helpers -----------------
function makeSessionObject(){
  return {
    sId: 'S-' + randId(12),
    createdAt: now(),
    verified: false,
    verifiedBy: null,   // 'referrer' or later 'bot'
    expiresAt: now() + CONFIG.sessionTTLms
  };
}

function saveSession(session){
  // use sessionStorage so tabs close invalidate it
  sessionStorage.setItem('synx_session', JSON.stringify(session));
}

function loadSession(){
  const raw = sessionStorage.getItem('synx_session');
  if(!raw) return null;
  try{
    const s = JSON.parse(raw);
    if(!s || typeof s !== 'object') return null;
    // expiry check
    if(s.expiresAt && now() > s.expiresAt) { sessionStorage.removeItem('synx_session'); return null; }
    return s;
  }catch(e){ sessionStorage.removeItem('synx_session'); return null; }
}

function clearSession(){
  sessionStorage.removeItem('synx_session');
}

// ----------------- anti-tamper detection -----------------
function isDevToolsOpen(){
  // heuristic only: not perfect
  const threshold = 160;
  const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
  const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
  if(widthDiff > threshold || heightDiff > threshold) return true;
  // try to detect debugger via toString hack
  let dev = false;
  const start = performance.now();
  debugger;
  const end = performance.now();
  if(end - start > 100) dev = true;
  return dev;
}

function attachBasicTamperHandlers(){
  // discourage copy/paste and devtools
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if(e.key==='F12' || (e.ctrlKey && e.shiftKey && ['I','C'].includes(e.key)) || (e.ctrlKey && e.key==='u')) {
      e.preventDefault();
      // mild UX warning
      const el=document.getElementById('statusText');
      if(el) el.textContent = 'DevTools blocked during verification.';
      return false;
    }
  });
  // intercept copy of anchor elements
  document.addEventListener('copy', e=>{
    const sel = window.getSelection().toString();
    if(sel && sel.includes('roblox.com')) {
      e.preventDefault();
      setStatus('Copy disabled for links.');
    }
  });
}

// ----------------- UI helpers -----------------
function setEventButtonLink(encoded) {
  const btn = document.getElementById('eventButton');
  if(!btn) return;
  // set data attribute with obfuscated value (not plain link in DOM)
  btn.setAttribute('data-enc', encoded);
  btn.removeAttribute('data-link'); // ensure not leaking
  btn.classList.remove('disabled');
}

function openEventFromButton(){
  const btn = document.getElementById('eventButton');
  if(!btn) return;
  const enc = btn.getAttribute('data-enc');
  if(!enc) { alert('No event link yet. Complete verification.'); return; }
  const url = unb64(enc);
  // open in new tab/window
  window.open(url, '_blank', 'noopener');
}

// ----------------- core flows -----------------

// index page flow: user clicks begin --> create session --> open ad partner --> go to redirect.html
function initIndexPage(){
  attachBasicTamperHandlers();
  const begin = document.getElementById('beginAccess');
  if(!begin) return;
  begin.addEventListener('click', ()=>{
    // create ephemeral session
    const session = makeSessionObject();
    saveSession(session);
    setStatus('Opening verification partner...');
    // Open ad partner in new tab so referrer flow is possible for some users
    window.open(CONFIG.lootlabsUrl || 'about:blank','_blank');
    // small UI feedback then redirect to redirect.html
    begin.disabled = true;
    begin.textContent = 'Verification started...';
    setTimeout(()=>{ window.location.href = 'redirect.html'; }, 900);
  });
}

// redirect.html flow: check referrer and poll for verification
function initRedirectPage(){
  attachBasicTamperHandlers();
  const btn = document.getElementById('eventButton');
  if(btn){
    btn.addEventListener('click', openEventFromButton);
  }
  const session = loadSession();
  if(!session){
    // no session -> force bypass page
    setStatus('No verification session detected. Redirecting...');
    setTimeout(()=> window.location.href = 'bypass.html', 800);
    return;
  }

  // quick devtools check; if devtools open, send them to bypass
  try{ if(isDevToolsOpen()){ sessionStorage.setItem('bypassReason','Devtools detected'); window.location.href='bypass.html'; return; } }catch(e){}

  setStatus('Checking verification status...');
  // If referrer points to partner domain right now, mark verified
  const ref = document.referrer || '';
  const lcRef = ref.toLowerCase();
  let matched = false;
  for(const d of CONFIG.lootlabsRefDomains){
    if(lcRef.includes(d)){ matched = true; break; }
  }
  if(matched){
    session.verified = true;
    session.verifiedBy = 'referrer';
    session.verifiedAt = now();
    // give only a short expiry from verification moment (shorten leak window)
    session.expiresAt = now() + (3 * 60 * 1000); // 3 minutes after verified
    saveSession(session);
    // obfuscate the roblox link and set on button
    const encoded = b64(CONFIG.robloxEventUrl + '?s=' + session.sId); // append session id for tracking (client-side only)
    setEventButtonLink(encoded);
    setStatus('Verification detected! Click JOIN to open the event.');
    return;
  }

  // otherwise, enter a short poll loop that checks if the session was validated (some partners redirect back)
  let checks = 0;
  const poll = setInterval(()=>{
    checks++;
    const cur = loadSession();
    if(!cur){ clearInterval(poll); window.location.href='bypass.html'; return; }
    // if verified by earlier flow, show success
    if(cur.verified){
      clearInterval(poll);
      const encoded = b64(CONFIG.robloxEventUrl + '?s=' + cur.sId);
      setEventButtonLink(encoded);
      setStatus('Verification complete! Click JOIN to open the event.');
      return;
    }
    // else check if referrer became correct (user returned)
    const nowRef = document.referrer || '';
    for(const d of CONFIG.lootlabsRefDomains){
      if(nowRef.toLowerCase().includes(d)){
        cur.verified = true;
        cur.verifiedBy = 'referrer';
        cur.verifiedAt = now();
        cur.expiresAt = now() + (3 * 60 * 1000);
        saveSession(cur);
        clearInterval(poll);
        const encoded = b64(CONFIG.robloxEventUrl + '?s=' + cur.sId);
        setEventButtonLink(encoded);
        setStatus('Verification complete! Click JOIN to open the event.');
        return;
      }
    }

    if(checks >= CONFIG.maxRefChecks){
      clearInterval(poll);
      // fallback: show token input to request manual verification via Discord (staff)
      setStatus('Verification timed out. Request manual review via Discord.');
      const tokenInput = document.getElementById('tokenInput');
      if(tokenInput) tokenInput.classList.remove('hidden');
      return;
    }
  }, 3000);
}

// bypass page: show reason, clear session, and provide contact
function initBypassPage(){
  attachBasicTamperHandlers();
  const reason = sessionStorage.getItem('bypassReason') || 'Verification failed or bypass detected.';
  const reasonEl = document.getElementById('bypassReason');
  if(reasonEl) reasonEl.textContent = reason;
  // clear session
  clearSession();
  // wire buttons
  const goHome = document.getElementById('goHome');
  if(goHome) goHome.addEventListener('click', ()=> { window.location.href='index.html'; });
  const contact = document.getElementById('contactSupport');
  if(contact) contact.addEventListener('click', ()=> { window.open(CONFIG.discordUrl,'_blank'); });
}

// optional manual token submit (for staff manual verification)
function initManualTokenSubmit(){
  const submit = document.getElementById('submitToken');
  if(!submit) return;
  submit.addEventListener('click', ()=>{
    const tokenField = document.getElementById('tokenField');
    if(!tokenField) return;
    const entered = (tokenField.value||'').trim();
    if(!entered){ alert('Paste the verification code you received from partner or staff.'); return; }
    // client-only: accept token if it matches session id suffix - this is fuzzy and only for UX
    const session = loadSession();
    if(!session){ alert('No active session. Start verification again.'); return; }
    if(entered.includes(session.sId.slice(-6))){ // weak check to allow staff to issue a code containing session suffix
      session.verified = true;
      session.verifiedBy = 'manual';
      session.verifiedAt = now();
      session.expiresAt = now() + (3*60*1000);
      saveSession(session);
      const encoded = b64(CONFIG.robloxEventUrl + '?s=' + session.sId);
      setEventButtonLink(encoded);
      setStatus('Manual verification accepted. Click JOIN.');
    } else {
      alert('Invalid code. Contact staff in Discord.');
    }
  });
}

// ----------------- init -----------------
document.addEventListener('DOMContentLoaded', ()=>{
  // route pages by pathname
  const path = window.location.pathname.split('/').pop();
  // common UI init
  const joinBtn = document.getElementById('eventButton');
  if(joinBtn) joinBtn.addEventListener('click',(e)=>{ e.preventDefault(); openEventFromButton(); });

  if(path === '' || path === 'index.html') initIndexPage();
  else if(path === 'redirect.html') { initRedirectPage(); initManualTokenSubmit(); }
  else if(path === 'bypass.html') initBypassPage();
});
