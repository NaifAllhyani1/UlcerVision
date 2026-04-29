import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';

const ACCEPT = 'image/jpeg,image/jpg,image/png';

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get('/predict', { params: { page, limit: 10 } });
      setPredictions(data.data);
      setPagination(data.pagination);
    } catch {
      setPredictions([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    setError('');
    setResult(null);
    if (!selected) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(selected.type)) {
      setError('Only JPG and PNG images are allowed.');
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an image.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await api.post('/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data.prediction);
      setSuccess('Prediction completed.');
      setFile(null);
      setPreview(null);
      loadHistory(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Prediction failed.');
    } finally {
      setLoading(false);
    }
  };

  const clearPreview = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setError('');
  };

  useEffect(() => {
    loadHistory(1);
  }, [loadHistory]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Wound Assessment</h1>

      {error && (
        <Alert type="error" onClose={() => setError('')} className="mb-4">
          {error}
        </Alert>
      )}
      {success && (
        <Alert type="success" onClose={() => setSuccess('')} className="mb-4">
          {success}
        </Alert>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Upload wound image</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="sr-only">Choose image</span>
              <input
                type="file"
                accept={ACCEPT}
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-medical-50 file:text-medical-700 file:font-medium hover:file:bg-medical-100"
              />
            </label>
            {preview && (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-64 object-contain rounded-lg border border-slate-200 bg-slate-50"
                />
                <button
                  type="button"
                  onClick={clearPreview}
                  className="absolute top-2 right-2 bg-slate-800/80 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-800"
                >
                  ×
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!file || loading}
                className="px-4 py-2 bg-medical-600 text-white rounded-lg font-medium hover:bg-medical-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze'
                )}
              </button>
              {file && !loading && (
                <button type="button" onClick={clearPreview} className="px-4 py-2 text-slate-600 hover:text-slate-800">
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Result</h2>
          {result ? (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-sm text-slate-500">Prediction</p>
                <p className="font-medium text-slate-800">{result.predictionResult || '—'}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-sm text-slate-500">Severity</p>
                <p className="font-medium text-slate-800">{result.severity || '—'}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-sm text-slate-500">Confidence</p>
                <p className="font-medium text-slate-800">
                  {typeof result.confidence === 'number' ? `${(result.confidence * 100).toFixed(1)}%` : result.confidence ?? '—'}
                </p>
              </div>
              {result.modelUsed && (
                <p className="text-xs text-slate-400">Model: {result.modelUsed}</p>
              )}
            </div>
          ) : (
            <p className="text-slate-500">Upload an image and click Analyze to see results.</p>
          )}
        </div>
      </div>

      <div className="mt-10 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-800 p-4 border-b border-slate-100">
          Prediction history
        </h2>
        {historyLoading ? (
          <div className="p-8 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : predictions.length === 0 ? (
          <p className="p-6 text-slate-500">No predictions yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Result</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Severity</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Confidence</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Model</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(p.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">{p.predictionResult || '—'}</td>
                      <td className="py-3 px-4">{p.severity || '—'}</td>
                      <td className="py-3 px-4">
                        {typeof p.confidence === 'number' ? `${(p.confidence * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.modelUsed || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadHistory(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 rounded border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => loadHistory(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="px-3 py-1 rounded border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
