// Groups Page Module

const GroupsPage = {
    groups: [],
    
    init: function() {
        console.log('Groups page initialized');
        this.loadGroups();
        this.attachEventListeners();
    },
    
    attachEventListeners: function() {
        const createGroupBtn = document.getElementById('createGroupBtn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', this.showCreateGroupModal.bind(this));
        }
        
        const modal = document.getElementById('createGroupModal');
        const closeBtn = modal?.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancelGroupBtn');
        const form = document.getElementById('createGroupForm');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', this.hideCreateGroupModal.bind(this));
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.hideCreateGroupModal.bind(this));
        }
        
        if (form) {
            form.addEventListener('submit', this.handleCreateGroup.bind(this));
        }
        
        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideCreateGroupModal();
                }
            });
        }
    },
    
    loadGroups: function() {
        const savedGroups = localStorage.getItem('meeplewood_groups');
        if (savedGroups) {
            this.groups = JSON.parse(savedGroups);
        }
        this.renderGroups();
    },
    
    renderGroups: function() {
        const groupsList = document.getElementById('groupsList');
        if (!groupsList) return;
        
        if (this.groups.length === 0) {
            groupsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <p>No groups yet. Create one to get started!</p>
                </div>
            `;
            return;
        }
        
        groupsList.innerHTML = this.groups.map((group, index) => `
            <div class="group-card" data-index="${index}">
                <div class="group-card-icon">👥</div>
                <h3>${group.name}</h3>
                <p>${group.description || 'No description'}</p>
                <p class="group-members">${group.members?.length || 0} members</p>
            </div>
        `).join('');
        
        // Add click handlers
        const groupCards = document.querySelectorAll('.group-card');
        groupCards.forEach((card, index) => {
            card.addEventListener('click', () => this.showGroupDetails(index));
        });
    },
    
    showCreateGroupModal: function() {
        const modal = document.getElementById('createGroupModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    },
    
    hideCreateGroupModal: function() {
        const modal = document.getElementById('createGroupModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Reset form
        const form = document.getElementById('createGroupForm');
        if (form) {
            form.reset();
        }
    },
    
    handleCreateGroup: function(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const groupName = formData.get('groupName');
        const groupDescription = formData.get('groupDescription');
        
        const newGroup = {
            id: Date.now(),
            name: groupName,
            description: groupDescription,
            members: [],
            createdAt: new Date().toISOString()
        };
        
        this.groups.push(newGroup);
        localStorage.setItem('meeplewood_groups', JSON.stringify(this.groups));
        
        console.log('Group created:', newGroup);
        
        this.hideCreateGroupModal();
        this.renderGroups();
        
        // Show success message
        alert(`Group "${groupName}" created successfully!`);
    },
    
    showGroupDetails: function(index) {
        const group = this.groups[index];
        if (!group) return;
        
        console.log('Showing details for group:', group.name);
        
        const groupDetails = document.getElementById('groupDetails');
        if (!groupDetails) return;
        
        groupDetails.style.display = 'block';
        groupDetails.innerHTML = `
            <h2>${group.name}</h2>
            <p>${group.description || 'No description'}</p>
            
            <h3>Members (${group.members?.length || 0})</h3>
            <div class="members-list">
                ${group.members?.length > 0 
                    ? group.members.map(member => `
                        <div class="member-item">
                            <div class="member-avatar">${member.name.charAt(0).toUpperCase()}</div>
                            <div>${member.name}</div>
                        </div>
                    `).join('')
                    : '<p class="empty-state">No members yet. Invite people to join!</p>'
                }
            </div>
            
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button class="primary-button" onclick="GroupsPage.addMember(${index})">+ Add Member</button>
                <button class="secondary-button" onclick="GroupsPage.hideGroupDetails()">Close</button>
            </div>
        `;
        
        groupDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    
    hideGroupDetails: function() {
        const groupDetails = document.getElementById('groupDetails');
        if (groupDetails) {
            groupDetails.style.display = 'none';
        }
    },
    
    addMember: function(groupIndex) {
        const memberName = prompt('Enter member name:');
        if (memberName && memberName.trim()) {
            if (!this.groups[groupIndex].members) {
                this.groups[groupIndex].members = [];
            }
            
            this.groups[groupIndex].members.push({
                id: Date.now(),
                name: memberName.trim()
            });
            
            localStorage.setItem('meeplewood_groups', JSON.stringify(this.groups));
            this.showGroupDetails(groupIndex);
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GroupsPage;
}
