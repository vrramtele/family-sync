import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar as CalendarIcon, 
  AlertCircle 
} from 'lucide-react';
import API from '../services/api';

function CalendarView({ user, familyData, onRefreshNotifications }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calendar display state
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals state
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(''); // 'YYYY-MM-DD'
  const [editingEvent, setEditingEvent] = useState(null); // null means creating a new event

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await API.get('/events');
      setEvents(response.data);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Could not retrieve calendar events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [familyData?.id]);

  // Calendar logic helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.

  const daysInCurrentMonth = getDaysInMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);
  const firstDayIndex = getFirstDayOfMonth(year, month); // leading empty grid cells

  // Build grid of days
  const calendarCells = [];

  // Trailing days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDay = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, prevDay);
    calendarCells.push({
      date: prevMonthDate,
      isCurrentMonth: false,
      dayNumber: prevDay
    });
  }

  // Days in current month
  const today = new Date();
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const cellDate = new Date(year, month, d);
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    calendarCells.push({
      date: cellDate,
      isCurrentMonth: true,
      dayNumber: d,
      isToday
    });
  }

  // Leading days of next month to fill grid (multiple of 7, usually 35 or 42 cells)
  const totalCellsNeeded = calendarCells.length <= 35 ? 35 : 42;
  const remainingCells = totalCellsNeeded - calendarCells.length;
  for (let n = 1; n <= remainingCells; n++) {
    const nextMonthDate = new Date(year, month + 1, n);
    calendarCells.push({
      date: nextMonthDate,
      isCurrentMonth: false,
      dayNumber: n
    });
  }

  // Format date to local YYYY-MM-DD string
  const formatDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Open modal for day click
  const handleCellClick = (cellDate) => {
    const dateStr = formatDateString(cellDate);
    setSelectedDateStr(dateStr);
    
    // Check if there are events on this day, or default to adding a new event
    const eventsOnDay = events.filter(e => e.date === dateStr);
    if (eventsOnDay.length > 0) {
      // If events exist, we'll open a modal displaying them and giving an option to add
      setEditingEvent(null);
      setTitle('');
      setDescription('');
    } else {
      // Direct add state
      setEditingEvent(null);
      setTitle('');
      setDescription('');
    }
    setError('');
    setShowEventModal(true);
  };

  // Open modal to edit existing event
  const handleEditEventClick = (event, e) => {
    e.stopPropagation(); // prevent triggering cell click
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || '');
    setSelectedDateStr(event.date);
    setError('');
    setShowEventModal(true);
  };

  // Save/Update Event
  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      return setError('Event title is required.');
    }

    const eventPayload = {
      title: title.trim(),
      description: description.trim(),
      date: selectedDateStr
    };

    try {
      if (editingEvent) {
        // Edit Mode
        const response = await API.put(`/events/${editingEvent.id}`, eventPayload);
        setEvents(prev => prev.map(ev => ev.id === editingEvent.id ? response.data : ev));
        setSuccess('Event updated successfully!');
      } else {
        // Add Mode
        const response = await API.post('/events', eventPayload);
        setEvents(prev => [...prev, response.data]);
        setSuccess('Event scheduled successfully!');
      }
      setShowEventModal(false);
      setEditingEvent(null);
      if (onRefreshNotifications) onRefreshNotifications();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save event.');
    }
  };

  // Delete event
  const handleDeleteEvent = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await API.delete(`/events/${id}`);
      setEvents(prev => prev.filter(ev => ev.id !== id));
      setSuccess('Event deleted successfully.');
      setShowEventModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  return (
    <div className="container-fluid px-0 animate-fade-in">
      
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h2 className="text-white fw-bold mb-1">Shared Calendar</h2>
          <p className="text-muted">Coordinate family schedules, appointments, and social events.</p>
        </div>
        <div className="d-flex align-items-center justify-content-between bg-secondary bg-opacity-25 border border-secondary border-opacity-10 p-2 rounded-3 gap-2">
          <button onClick={handlePrevMonth} className="btn btn-sm btn-outline-secondary p-2 border-0 text-white-50">
            <ChevronLeft size={18} />
          </button>
          <h5 className="text-white mb-0 fw-bold px-3" style={{ minWidth: '150px', textAlign: 'center' }}>
            {monthNames[month]} {year}
          </h5>
          <button onClick={handleNextMonth} className="btn btn-sm btn-outline-secondary p-2 border-0 text-white-50">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {success && (
        <div className="alert alert-success border-0 bg-success bg-opacity-25 text-success-emphasis py-2 px-3 mb-4 rounded-3">
          {success}
        </div>
      )}

      {/* Monthly Grid */}
      <div className="glass-panel p-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-purple" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div>
            {/* Calendar Grid Headers */}
            <div className="calendar-grid text-white mb-2">
              <div className="calendar-day-header">Sun</div>
              <div className="calendar-day-header">Mon</div>
              <div className="calendar-day-header">Tue</div>
              <div className="calendar-day-header">Wed</div>
              <div className="calendar-day-header">Thu</div>
              <div className="calendar-day-header">Fri</div>
              <div className="calendar-day-header">Sat</div>
            </div>

            {/* Calendar Grid Cells */}
            <div className="calendar-grid">
              {calendarCells.map((cell, idx) => {
                const dateStr = formatDateString(cell.date);
                const dayEvents = events.filter(e => e.date === dateStr);

                return (
                  <div 
                    key={idx} 
                    onClick={() => handleCellClick(cell.date)}
                    className={`calendar-cell ${!cell.isCurrentMonth ? 'different-month' : ''} ${cell.isToday ? 'today' : ''}`}
                  >
                    <span className={`calendar-day-number ${cell.isToday ? 'text-purple fw-bold' : 'text-white-50'}`}>
                      {cell.dayNumber}
                    </span>

                    {/* Events render list */}
                    <div className="calendar-event-pills">
                      {dayEvents.slice(0, 3).map(event => (
                        <div 
                          key={event.id} 
                          onClick={(e) => handleEditEventClick(event, e)}
                          className="calendar-event-pill" 
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-muted text-center" style={{ fontSize: '0.65rem' }}>
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Event Details / Scheduling Modal */}
      {showEventModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-panel border border-secondary border-opacity-30 text-white">
              
              <div className="modal-header border-bottom border-secondary border-opacity-20 p-4 d-flex justify-content-between align-items-center">
                <h5 className="modal-title fw-bold">
                  {editingEvent ? 'Edit Event' : `Schedule Event on ${selectedDateStr}`}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEventModal(false)}></button>
              </div>

              {/* Display existing events on this day if in ADD mode */}
              {!editingEvent && events.filter(e => e.date === selectedDateStr).length > 0 && (
                <div className="p-4 border-bottom border-secondary border-opacity-10 bg-dark bg-opacity-20">
                  <h6 className="text-cyan fw-bold mb-2">Scheduled Events Today:</h6>
                  <div className="d-flex flex-column gap-2">
                    {events.filter(e => e.date === selectedDateStr).map(ev => (
                      <div key={ev.id} className="d-flex justify-content-between align-items-center bg-secondary bg-opacity-10 p-2 rounded-3 border border-secondary border-opacity-25">
                        <div>
                          <strong className="text-white">{ev.title}</strong>
                          {ev.description && <p className="text-muted mb-0 small text-truncate" style={{ maxWidth: '250px' }}>{ev.description}</p>}
                        </div>
                        <div className="d-flex gap-2">
                          <button onClick={(e) => handleEditEventClick(ev, e)} className="btn btn-sm btn-link text-white-50 p-0 text-decoration-none">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDeleteEvent(ev.id)} className="btn btn-sm btn-link text-danger-emphasis p-0 text-decoration-none ms-2">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitEvent}>
                <div className="modal-body p-4">
                  {error && (
                    <div className="alert alert-danger border-0 bg-danger bg-opacity-25 text-danger-emphasis py-2 px-3 mb-3 d-flex align-items-center gap-2">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Title */}
                  <div className="mb-3">
                    <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Event Name</label>
                    <input 
                      type="text" 
                      className="form-control form-control-dark"
                      placeholder="e.g., Birthday Party, Dentist Appointment"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Description / Notes</label>
                    <textarea 
                      className="form-control form-control-dark"
                      rows="3"
                      placeholder="Add details, locations, or reminders..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                  </div>

                  {/* Date selection (useful if updating or reviewing) */}
                  <div className="mb-3">
                    <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Date</label>
                    <input 
                      type="date" 
                      className="form-control form-control-dark"
                      value={selectedDateStr}
                      onChange={(e) => setSelectedDateStr(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer border-top border-secondary border-opacity-20 p-4 d-flex justify-content-between">
                  {editingEvent ? (
                    <button 
                      type="button" 
                      onClick={() => handleDeleteEvent(editingEvent.id)}
                      className="btn btn-outline-danger border-danger border-opacity-50 text-danger-emphasis d-flex align-items-center gap-2"
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  ) : <div />}

                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-secondary border-secondary text-white-50" onClick={() => setShowEventModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-purple px-4">
                      {editingEvent ? 'Save Changes' : 'Schedule'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;
