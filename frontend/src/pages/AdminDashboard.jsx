import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('models');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [models, setModels] = useState([]);
  const [modelName, setModelName] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [modelsLoading, setModelsLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [predictions, setPredictions] = useState([]);
  const [predPagination, setPredPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [predictionsLoading, setPredictionsLoading] = useState(false);

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const { data } = await api.get('/admin/models');
      setModels(data.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load models.');
    } finally {
      setModelsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadPredictions = useCallback(async (page = 1) => {
    setPredictionsLoading(true);
    try {
      const { data } = await api.get('/admin/predictions', { params: { page, limit: 20 } });
      setPredictions(data.data);
      setPredPagination(data.pagination);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load predictions.');
    } finally {
      setPredictionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'models') loadModels();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'predictions') loadPredictions(1);
  }, [activeTab, loadModels, loadUsers, loadPredictions]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleAddModel = async (e) => {
    e.preventDefault();
    if (!modelName.trim() || !modelUrl.trim()) return;
    setError('');
    try {
      await api.post('/admin/models', { name: modelName.trim(), apiUrl: modelUrl.trim() });
      setSuccess('Model added.');
      setModelName('');
      setModelUrl('');
      loadModels();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to add model.');
    }
  };

  const handleUpdateModel = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    try {
      await api.put(`/admin/models/${editingId}`, {
        name: editName.trim(),
        apiUrl: editUrl.trim(),
      });
      setSuccess('Model updated.');
      setEditingId(null);
      setEditName('');
      setEditUrl('');
      loadModels();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update model.');
    }
  };

  const handleDeleteModel = async (id) => {
    if (!window.confirm('Delete this model?')) return;
    setError('');
    try {
      await api.delete(`/admin/models/${id}`);
      setSuccess('Model deleted.');
      loadModels();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete model.');
    }
  };

  const handleActivateModel = async (id) => {
    setError('');
    try {
      await api.put(`/admin/models/${id}/activate`);
      setSuccess('Model activated.');
      loadModels();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to activate model.');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setError('');
    try {
      await api.delete(`/admin/users/${id}`);
      setSuccess('User deleted.');
      loadUsers();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete user.');
    }
  };

  const startEdit = (m) => {
    setEditingId(m._id);
    setEditName(m.name);
    setEditUrl(m.apiUrl);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditUrl('');
  };

  const tabs = [
    { id: 'models', label: 'Model endpoints' },
    { id: 'users', label: 'Users' },
    { id: 'predictions', label: 'Predictions' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Admin dashboard</h1>

      {error && (
        <Alert type="error" onClose={clearMessages} className="mb-4">
          {error}
        </Alert>
      )}
      {success && (
        <Alert type="success" onClose={clearMessages} className="mb-4">
          {success}
        </Alert>
      )}

      <div className="flex gap-2 border-b border-slate-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 font-medium rounded-t-lg transition ${
              activeTab === t.id
                ? 'bg-medical-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'models' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Add model endpoint</h2>
            <form onSubmit={handleAddModel} className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="e.g. DFU Model v1"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-slate-700 mb-1">API URL</label>
                <input
                  type="url"
                  value={modelUrl}
                  onChange={(e) => setModelUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="https://your-model-api.com/predict"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-medical-600 text-white rounded-lg font-medium hover:bg-medical-700"
              >
                Add
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <h2 className="text-lg font-semibold text-slate-800 p-4 border-b">All models</h2>
            {modelsLoading ? (
              <div className="p-8 flex justify-center"><Spinner size="lg" /></div>
            ) : models.length === 0 ? (
              <p className="p-6 text-slate-500">No models. Add one above.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {models.map((m) => (
                  <li key={m._id} className="p-4 flex flex-wrap items-center gap-4">
                    {editingId === m._id ? (
                      <form onSubmit={handleUpdateModel} className="flex flex-wrap gap-3 flex-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded border px-2 py-1 w-40"
                        />
                        <input
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          className="rounded border px-2 py-1 flex-1 min-w-[200px]"
                        />
                        <button type="submit" className="px-3 py-1 bg-medical-600 text-white rounded">Save</button>
                        <button type="button" onClick={cancelEdit} className="px-3 py-1 border rounded">Cancel</button>
                      </form>
                    ) : (
                      <>
                        <span className="font-medium">{m.name}</span>
                        <span className="text-slate-500 text-sm truncate max-w-xs">{m.apiUrl}</span>
                        {m.isActive && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-medium">
                            Active
                          </span>
                        )}
                        <div className="ml-auto flex gap-2">
                          {!m.isActive && (
                            <button
                              onClick={() => handleActivateModel(m._id)}
                              className="text-sm text-medical-600 hover:underline"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(m)}
                            className="text-sm text-slate-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteModel(m._id)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 p-4 border-b">All users</h2>
          {usersLoading ? (
            <div className="p-8 flex justify-center"><Spinner size="lg" /></div>
          ) : users.length === 0 ? (
            <p className="p-6 text-slate-500">No users.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-slate-100">
                      <td className="py-3 px-4">{u.name}</td>
                      <td className="py-3 px-4">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={u.role === 'admin' ? 'text-amber-600 font-medium' : ''}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u._id)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'predictions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 p-4 border-b">All predictions</h2>
          {predictionsLoading ? (
            <div className="p-8 flex justify-center"><Spinner size="lg" /></div>
          ) : predictions.length === 0 ? (
            <p className="p-6 text-slate-500">No predictions.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">User</th>
                      <th className="text-left py-3 px-4 font-medium">Result</th>
                      <th className="text-left py-3 px-4 font-medium">Severity</th>
                      <th className="text-left py-3 px-4 font-medium">Confidence</th>
                      <th className="text-left py-3 px-4 font-medium">Model</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((p) => (
                      <tr key={p._id} className="border-b border-slate-100">
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(p.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {p.userId?.name ?? p.userId?.email ?? p.userId ?? '—'}
                        </td>
                        <td className="py-3 px-4">{p.predictionResult || '—'}</td>
                        <td className="py-3 px-4">{p.severity || '—'}</td>
                        <td className="py-3 px-4">
                          {typeof p.confidence === 'number' ? `${(p.confidence * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-3 px-4">{p.modelUsed || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {predPagination.pages > 1 && (
                <div className="flex justify-between px-4 py-3 border-t">
                  <p className="text-sm text-slate-500">
                    Page {predPagination.page} of {predPagination.pages} ({predPagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadPredictions(predPagination.page - 1)}
                      disabled={predPagination.page <= 1}
                      className="px-3 py-1 rounded border disabled:opacity-50 hover:bg-slate-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => loadPredictions(predPagination.page + 1)}
                      disabled={predPagination.page >= predPagination.pages}
                      className="px-3 py-1 rounded border disabled:opacity-50 hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
