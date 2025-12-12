/**
 * Lot Owners management JavaScript
 */

let lotOwnersData = [];

// Load lot owners
async function loadLotOwners() {
    try {
        const tbody = document.getElementById('lot-owners-tbody');
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Loading...</td></tr>';

        lotOwnersData = await apiCall('/api/lot-owners');
        renderLotOwners(lotOwnersData);
    } catch (error) {
        const tbody = document.getElementById('lot-owners-tbody');
        tbody.innerHTML = '<tr><td colspan="4" class="loading">Error loading lot owners</td></tr>';
    }
}

// Render lot owners table
function renderLotOwners(data) {
    const tbody = document.getElementById('lot-owners-tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">No lot owners found. Sync from Directory or import from CSV.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map((owner, index) => `
        <tr>
            <td>${owner.Surname || ''}</td>
            <td>${owner.FirstName || ''}</td>
            <td>
                <input type="text" class="lot-numbers-input" data-index="${index}" value="${owner.Lot_Numbers || ''}" placeholder="e.g., 1,2,3" onchange="updateLotNumbers(${index})">
            </td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteLotOwner(${index})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Update lot numbers
async function updateLotNumbers(index) {
    const input = document.querySelector(`.lot-numbers-input[data-index="${index}"]`);
    const lotNumbers = input.value.trim();
    
    const owner = lotOwnersData[index];
    if (!owner) return;

    // Update local data
    owner.Lot_Numbers = lotNumbers;

    // Save to backend (we'll need to add an update endpoint or use add which should handle updates)
    try {
        await apiCall('/api/lot-owners', {
            method: 'POST',
            body: JSON.stringify({
                Surname: owner.Surname,
                FirstName: owner.FirstName,
                Lot_Numbers: lotNumbers
            })
        });
    } catch (error) {
        console.error('Error updating lot numbers:', error);
    }
}

// Delete lot owner
async function deleteLotOwner(index) {
    if (!confirm('Are you sure you want to delete this lot owner?')) {
        return;
    }

    const owner = lotOwnersData[index];
    if (!owner) return;

    // Remove from local data
    lotOwnersData.splice(index, 1);
    
    // Re-render
    renderLotOwners(lotOwnersData);

    // Note: We might want to add a delete endpoint, but for now we'll just remove from display
    showMessage('Lot owner removed from display. Note: This does not delete from Excel yet.');
}

// Sync from directory
async function syncFromDirectory() {
    if (!confirm('This will replace all current lot owners with entries from the Directory. Continue?')) {
        return;
    }

    try {
        const result = await apiCall('/api/lot-owners/sync-directory', {
            method: 'POST'
        });
        showMessage(result.message);
        await loadLotOwners();
    } catch (error) {
        console.error('Error syncing from directory:', error);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Sync button
    const syncBtn = document.getElementById('sync-lot-owners-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', syncFromDirectory);
    }

    // Bulk import button
    const bulkImportBtn = document.getElementById('bulk-import-lot-owners-btn');
    if (bulkImportBtn) {
        bulkImportBtn.addEventListener('click', () => {
            openBulkImportModal('lot-owners');
        });
    }

    // Download template button
    const downloadTemplateBtn = document.getElementById('download-template-lot-owners-btn');
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', () => {
            window.location.href = '/api/lot-owners/template';
        });
    }
});

