/**
 * VPN Setup Page JavaScript
 */

// State
let authToken = null;
let peers = [];
let selectedPeerId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  loadServerStatus();
  loadPeers();

  // Add enter key handler for password input
  document.getElementById('vpnPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      vpnLogin();
    }
  });

  // Show iOS instructions by default
  showInstructions('ios');
});

/**
 * Check if user is already authenticated
 */
async function checkAuthStatus() {
  try {
    // Check localStorage for existing token
    const storedToken = localStorage.getItem('vpn_token');
    if (!storedToken) {
      return; // No token stored, user needs to login
    }

    // Verify token with server
    const response = await fetch(`/api/vpn/auth/status?token=${encodeURIComponent(storedToken)}`);
    const data = await response.json();

    if (data.authenticated) {
      authToken = storedToken;
      onAuthSuccess();
    } else {
      // Token invalid/expired, clear it
      localStorage.removeItem('vpn_token');
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }
}

/**
 * Login to access VPN configs
 */
async function vpnLogin() {
  const password = document.getElementById('vpnPassword').value;
  const errorDiv = document.getElementById('authError');
  const loginBtn = document.getElementById('loginBtn');

  if (!password) {
    showError(errorDiv, 'Please enter a password');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Authenticating...';

  try {
    const response = await fetch('/api/vpn/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      authToken = data.token;
      localStorage.setItem('vpn_token', authToken);
      onAuthSuccess();
    } else {
      showError(errorDiv, data.error || 'Authentication failed');
    }
  } catch (error) {
    showError(errorDiv, 'Connection error. Please try again.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Unlock';
  }
}

/**
 * Handle successful authentication
 */
function onAuthSuccess() {
  // Try to get token from localStorage if not set
  if (!authToken) {
    authToken = localStorage.getItem('vpn_token');
  }

  // Hide auth section, show management buttons
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('addPeerBtn').classList.remove('hidden');
  document.getElementById('downloadBtn').disabled = false;
  document.getElementById('copyBtn').disabled = false;

  // Refresh peers to show QR codes
  if (selectedPeerId) {
    selectPeer(selectedPeerId);
  }
}

/**
 * Show error message
 */
function showError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');
  setTimeout(() => {
    element.classList.add('hidden');
  }, 5000);
}

/**
 * Load server status
 */
async function loadServerStatus() {
  try {
    const response = await fetch('/api/vpn/status');
    const data = await response.json();

    const statusBadge = document.getElementById('vpnStatusBadge');
    const serverEndpoint = document.getElementById('serverEndpoint');
    const connectedPeers = document.getElementById('connectedPeers');

    if (data.running) {
      statusBadge.textContent = 'Online';
      statusBadge.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800';
    } else {
      statusBadge.textContent = 'Offline';
      statusBadge.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800';
    }

    if (data.server) {
      const endpoint = data.server.endpoint || '-';
      serverEndpoint.textContent = endpoint;

      // Warn if endpoint is localhost (misconfigured)
      if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
        serverEndpoint.classList.add('text-yellow-600');
        serverEndpoint.title = 'Warning: Endpoint not configured. Set PUBLIC_IP_OR_DDNS in .env';
      } else {
        serverEndpoint.classList.remove('text-yellow-600');
        serverEndpoint.title = '';
      }
    }

    if (data.peers) {
      connectedPeers.textContent = data.peers.length;
    }
  } catch (error) {
    console.error('Failed to load server status:', error);
    document.getElementById('vpnStatusBadge').textContent = 'Error';
    document.getElementById('vpnStatusBadge').className = 'px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800';
  }
}

/**
 * Load peer list
 */
async function loadPeers() {
  const loadingDiv = document.getElementById('peersLoading');
  const noPeersDiv = document.getElementById('noPeersMessage');
  const tabsDiv = document.getElementById('peerTabs');

  try {
    const response = await fetch('/api/vpn/peers');
    const data = await response.json();

    loadingDiv.classList.add('hidden');

    if (!data.peers || data.peers.length === 0) {
      noPeersDiv.classList.remove('hidden');
      return;
    }

    peers = data.peers;

    // Create tabs
    tabsDiv.innerHTML = '';
    peers.forEach((peer, index) => {
      const tab = document.createElement('button');
      tab.className = 'peer-tab px-4 py-2 text-gray-600 transition-colors';
      tab.textContent = peer.name || `Peer ${peer.id}`;
      tab.onclick = () => selectPeer(peer.id);
      tab.dataset.peerId = peer.id;
      tabsDiv.appendChild(tab);
    });

    // Select first peer by default
    if (peers.length > 0) {
      selectPeer(peers[0].id);
    }
  } catch (error) {
    console.error('Failed to load peers:', error);
    loadingDiv.innerHTML = '<p class="text-red-600">Failed to load configurations. Please refresh the page.</p>';
  }
}

/**
 * Select and display a peer
 */
async function selectPeer(peerId) {
  selectedPeerId = peerId;

  // Update tab styles
  document.querySelectorAll('.peer-tab').forEach(tab => {
    if (tab.dataset.peerId == peerId) {
      tab.classList.add('tab-active');
    } else {
      tab.classList.remove('tab-active');
    }
  });

  // Show details section
  document.getElementById('peerDetails').classList.remove('hidden');
  document.getElementById('noPeersMessage').classList.add('hidden');

  // Find peer data
  const peer = peers.find(p => p.id == peerId);
  if (!peer) return;

  // Update details
  document.getElementById('peerName').textContent = peer.name || `peer${peerId}`;
  document.getElementById('peerAddress').textContent = peer.address || '-';
  document.getElementById('peerDNS').textContent = peer.dns || '-';
  document.getElementById('peerEndpoint').textContent = peer.endpoint || '-';

  // Show/hide delete button (can't delete peer1)
  const deleteBtn = document.getElementById('deleteBtn');
  if (authToken && peerId != 1) {
    deleteBtn.classList.remove('hidden');
  } else {
    deleteBtn.classList.add('hidden');
  }

  // Load QR code if authenticated
  if (authToken && peer.hasQR) {
    loadQRCode(peerId);
  } else {
    document.getElementById('qrCode').classList.add('hidden');
    document.getElementById('qrPlaceholder').classList.remove('hidden');
  }
}

/**
 * Load QR code for peer
 */
async function loadQRCode(peerId) {
  const qrImg = document.getElementById('qrCode');
  const qrPlaceholder = document.getElementById('qrPlaceholder');

  try {
    // Use token in URL for image request
    const url = `/api/vpn/peers/${peerId}/qr?token=${encodeURIComponent(authToken)}`;

    // Create a test request to check if QR is available
    const response = await fetch(url);
    if (response.ok) {
      qrImg.src = url;
      qrImg.classList.remove('hidden');
      qrPlaceholder.classList.add('hidden');
    } else {
      qrPlaceholder.textContent = 'QR code not available';
      qrPlaceholder.classList.remove('hidden');
      qrImg.classList.add('hidden');
    }
  } catch (error) {
    console.error('Failed to load QR code:', error);
    qrPlaceholder.textContent = 'Failed to load QR code';
  }
}

/**
 * Download config file
 */
function downloadConfig() {
  if (!selectedPeerId || !authToken) return;

  const url = `/api/vpn/peers/${selectedPeerId}/config?token=${encodeURIComponent(authToken)}`;
  window.location.href = url;
}

/**
 * Copy config to clipboard
 */
async function copyConfig() {
  if (!selectedPeerId || !authToken) return;

  const copyBtn = document.getElementById('copyBtn');
  const originalText = copyBtn.textContent;

  try {
    copyBtn.textContent = 'Copying...';

    const response = await fetch(`/api/vpn/peers/${selectedPeerId}/config-content?token=${encodeURIComponent(authToken)}`);
    const data = await response.json();

    if (data.config) {
      await navigator.clipboard.writeText(data.config);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    } else {
      throw new Error('Config not found');
    }
  } catch (error) {
    console.error('Copy failed:', error);
    copyBtn.textContent = 'Copy Failed';
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  }
}

/**
 * Create a new peer
 */
async function createPeer() {
  if (!authToken) {
    alert('Please authenticate first');
    return;
  }

  const addBtn = document.getElementById('addPeerBtn');
  addBtn.disabled = true;
  addBtn.textContent = 'Creating...';

  try {
    const response = await fetch('/api/vpn/peers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert(`Peer ${data.peer.name} created successfully!`);
      await loadPeers();
      selectPeer(data.peer.id);
    } else {
      alert(data.error || 'Failed to create peer');
    }
  } catch (error) {
    console.error('Create peer failed:', error);
    alert('Failed to create peer. Please try again.');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = '+ Add Peer';
  }
}

/**
 * Delete the selected peer
 */
async function deletePeer() {
  if (!selectedPeerId || !authToken) return;

  if (selectedPeerId == 1) {
    alert('Cannot delete the primary peer (peer1)');
    return;
  }

  if (!confirm(`Are you sure you want to delete peer${selectedPeerId}? This action cannot be undone.`)) {
    return;
  }

  const deleteBtn = document.getElementById('deleteBtn');
  deleteBtn.disabled = true;
  deleteBtn.textContent = 'Deleting...';

  try {
    const response = await fetch(`/api/vpn/peers/${selectedPeerId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert(`Peer ${selectedPeerId} deleted successfully`);
      selectedPeerId = null;
      await loadPeers();
    } else {
      alert(data.error || 'Failed to delete peer');
    }
  } catch (error) {
    console.error('Delete peer failed:', error);
    alert('Failed to delete peer. Please try again.');
  } finally {
    deleteBtn.disabled = false;
    deleteBtn.textContent = 'Delete';
  }
}

/**
 * Show platform-specific instructions
 */
function showInstructions(platform) {
  // Hide all instruction panels
  document.querySelectorAll('.instruction-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  // Hide default message
  document.getElementById('instructions-default').classList.add('hidden');

  // Show selected platform instructions
  const selectedPanel = document.getElementById(`instructions-${platform}`);
  if (selectedPanel) {
    selectedPanel.classList.remove('hidden');
  }

  // Update tab styles
  document.querySelectorAll('.instruction-tab').forEach(tab => {
    if (tab.dataset.platform === platform) {
      tab.classList.remove('bg-gray-100');
      tab.classList.add('bg-green-600', 'text-white');
    } else {
      tab.classList.remove('bg-green-600', 'text-white');
      tab.classList.add('bg-gray-100');
    }
  });
}
