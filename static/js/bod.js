/**
 * Board of Directors management JavaScript
 */

let currentYear = null;
const positions = [
    'President',
    'Vice President',
    'BOD 1',
    'BOD 2',
    'BOD 3',
    'BOD 4',
    'BOD 5'
];

// Load BOD data
async function loadBOD() {
    try {
        // Load years
        const years = await apiCall('/api/bod/years');
        const yearSelect = document.getElementById('bod-year-select');
        
        yearSelect.innerHTML = '<option value="">Select Year...</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });

        // Load current year if available
        if (years.length > 0 && !currentYear) {
            currentYear = years[0];
            yearSelect.value = currentYear;
            await loadBODForYear(currentYear);
        } else if (currentYear) {
            await loadBODForYear(currentYear);
        } else {
            renderBODCards([]);
        }
    } catch (error) {
        console.error('Error loading BOD:', error);
    }
}

// Load BOD for specific year
async function loadBODForYear(year) {
    try {
        const data = await apiCall(`/api/bod?year=${year}`);
        renderBODCards(data);
    } catch (error) {
        console.error('Error loading BOD for year:', error);
    }
}

// Render BOD cards
function renderBODCards(data) {
    const container = document.getElementById('bod-cards');
    
    if (!data || data.length === 0) {
        // Create empty cards for all positions
        const emptyCards = positions.map(pos => ({
            Position: pos,
            Name: '',
            Additional_Duties: '',
            Contact_Info: ''
        }));
        container.innerHTML = emptyCards.map(createBODCard).join('');
        return;
    }

    // Create cards for all positions, filling in existing data
    const positionMap = {};
    data.forEach(item => {
        positionMap[item.Position] = item;
    });

    const cards = positions.map(pos => {
        const existing = positionMap[pos] || {};
        return {
            Position: pos,
            Name: existing.Name || '',
            Additional_Duties: existing.Additional_Duties || '',
            Contact_Info: existing.Contact_Info || ''
        };
    });

    container.innerHTML = cards.map(createBODCard).join('');
}

// Create BOD card HTML
function createBODCard(item) {
    return `
        <div class="bod-card">
            <h3>${item.Position}</h3>
            <div class="form-group">
                <label>Name:</label>
                <input type="text" class="bod-name" data-position="${item.Position}" value="${item.Name || ''}" placeholder="Enter name">
            </div>
            <div class="form-group">
                <label>Additional Duties:</label>
                <input type="text" class="bod-duties" data-position="${item.Position}" value="${item.Additional_Duties || ''}" placeholder="e.g., Treasurer">
            </div>
            <div class="form-group">
                <label>Contact Info:</label>
                <textarea class="bod-contact" data-position="${item.Position}" placeholder="Contact information">${item.Contact_Info || ''}</textarea>
            </div>
        </div>
    `;
}

// Save BOD data
async function saveBOD() {
    if (!currentYear) {
        showMessage('Please select a year first', 'error');
        return;
    }

    const positions = [];
    const cards = document.querySelectorAll('.bod-card');
    
    cards.forEach(card => {
        const position = card.querySelector('.bod-name').getAttribute('data-position');
        const name = card.querySelector('.bod-name').value.trim();
        const duties = card.querySelector('.bod-duties').value.trim();
        const contact = card.querySelector('.bod-contact').value.trim();

        positions.push({
            position: position,
            name: name,
            additional_duties: duties,
            contact_info: contact
        });
    });

    try {
        await apiCall('/api/bod', {
            method: 'POST',
            body: JSON.stringify({
                year: currentYear,
                positions: positions
            })
        });
        showMessage('Board of Directors saved successfully');
    } catch (error) {
        console.error('Error saving BOD:', error);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Year selector
    const yearSelect = document.getElementById('bod-year-select');
    if (yearSelect) {
        yearSelect.addEventListener('change', async function() {
            currentYear = this.value;
            if (currentYear) {
                await loadBODForYear(currentYear);
            } else {
                renderBODCards([]);
            }
        });
    }

    // Add year button
    const addYearBtn = document.getElementById('add-bod-year-btn');
    if (addYearBtn) {
        addYearBtn.addEventListener('click', () => {
            openAddYearModal();
        });
    }

    // Add year form
    const addYearForm = document.getElementById('add-year-form');
    if (addYearForm) {
        addYearForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const year = document.getElementById('new-year').value;
            if (year) {
                currentYear = year;
                yearSelect.value = year;
                await loadBODForYear(year);
                closeModal('add-year-modal');
                document.getElementById('new-year').value = '';
            }
        });
    }

    const cancelYearBtn = document.getElementById('cancel-year-btn');
    if (cancelYearBtn) {
        cancelYearBtn.addEventListener('click', () => {
            closeModal('add-year-modal');
        });
    }

    // Auto-save on input change (debounced)
    let saveTimeout;
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('bod-name') || 
            e.target.classList.contains('bod-duties') || 
            e.target.classList.contains('bod-contact')) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                if (currentYear) {
                    saveBOD();
                }
            }, 1000);
        }
    });
});

// Open add year modal
function openAddYearModal() {
    const currentDate = new Date();
    document.getElementById('new-year').value = currentDate.getFullYear();
    openModal('add-year-modal');
}

