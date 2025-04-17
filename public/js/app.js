// Initialize Supabase client
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const userInfo = document.getElementById('user-info');
const userEmail = document.getElementById('user-email');
const apiKeysActions = document.getElementById('api-keys-actions');
const newApiKeyButton = document.getElementById('new-api-key-button');
const newApiKeyForm = document.getElementById('new-api-key-form');
const apiKeyName = document.getElementById('api-key-name');
const createApiKeyButton = document.getElementById('create-api-key-button');
const cancelApiKeyButton = document.getElementById('cancel-api-key-button');
const apiKeysList = document.getElementById('api-keys-list');
const parserForm = document.getElementById('parser-form');
const apiKeySelect = document.getElementById('api-key-select');
const documentForm = document.getElementById('document-form');
const parserResult = document.getElementById('parser-result');
const resultJson = document.getElementById('result-json');

// Initialize
init();

async function init() {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (session) {
        updateUIForLoggedInUser(session.user);
        loadApiKeys();
    }

    // Set up auth listeners
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            updateUIForLoggedInUser(session.user);
            loadApiKeys();
        } else if (event === 'SIGNED_OUT') {
            updateUIForLoggedOutUser();
        }
    });

    // Set up event listeners
    loginButton.addEventListener('click', handleLogin);
    logoutButton.addEventListener('click', handleLogout);
    newApiKeyButton.addEventListener('click', toggleNewApiKeyForm);
    createApiKeyButton.addEventListener('click', createApiKey);
    cancelApiKeyButton.addEventListener('click', toggleNewApiKeyForm);
    documentForm.addEventListener('submit', handleDocumentSubmit);
}

// Auth functions
async function handleLogin() {
    try {
        loginButton.disabled = true;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });

        if (error) throw error;
    } catch (error) {
        console.error('Error logging in:', error.message);
        showToast('Error logging in: ' + error.message, 'danger');
    } finally {
        loginButton.disabled = false;
    }
}

async function handleLogout() {
    try {
        logoutButton.disabled = true;

        const { error } = await supabase.auth.signOut();

        if (error) throw error;

        updateUIForLoggedOutUser();
    } catch (error) {
        console.error('Error logging out:', error.message);
        showToast('Error logging out: ' + error.message, 'danger');
    } finally {
        logoutButton.disabled = false;
    }
}

function updateUIForLoggedInUser(user) {
    loginButton.classList.add('d-none');
    userInfo.classList.remove('d-none');
    userEmail.textContent = user.email;

    document.querySelectorAll('.login-required-msg').forEach(el => {
        el.classList.add('d-none');
    });

    apiKeysActions.classList.remove('d-none');
    parserForm.classList.remove('d-none');
}

function updateUIForLoggedOutUser() {
    loginButton.classList.remove('d-none');
    userInfo.classList.add('d-none');
    userEmail.textContent = '';

    document.querySelectorAll('.login-required-msg').forEach(el => {
        el.classList.remove('d-none');
    });

    apiKeysActions.classList.add('d-none');
    parserForm.classList.add('d-none');

    apiKeysList.innerHTML = '';
    apiKeySelect.innerHTML = '';
    parserResult.classList.add('d-none');
}

// API Key functions
function toggleNewApiKeyForm() {
    newApiKeyForm.classList.toggle('d-none');
    if (!newApiKeyForm.classList.contains('d-none')) {
        apiKeyName.focus();
    } else {
        apiKeyName.value = '';
    }
}

async function createApiKey() {
    try {
        const name = apiKeyName.value.trim();

        if (!name) {
            showToast('Please provide a name for your API key', 'warning');
            return;
        }

        createApiKeyButton.disabled = true;
        createApiKeyButton.innerHTML = '<span class="spinner-border" role="status" aria-hidden="true"></span> Creating...';

        const response = await fetch('/api/api-keys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create API key');
        }

        const result = await response.json();

        showToast('API key created successfully', 'success');
        toggleNewApiKeyForm();
        loadApiKeys();
    } catch (error) {
        console.error('Error creating API key:', error.message);
        showToast('Error creating API key: ' + error.message, 'danger');
    } finally {
        createApiKeyButton.disabled = false;
        createApiKeyButton.textContent = 'Create';
    }
}

async function loadApiKeys() {
    try {
        apiKeysList.innerHTML = '<p>Loading API keys...</p>';
        apiKeySelect.innerHTML = '<option value="">Loading...</option>';

        const response = await fetch('/api/api-keys');

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to load API keys');
        }

        const { apiKeys } = await response.json();

        displayApiKeys(apiKeys);
        populateApiKeySelect(apiKeys);
    } catch (error) {
        console.error('Error loading API keys:', error.message);
        apiKeysList.innerHTML = `<p class="text-danger">Error loading API keys: ${error.message}</p>`;
        apiKeySelect.innerHTML = '<option value="">No API keys available</option>';
    }
}

function displayApiKeys(apiKeys) {
    if (!apiKeys || apiKeys.length === 0) {
        apiKeysList.innerHTML = '<p>No API keys found. Create one to get started.</p>';
        return;
    }

    apiKeysList.innerHTML = '';

    apiKeys.forEach(apiKey => {
        const keyItem = document.createElement('div');
        keyItem.className = 'api-key-item';

        const createdDate = new Date(apiKey.createdAt).toLocaleDateString();
        const lastUsedDate = apiKey.lastUsedAt
            ? new Date(apiKey.lastUsedAt).toLocaleDateString()
            : 'Never';

        keyItem.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h5 class="mb-0">${apiKey.name}</h5>
        <button class="btn btn-sm btn-outline-danger revoke-key" data-key-id="${apiKey.id}">Revoke</button>
      </div>
      <div class="api-key-value mb-2">${apiKey.key}</div>
      <div class="api-key-meta">
        Created: ${createdDate} | Last used: ${lastUsedDate}
        ${apiKey.expiresAt ? ` | Expires: ${new Date(apiKey.expiresAt).toLocaleDateString()}` : ''}
      </div>
    `;

        apiKeysList.appendChild(keyItem);

        // Add event listener to revoke button
        keyItem.querySelector('.revoke-key').addEventListener('click', () => revokeApiKey(apiKey.id));
    });
}

function populateApiKeySelect(apiKeys) {
    apiKeySelect.innerHTML = '';

    if (!apiKeys || apiKeys.length === 0) {
        apiKeySelect.innerHTML = '<option value="">No API keys available</option>';
        return;
    }

    apiKeys.forEach(apiKey => {
        const option = document.createElement('option');
        option.value = apiKey.key;
        option.textContent = `${apiKey.name} (${apiKey.key.substring(0, 8)}...)`;
        apiKeySelect.appendChild(option);
    });
}

async function revokeApiKey(apiKeyId) {
    try {
        if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
            return;
        }

        const response = await fetch(`/api/api-keys/${apiKeyId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to revoke API key');
        }

        showToast('API key revoked successfully', 'success');
        loadApiKeys();
    } catch (error) {
        console.error('Error revoking API key:', error.message);
        showToast('Error revoking API key: ' + error.message, 'danger');
    }
}

// Document processing functions
async function handleDocumentSubmit(e) {
    e.preventDefault();

    try {
        const apiKey = apiKeySelect.value;
        const file = document.getElementById('document-file').files[0];
        const languageHint = document.getElementById('language-hint').value.trim();
        const documentType = document.getElementById('document-type').value;

        if (!apiKey) {
            showToast('Please select an API key', 'warning');
            return;
        }

        if (!file) {
            showToast('Please select a document to parse', 'warning');
            return;
        }

        // Show loading state
        document.querySelector('#document-form button[type="submit"]').disabled = true;
        document.querySelector('#document-form button[type="submit"]').innerHTML =
            '<span class="spinner-border" role="status" aria-hidden="true"></span> Processing...';

        parserResult.classList.add('d-none');

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        if (languageHint) {
            formData.append('language', languageHint);
        }

        if (documentType) {
            formData.append('documentType', documentType);
        }

        // Send request
        const response = await fetch('/api/documents/parse', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
            },
            body: formData,
        });

        if (!response.ok) {
            let errorMessage = 'Failed to parse document';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // If response is not JSON
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        // Display result
        resultJson.textContent = JSON.stringify(result, null, 2);
        parserResult.classList.remove('d-none');

        showToast('Document processed successfully', 'success');
    } catch (error) {
        console.error('Error processing document:', error.message);
        showToast('Error processing document: ' + error.message, 'danger');
    } finally {
        // Reset loading state
        document.querySelector('#document-form button[type="submit"]').disabled = false;
        document.querySelector('#document-form button[type="submit"]').textContent = 'Parse Document';
    }
}

// Helper functions
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');

    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${type} border-0 mb-2`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

    toastContainer.appendChild(toastEl);

    // Initialize Bootstrap toast
    const toast = new bootstrap.Toast(toastEl, {
        autohide: true,
        delay: 5000,
    });

    // Show toast
    toast.show();

    // Remove toast when hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
} 