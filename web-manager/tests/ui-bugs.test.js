/**
 * UI Bug Fixes v0.4.0 - Jest Tests
 * Tests for all bug fixes related to UI issues
 */

const fs = require('fs');
const path = require('path');

// Helper to read view files
const readView = (filename) => {
  return fs.readFileSync(
    path.join(__dirname, '..', 'views', filename),
    'utf8'
  );
};

// Helper to read JS files
const readJs = (filename) => {
  return fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', filename),
    'utf8'
  );
};

describe('UI Bug Fixes v0.4.0', () => {
  describe('Bug 1 & 6: Update Checker', () => {
    let aboutHtml;

    beforeAll(() => {
      aboutHtml = readView('about.ejs');
    });

    test('about.ejs contains updateStatusCard element', () => {
      expect(aboutHtml).toContain('id="updateStatusCard"');
    });

    test('about.ejs contains updateStatusContent element', () => {
      expect(aboutHtml).toContain('id="updateStatusContent"');
    });

    test('about.ejs contains progressCard element', () => {
      expect(aboutHtml).toContain('id="progressCard"');
    });

    test('about.ejs contains progressBar element', () => {
      expect(aboutHtml).toContain('id="progressBar"');
    });

    test('about.ejs contains progressState element', () => {
      expect(aboutHtml).toContain('id="progressState"');
    });

    test('about.ejs contains progressPercent element', () => {
      expect(aboutHtml).toContain('id="progressPercent"');
    });

    test('about.ejs contains progressMessage element', () => {
      expect(aboutHtml).toContain('id="progressMessage"');
    });

    test('about.ejs contains progressLogs element', () => {
      expect(aboutHtml).toContain('id="progressLogs"');
    });

    test('about.ejs loads update-checker.js', () => {
      expect(aboutHtml).toContain('update-checker.js');
    });
  });

  describe('Bug 2: VPN Authentication', () => {
    let vpnSetupJs;

    beforeAll(() => {
      vpnSetupJs = readJs('vpn-setup.js');
    });

    test('checkAuthStatus() retrieves stored token from localStorage', () => {
      expect(vpnSetupJs).toContain("localStorage.getItem('vpn_token')");
    });

    test('checkAuthStatus() sends token with status request', () => {
      expect(vpnSetupJs).toContain('/api/vpn/auth/status?token=');
    });

    test('checkAuthStatus() sets authToken on success', () => {
      expect(vpnSetupJs).toContain('authToken = storedToken');
    });

    test('checkAuthStatus() clears invalid token', () => {
      expect(vpnSetupJs).toContain("localStorage.removeItem('vpn_token')");
    });

    test('vpnLogin() stores token in localStorage on success', () => {
      expect(vpnSetupJs).toContain("localStorage.setItem('vpn_token'");
    });
  });

  describe('Bug 3: Server Endpoint Display', () => {
    let vpnSetupJs;

    beforeAll(() => {
      vpnSetupJs = readJs('vpn-setup.js');
    });

    test('loadServerStatus() checks for localhost in endpoint', () => {
      expect(vpnSetupJs).toContain("endpoint.includes('localhost')");
    });

    test('loadServerStatus() checks for 127.0.0.1 in endpoint', () => {
      expect(vpnSetupJs).toContain("endpoint.includes('127.0.0.1')");
    });

    test('loadServerStatus() adds warning class for localhost', () => {
      expect(vpnSetupJs).toContain("serverEndpoint.classList.add('text-yellow-600')");
    });

    test('loadServerStatus() sets warning title for misconfigured endpoint', () => {
      expect(vpnSetupJs).toContain('Warning: Endpoint not configured');
    });
  });

  describe('Bug 5: Platform Instructions', () => {
    let vpnSetupJs;
    let vpnSetupHtml;

    beforeAll(() => {
      vpnSetupJs = readJs('vpn-setup.js');
      vpnSetupHtml = readView('vpn-setup.ejs');
    });

    test('iOS instructions are shown by default on page load', () => {
      expect(vpnSetupJs).toContain("showInstructions('ios')");
    });

    test('showInstructions() function exists', () => {
      expect(vpnSetupJs).toContain('function showInstructions(platform)');
    });

    test('vpn-setup.ejs has instruction panels for all platforms', () => {
      expect(vpnSetupHtml).toContain('id="instructions-ios"');
      expect(vpnSetupHtml).toContain('id="instructions-android"');
      expect(vpnSetupHtml).toContain('id="instructions-windows"');
      expect(vpnSetupHtml).toContain('id="instructions-macos"');
      expect(vpnSetupHtml).toContain('id="instructions-linux"');
    });

    test('instruction tabs have onclick handlers', () => {
      expect(vpnSetupHtml).toContain("onclick=\"showInstructions('ios')\"");
      expect(vpnSetupHtml).toContain("onclick=\"showInstructions('android')\"");
      expect(vpnSetupHtml).toContain("onclick=\"showInstructions('windows')\"");
      expect(vpnSetupHtml).toContain("onclick=\"showInstructions('macos')\"");
      expect(vpnSetupHtml).toContain("onclick=\"showInstructions('linux')\"");
    });
  });

  describe('Bug 7: Status Page Loading', () => {
    let statusHtml;

    beforeAll(() => {
      statusHtml = readView('status.ejs');
    });

    test('status.ejs uses AbortController for fetch', () => {
      expect(statusHtml).toContain('new AbortController()');
    });

    test('status.ejs aborts pending requests', () => {
      expect(statusHtml).toContain('statusController.abort()');
    });

    test('status.ejs has fetch timeout (10 seconds)', () => {
      expect(statusHtml).toContain('setTimeout(() => statusController.abort(), 10000)');
    });

    test('status.ejs passes signal to fetch', () => {
      expect(statusHtml).toContain('signal: statusController.signal');
    });

    test('status.ejs handles AbortError', () => {
      expect(statusHtml).toContain("error.name === 'AbortError'");
    });

    test('status.ejs has showErrorState function', () => {
      expect(statusHtml).toContain('function showErrorState()');
    });

    test('status.ejs error state has retry button', () => {
      expect(statusHtml).toContain('onclick="loadStatus()"');
      expect(statusHtml).toContain('Retry');
    });

    test('status.ejs clears timeout on success', () => {
      expect(statusHtml).toContain('clearTimeout(timeoutId)');
    });
  });
});
