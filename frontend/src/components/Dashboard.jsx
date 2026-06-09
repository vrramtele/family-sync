import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  Calendar as CalendarIcon, 
  Award, 
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import API from '../services/api';

function Dashboard({ user, familyData, onRefreshNotifications }) {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, eventsRes] = await Promise.all([
        API.get('/tasks'),
        API.get('/events')
      ]);
      setTasks(tasksRes.data);
      setEvents(eventsRes.data);
      if (onRefreshNotifications) onRefreshNotifications();
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Could not retrieve dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [familyData?.id]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-purple" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const pendingTasks = tasks.filter(t => t.status === 'Pending');
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // Group events within the next 7 days
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);
  // Set times to midnight to capture the whole day
  now.setHours(0, 0, 0, 0);
  nextWeek.setHours(23, 59, 59, 999);

  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate >= now && eventDate <= nextWeek;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Chores completed by family members (Productivity stats)
  // We want to calculate the number of completed tasks for each family member
  const memberStats = {};
  
  // Initialize from family members list
  if (familyData?.members) {
    familyData.members.forEach(member => {
      memberStats[member.id] = {
        name: member.name,
        completed: 0,
        pending: 0
      };
    });
  }

  // Count chores
  tasks.forEach(task => {
    if (task.assignedTo && memberStats[task.assignedTo]) {
      if (task.status === 'Completed') {
        memberStats[task.assignedTo].completed++;
      } else {
        memberStats[task.assignedTo].pending++;
      }
    }
  });

  const memberStatsList = Object.values(memberStats).sort((a, b) => b.completed - a.completed);

  return (
    <div className="container-fluid px-0 animate-fade-in">
      <div className="mb-4">
        <h2 className="text-white fw-bold mb-1">Welcome back, <span className="glow-text-purple">{user.name}</span>!</h2>
        <p className="text-secondary fs-6">Here is what is happening in the {familyData?.familyName || 'Family'} today.</p>
      </div>

      {error && (
        <div className="alert alert-danger border-0 bg-danger bg-opacity-25 text-danger-emphasis d-flex align-items-center gap-2 mb-4">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Cards */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="glass-panel glass-panel-hover p-4 h-100 d-flex align-items-center justify-content-between">
            <div>
              <span className="text-secondary d-block mb-1" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Completed Chores</span>
              <h3 className="text-success fw-bold mb-0 fs-1">{completedTasks.length}</h3>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>Out of {totalTasks} total</span>
            </div>
            <div className="icon-container icon-success">
              <CheckCircle size={28} />
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="glass-panel glass-panel-hover p-4 h-100 d-flex align-items-center justify-content-between">
            <div>
              <span className="text-secondary d-block mb-1" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Pending Chores</span>
              <h3 className="text-warning fw-bold mb-0 fs-1">{pendingTasks.length}</h3>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>Awaiting completion</span>
            </div>
            <div className="icon-container icon-warning">
              <Clock size={28} />
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="glass-panel glass-panel-hover p-4 h-100 d-flex align-items-center justify-content-between">
            <div>
              <span className="text-secondary d-block mb-1" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Upcoming Events</span>
              <h3 className="text-cyan fw-bold mb-0 fs-1">{upcomingEvents.length}</h3>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>Next 7 days</span>
            </div>
            <div className="icon-container icon-cyan">
              <CalendarIcon size={28} />
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="glass-panel glass-panel-hover p-4 h-100 d-flex align-items-center justify-content-between">
            <div>
              <span className="text-secondary d-block mb-1" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Task Completion</span>
              <h3 className="text-purple fw-bold mb-0 fs-1">{completionRate}%</h3>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>Family finish rate</span>
            </div>
            <div className="icon-container icon-purple">
              <TrendingUp size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & Events layout */}
      <div className="row g-4">
        
        {/* Productivity Stats (Leaderboard/Contributions) */}
        <div className="col-12 col-lg-7">
          <div className="glass-panel p-4 h-100">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div className="d-flex align-items-center gap-2">
                <Award className="text-purple" size={22} />
                <h5 className="text-white mb-0 fw-bold">Chore Leaderboard & Chores Track</h5>
              </div>
              <span className="text-secondary" style={{ fontSize: '0.9rem' }}>Family Contribution</span>
            </div>

            {memberStatsList.length === 0 ? (
              <div className="text-center py-5 text-muted">No family members found to track.</div>
            ) : (
              <div className="d-flex flex-column gap-4">
                {memberStatsList.map((member, idx) => {
                  const totalMemberTasks = member.completed + member.pending;
                  const percent = totalMemberTasks > 0 ? Math.round((member.completed / totalMemberTasks) * 100) : 0;
                  
                  // Color codes for places
                  let medalColor = 'text-muted';
                  if (idx === 0 && member.completed > 0) medalColor = 'text-warning'; // Gold
                  else if (idx === 1 && member.completed > 0) medalColor = 'text-white-50'; // Silver
                  else if (idx === 2 && member.completed > 0) medalColor = 'text-danger'; // Bronze

                  return (
                    <div key={member.name} className="p-3 bg-secondary bg-opacity-10 rounded-3 border border-secondary border-opacity-25">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span className={`fw-bold ${medalColor}`} style={{ fontSize: '1.1rem' }}>
                            {idx + 1}.
                          </span>
                          <span className="text-white fw-semibold">{member.name}</span>
                          {member.name === user.name && (
                            <span className="badge bg-purple bg-opacity-20 text-purple border border-purple border-opacity-50 ms-2" style={{ fontSize: '0.65rem' }}>
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-end">
                          <span className="text-white fw-bold fs-5">{member.completed}</span>
                          <span className="text-secondary ms-1" style={{ fontSize: '0.85rem' }}>completed</span>
                          <span className="text-secondary mx-2">|</span>
                          <span className="text-warning fw-bold fs-5">{member.pending}</span>
                          <span className="text-secondary ms-1" style={{ fontSize: '0.85rem' }}>pending</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="progress bg-dark bg-opacity-50" style={{ height: '8px' }}>
                        <div 
                          className="progress-bar bg-gradient-purple" 
                          role="progressbar" 
                          style={{ 
                            width: `${percent}%`, 
                            background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', 
                            borderRadius: '4px',
                            transition: 'width 1s ease'
                          }} 
                          aria-valuenow={percent} 
                          aria-valuemin="0" 
                          aria-valuemax="100"
                        ></div>
                      </div>
                      <div className="d-flex justify-content-between text-secondary mt-2 fw-semibold" style={{ fontSize: '0.85rem' }}>
                        <span>Completion Efficiency</span>
                        <span className="text-white">{percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming events and activities */}
        <div className="col-12 col-lg-5">
          <div className="glass-panel p-4 h-100 d-flex flex-column">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div className="d-flex align-items-center gap-2">
                <CalendarIcon className="text-cyan" size={22} />
                <h5 className="text-white mb-0 fw-bold">Upcoming Week Agenda</h5>
              </div>
              <span className="badge bg-cyan bg-opacity-10 text-cyan border border-cyan border-opacity-30 px-2 py-1" style={{ fontSize: '0.75rem' }}>
                7 Days
              </span>
            </div>

            <div className="flex-grow-1 overflow-y-auto" style={{ maxHeight: '350px' }}>
              {upcomingEvents.length === 0 ? (
                <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 h-100 text-secondary">
                  <CalendarIcon size={48} className="mb-3 opacity-50 text-cyan" />
                  <p className="mb-0 fs-6">No events scheduled for this week.</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {upcomingEvents.map(event => {
                    const dateObj = new Date(event.date);
                    const formattedDay = dateObj.toLocaleDateString([], { day: '2-digit' });
                    const formattedMonth = dateObj.toLocaleDateString([], { month: 'short' });
                    const formattedWeekday = dateObj.toLocaleDateString([], { weekday: 'short' });

                    return (
                      <div key={event.id} className="d-flex gap-3 align-items-center p-3 bg-secondary bg-opacity-10 rounded-3 border border-secondary border-opacity-25 transition-all glass-panel-hover">
                        {/* Event Date Block */}
                        <div className="bg-cyan bg-opacity-15 border border-cyan border-opacity-20 text-center rounded-3 p-2 d-flex flex-column justify-content-center" style={{ minWidth: '55px', height: '55px' }}>
                          <span className="text-cyan fw-bold mb-0 lh-1" style={{ fontSize: '1.2rem' }}>{formattedDay}</span>
                          <span className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.65rem' }}>{formattedMonth}</span>
                        </div>

                        {/* Event Details */}
                        <div className="flex-grow-1 overflow-hidden">
                          <h6 className="text-white mb-1 fw-bold text-truncate" style={{ fontSize: '1rem' }}>{event.title}</h6>
                          <p className="text-secondary mb-1 text-truncate" style={{ fontSize: '0.85rem' }}>
                            {event.description || 'No description provided.'}
                          </p>
                          <span className="text-cyan" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                            {formattedWeekday} - All day
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
