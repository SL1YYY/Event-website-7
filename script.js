// Security Configuration
const SECURITY_CONFIG = {
    validTokens: ["TOKEN-123", "TOKEN-456", "TOKEN-789"],
    lootlabsUrl: "https://lootdest.org/s?UrSxQK6R",
    robloxEventUrl: "https://www.roblox.com/games/123456789/Event-Game",
    discordUrl: "https://discord.gg/dyGvnnymbHj",
    maxAttempts: 3,
    sessionTimeout: 86400000 // 24 hours
};

// Security State
let securityState = {
    attempts: 0,
    blocked: false,
    devToolsDetected: false,
    suspiciousActivity: false,
    sessionId: generateSessionId(),
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
};

// Initialize everything when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeSecurity();
    initializePageLogic();
    startSecurityMonitoring();
    updateTimestamps();
});

// Security Functions (TONED DOWN)
function initializeSecurity() {
    detectDevTools();
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', handleKeyDown);
    
    if (window.location.pathname.includes('redirect.html')) {
        validateReferrer();
    }
    
    // Removed automation detection - too aggressive
    validateSession();
}

function detectDevTools() {
    const threshold = 160;
    
    function check() {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
            if (!securityState.devToolsDetected) {
                securityState.devToolsDetected = true;
                logSecurityEvent('DevTools detected');
                handleSecurityViolation('devtools');
            }
        }
    }
    
    setInterval(check, 5000); // Check less frequently
}

function handleKeyDown(e) {
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'u')) {
        e.preventDefault();
        logSecurityEvent('Blocked keyboard shortcut: ' + e.key);
        return false;
    }
}

function validateReferrer() {
    const validReferrers = [
        'https://lootlabs.net',
        'https://lootdest.org',
        window.location.origin
    ];
    
    const referrer = document.referrer;
    if (!referrer) {
        logSecurityEvent('No referrer detected');
        return;
    }
    
    let isValidReferrer = false;
    for (let validRef of validReferrers) {
        if (referrer.startsWith(validRef)) {
            isValidReferrer = true;
            break;
        }
    }
    
    if (!isValidReferrer) {
        logSecurityEvent('Invalid referrer: ' + referrer);
        redirectToBypass('Invalid referrer detected');
    }
}

function validateSession() {
    const sessionData = localStorage.getItem('eventSession');
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            if (Date.now() - session.created > SECURITY_CONFIG.sessionTimeout) {
                localStorage.removeItem('eventSession');
                logSecurityEvent('Session expired');
            }
        } catch (e) {
            localStorage.removeItem('eventSession');
            logSecurityEvent('Invalid session data');
        }
    }
}

function generateSessionId() {
    return 'SES-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function logSecurityEvent(event) {
    console.log(`[SECURITY] ${new Date().toISOString()}: ${event}`);
    
    const events = JSON.parse(localStorage.getItem('securityEvents') || '[]');
    events.push({
        timestamp: new Date().toISOString(),
        event: event,
        userAgent: navigator.userAgent,
        url: window.location.href
    });
    
    if (events.length > 50) {
        events.splice(0, events.length - 50);
    }
    
    localStorage.setItem('securityEvents', JSON.stringify(events));
}

function handleSecurityViolation(type) {
    switch (type) {
        case 'devtools':
            // Only redirect sometimes, not always
            if (Math.random() > 0.8) {
                redirectToBypass('DevTools usage detected');
            }
            break;
        case 'referrer':
            redirectToBypass('Invalid access method');
            break;
    }
}

function redirectToBypass(reason) {
    logSecurityEvent('Redirecting to bypass page: ' + reason);
    localStorage.setItem('bypassReason', reason);
    window.location.href = 'bypass.html';
}

// Page-specific Logic
function initializePageLogic() {
    const currentPage = getCurrentPage();
    
    switch (currentPage) {
        case 'index':
            initializeIndexPage();
            break;
        case 'redirect':
            initializeRedirectPage();
            break;
        case 'bypass':
            initializeBypassPage();
            break;
    }
}

function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('redirect.html')) return 'redirect';
    if (path.includes('bypass.html')) return 'bypass';
    return 'index';
}

// Index Page Logic
function initializeIndexPage() {
    const beginBtn = document.getElementById('beginAccess');
    if (beginBtn) {
        beginBtn.addEventListener('click', function() {
            // Add visual feedback
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // Create session
            const sessionData = {
                created: Date.now(),
                sessionId: securityState.sessionId,
                stage: 'verification'
            };
            localStorage.setItem('eventSession', JSON.stringify(sessionData));
            
            logSecurityEvent('User initiated access process');
            
            // Show loading state
            this.innerHTML = '<span>Opening Verification...</span>';
            this.disabled = true;
            
            // Open LootLabs in new tab
            window.open(SECURITY_CONFIG.lootlabsUrl, '_blank');
            
            // Redirect to verification page
            setTimeout(() => {
                window.location.href = 'redirect.html';
            }, 2000);
        });
    }
}

// Redirect Page Logic
function initializeRedirectPage() {
    const tokenInput = document.getElementById('accessToken');
    const validateBtn = document.getElementById('validateToken');
    const eventBtn = document.getElementById('eventButton');
    
    if (tokenInput && validateBtn) {
        validateBtn.addEventListener('click', function() {
            validateAccessToken();
        });
        
        tokenInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                validateAccessToken();
            }
        });
        
        tokenInput.addEventListener('input', function() {
            // Clear any error states when user starts typing
            const errorSection = document.getElementById('errorSection');
            if (errorSection && !errorSection.classList.contains('hidden')) {
                errorSection.classList.add('hidden');
            }
        });
    }
    
    if (eventBtn) {
        eventBtn.addEventListener('click', function() {
            const link = this.getAttribute('data-link');
            if (link && link !== '') {
                logSecurityEvent('User accessed event');
                // Add click animation
                this.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    this.style.transform = '';
                    window.open(link, '_blank');
                }, 150);
            }
        });
    }
    
    // Auto-focus token input
    if (tokenInput) {
        setTimeout(() => tokenInput.focus(), 500);
    }
    
    checkExistingSession();
}

function validateAccessToken() {
    const tokenInput = document.getElementById('accessToken');
    const token = tokenInput.value.trim().toUpperCase();
    
    if (!token) {
        showError('Please enter an access token');
        return;
    }
    
    // Check attempts
    securityState.attempts++;
    if (securityState.attempts > SECURITY_CONFIG.maxAttempts) {
        logSecurityEvent('Too many validation attempts');
        redirectToBypass('Too many failed attempts');
        return;
    }
    
    showLoadingState();
    
    setTimeout(() => {
        if (isValidToken(token)) {
            showSuccess(token);
            logSecurityEvent('Valid token provided: ' + token);
        } else {
            showError('Invalid token. Please check your token and try again.');
            logSecurityEvent('Invalid token attempt: ' + token);
            
            if (securityState.attempts >= SECURITY_CONFIG.maxAttempts) {
                setTimeout(() => {
                    redirectToBypass('Maximum attempts exceeded');
                }, 2000);
            }
        }
    }, 2000);
}

function isValidToken(token) {
    return SECURITY_CONFIG.validTokens.includes(token);
}

function showLoadingState() {
    const title = document.getElementById('verificationTitle');
    const spinner = document.getElementById('loadingSpinner');
    const statusText = document.getElementById('statusText');
    const tokenSection = document.getElementById('tokenInput');
    const validateBtn = document.getElementById('validateToken');
    
    if (title) title.textContent = 'Validating Access Token...';
    if (spinner) spinner.classList.remove('hidden');
    if (statusText) statusText.textContent = 'Verifying...';
    if (tokenSection) tokenSection.style.opacity = '0.5';
    if (validateBtn) {
        validateBtn.disabled = true;
        validateBtn.innerHTML = '<span>Validating...</span>';
    }
}

function showSuccess(token) {
    const tokenSection = document.getElementById('tokenInput');
    const successSection = document.getElementById('successSection');
    const errorSection = document.getElementById('errorSection');
    const eventBtn = document.getElementById('eventButton');
    const expiryTime = document.getElementById('expiryTime');
    
    if (tokenSection) tokenSection.classList.add('hidden');
    if (errorSection) errorSection.classList.add('hidden');
    if (successSection) successSection.classList.remove('hidden');
    
    if (eventBtn) {
        eventBtn.setAttribute('data-link', SECURITY_CONFIG.robloxEventUrl);
    }
    
    if (expiryTime) {
        const expiry = new Date(Date.now() + SECURITY_CONFIG.sessionTimeout);
        expiryTime.textContent = expiry.toISOString().replace('T', ' ').split('.')[0] + ' UTC';
    }
    
    // Store successful validation
    const sessionData = JSON.parse(localStorage.getItem('eventSession') || '{}');
    sessionData.validated = true;
    sessionData.token = hashToken(token);
    sessionData.validatedAt = Date.now();
    localStorage.setItem('eventSession', JSON.stringify(sessionData));
    
    // Add success animation
    successSection.style.animation = 'successSlide 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
}

function showError(message) {
    const tokenSection = document.getElementById('tokenInput');
    const successSection = document.getElementById('successSection');
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    const retryBtn = document.getElementById('retryButton');
    const spinner = document.getElementById('loadingSpinner');
    const statusText = document.getElementById('statusText');
    const validateBtn = document.getElementById('validateToken');
    
    if (tokenSection) tokenSection.style.opacity = '1';
    if (successSection) successSection.classList.add('hidden');
    if (errorSection) errorSection.classList.remove('hidden');
    if (errorMessage) errorMessage.textContent = message;
    if (spinner) spinner.classList.add('hidden');
    if (statusText) statusText.textContent = 'Ready';
    if (validateBtn) {
        validateBtn.disabled = false;
        validateBtn.innerHTML = '<span>Validate Token</span>';
    }
    
    if (retryBtn) {
        retryBtn.addEventListener('click', function() {
            if (errorSection) errorSection.classList.add('hidden');
            document.getElementById('accessToken').value = '';
            document.getElementById('accessToken').focus();
        });
    }
}

function checkExistingSession() {
    const sessionData = localStorage.getItem('eventSession');
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            if (session.validated && 
                Date.now() - session.validatedAt < SECURITY_CONFIG.sessionTimeout) {
                setTimeout(() => {
                    showSuccess('EXISTING-SESSION');
                }, 1000);
                logSecurityEvent('Existing valid session found');
            }
        } catch (e) {
            localStorage.removeItem('eventSession');
        }
    }
}

function hashToken(token) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

// Bypass Page Logic
function initializeBypassPage() {
    const goHomeBtn = document.getElementById('goHome');
    const contactSupportBtn = document.getElementById('contactSupport');
    
    if (goHomeBtn) {
        goHomeBtn.addEventListener('click', function() {
            // Add click animation
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                localStorage.clear();
                window.location.href = 'index.html';
            }, 150);
        });
    }
    
    if (contactSupportBtn) {
        contactSupportBtn.addEventListener('click', function() {
            // Add click animation
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
                window.open(SECURITY_CONFIG.discordUrl, '_blank');
            }, 150);
        });
    }
    
    updateSessionInfo();
    
    const bypassReason = localStorage.getItem('bypassReason');
    if (bypassReason) {
        logSecurityEvent('Bypass page accessed: ' + bypassReason);
        localStorage.removeItem('bypassReason');
    }
    
    localStorage.removeItem('eventSession');
    animateViolations();
}

function updateSessionInfo() {
    const timestampEl = document.getElementById('timestamp');
    const userAgentEl = document.getElementById('userAgent');
    const sessionIdEl = document.getElementById('sessionId');
    const userLoginEl = document.getElementById('userLogin');
    
    if (timestampEl) {
        timestampEl.textContent = '2025-08-08 10:41:20 UTC';
    }
    
    if (userAgentEl) {
        const ua = navigator.userAgent;
        let simplified = 'Unknown Browser';
        if (ua.includes('Chrome')) simplified = 'Chrome';
        else if (ua.includes('Safari')) simplified = 'Safari';
        else if (ua.includes('Firefox')) simplified = 'Firefox';
        else if (ua.includes('Edge')) simplified = 'Edge';
        
        if (ua.includes('Mobile')) simplified += ' (Mobile)';
        userAgentEl.textContent = simplified;
    }
    
    if (sessionIdEl) {
        sessionIdEl.textContent = securityState.sessionId + '-BYPASS-DETECTED';
    }
    
    if (userLoginEl) {
        userLoginEl.textContent = 'SL1YYY';
    }
}

function animateViolations() {
    const violations = document.querySelectorAll('.violation-list .step-card');
    violations.forEach((violation, index) => {
        setTimeout(() => {
            violation.style.opacity = '1';
            violation.style.transform = 'translateX(0)';
        }, index * 200);
    });
}

// Update timestamps throughout the site
function updateTimestamps() {
    const utcString = '2025-08-08 10:41:20 UTC';
    
    // Update any timestamp elements
    const timestampElements = document.querySelectorAll('[id*="timestamp"], .timestamp');
    timestampElements.forEach(el => {
        if (el.textContent.includes('UTC') || el.textContent.includes('2025')) {
            el.textContent = utcString;
        }
    });
}

// SIMPLIFIED Security Monitoring - No more aggressive checks
function startSecurityMonitoring() {
    // Just basic click effects, no security violations
    document.addEventListener('click', function(e) {
        // Add click effect to buttons
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            const btn = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
            btn.style.transform = 'scale(0.98)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 150);
        }
    });
    
    // Basic security check every 60 seconds instead of 30
    setInterval(performSecurityCheck, 60000);
}

function performSecurityCheck() {
    // Just check localStorage integrity
    try {
        const testData = localStorage.getItem('securityEvents');
        if (testData) {
            JSON.parse(testData);
        }
    } catch (e) {
        logSecurityEvent('Local storage corruption detected');
        localStorage.clear();
    }
}

// Simplified anti-debugging - less aggressive
(() => {
    let devtools = false;
    let threshold = 160;
    
    function detectDevTools() {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
            devtools = true;
        }
    }
    
    function randomDelay() {
        return Math.floor(Math.random() * 3000) + 2000; // Longer delays
    }
    
    setInterval(() => {
        detectDevTools();
        if (devtools && Math.random() > 0.9) { // Even less likely to trigger
            if (window.location.pathname !== '/bypass.html') {
                redirectToBypass('DevTools detected during monitoring');
            }
        }
    }, randomDelay());
})();

// Initialize security logging
logSecurityEvent('Security system initialized for user: SL1YYY');

// Modal Functions with HIGHER Z-INDEX
function showTermsModal() {
    const modalHTML = `
        <div class="modal-overlay" id="termsModal" style="z-index: 999999 !important;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">📜 Terms of Service</h3>
                    <button class="modal-close" onclick="closeModal('termsModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="modal-section">
                        <h4>🎯 Acceptance of Terms</h4>
                        <p>By using this Event Access Portal, you agree to these terms and all applicable laws.</p>
                    </div>
                    
                    <div class="modal-section">
                        <h4>🔐 Verification Process</h4>
                        <ul>
                            <li>Complete verification through authorized partners</li>
                            <li>Access tokens are single-use and expire after 24 hours</li>
                            <li>Sharing tokens is strictly prohibited</li>
                            <li>Multiple failed attempts may result in restrictions</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>🚫 Prohibited Activities</h4>
                        <ul>
                            <li>Bypassing verification systems</li>
                            <li>Using automated tools or bots</li>
                            <li>Tampering with security measures</li>
                            <li>Sharing credentials with unauthorized users</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>🎮 Event Access</h4>
                        <ul>
                            <li>Access granted at our discretion</li>
                            <li>Events may be limited by time or capacity</li>
                            <li>We reserve the right to modify events</li>
                            <li>No guarantee of specific outcomes</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>📞 Contact</h4>
                        <p>Questions? Contact us on <a href="https://discord.gg/dyGvnnymbHj" target="_blank">Discord</a>.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="closeModal('termsModal')">Got it!</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setTimeout(() => {
        document.getElementById('termsModal').classList.add('active');
    }, 10);
}

function showPrivacyModal() {
    const modalHTML = `
        <div class="modal-overlay" id="privacyModal" style="z-index: 999999 !important;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">🔒 Privacy Policy</h3>
                    <button class="modal-close" onclick="closeModal('privacyModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="modal-section">
                        <h4>🎯 Information We Collect</h4>
                        <ul>
                            <li><strong>Verification Tokens:</strong> Used solely to verify task completion</li>
                            <li><strong>Session Data:</strong> Temporary data to maintain verification status</li>
                            <li><strong>Timestamps:</strong> For token expiration and abuse prevention</li>
                            <li><strong>Browser Info:</strong> Basic technical data for security</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>🛡️ How We Use Your Information</h4>
                        <ul>
                            <li>Tokens verify completion of verification tasks</li>
                            <li>Session data ensures smooth user experience</li>
                            <li>Timestamps prevent token abuse and expiration</li>
                            <li>Browser info helps detect security threats</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>🔐 Data Protection</h4>
                        <ul>
                            <li><strong>We DO NOT collect personal information</strong></li>
                            <li>No usernames, emails, or personal data stored</li>
                            <li>All data is temporary and automatically deleted</li>
                            <li>Tokens are hashed for security</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>⏰ Data Retention</h4>
                        <ul>
                            <li>Session data: Deleted after 24 hours</li>
                            <li>Security logs: Kept locally, cleared regularly</li>
                            <li>Tokens: Single-use and immediately invalidated</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>📞 Questions?</h4>
                        <p>Contact us on <a href="https://discord.gg/dyGvnnymbHj" target="_blank">Discord</a> for privacy concerns.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="closeModal('privacyModal')">Understood!</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setTimeout(() => {
        document.getElementById('privacyModal').classList.add('active');
    }, 10);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Fix terms and privacy links
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const links = document.querySelectorAll('a[href="#"]');
        links.forEach(link => {
            const text = link.textContent.toLowerCase();
            if (text.includes('terms')) {
                link.onclick = function(e) {
                    e.preventDefault();
                    showTermsModal();
                    return false;
                };
            } else if (text.includes('privacy')) {
                link.onclick = function(e) {
                    e.preventDefault();
                    showPrivacyModal();
                    return false;
                };
            }
        });
    }, 500);
});
