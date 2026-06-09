import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Terminal, 
  Play, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Check, 
  AlertCircle,
  Activity,
  Code
} from 'lucide-react';
import API from '../services/api';

const SCHEMA_COLUMNS = {
  users: ['id', 'name', 'email', 'role', 'familyId'],
  families: ['id', 'familyName', 'inviteCode', 'adminId'],
  tasks: ['id', 'title', 'description', 'assignedTo', 'assignedToName', 'dueDate', 'priority', 'status', 'category', 'familyId'],
  events: ['id', 'title', 'description', 'date', 'familyId'],
  notifications: ['id', 'userId', 'message', 'timestamp', 'isRead']
};

function DbManager() {
  const [activeSubTab, setActiveSubTab] = useState('table-editor'); // 'table-editor' | 'sql-editor'
  
  // Table Editor States
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('tasks');
  const [rows, setRows] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  
  // Editing state for rows
  const [editingRowId, setEditingRowId] = useState(null); // id of row being edited
  const [editFormData, setEditFormData] = useState({});

  // Add row modal state
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [addRowFormData, setAddRowFormData] = useState({});

  // SQL Editor States
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM tasks;');
  const [queryResult, setQueryResult] = useState(null);
  const [runningQuery, setRunningQuery] = useState(false);
  
  // Feedback alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearAlerts = () => {
    setError('');
    setSuccess('');
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableRows(selectedTable);
    }
  }, [selectedTable]);

  // Fetch SQLite tables metadata
  const fetchTables = async () => {
    try {
      const response = await API.get('/db/tables');
      setTables(response.data);
      if (response.data.length > 0 && !response.data.includes(selectedTable)) {
        setSelectedTable(response.data[0]);
      }
    } catch (err) {
      console.error('Error fetching tables list:', err);
      setError('Could not fetch database tables list.');
    }
  };

  // Fetch rows for select table
  const fetchTableRows = async (tableName) => {
    setLoadingTable(true);
    clearAlerts();
    setEditingRowId(null);
    try {
      const response = await API.get(`/db/tables/${tableName}`);
      setRows(response.data);
    } catch (err) {
      console.error(`Error loading table ${tableName}:`, err);
      setError(`Failed to retrieve rows from table: "${tableName}"`);
    } finally {
      setLoadingTable(false);
    }
  };

  // Handle Edit row toggle
  const startEditingRow = (row) => {
    setEditingRowId(row.id);
    setEditFormData({ ...row });
  };

  const cancelEditingRow = () => {
    setEditingRowId(null);
    setEditFormData({});
  };

  const handleEditChange = (col, val) => {
    setEditFormData(prev => ({ ...prev, [col]: val }));
  };

  // Save row changes
  const saveRowChanges = async (id) => {
    clearAlerts();
    try {
      await API.put(`/db/tables/${selectedTable}/row/${id}`, editFormData);
      setRows(prev => prev.map(row => row.id === id ? { ...editFormData } : row));
      setEditingRowId(null);
      setSuccess('Row updated successfully!');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating row.');
    }
  };

  // Delete row
  const deleteRow = async (id) => {
    if (!window.confirm('Delete this record from database permanently?')) return;
    clearAlerts();
    try {
      await API.delete(`/db/tables/${selectedTable}/row/${id}`);
      setRows(prev => prev.filter(row => row.id !== id));
      setSuccess('Record deleted successfully.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete row.');
    }
  };

  // Open add row modal
  const openAddRowModal = () => {
    const defaultCols = SCHEMA_COLUMNS[selectedTable] || [];
    const initialForm = {};
    defaultCols.forEach(col => {
      if (col === 'id') {
        initialForm.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      } else {
        initialForm[col] = '';
      }
    });
    setAddRowFormData(initialForm);
    setShowAddRowModal(true);
  };

  const handleAddChange = (col, val) => {
    setAddRowFormData(prev => ({ ...prev, [col]: val }));
  };

  // Insert Row
  const submitAddRow = async (e) => {
    e.preventDefault();
    clearAlerts();
    try {
      await API.post(`/db/tables/${selectedTable}/row`, addRowFormData);
      setRows(prev => [...prev, addRowFormData]);
      setShowAddRowModal(false);
      setSuccess('Record inserted successfully!');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to insert row.');
    }
  };

  // SQL query executor
  const runSQLQuery = async () => {
    if (!sqlQuery.trim()) return;
    setRunningQuery(true);
    setQueryResult(null);
    clearAlerts();
    try {
      const response = await API.post('/db/query', { query: sqlQuery });
      setQueryResult(response.data);
      setSuccess('SQL Statement executed successfully!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setQueryResult({
        type: 'error',
        message: err.response?.data?.message || 'Execution error',
        error: err.response?.data?.error || err.message
      });
      setError('SQL Syntax / execution error.');
    } finally {
      setRunningQuery(false);
    }
  };

  // Predefined SQL Templates
  const sqlTemplates = [
    {
      name: 'Select Chores',
      query: 'SELECT * FROM tasks;'
    },
    {
      name: 'Contributions Count',
      query: 'SELECT assignedToName as Member, COUNT(*) as CompletedChores FROM tasks WHERE status = \'Completed\' GROUP BY assignedTo;'
    },
    {
      name: 'Join Members & Families',
      query: 'SELECT u.name, u.email, u.role, f.familyName FROM users u INNER JOIN families f ON u.familyId = f.id;'
    },
    {
      name: 'Unread Notifications Feed',
      query: 'SELECT * FROM notifications WHERE isRead = 0 ORDER BY timestamp DESC;'
    }
  ];

  return (
    <div className="container-fluid px-0 animate-fade-in">
      {/* Title */}
      <div className="mb-4">
        <h2 className="text-white fw-bold mb-1">Database Manager Console</h2>
        <p className="text-muted">Inspect SQLite schema tables, edit fields inline, or write raw SQL statements directly to the database.</p>
      </div>

      {/* View Select Sub-tabs */}
      <div className="d-flex border-bottom border-secondary border-opacity-35 mb-4">
        <button 
          onClick={() => {
            setActiveSubTab('table-editor');
            clearAlerts();
          }} 
          className={`btn px-4 py-2 border-0 fw-semibold text-decoration-none d-flex align-items-center gap-2 ${activeSubTab === 'table-editor' ? 'text-purple border-bottom border-purple border-3 bg-secondary bg-opacity-10' : 'text-white-50'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          <Database size={16} />
          <span>Table Editor</span>
        </button>
        <button 
          onClick={() => {
            setActiveSubTab('sql-editor');
            clearAlerts();
          }} 
          className={`btn px-4 py-2 border-0 fw-semibold text-decoration-none d-flex align-items-center gap-2 ${activeSubTab === 'sql-editor' ? 'text-purple border-bottom border-purple border-3 bg-secondary bg-opacity-10' : 'text-white-50'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          <Terminal size={16} />
          <span>SQL Query Editor</span>
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="alert alert-danger border-0 bg-danger bg-opacity-25 text-danger-emphasis py-2 px-3 mb-4 rounded-3 d-flex align-items-center gap-2 animate-fade-in">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success border-0 bg-success bg-opacity-25 text-success-emphasis py-2 px-3 mb-4 rounded-3 d-flex align-items-center gap-2 animate-fade-in">
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* VIEW 1: TABLE EDITOR */}
      {activeSubTab === 'table-editor' && (
        <div>
          <div className="glass-panel p-3 mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <label className="text-white-50 mb-0 font-weight-bold" style={{ fontSize: '0.9rem' }}>Inspect Table:</label>
              <select 
                className="form-select form-select-dark" 
                style={{ width: '180px' }}
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
              >
                {tables.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <button onClick={openAddRowModal} className="btn btn-cyan d-flex align-items-center gap-2 py-2">
              <Plus size={18} />
              <span>Insert Record</span>
            </button>
          </div>

          <div className="glass-panel p-4 overflow-x-auto">
            {loadingTable ? (
              <div className="text-center py-5">
                <div className="spinner-border text-purple" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-5 text-muted">No records found in table "{selectedTable}".</div>
            ) : (
              <table className="table table-dark table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr className="border-bottom border-secondary">
                    {SCHEMA_COLUMNS[selectedTable]?.map(col => (
                      <th key={col} className="py-3 text-cyan fw-bold">{col}</th>
                    )) || Object.keys(rows[0]).map(col => (
                      <th key={col} className="py-3 text-cyan fw-bold">{col}</th>
                    ))}
                    <th className="py-3 text-end text-cyan fw-bold" style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const isEditing = editingRowId === row.id;
                    const cols = SCHEMA_COLUMNS[selectedTable] || Object.keys(row);

                    return (
                      <tr key={row.id} className="border-bottom border-secondary border-opacity-20">
                        {cols.map(col => (
                          <td key={col} className="text-white-50">
                            {isEditing ? (
                              col === 'id' ? (
                                <span>{row.id}</span>
                              ) : (
                                <input 
                                  type="text" 
                                  className="form-control form-control-dark py-1"
                                  value={editFormData[col] !== undefined ? editFormData[col] : ''}
                                  onChange={(e) => handleEditChange(col, e.target.value)}
                                />
                              )
                            ) : (
                              <span className="text-truncate d-inline-block" style={{ maxWidth: '200px' }} title={String(row[col])}>
                                {row[col] !== null && row[col] !== undefined ? String(row[col]) : <em className="text-muted">null</em>}
                              </span>
                            )}
                          </td>
                        ))}

                        <td className="text-end">
                          {isEditing ? (
                            <div className="d-flex justify-content-end gap-2">
                              <button 
                                onClick={() => saveRowChanges(row.id)} 
                                className="btn btn-sm btn-outline-success p-1 rounded-circle"
                                title="Save changes"
                              >
                                <Save size={14} />
                              </button>
                              <button 
                                onClick={cancelEditingRow} 
                                className="btn btn-sm btn-outline-secondary p-1 rounded-circle"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="d-flex justify-content-end gap-2">
                              <button 
                                onClick={() => startEditingRow(row)} 
                                className="btn btn-sm btn-outline-secondary p-1 rounded-circle border-0 text-white-50"
                                title="Edit row"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                onClick={() => deleteRow(row.id)} 
                                className="btn btn-sm btn-outline-danger p-1 rounded-circle border-0 text-danger-emphasis"
                                title="Delete row"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: SQL EDITOR */}
      {activeSubTab === 'sql-editor' && (
        <div>
          <div className="row g-4">
            
            {/* Input & Templates */}
            <div className="col-12 col-lg-8">
              <div className="glass-panel p-4 mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="d-flex align-items-center gap-2 text-white">
                    <Code className="text-purple" size={20} />
                    <span className="fw-bold">Write SQL Command</span>
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>SQLite syntax</span>
                </div>

                <textarea 
                  className="form-control form-control-dark font-monospace mb-3"
                  rows="6"
                  style={{ fontSize: '0.9rem', lineHeight: '1.4' }}
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="SELECT * FROM tasks;"
                ></textarea>

                <button 
                  onClick={runSQLQuery} 
                  className="btn btn-purple px-4 py-2 d-flex align-items-center gap-2"
                  disabled={runningQuery}
                >
                  <Play size={16} fill="white" />
                  <span>{runningQuery ? 'Executing...' : 'Run Query'}</span>
                </button>
              </div>

              {/* Result Grid Panel */}
              <div className="glass-panel p-4">
                <h5 className="text-white mb-4 fw-bold">Query Execution Output</h5>

                {!queryResult ? (
                  <div className="text-center py-5 text-muted">Execute a query above to view table results.</div>
                ) : queryResult.type === 'error' ? (
                  <div className="p-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded-3">
                    <div className="d-flex align-items-center gap-2 text-danger-emphasis mb-2">
                      <AlertCircle size={18} />
                      <strong style={{ fontSize: '0.95rem' }}>{queryResult.message}</strong>
                    </div>
                    <pre className="mb-0 text-white-50 font-monospace text-wrap" style={{ fontSize: '0.8rem' }}>{queryResult.error}</pre>
                  </div>
                ) : queryResult.type === 'write' ? (
                  <div className="p-3 bg-secondary bg-opacity-10 border border-secondary border-opacity-20 rounded-3">
                    <div className="d-flex align-items-center gap-3 text-success mb-2">
                      <Check size={18} />
                      <strong>{queryResult.message}</strong>
                    </div>
                    <ul className="text-white-50 mb-0 font-monospace" style={{ fontSize: '0.85rem' }}>
                      <li>Rows updated/changed: {queryResult.changes}</li>
                      <li>Execution latency: {queryResult.timeMs}ms</li>
                    </ul>
                  </div>
                ) : queryResult.data.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <p className="mb-1">Query completed successfully.</p>
                    <span className="small">0 rows returned ({queryResult.timeMs}ms)</span>
                  </div>
                ) : (
                  <div>
                    <div className="d-flex align-items-center gap-3 text-cyan mb-3" style={{ fontSize: '0.85rem' }}>
                      <Activity size={14} />
                      <span>Returned {queryResult.count} rows in {queryResult.timeMs}ms</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="table table-dark table-hover align-middle mb-0" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr className="border-bottom border-secondary border-opacity-35">
                            {Object.keys(queryResult.data[0]).map(col => (
                              <th key={col} className="py-2 text-cyan fw-bold">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.data.map((row, idx) => (
                            <tr key={idx} className="border-bottom border-secondary border-opacity-15">
                              {Object.values(row).map((val, vIdx) => (
                                <td key={vIdx} className="text-white-50">
                                  {val !== null && val !== undefined ? String(val) : <em className="text-muted">null</em>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* templates panel */}
            <div className="col-12 col-lg-4">
              <div className="glass-panel p-4 h-100">
                <h5 className="text-white mb-3 fw-bold">Query Templates</h5>
                <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>Click a pre-configured query template to load it into the editor.</p>

                <div className="d-flex flex-column gap-3">
                  {sqlTemplates.map(tpl => (
                    <button 
                      key={tpl.name}
                      onClick={() => setSqlQuery(tpl.query)}
                      className="btn text-start p-3 bg-secondary bg-opacity-10 border border-secondary border-opacity-20 text-white transition-all glass-panel-hover"
                      style={{ borderRadius: '8px' }}
                    >
                      <strong className="d-block mb-1 text-cyan" style={{ fontSize: '0.85rem' }}>{tpl.name}</strong>
                      <code className="text-muted text-truncate d-block small" style={{ fontSize: '0.75rem' }}>{tpl.query}</code>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add Row Modal */}
      {showAddRowModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-panel border border-secondary border-opacity-30 text-white">
              
              <div className="modal-header border-bottom border-secondary border-opacity-20 p-4">
                <h5 className="modal-title fw-bold">Insert Record: {selectedTable}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddRowModal(false)}></button>
              </div>

              <form onSubmit={submitAddRow}>
                <div className="modal-body p-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {SCHEMA_COLUMNS[selectedTable]?.map(col => (
                    <div className="mb-3" key={col}>
                      <label className="form-label text-white-50" style={{ fontSize: '0.85rem' }}>{col}</label>
                      <input 
                        type="text" 
                        className="form-control form-control-dark"
                        value={addRowFormData[col] || ''}
                        onChange={(e) => handleAddChange(col, e.target.value)}
                        placeholder={`Enter ${col}`}
                        required={col === 'id' || col === 'title' || col === 'name' || col === 'email' || col === 'password' || col === 'userId'}
                      />
                    </div>
                  ))}
                </div>

                <div className="modal-footer border-top border-secondary border-opacity-20 p-4">
                  <button type="button" className="btn btn-outline-secondary border-secondary text-white-50" onClick={() => setShowAddRowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-cyan px-4">Insert</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DbManager;
