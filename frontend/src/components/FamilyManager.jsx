import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Copy, 
  Trash2, 
  UserPlus, 
  Crown, 
  Check, 
  ShieldAlert 
} from 'lucide-react';
import API from '../services/api';

function FamilyManager({ user, familyData, onFamilyUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // Form states
  const [familyNameInput, setFamilyNameInput] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // Add Member states
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberRel, setNewMemberRel] = useState('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (!familyData?.inviteCode) return;
    navigator.clipboard.writeText(familyData.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Create Family Group
  const handleCreateFamily = async (e) => {
    e.preventDefault();
    if (!familyNameInput.trim()) return setError('Please enter a family name.');
    setLoading(true);
    clearMessages();
    try {
      const response = await API.post('/family/create', { familyName: familyNameInput.trim() });
      setSuccess('Family group created successfully!');
      onFamilyUpdate(response.data.familyId, response.data.userRole);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create family group.');
    } finally {
      setLoading(false);
    }
  };

  // Join Family Group
  const handleJoinFamily = async (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return setError('Please enter a valid invite code.');
    setLoading(true);
    clearMessages();
    try {
      const response = await API.post('/family/join', { inviteCode: inviteCodeInput.trim() });
      setSuccess('Joined family group successfully!');
      onFamilyUpdate(response.data.familyId, response.data.userRole);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join family group. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  // Remove member (Admin only)
  const handleRemoveMember = async (memberId, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the family group?`)) return;
    setLoading(true);
    clearMessages();
    try {
      await API.delete(`/family/members/${memberId}`);
      setSuccess(`${name} was successfully removed from the family.`);
      onFamilyUpdate(familyData.familyId, user.role); // trigger reload
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member.');
    } finally {
      setLoading(false);
    }
  };

  // Add Managed Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail || !newMemberPassword) {
      return setError('Name, email, and password are required.');
    }
    setLoading(true);
    clearMessages();
    try {
      await API.post('/family/add-managed-member', {
        name: newMemberName.trim(),
        email: newMemberEmail.trim(),
        password: newMemberPassword,
        relationship: newMemberRel.trim()
      });
      setSuccess(`${newMemberName} added successfully!`);
      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberPassword('');
      setNewMemberRel('');
      onFamilyUpdate(familyData.familyId, user.role); // reload members
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member.');
    } finally {
      setLoading(false);
    }
  };

  // Check user group membership
  const inFamily = !!user.familyId && familyData;
  const isAdmin = user.role === 'Family Admin';

  return (
    <div className="container-fluid px-0 animate-fade-in">
      
      {/* Welcome header */}
      <div className="mb-4">
        <h2 className="text-white fw-bold mb-1">Family Portal</h2>
        <p className="text-muted">Manage your family group, invite members, and configure permissions.</p>
      </div>

      {error && (
        <div className="alert alert-danger border-0 bg-danger bg-opacity-25 text-danger-emphasis py-2 px-3 mb-4 rounded-3 d-flex align-items-center gap-2">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success border-0 bg-success bg-opacity-25 text-success-emphasis py-2 px-3 mb-4 rounded-3 d-flex align-items-center gap-2">
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* VIEW: USER IN FAMILY GROUP */}
      {inFamily ? (
        <div className="row g-4">
          
          {/* Family Card */}
          <div className="col-12 col-md-5">
            <div className="glass-panel p-4 h-100">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Users className="text-purple" size={24} />
                <h4 className="text-white mb-0 fw-bold">{familyData.familyName}</h4>
              </div>
              
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                Share this invite code with your family members so they can join your dashboard!
              </p>

              {/* Invite Code Block */}
              <div className="d-flex align-items-center justify-content-between p-3 bg-secondary bg-opacity-10 rounded-3 border border-secondary border-opacity-25 mb-4 mt-3">
                <div>
                  <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>INVITATION CODE</span>
                  <span className="text-cyan fw-bold fs-4 glow-text-cyan">{familyData.inviteCode}</span>
                </div>
                <button 
                  onClick={handleCopyCode} 
                  className="btn btn-outline-cyan p-2 d-flex align-items-center justify-content-center"
                  style={{ width: '42px', height: '42px', borderRadius: '8px' }}
                  title="Copy Invite Code"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>

              {/* User role info card */}
              <div className="d-flex align-items-center gap-3 p-3 bg-dark bg-opacity-30 rounded-3">
                <div className="bg-purple bg-opacity-15 p-2 rounded-circle text-purple">
                  {isAdmin ? <Crown size={20} /> : <Users size={20} />}
                </div>
                <div>
                  <span className="text-muted d-block" style={{ fontSize: '0.75rem' }}>YOUR ROLE</span>
                  <strong className="text-white">{user.role}</strong>
                </div>
              </div>
            </div>

            {/* Add Member Form (Admin Only) */}
            {isAdmin && (
              <div className="glass-panel p-4 mt-4">
                <h5 className="text-white mb-3 fw-bold d-flex align-items-center gap-2">
                  <UserPlus className="text-cyan" size={20} />
                  Add Member Manually
                </h5>
                <form onSubmit={handleAddMember}>
                  <div className="mb-2">
                    <input type="text" className="form-control form-control-dark mb-2" placeholder="Full Name" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required />
                  </div>
                  <div className="mb-2">
                    <input type="email" className="form-control form-control-dark mb-2" placeholder="Email Address" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} required />
                  </div>
                  <div className="mb-2">
                    <input type="password" className="form-control form-control-dark mb-2" placeholder="Temporary Password" value={newMemberPassword} onChange={e => setNewMemberPassword(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <select className="form-select form-select-dark" value={newMemberRel} onChange={e => setNewMemberRel(e.target.value)}>
                      <option value="">Relationship (Optional)</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Partner">Partner</option>
                      <option value="Child">Child</option>
                      <option value="Ex">Ex</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-cyan w-100 py-2" disabled={loading}>
                    Add Member
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Members List */}
          <div className="col-12 col-md-7">
            <div className="glass-panel p-4 h-100">
              <h5 className="text-white mb-4 fw-bold">Family Members ({familyData.members?.length || 0})</h5>

              <div className="d-flex flex-column gap-3">
                {familyData.members?.map(member => {
                  const isMemberAdmin = member.role === 'Family Admin';
                  const isSelf = member.id === user.id;

                  return (
                    <div 
                      key={member.id} 
                      className="d-flex align-items-center justify-content-between p-3 bg-secondary bg-opacity-10 rounded-3 border border-secondary border-opacity-20"
                    >
                      <div className="d-flex align-items-center gap-3 overflow-hidden">
                        <div className={`avatar-circle text-white ${isMemberAdmin ? 'bg-warning bg-opacity-70' : 'bg-purple bg-opacity-50'}`}>
                          {member.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="d-flex align-items-center gap-2">
                            <h6 className="mb-0 text-white fw-bold text-truncate">{member.name}</h6>
                            {isMemberAdmin && (
                              <Crown size={12} className="text-warning" title="Family Admin" />
                            )}
                            {isSelf && (
                              <span className="badge bg-purple bg-opacity-20 text-purple border border-purple border-opacity-50" style={{ fontSize: '0.65rem' }}>
                                You
                              </span>
                            )}
                            {member.relationship && (
                              <span className="badge bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-25" style={{ fontSize: '0.65rem' }}>
                                {member.relationship}
                              </span>
                            )}
                          </div>
                          <span className="text-muted text-truncate d-block" style={{ fontSize: '0.8rem' }}>{member.email}</span>
                        </div>
                      </div>

                      {/* Remove member control for Admin */}
                      {isAdmin && !isSelf && (
                        <button 
                          onClick={() => handleRemoveMember(member.id, member.name)} 
                          className="btn btn-outline-danger p-2 d-flex align-items-center justify-content-center border-0 text-danger-emphasis"
                          title={`Remove ${member.name} from family`}
                          disabled={loading}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}

                      {/* Non-admin view display */}
                      {(!isAdmin || isSelf) && (
                        <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                          {isMemberAdmin ? 'Admin' : 'Member'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Member Form (Admin Only) */}
            {isAdmin && (
              <div className="glass-panel p-4 mt-4">
                <h5 className="text-white mb-3 fw-bold d-flex align-items-center gap-2">
                  <UserPlus className="text-cyan" size={20} />
                  Add Member Manually
                </h5>
                <form onSubmit={handleAddMember}>
                  <div className="mb-2">
                    <input type="text" className="form-control form-control-dark mb-2" placeholder="Full Name" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} required />
                  </div>
                  <div className="mb-2">
                    <input type="email" className="form-control form-control-dark mb-2" placeholder="Email Address" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} required />
                  </div>
                  <div className="mb-2">
                    <input type="password" className="form-control form-control-dark mb-2" placeholder="Temporary Password" value={newMemberPassword} onChange={e => setNewMemberPassword(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <select className="form-select form-select-dark" value={newMemberRel} onChange={e => setNewMemberRel(e.target.value)}>
                      <option value="">Relationship (Optional)</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Partner">Partner</option>
                      <option value="Child">Child</option>
                      <option value="Ex">Ex</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-cyan w-100 py-2" disabled={loading}>
                    Add Member
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW: USER NOT IN FAMILY GROUP (SETUP SCREEN) */
        <div className="row g-4 justify-content-center py-5">
          
          {/* Create Group Box */}
          <div className="col-12 col-md-5">
            <div className="glass-panel p-4 h-100 d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Plus className="text-purple" size={24} />
                  <h4 className="text-white mb-0 fw-bold">Create Family Group</h4>
                </div>
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                  Start a new family board where you can invite household members, delegate chores, and maintain a shared calendar.
                </p>
              </div>

              <form onSubmit={handleCreateFamily} className="mt-4">
                <div className="mb-3">
                  <label className="form-label text-white-50 mb-1" style={{ fontSize: '0.85rem' }}>Family Group Name</label>
                  <input 
                    type="text" 
                    className="form-control form-control-dark" 
                    placeholder="e.g., The Adams House"
                    value={familyNameInput}
                    onChange={(e) => setFamilyNameInput(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-purple w-100 py-2 mt-2" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Family'}
                </button>
              </form>
            </div>
          </div>

          {/* Join Group Box */}
          <div className="col-12 col-md-5">
            <div className="glass-panel p-4 h-100 d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <UserPlus className="text-cyan" size={24} />
                  <h4 className="text-white mb-0 fw-bold">Join Family Group</h4>
                </div>
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                  If your family administrator already configured a group on FamSync, paste their shared invite code here to join immediately.
                </p>
              </div>

              <form onSubmit={handleJoinFamily} className="mt-4">
                <div className="mb-3">
                  <label className="form-label text-white-50 mb-1" style={{ fontSize: '0.85rem' }}>Invitation Code</label>
                  <input 
                    type="text" 
                    className="form-control form-control-dark glow-border-cyan text-center" 
                    style={{ letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}
                    placeholder="ADAMS123"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-cyan w-100 py-2 mt-2" disabled={loading}>
                  {loading ? 'Joining...' : 'Join Family'}
                </button>
              </form>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default FamilyManager;
