/* TrendyBot shared authentication and account menu */
(() => {
  'use strict';

  const AUTH_TOKEN_KEY = 'trendyAuthToken';
  const API_BASE_KEY = 'trendyApiBase';
  const DEFAULT_API_BASE =
    'https://trendybot-connect-gateway.trendycreator380.workers.dev';

  function getApiBase() {
    const saved = localStorage.getItem(API_BASE_KEY) || '';
    return (
      window.TRENDY_API_BASE ||
      (saved && !saved.includes('.trycloudflare.com') ? saved : '') ||
      DEFAULT_API_BASE
    ).trim().replace(/\/+$/, '');
  }

  function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
  }

  async function getAccount() {
    const token = getAuthToken();

    if (token) {
      const response = await fetch(getApiBase() + '/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token }
      });

      if (response.status === 401) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        window.dispatchEvent(new Event('trendy-auth-changed'));
        throw new Error('Your TrendyBot session has expired. Please sign in again.');
      } else if (!response.ok) {
        throw new Error('Unable to check the independent account session.');
      } else {
        const result = await response.json();

        if (result?.success && result.user) {
          return {
            type: 'independent',
            token,
            user: result.user
          };
        }

        throw new Error('Invalid account service response.');
      }
    }

    return null;
  }

  async function getAccessToken() {
    const account = await getAccount();

    if (!account?.token) {
      throw new Error('Please sign in to your TrendyBot account first.');
    }

    return account.token;
  }

  async function signOut() {
    const token = getAuthToken();
    if (!token) {
      window.dispatchEvent(new Event('trendy-auth-changed'));
      return;
    }

    const response = await fetch(getApiBase() + '/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });

    if (!response.ok) {
      throw new Error('The account service could not sign you out.');
    }

    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.dispatchEvent(new Event('trendy-auth-changed'));
  }

  // Expose the shared service before page-specific scripts execute.
  window.TrendyAuth = Object.freeze({
    getAccessToken,
    getAccount,
    signOut
  });

  // The account menu is optional; authentication must work without it.
  const root = document.getElementById('tb-menu-root');
  if (!root) return;

  const toggle = document.getElementById('tb-menu-toggle');
  const panel = document.getElementById('tb-menu-panel');
  const accountLink = document.getElementById('tb-menu-account-link');
  const accountBox = document.getElementById('tb-menu-account');
  const nameNode = document.getElementById('tb-menu-name');
  const emailNode = document.getElementById('tb-menu-email');
  const signout = document.getElementById('tb-menu-signout');

  if (!toggle || !panel || !accountLink || !accountBox ||
      !nameNode || !emailNode || !signout) {
    console.warn('[Trendy menu] Required elements are missing.');
    return;
  }

  function showSignedOut() {
    accountLink.hidden = false;
    accountBox.hidden = true;
  }

  async function updateAccount() {
    try {
      const account = await getAccount();

      if (!account) {
        showSignedOut();
        return;
      }

      const user = account.user;
      const metadata = user.user_metadata || {};

      nameNode.textContent =
        user.displayName ||
        user.display_name ||
        metadata.full_name ||
        metadata.name ||
        user.email ||
        'Signed-in account';

      emailNode.textContent = user.email || '';
      accountLink.hidden = true;
      accountBox.hidden = false;
    } catch (error) {
      console.warn('[Trendy menu] Account status unavailable:', error.message);
      showSignedOut();
    }
  }

  function closeMenu() {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
  }

  toggle.addEventListener('click', () => {
    const opening = panel.hidden;
    panel.hidden = !opening;
    toggle.setAttribute('aria-expanded', String(opening));
    toggle.setAttribute(
      'aria-label',
      opening ? 'Close navigation menu' : 'Open navigation menu'
    );
  });

  document.addEventListener('click', event => {
    if (!root.contains(event.target)) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  signout.addEventListener('click', async () => {
    signout.disabled = true;
    signout.textContent = 'Signing out...';

    try {
      await signOut();
      window.location.replace('./index.html');
    } catch (error) {
      signout.disabled = false;
      signout.textContent = 'Sign Out';
      alert(error.message || 'Unable to sign out.');
    }
  });

  updateAccount();


  window.addEventListener('trendy-auth-changed', updateAccount);
  window.addEventListener('storage', event => {
    if (event.key === AUTH_TOKEN_KEY) updateAccount();
  });
})();
