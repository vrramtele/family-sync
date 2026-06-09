import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Calendar as CalendarIcon, 
  User, 
  Filter, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import API from '../services/api';

function TodoList({ user, familyData, onRefreshNotifications }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null); // null means adding a new task
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('Chores');

  // Filter States
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Pending' | 'Completed'
  const [filterPriority, setFilterPriority] = useState('All'); // 'All' | 'High' | 'Medium' | 'Low'
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAssignee, setFilterAssignee] = useState('All'); // 'All' | 'Me' | specific_id

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await API.get('/tasks');
      setTasks(response.data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Could not retrieve tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [familyData?.id]);

  const openAddModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setAssignedTo(user.id); // default assign to self
    setDueDate('');
    setPriority('Medium');
    setCategory('Chores');
    setError('');
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setAssignedTo(task.assignedTo || '');
    setDueDate(task.dueDate || '');
    setPriority(task.priority);
    setCategory(task.category || 'Chores');
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTask(null);
  };

  // Create or Update task
  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      return setError('Task title is required.');
    }

    const taskPayload = {
      title: title.trim(),
      description: description.trim(),
      assignedTo: assignedTo || null,
      dueDate: dueDate || null,
      priority,
      category
    };

    try {
      if (editingTask) {
        // Edit Mode
        const response = await API.put(`/tasks/${editingTask.id}`, taskPayload);
        setTasks(prev => prev.map(t => t.id === editingTask.id ? response.data : t));
        setSuccess('Task updated successfully!');
      } else {
        // Add Mode
        const response = await API.post('/tasks', taskPayload);
        setTasks(prev => [...prev, response.data]);
        setSuccess('Task created successfully!');
      }
      closeModal();
      if (onRefreshNotifications) onRefreshNotifications();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task.');
    }
  };

  // Toggle task status
  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const response = await API.put(`/tasks/${task.id}`, { status: nextStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? response.data : t));
      if (onRefreshNotifications) onRefreshNotifications();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Delete task
  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await API.delete(`/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id));
      setSuccess('Task deleted successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Categories list
  const categories = ['Chores', 'Groceries', 'Finance', 'Education', 'Medical', 'Other'];

  // Filtering Logic
  const filteredTasks = tasks.filter(task => {
    // Search filter
    const matchesSearch = task.title.toLowerCase().includes(filterSearch.toLowerCase()) || 
                          (task.description || '').toLowerCase().includes(filterSearch.toLowerCase());
    
    // Status filter
    const matchesStatus = filterStatus === 'All' || task.status === filterStatus;

    // Priority filter
    const matchesPriority = filterPriority === 'All' || task.priority === filterPriority;

    // Category filter
    const matchesCategory = filterCategory === 'All' || task.category === filterCategory;

    // Assignee filter
    let matchesAssignee = true;
    if (filterAssignee === 'Me') {
      matchesAssignee = task.assignedTo === user.id;
    } else if (filterAssignee !== 'All') {
      matchesAssignee = task.assignedTo === filterAssignee;
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssignee;
  });

  return (
    <div className="container-fluid px-0 animate-fade-in">
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="text-white fw-bold mb-1">Shared To-Do Lists</h2>
          <p className="text-muted">Manage chores and tasks collaboratively with family members.</p>
        </div>
        <button onClick={openAddModal} className="btn btn-purple d-flex align-items-center gap-2 py-2">
          <Plus size={18} />
          <span>Add Task</span>
        </button>
      </div>

      {success && (
        <div className="alert alert-success border-0 bg-success bg-opacity-25 text-success-emphasis py-2 px-3 mb-4 rounded-3">
          {success}
        </div>
      )}

      {/* Filters Area */}
      <div className="glass-panel p-3 mb-4">
        <div className="row g-3">
          {/* Search bar */}
          <div className="col-12 col-md-4">
            <div className="position-relative">
              <span className="position-absolute translate-middle-y text-muted" style={{ left: '12px', top: '50%' }}>
                <Search size={16} />
              </span>
              <input 
                type="text" 
                className="form-control form-control-dark" 
                style={{ paddingLeft: '38px' }}
                placeholder="Search chores..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="col-6 col-sm-4 col-md-2">
            <select 
              className="form-select form-select-dark w-100"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="col-6 col-sm-4 col-md-2">
            <select 
              className="form-select form-select-dark w-100"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="col-6 col-sm-4 col-md-2">
            <select 
              className="form-select form-select-dark w-100"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Assignee filter */}
          <div className="col-6 col-sm-4 col-md-2">
            <select 
              className="form-select form-select-dark w-100"
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
            >
              <option value="All">All Assignees</option>
              <option value="Me">Assigned to Me</option>
              {familyData?.members?.map(m => (
                m.id !== user.id && <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Task List Grid/Panel */}
      <div className="glass-panel p-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-purple" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <Filter size={36} className="mb-2 opacity-50" />
            <p className="mb-0">No chores match the selected filters.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {filteredTasks.map(task => {
              const isCompleted = task.status === 'Completed';
              return (
                <div 
                  key={task.id} 
                  className={`d-flex flex-column flex-md-row align-items-md-center justify-content-between p-3 rounded-3 border transition-all ${isCompleted ? 'bg-secondary bg-opacity-5 border-secondary border-opacity-10' : 'bg-secondary bg-opacity-10 border-secondary border-opacity-20 glass-panel-hover'}`}
                >
                  <div className="d-flex align-items-start gap-3 flex-grow-1 overflow-hidden">
                    {/* Checkbox */}
                    <div 
                      onClick={() => handleToggleStatus(task)} 
                      className={`task-checkbox mt-1 flex-shrink-0 ${isCompleted ? 'completed' : ''}`}
                    >
                      {isCompleted && <Check size={14} className="text-white" />}
                    </div>

                    {/* Text Details */}
                    <div className="overflow-hidden">
                      <h6 className={`task-title-text fw-bold mb-1 ${isCompleted ? 'completed text-white-50' : 'text-white'}`}>
                        {task.title}
                      </h6>
                      <p className="text-muted mb-2 text-truncate" style={{ fontSize: '0.85rem' }}>
                        {task.description || 'No description provided'}
                      </p>
                      
                      {/* Meta Pill Grid */}
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        <span className="category-badge">{task.category || 'Chores'}</span>
                        
                        <span className={`priority-pill ${
                          task.priority === 'High' ? 'priority-high' : 
                          task.priority === 'Medium' ? 'priority-medium' : 
                          'priority-low'
                        }`}>
                          {task.priority}
                        </span>

                        {task.dueDate && (
                          <span className="text-muted d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                            <CalendarIcon size={12} />
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="d-flex align-items-center justify-content-between justify-content-md-end gap-3 mt-3 mt-md-0 border-top border-secondary border-opacity-10 pt-2 pt-md-0 border-md-top-0">
                    {/* Assignee display */}
                    <div className="d-flex align-items-center gap-2 bg-dark bg-opacity-30 px-3 py-1 rounded-pill">
                      <User size={12} className="text-cyan" />
                      <span className="text-white-50" style={{ fontSize: '0.75rem' }}>
                        {task.assignedTo === user.id ? 'Me' : task.assignedToName || 'Unassigned'}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="d-flex gap-2">
                      <button 
                        onClick={() => openEditModal(task)} 
                        className="btn btn-sm btn-outline-secondary p-2 d-flex align-items-center justify-content-center border-0 text-white-50"
                        title="Edit chore"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTask(task.id)} 
                        className="btn btn-sm btn-outline-danger p-2 d-flex align-items-center justify-content-center border-0 text-danger-emphasis"
                        title="Delete chore"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Modal (Add/Edit) */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-panel border border-secondary border-opacity-30 text-white">
              
              <div className="modal-header border-bottom border-secondary border-opacity-20 p-4">
                <h5 className="modal-title fw-bold">{editingTask ? 'Edit Task' : 'Add Chore / Task'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>

              <form onSubmit={handleSubmitTask}>
                <div className="modal-body p-4">
                  {error && (
                    <div className="alert alert-danger border-0 bg-danger bg-opacity-25 text-danger-emphasis py-2 px-3 mb-3 d-flex align-items-center gap-2">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Title */}
                  <div className="mb-3">
                    <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Chore Title</label>
                    <input 
                      type="text" 
                      className="form-control form-control-dark"
                      placeholder="e.g., Clean the garage"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Description</label>
                    <textarea 
                      className="form-control form-control-dark"
                      rows="3"
                      placeholder="Specific instructions or notes..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                  </div>

                  {/* Due date & Category */}
                  <div className="row">
                    <div className="col-6 mb-3">
                      <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Due Date</label>
                      <input 
                        type="date" 
                        className="form-control form-control-dark"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Category</label>
                      <select 
                        className="form-select form-select-dark"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Assignee & Priority */}
                  <div className="row">
                    <div className="col-6 mb-3">
                      <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Assign To</label>
                      <select 
                        className="form-select form-select-dark"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {familyData?.members?.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.id === user.id ? 'Me' : m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>Priority</label>
                      <select 
                        className="form-select form-select-dark"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top border-secondary border-opacity-20 p-4">
                  <button type="button" className="btn btn-outline-secondary border-secondary text-white-50" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-purple px-4">{editingTask ? 'Save Changes' : 'Create Task'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TodoList;
