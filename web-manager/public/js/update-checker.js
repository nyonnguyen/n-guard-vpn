/**
 * Update Checker JavaScript
 * Handles checking for updates and managing the update installation process
 */

let eventSource = null;

/**
 * Check for available updates
 */
async function checkForUpdates() {
  const btn = document.getElementById('checkUpdateBtn');
  const statusCard = document.getElementById('updateStatusCard');
  const statusContent = document.getElementById('updateStatusContent');

  if (!btn || !statusCard || !statusContent) {
    console.error('Required elements not found');
    return;
  }

  // Disable button and show loading
  btn.disabled = true;
  btn.innerHTML = '<span class="animate-pulse">Checking...</span>';

  try {
    const response = await fetch('/api/version/check');
    const data = await response.json();

    // Show status card
    statusCard.classList.remove('hidden');

    if (data.update_available) {
      // Update available
      statusContent.className = 'p-4 bg-green-50 border-2 border-green-200 rounded-lg';
      statusContent.innerHTML = `
        <div class="flex items-start">
          <svg class="w-6 h-6 text-green-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div class="flex-1">
            <h3 class="font-bold text-green-800 text-lg mb-2">Update Available!</h3>
            <div class="space-y-2 mb-4">
              <p><strong>Current:</strong> <span class="font-mono">${data.current_version}</span></p>
              <p><strong>Latest:</strong> <span class="font-mono text-green-700">${data.latest_version}</span></p>
              <p><strong>Released:</strong> ${new Date(data.release_date).toLocaleDateString()}</p>
            </div>

            ${data.release_notes ? `
              <details class="mb-4 bg-white p-3 rounded border">
                <summary class="cursor-pointer font-semibold text-blue-600 hover:text-blue-800">
                  What's New
                </summary>
                <div class="mt-3 prose prose-sm max-w-none">
                  <pre class="text-sm bg-gray-50 p-3 rounded overflow-auto max-h-60 whitespace-pre-wrap">${data.release_notes}</pre>
                </div>
              </details>
            ` : ''}

            <button onclick="installUpdate('${data.latest_version}')"
                    class="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg font-semibold transition-colors shadow-md">
              Install Update to v${data.latest_version}
            </button>
          </div>
        </div>
      `;
    } else {
      // Already up to date
      statusContent.className = 'p-4 bg-blue-50 border-2 border-blue-200 rounded-lg';
      statusContent.innerHTML = `
        <div class="flex items-start">
          <svg class="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <p class="text-blue-800 font-semibold">You're up to date!</p>
            <p class="text-blue-700 text-sm mt-1">Running version ${data.current_version}</p>
          </div>
        </div>
      `;
    }
  } catch (error) {
    statusCard.classList.remove('hidden');
    statusContent.className = 'p-4 bg-red-50 border-2 border-red-200 rounded-lg';
    statusContent.innerHTML = `
      <div class="flex items-start">
        <svg class="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <p class="text-red-800 font-semibold">Error checking for updates</p>
          <p class="text-red-700 text-sm mt-1">${error.message}</p>
          <p class="text-red-600 text-xs mt-2">Please check your internet connection and try again.</p>
        </div>
      </div>
    `;
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Check for Updates';
  }
}

/**
 * Install update
 * @param {string} version - Version to install
 */
async function installUpdate(version) {
  // Confirm with user
  const confirmMessage = `Install update to version ${version}?\n\n` +
    `This will:\n` +
    `- Create a backup of the current version\n` +
    `- Download and verify the update\n` +
    `- Update all components\n` +
    `- Restart services\n\n` +
    `The process takes 2-5 minutes. Do not close this page or power off the device.`;

  if (!confirm(confirmMessage)) {
    return;
  }

  // Hide update status card
  const statusCard = document.getElementById('updateStatusCard');
  if (statusCard) {
    statusCard.classList.add('hidden');
  }

  // Show progress card
  const progressCard = document.getElementById('progressCard');
  if (progressCard) {
    progressCard.classList.remove('hidden');
  }

  try {
    // Start the update
    const response = await fetch('/api/update/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start update');
    }

    // Start listening to SSE for progress updates
    startProgressMonitoring();

  } catch (error) {
    showUpdateError(error.message);
  }
}

/**
 * Start monitoring update progress via SSE
 */
function startProgressMonitoring() {
  // Close existing connection if any
  if (eventSource) {
    eventSource.close();
  }

  // Create new SSE connection
  eventSource = new EventSource('/api/update/stream');

  eventSource.onmessage = function(event) {
    try {
      const status = JSON.parse(event.data);
      updateProgressUI(status);

      // Close connection on final states
      if (status.state === 'success' || status.state === 'failed') {
        eventSource.close();
        eventSource = null;

        if (status.state === 'success') {
          showUpdateSuccess();
        }
      }
    } catch (error) {
      console.error('Failed to parse SSE data:', error);
    }
  };

  eventSource.onerror = function(error) {
    console.error('SSE error:', error);
    eventSource.close();
    eventSource = null;
  };
}

/**
 * Update progress UI
 * @param {Object} status - Status object from server
 */
function updateProgressUI(status) {
  // Update progress bar
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = status.progress + '%';
  }

  // Update progress percentage
  const progressPercent = document.getElementById('progressPercent');
  if (progressPercent) {
    progressPercent.textContent = status.progress + '%';
  }

  // Update state
  const progressState = document.getElementById('progressState');
  if (progressState) {
    progressState.textContent = getStateLabel(status.state);
  }

  // Update message
  const progressMessage = document.getElementById('progressMessage');
  if (progressMessage) {
    progressMessage.textContent = status.message;
  }

  // Update logs
  const progressLogs = document.getElementById('progressLogs');
  if (progressLogs && status.logs && status.logs.length > 0) {
    progressLogs.textContent = status.logs.join('\n');
    // Auto-scroll to bottom
    progressLogs.scrollTop = progressLogs.scrollHeight;
  }
}

/**
 * Get user-friendly label for state
 * @param {string} state - State from server
 * @returns {string}
 */
function getStateLabel(state) {
  const labels = {
    'idle': 'Idle',
    'initializing': 'Initializing...',
    'validating': 'Validating Environment...',
    'backing_up': 'Creating Backup...',
    'downloading': 'Downloading Update...',
    'verifying': 'Verifying Download...',
    'installing': 'Installing Files...',
    'updating_images': 'Updating Docker Images...',
    'restarting': 'Restarting Services...',
    'verifying_health': 'Verifying Health...',
    'rolling_back': 'Rolling Back...',
    'success': 'Success!',
    'failed': 'Failed'
  };

  return labels[state] || state;
}

/**
 * Show update success message
 */
function showUpdateSuccess() {
  const progressCard = document.getElementById('progressCard');
  if (progressCard) {
    progressCard.innerHTML = `
      <div class="text-center py-8">
        <svg class="w-16 h-16 text-green-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3 class="text-2xl font-bold text-green-800 mb-2">Update Successful!</h3>
        <p class="text-gray-600 mb-4">N-Guard VPN has been updated successfully.</p>
        <p class="text-sm text-gray-500">Refreshing page in 3 seconds...</p>
      </div>
    `;

    // Reload page after 3 seconds
    setTimeout(() => {
      location.reload();
    }, 3000);
  }
}

/**
 * Show update error
 * @param {string} message - Error message
 */
function showUpdateError(message) {
  const progressCard = document.getElementById('progressCard');
  if (progressCard) {
    progressCard.classList.remove('hidden');
    progressCard.innerHTML = `
      <div class="text-center py-8">
        <svg class="w-16 h-16 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3 class="text-2xl font-bold text-red-800 mb-2">Update Failed</h3>
        <p class="text-gray-600 mb-4">${message}</p>
        <p class="text-sm text-gray-500 mb-4">The system has been rolled back to the previous version.</p>
        <button onclick="location.reload()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
          Reload Page
        </button>
      </div>
    `;
  }
}

// Make functions available globally
window.checkForUpdates = checkForUpdates;
window.installUpdate = installUpdate;
