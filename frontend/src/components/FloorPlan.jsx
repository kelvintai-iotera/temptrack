import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from '../api/axiosSetup';
import { Button } from './ui/Button';
import { Map, Upload, Router, Move, Trash2 } from 'lucide-react';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function GatewayMarker({ gateway, selected, isAdmin, onSelect, onDragStart }) {
  if (gateway.plan_x == null || gateway.plan_y == null) return null;

  return (
    <button
      type="button"
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold shadow-md border transition-all ${
        selected
          ? 'bg-accent-cyan text-white border-accent-cyan scale-105 z-20'
          : 'bg-card text-foreground border-border hover:border-accent-cyan z-10'
      }`}
      style={{ left: `${gateway.plan_x}%`, top: `${gateway.plan_y}%` }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(gateway.id);
      }}
      onPointerDown={(e) => {
        if (isAdmin) onDragStart(e, gateway.id);
      }}
      title={`${gateway.name} — drag to reposition`}
    >
      <Router size={12} />
      <span className="max-w-[8rem] truncate">{gateway.name}</span>
    </button>
  );
}

export const FloorPlan = ({ currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedGatewayId, setSelectedGatewayId] = useState(null);
  const [placingGatewayId, setPlacingGatewayId] = useState(null);
  const imageUrl = state?.hasPlan ? `/floor-plan/image?t=${encodeURIComponent(state.updatedAt || '')}` : null;

  const loadState = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/floor-plan');
      setState(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load floor plan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.type === 'application/pdf') {
      setError('PDF preview is not supported yet. Please export the floor plan as PNG or JPEG.');
      return;
    }

    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      setError('Use PNG, JPEG, or WebP images.');
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await axios.post('/floor-plan/upload', {
        dataUrl,
        fileName: file.name,
      });
      setMessage('Floor plan uploaded.');
      await loadState();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const savePosition = async (gatewayId, plan_x, plan_y) => {
    const res = await axios.patch(`/floor-plan/gateways/${gatewayId}/position`, { plan_x, plan_y });
    setState((prev) => ({
      ...prev,
      gateways: prev.gateways.map((g) => (g.id === gatewayId ? res.data : g)),
    }));
  };

  const handleCanvasClick = async (event) => {
    if (!placingGatewayId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const plan_x = ((event.clientX - rect.left) / rect.width) * 100;
    const plan_y = ((event.clientY - rect.top) / rect.height) * 100;
    try {
      await savePosition(placingGatewayId, plan_x, plan_y);
      setPlacingGatewayId(null);
      setSelectedGatewayId(placingGatewayId);
      setMessage('Gateway position saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save position');
    }
  };

  const handleDragStart = (event, gatewayId) => {
    if (!isAdmin) return;
    event.preventDefault();
    dragRef.current = { gatewayId, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current || !canvasRef.current) return;
    if (dragRef.current.pointerId !== event.pointerId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const plan_x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const plan_y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    const { gatewayId } = dragRef.current;
    setState((prev) => ({
      ...prev,
      gateways: prev.gateways.map((g) => (
        g.id === gatewayId ? { ...g, plan_x, plan_y } : g
      )),
    }));
  };

  const handlePointerUp = async (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const { gatewayId } = dragRef.current;
    dragRef.current = null;
    const gateway = state?.gateways.find((g) => g.id === gatewayId);
    if (!gateway || gateway.plan_x == null || gateway.plan_y == null) return;
    try {
      await savePosition(gatewayId, gateway.plan_x, gateway.plan_y);
      setMessage('Gateway position updated.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save position');
    }
  };

  const clearPosition = async (gatewayId) => {
    try {
      const res = await axios.delete(`/floor-plan/gateways/${gatewayId}/position`);
      setState((prev) => ({
        ...prev,
        gateways: prev.gateways.map((g) => (g.id === gatewayId ? res.data : g)),
      }));
      if (selectedGatewayId === gatewayId) setSelectedGatewayId(null);
      setMessage('Gateway removed from plan.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to clear position');
    }
  };

  const unplacedGateways = state?.gateways.filter((g) => g.plan_x == null || g.plan_y == null) || [];

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <Map className="text-accent-cyan" size={24} />
            Floor Plan
          </h2>
          <p className="page-subtitle">
            Upload a building layout and place gateways on the map. PNG and JPEG are supported; PDF import is planned.
          </p>
        </div>
        {isAdmin && (
          <label className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent-cyan text-white hover:opacity-90 cursor-pointer transition-all">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
              className="sr-only"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Upload size={16} />
            {uploading ? 'Uploading…' : 'Upload Plan'}
          </label>
        )}
      </div>

      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      {message && <p className="alert alert-success" role="status">{message}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-6">
        <div className="panel">
          {loading ? (
            <p className="text-sm text-muted py-16 text-center">Loading floor plan…</p>
          ) : !state?.hasPlan ? (
            <div className="py-16 text-center text-muted">
              <Map className="mx-auto mb-3 opacity-40" size={40} />
              <p className="font-medium text-foreground">No floor plan yet</p>
              <p className="text-sm mt-1">Upload a PNG or JPEG layout to get started.</p>
            </div>
          ) : (
            <div
              ref={canvasRef}
              className={`relative rounded-xl overflow-hidden border border-border bg-slate-100 dark:bg-black/30 ${
                placingGatewayId ? 'cursor-crosshair ring-2 ring-accent-cyan/40' : ''
              }`}
              onClick={handleCanvasClick}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <img
                src={imageUrl}
                alt="Floor plan"
                className="w-full h-auto block select-none pointer-events-none"
                draggable={false}
              />
              {state.gateways.map((gateway) => (
                <GatewayMarker
                  key={gateway.id}
                  gateway={gateway}
                  selected={selectedGatewayId === gateway.id}
                  isAdmin={isAdmin}
                  onSelect={setSelectedGatewayId}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="panel flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Gateways</h3>
            <p className="text-xs text-muted">
              {isAdmin
                ? 'Select a gateway, then click the plan to place it. Drag markers to fine-tune.'
                : 'View gateway positions on the floor plan.'}
            </p>
          </div>

          <ul className="space-y-2">
            {state?.gateways.map((gateway) => {
              const placed = gateway.plan_x != null && gateway.plan_y != null;
              const isSelected = selectedGatewayId === gateway.id;
              return (
                <li
                  key={gateway.id}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    isSelected ? 'border-accent-cyan bg-cyan-50 dark:bg-accent-cyan/10' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="text-left font-medium truncate"
                      onClick={() => setSelectedGatewayId(gateway.id)}
                    >
                      {gateway.name}
                    </button>
                    {placed && isAdmin && (
                      <button
                        type="button"
                        className="text-muted hover:text-danger p-1"
                        aria-label={`Remove ${gateway.name} from plan`}
                        onClick={() => clearPosition(gateway.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {placed ? `Placed at ${Number(gateway.plan_x).toFixed(1)}%, ${Number(gateway.plan_y).toFixed(1)}%` : 'Not placed'}
                  </p>
                  {isAdmin && !placed && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => {
                        setPlacingGatewayId(gateway.id);
                        setMessage(`Click the plan to place ${gateway.name}.`);
                      }}
                    >
                      <Move size={14} />
                      Place on plan
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>

          {isAdmin && unplacedGateways.length > 0 && placingGatewayId && (
            <p className="text-xs text-accent-cyan">
              Placing: {unplacedGateways.find((g) => g.id === placingGatewayId)?.name || 'gateway'} — click the image
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};
