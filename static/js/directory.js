/**
 * Directory management JavaScript
 */

let directoryData = [];

// Load directory data
async function loadDirectory() {
    try {
        const tbody = document.getElementById('directory-tbody');
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Loading...</td></tr>';

        directoryData = await apiCall('/api/directory');
        renderDirectory(directoryData);
    } catch (error) {
        const tbody = document.getElementById('directory-tbody');
        tbody.innerHTML = '<tr><td colspan="8" class="loading">Error loading directory</td></tr>';
    }
}

// Render directory table
function renderDirectory(data) {
    const tbody = document.getElementById('directory-tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">No entries found</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(entry => `
        <tr>
            <td>${entry.ID || ''}</td>
            <td>${entry.Owner || ''}</td>
            <td>${entry.Phone || ''}</td>
            <td>${entry.Address || ''}</td>
            <td>${entry.City || ''}</td>
            <td>${entry.Zip || ''}</td>
            <td>${entry.Email || ''}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editDirectoryEntry(${entry.ID})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteDirectoryEntry(${entry.ID})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Search directory
let searchTimeout;
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('directory-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            searchTimeout = setTimeout(async () => {
                if (query.length === 0) {
                    renderDirectory(directoryData);
                    return;
                }

                try {
                    const results = await apiCall(`/api/directory/search?q=${encodeURIComponent(query)}`);
                    renderDirectory(results);
                } catch (error) {
                    console.error('Search error:', error);
                }
            }, 300);
        });
    }

    // Add entry button
    const addBtn = document.getElementById('add-directory-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openAddDirectoryModal();
        });
    }

    // Bulk import button
    const bulkImportBtn = document.getElementById('bulk-import-directory-btn');
    if (bulkImportBtn) {
        bulkImportBtn.addEventListener('click', () => {
            openBulkImportModal('directory');
        });
    }

    // Download template button
    const downloadTemplateBtn = document.getElementById('download-template-directory-btn');
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', () => {
            window.location.href = '/api/directory/template';
        });
    }

    // Directory form submission
    const directoryForm = document.getElementById('directory-form');
    if (directoryForm) {
        directoryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveDirectoryEntry();
        });
    }

    // Cancel buttons
    const cancelBtn = document.getElementById('cancel-directory-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            closeModal('directory-modal');
        });
    }
});

// Open add directory modal
function openAddDirectoryModal() {
    document.getElementById('modal-title').textContent = 'Add Directory Entry';
    document.getElementById('directory-id').value = '';
    document.getElementById('owner').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('address').value = '';
    document.getElementById('city').value = '';
    document.getElementById('zip').value = '';
    document.getElementById('email').value = '';
    openModal('directory-modal');
}

// Edit directory entry
async function editDirectoryEntry(id) {
    const entry = directoryData.find(e => e.ID === id);
    if (!entry) return;

    document.getElementById('modal-title').textContent = 'Edit Directory Entry';
    document.getElementById('directory-id').value = entry.ID;
    document.getElementById('owner').value = entry.Owner || '';
    document.getElementById('phone').value = entry.Phone || '';
    document.getElementById('address').value = entry.Address || '';
    document.getElementById('city').value = entry.City || '';
    document.getElementById('zip').value = entry.Zip || '';
    document.getElementById('email').value = entry.Email || '';
    openModal('directory-modal');
}

// Save directory entry
async function saveDirectoryEntry() {
    const id = document.getElementById('directory-id').value;
    const data = {
        Owner: document.getElementById('owner').value,
        Phone: document.getElementById('phone').value,
        Address: document.getElementById('address').value,
        City: document.getElementById('city').value,
        Zip: document.getElementById('zip').value,
        Email: document.getElementById('email').value
    };

    try {
        if (id) {
            // Update
            await apiCall(`/api/directory/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showMessage('Entry updated successfully');
        } else {
            // Add
            await apiCall('/api/directory', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showMessage('Entry added successfully');
        }

        closeModal('directory-modal');
        await loadDirectory();
    } catch (error) {
        console.error('Save error:', error);
    }
}

// Delete directory entry
async function deleteDirectoryEntry(id) {
    if (!confirm('Are you sure you want to delete this entry?')) {
        return;
    }

    try {
        await apiCall(`/api/directory/${id}`, {
            method: 'DELETE'
        });
        showMessage('Entry deleted successfully');
        await loadDirectory();
    } catch (error) {
        console.error('Delete error:', error);
    }
}

// Bulk import modal
function openBulkImportModal(type) {
    document.getElementById('bulk-import-modal').setAttribute('data-type', type);
    openModal('bulk-import-modal');
}

// Handle bulk import form
document.addEventListener('DOMContentLoaded', function() {
    const bulkImportForm = document.getElementById('bulk-import-form');
    if (bulkImportForm) {
        bulkImportForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const type = document.getElementById('bulk-import-modal').getAttribute('data-type');
            const fileInput = document.getElementById('csv-file');
            
            if (!fileInput.files.length) {
                showMessage('Please select a file', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            try {
                const endpoint = type === 'directory' 
                    ? '/api/directory/bulk-import'
                    : '/api/lot-owners/bulk-import';
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                
                if (result.success) {
                    showMessage(result.message);
                    closeModal('bulk-import-modal');
                    fileInput.value = '';
                    
                    if (type === 'directory') {
                        await loadDirectory();
                    } else {
                        if (typeof loadLotOwners === 'function') {
                            await loadLotOwners();
                        }
                    }
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                showMessage('Import failed: ' + error.message, 'error');
            }
        });
    }

    const cancelImportBtn = document.getElementById('cancel-import-btn');
    if (cancelImportBtn) {
        cancelImportBtn.addEventListener('click', () => {
            closeModal('bulk-import-modal');
            document.getElementById('csv-file').value = '';
        });
    }
});

