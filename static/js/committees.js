/**
 * Committees management JavaScript
 */

const committeeList = [
    'Architectural',
    'Annual Finance Audit Committee',
    'Beautification',
    'Covenants',
    'By-laws',
    'Rules and Regulations',
    'Dock master',
    'Community Maintenance / annual bush hogging coordinator',
    'Neighborhood Watch',
    'Nominating Committee',
    'Pond Maintenance',
    'Road Signs',
    'Social Committee',
    'Welcome Committee',
    'Webmaster'
];

let committeesData = {};

// Load committees
async function loadCommittees() {
    try {
        committeesData = await apiCall('/api/committees');
        renderCommittees();
    } catch (error) {
        console.error('Error loading committees:', error);
    }
}

// Render committees
function renderCommittees() {
    const container = document.getElementById('committees-list');
    
    container.innerHTML = committeeList.map(committeeName => {
        const committee = committeesData[committeeName] || {
            members: [],
            meeting_notes: ''
        };
        
        return createCommitteeSection(committeeName, committee);
    }).join('');

    // Attach event listeners
    attachCommitteeListeners();
}

// Create committee section HTML
function createCommitteeSection(name, committee) {
    const membersHtml = committee.members.map((member, idx) => `
        <div class="member-item" data-index="${idx}">
            <input type="text" class="member-name" placeholder="Member name" value="${member.name || ''}">
            <select class="member-role">
                <option value="Member" ${member.role === 'Member' ? 'selected' : ''}>Member</option>
                <option value="Chair" ${member.role === 'Chair' ? 'selected' : ''}>Chair</option>
            </select>
            <input type="text" class="member-contact" placeholder="Contact info" value="${member.contact || ''}">
            <button type="button" class="btn btn-sm btn-danger" onclick="removeMember('${name}', ${idx})">Remove</button>
        </div>
    `).join('');

    return `
        <div class="committee-section" data-committee="${name}">
            <div class="committee-header">
                <h3>${name}</h3>
                <button class="btn btn-sm btn-primary" onclick="addMember('${name}')">Add Member</button>
            </div>
            <div class="committee-members" id="members-${name.replace(/\s+/g, '-')}">
                ${membersHtml || '<p class="info-message">No members yet. Click "Add Member" to add one.</p>'}
            </div>
            <div class="form-group" style="margin-top: 15px;">
                <label>Meeting Notes:</label>
                <textarea class="meeting-notes" data-committee="${name}" rows="3" placeholder="Meeting notes and updates...">${committee.meeting_notes || ''}</textarea>
            </div>
        </div>
    `;
}

// Attach event listeners for auto-save
function attachCommitteeListeners() {
    // Auto-save on input change (debounced)
    let saveTimeout;
    
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('member-name') || 
            e.target.classList.contains('member-role') || 
            e.target.classList.contains('member-contact') ||
            e.target.classList.contains('meeting-notes')) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                const committeeName = e.target.closest('.committee-section').getAttribute('data-committee');
                saveCommittee(committeeName);
            }, 1000);
        }
    });
}

// Add member to committee
function addMember(committeeName) {
    const membersContainer = document.getElementById(`members-${committeeName.replace(/\s+/g, '-')}`);
    
    // Remove "no members" message if present
    const noMembersMsg = membersContainer.querySelector('.info-message');
    if (noMembersMsg) {
        noMembersMsg.remove();
    }

    const memberIndex = membersContainer.children.length;
    const memberHtml = `
        <div class="member-item" data-index="${memberIndex}">
            <input type="text" class="member-name" placeholder="Member name">
            <select class="member-role">
                <option value="Member">Member</option>
                <option value="Chair">Chair</option>
            </select>
            <input type="text" class="member-contact" placeholder="Contact info">
            <button type="button" class="btn btn-sm btn-danger" onclick="removeMember('${committeeName}', ${memberIndex})">Remove</button>
        </div>
    `;
    
    membersContainer.insertAdjacentHTML('beforeend', memberHtml);
    
    // Auto-save after a moment
    setTimeout(() => saveCommittee(committeeName), 500);
}

// Remove member from committee
function removeMember(committeeName, index) {
    const membersContainer = document.getElementById(`members-${committeeName.replace(/\s+/g, '-')}`);
    const memberItem = membersContainer.querySelector(`[data-index="${index}"]`);
    
    if (memberItem) {
        memberItem.remove();
        
        // Re-index remaining members
        const remainingMembers = membersContainer.querySelectorAll('.member-item');
        remainingMembers.forEach((item, idx) => {
            item.setAttribute('data-index', idx);
            const removeBtn = item.querySelector('.btn-danger');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `removeMember('${committeeName}', ${idx})`);
            }
        });

        // Show "no members" message if empty
        if (membersContainer.children.length === 0) {
            membersContainer.innerHTML = '<p class="info-message">No members yet. Click "Add Member" to add one.</p>';
        }
        
        saveCommittee(committeeName);
    }
}

// Save committee
async function saveCommittee(committeeName) {
    const committeeSection = document.querySelector(`[data-committee="${committeeName}"]`);
    if (!committeeSection) return;

    const membersContainer = document.getElementById(`members-${committeeName.replace(/\s+/g, '-')}`);
    const members = [];
    
    const memberItems = membersContainer.querySelectorAll('.member-item');
    memberItems.forEach(item => {
        const name = item.querySelector('.member-name').value.trim();
        if (name) {
            members.push({
                name: name,
                role: item.querySelector('.member-role').value,
                contact: item.querySelector('.member-contact').value.trim()
            });
        }
    });

    const meetingNotes = committeeSection.querySelector('.meeting-notes').value.trim();

    try {
        await apiCall('/api/committees', {
            method: 'POST',
            body: JSON.stringify({
                committee_name: committeeName,
                members: members,
                meeting_notes: meetingNotes
            })
        });
    } catch (error) {
        console.error('Error saving committee:', error);
    }
}

