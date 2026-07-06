import React, { useState, useEffect, useId } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from '../api/axiosSetup';
import { useSettings } from '../context/SettingsContext';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import {
  UserPlus,
  Trash2,
  Shield,
  User,
  KeyRound,
  Thermometer,
  SlidersHorizontal,
  Router,
  Activity,
  Database,
  RefreshCw,
  Pencil,
  X,
  Check,
  Sun,
  Moon,
  Monitor,
  Palette,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const PARAM_FIELDS = [
  { key: 'BEACON_OUT_TIME', label: 'Beacon offline timeout (seconds)', type: 'number', min: 5, max: 3600 },
  { key: 'HISTORY_DELETE_EXPIRED_HOUR', label: 'History retention (hours)', type: 'number', min: 1, max: 8760 },
  { key: 'NEW_BEACON_PREFIX', label: 'Auto-import MAC prefixes', type: 'text', hint: 'Comma-separated, e.g. 80ECCC0,80ECCB0' },
  { key: 'TEMP_WARN_C', label: 'Temperature warning (°C)', type: 'number', step: '0.1' },
  { key: 'TEMP_CRITICAL_C', label: 'Temperature critical (°C)', type: 'number', step: '0.1' },
];

function SettingsShell({ children }) {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {children}
    </div>
  );
}

function AdminSettingsRoute({ isAdmin, children }) {
  if (!isAdmin) {
    return <Navigate to="/settings/appearance" replace />;
  }
  return children;
}

export const Settings = ({ currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';
  const { refreshConfig } = useSettings();

  return (
    <Routes>
      <Route index element={<Navigate to="appearance" replace />} />
      <Route
        path="appearance"
        element={(
          <SettingsShell>
            <AppearanceSection />
          </SettingsShell>
        )}
      />
      <Route
        path="password"
        element={(
          <SettingsShell>
            <ChangePasswordSection />
          </SettingsShell>
        )}
      />
      <Route
        path="status"
        element={(
          <AdminSettingsRoute isAdmin={isAdmin}>
            <SettingsShell>
              <SystemStatusSection />
            </SettingsShell>
          </AdminSettingsRoute>
        )}
      />
      <Route
        path="gateways"
        element={(
          <AdminSettingsRoute isAdmin={isAdmin}>
            <SettingsShell>
              <GatewayManagementSection />
            </SettingsShell>
          </AdminSettingsRoute>
        )}
      />
      <Route
        path="params"
        element={(
          <AdminSettingsRoute isAdmin={isAdmin}>
            <SettingsShell>
              <SystemParamsSection onSaved={refreshConfig} />
            </SettingsShell>
          </AdminSettingsRoute>
        )}
      />
      <Route
        path="users"
        element={(
          <AdminSettingsRoute isAdmin={isAdmin}>
            <SettingsShell>
              <UserManagementSection currentUser={currentUser} />
            </SettingsShell>
          </AdminSettingsRoute>
        )}
      />
      <Route path="*" element={<Navigate to="appearance" replace />} />
    </Routes>
  );
};

const APPEARANCE_OPTIONS = [
  {
    id: 'light',
    label: 'Light',
    description: 'Always use light theme',
    icon: Sun,
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Always use dark theme',
    icon: Moon,
  },
  {
    id: 'system',
    label: 'System',
    description: 'Match your device setting',
    icon: Monitor,
  },
];

function AppearanceSection() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-2 mb-1">
        <Palette className="text-accent-cyan" size={22} />
        <h2 className="text-xl font-bold font-display">Appearance</h2>
      </div>
      <p className="text-sm text-muted mb-6">
        Choose how TempTrack looks. Your preference is saved on this device.
        {theme === 'system' && (
          <span className="block mt-1 text-xs">
            Currently using {resolvedTheme === 'dark' ? 'dark' : 'light'} (from system).
          </span>
        )}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
        {APPEARANCE_OPTIONS.map(({ id, label, description, icon: Icon }) => {
          const selected = theme === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(id)}
              className={`text-left p-4 rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${
                selected
                  ? 'border-accent-cyan bg-cyan-50 dark:bg-accent-cyan/10 ring-1 ring-accent-cyan/30'
                  : 'border-border bg-slate-50 dark:bg-black/20 hover:border-accent-cyan/40 hover:bg-[var(--color-panel-hover)]'
              }`}
            >
              <Icon
                size={22}
                className={selected ? 'text-accent-cyan mb-2' : 'text-muted mb-2'}
              />
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted mt-1">{description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await axios.post('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated successfully');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass-panel p-6">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
        <KeyRound className="text-accent-cyan" size={20} />
        Change Password
      </h3>
      <p className="text-sm text-muted mb-6">Update your login password.</p>

      {message && (
        <div role="status" className="mb-4 text-success bg-success-muted p-3 rounded-xl border border-success/30">
          {message}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-4 text-danger bg-danger-muted p-3 rounded-xl border border-danger/30">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
        <Field id="pwd-current" label="Current password" type="password" value={currentPassword} onChange={setCurrentPassword} required />
        <Field id="pwd-new" label="New password" type="password" value={newPassword} onChange={setNewPassword} required />
        <Field id="pwd-confirm" label="Confirm new password" type="password" value={confirmPassword} onChange={setConfirmPassword} required />
        <div className="md:col-span-3">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Update Password'}
          </Button>
        </div>
      </form>
    </section>
  );
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function statusTone(status) {
  if (status === 'ok' || status === 'connected') {
    return 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-300 dark:border-green-500/20';
  }
  if (status === 'warn' || status === 'reconnecting' || status === 'offline') {
    return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/20';
  }
  return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/20';
}

function SystemStatusSection() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/settings/status');
      setStatus(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load system status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="glass-panel p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Activity className="text-accent-cyan" size={20} />
            System Status
          </h3>
          <p className="text-sm text-muted mt-1">MQTT, database, and runtime health.</p>
          {status?.public?.web_url && (
            <p className="text-xs text-muted mt-2">
              Web: <span className="font-mono">{status.public.web_url}</span>
              {status.public.mqtt_url && (
                <> · Gateway MQTT: <span className="font-mono">{status.public.mqtt_url}</span></>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={fetchStatus}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-[var(--color-panel-hover)] transition-all"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded-xl border border-red-300 dark:border-red-500/20">
          {error}
        </div>
      )}

      {loading && !status ? (
        <p className="text-muted">Loading status…</p>
      ) : status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatusCard
            label="Application"
            value={status.app?.name || 'TempTrack'}
            subValue={`v${status.app?.version || '0.0.0'}`}
          />
          <StatusCard
            label="Uptime"
            value={formatUptime(status.uptime_seconds || 0)}
            subValue={status.server_time ? new Date(status.server_time).toLocaleString() : '—'}
          />
          <StatusCard
            label="Database"
            value={status.database?.status === 'ok' ? 'Connected' : 'Error'}
            subValue={status.database?.message || 'PostgreSQL'}
            tone={status.database?.status}
          />
          <StatusCard
            label="MQTT Broker"
            value={status.mqtt?.status || 'unknown'}
            subValue={`${status.mqtt?.host || '—'}:${status.mqtt?.port || '—'} · ${status.mqtt?.subscribedTopics || 0} topics`}
            tone={status.mqtt?.connected ? 'connected' : status.mqtt?.status}
          />
          <StatusCard
            label="Last MQTT Data"
            value={
              status.mqtt?.lastMessageAt
                ? new Date(status.mqtt.lastMessageAt).toLocaleTimeString()
                : 'Never'
            }
            subValue={
              status.mqtt?.secondsSinceLastMessage != null
                ? `${status.mqtt.secondsSinceLastMessage}s ago · gateway publish check`
                : 'No gateway messages received yet'
            }
            tone={
              status.mqtt?.secondsSinceLastMessage == null
                ? 'error'
                : status.mqtt.secondsSinceLastMessage > 1200
                  ? 'error'
                  : status.mqtt.secondsSinceLastMessage > 300
                    ? 'warn'
                    : 'connected'
            }
          />
          <StatusCard
            label="Gateways"
            value={String(status.counts?.gateways ?? 0)}
            subValue={`${status.counts?.in_memory_gateways ?? 0} loaded in memory`}
          />
          <StatusCard
            label="Beacons"
            value={String(status.counts?.beacons ?? 0)}
            subValue="Registered in database"
          />
        </div>
      )}
    </section>
  );
}

function StatusCard({ label, value, subValue, tone }) {
  const toneClass = tone ? statusTone(tone) : 'bg-slate-50 dark:bg-black/20 border-border';
  return (
    <div className={`border rounded-xl p-4 ${tone ? toneClass : 'bg-slate-50 dark:bg-black/20 border-border'}`}>
      <p className="text-xs text-muted uppercase tracking-wider mb-2">{label}</p>
      <p className="text-lg font-bold capitalize">{value}</p>
      {subValue && <p className="text-xs text-muted mt-1 break-all">{subValue}</p>}
    </div>
  );
}

function GatewayManagementSection() {
  const [gateways, setGateways] = useState([]);
  const [mqttBrokerHint, setMqttBrokerHint] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [gatewayToDelete, setGatewayToDelete] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', mac_addr: '', check_point: false });
  const [newGateway, setNewGateway] = useState({
    id: '',
    name: '',
    mac_addr: '',
    check_point: false,
  });

  const fetchGateways = async () => {
    try {
      const res = await axios.get('/settings/gateways');
      setGateways(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load gateways');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGateways();
    axios.get('/settings/status')
      .then((res) => setMqttBrokerHint(res.data?.public?.mqtt_url || ''))
      .catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await axios.post('/settings/gateways', newGateway);
      setNewGateway({ id: '', name: '', mac_addr: '', check_point: false });
      setMessage('Gateway created. MQTT subscription updated.');
      fetchGateways();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to create gateway');
    }
  };

  const startEdit = (gateway) => {
    setEditingId(gateway.id);
    setEditForm({
      name: gateway.name,
      mac_addr: gateway.mac_addr,
      check_point: gateway.check_point,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', mac_addr: '', check_point: false });
  };

  const saveEdit = async (id) => {
    setMessage('');
    setError('');
    try {
      await axios.patch(`/settings/gateways/${encodeURIComponent(id)}`, editForm);
      setMessage('Gateway updated.');
      cancelEdit();
      fetchGateways();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to update gateway');
    }
  };

  const confirmDeleteGateway = async () => {
    if (!gatewayToDelete) return;
    setMessage('');
    setError('');
    try {
      await axios.delete(`/settings/gateways/${encodeURIComponent(gatewayToDelete.id)}`);
      setMessage('Gateway deleted.');
      fetchGateways();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to delete gateway');
    } finally {
      setGatewayToDelete(null);
    }
  };

  return (
    <section>
      <ConfirmDialog
        open={gatewayToDelete != null}
        title="Delete Gateway"
        message={gatewayToDelete ? `Delete "${gatewayToDelete.name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDeleteGateway}
        onCancel={() => setGatewayToDelete(null)}
      />
      <div className="mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Router className="text-accent-purple" size={20} />
          Gateway Management
        </h3>
        <p className="text-sm text-muted mt-1">Manage MQTT gateway locations and check points.</p>
        {mqttBrokerHint && (
          <p className="text-xs text-muted mt-2">
            Physical gateway MQTT broker: <span className="font-mono text-foreground">{mqttBrokerHint}</span> (no username/password)
          </p>
        )}
      </div>

      {message && (
        <div className="mb-4 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 p-3 rounded-xl border border-green-300 dark:border-green-500/20">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded-xl border border-red-300 dark:border-red-500/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-panel p-6 h-fit">
          <h4 className="text-base font-bold mb-6">Add Gateway</h4>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field
              label="Gateway ID"
              value={newGateway.id}
              onChange={(v) => setNewGateway((prev) => ({ ...prev, id: v }))}
              required
            />
            <Field
              label="Display name"
              value={newGateway.name}
              onChange={(v) => setNewGateway((prev) => ({ ...prev, name: v }))}
              required
            />
            <Field
              label="MAC address"
              value={newGateway.mac_addr}
              onChange={(v) => setNewGateway((prev) => ({ ...prev, mac_addr: v }))}
              required
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newGateway.check_point}
                onChange={(e) => setNewGateway((prev) => ({ ...prev, check_point: e.target.checked }))}
                className="rounded border-border"
              />
              Check point (OUT when offline)
            </label>
            <Button type="submit" variant="primary" className="mt-2">
              Add Gateway
            </Button>
          </form>
        </div>

        <div className="lg:col-span-2 glass-panel p-6">
          <h4 className="text-base font-bold mb-6 flex items-center gap-2">
            <Database size={18} className="text-muted" />
            Registered Gateways
          </h4>
          {loading ? (
            <p className="text-muted">Loading gateways…</p>
          ) : gateways.length === 0 ? (
            <p className="text-muted">No gateways configured.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {gateways.map((gateway) => (
                <div
                  key={gateway.id}
                  className="bg-slate-50 dark:bg-black/20 border border-border p-4 rounded-xl"
                >
                  {editingId === gateway.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field
                        label="Display name"
                        value={editForm.name}
                        onChange={(v) => setEditForm((prev) => ({ ...prev, name: v }))}
                        required
                      />
                      <Field
                        label="MAC address"
                        value={editForm.mac_addr}
                        onChange={(v) => setEditForm((prev) => ({ ...prev, mac_addr: v }))}
                        required
                      />
                      <label className="flex items-center gap-2 text-sm md:col-span-2">
                        <input
                          type="checkbox"
                          checked={editForm.check_point}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, check_point: e.target.checked }))}
                          className="rounded border-border"
                        />
                        Check point (OUT when offline)
                      </label>
                      <div className="md:col-span-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(gateway.id)}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-cyan-100 dark:bg-accent-cyan/20 text-cyan-800 dark:text-accent-cyan"
                        >
                          <Check size={16} />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold">{gateway.name}</p>
                        <p className="text-xs text-muted mt-1">ID: {gateway.id}</p>
                        <p className="text-xs text-muted font-mono mt-1">MAC: {gateway.mac_addr}</p>
                        <p className="text-xs text-muted mt-2">
                          {gateway.beacon_count} beacon{gateway.beacon_count !== 1 ? 's' : ''} ·{' '}
                          {gateway.check_point ? 'Check point' : 'Standard gateway'}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(gateway)}
                          className="p-2 text-muted hover:text-foreground hover:bg-[var(--color-panel-hover)] rounded-lg"
                          title="Edit gateway"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setGatewayToDelete(gateway)}
                          disabled={gateway.beacon_count > 0}
                          className="p-2 text-muted hover:text-danger hover:bg-danger-muted rounded-lg disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
                          aria-label={gateway.beacon_count > 0 ? 'Remove beacons before deleting' : `Delete gateway ${gateway.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SystemParamsSection({ onSaved }) {
  const [params, setParams] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchParams = async () => {
    try {
      const res = await axios.get('/settings/params');
      const next = {};
      res.data.forEach((row) => {
        next[row.key] = row.value;
      });
      setParams(next);
      setError('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load system parameters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParams();
  }, []);

  const handleChange = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await axios.patch('/settings/params', { params });
      await fetchParams();
      await onSaved?.();
      setMessage('System settings saved. Most changes take effect immediately.');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass-panel p-6">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
        <SlidersHorizontal className="text-accent-purple" size={20} />
        System Parameters
      </h3>
      <p className="text-sm text-muted mb-6 flex items-center gap-2">
        <Thermometer size={16} />
        Alert thresholds, beacon timeout, history retention, and MAC import rules.
      </p>

      {message && (
        <div className="mb-4 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 p-3 rounded-xl border border-green-300 dark:border-green-500/20">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded-xl border border-red-300 dark:border-red-500/20">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading parameters…</p>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PARAM_FIELDS.map((field) => (
            <div key={field.key} className={field.key === 'NEW_BEACON_PREFIX' ? 'md:col-span-2' : ''}>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">{field.label}</label>
              <input
                type={field.type}
                min={field.min}
                max={field.max}
                step={field.step}
                value={params[field.key] ?? ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="input-field"
                required
              />
              {field.hint && <p className="text-xs text-muted mt-1">{field.hint}</p>}
            </div>
          ))}
          <div className="md:col-span-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save System Settings'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function UserManagementSection({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('viewer');

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await axios.post('/auth/users', { username: newUsername, password: newPassword, role: newRole });
      setNewUsername('');
      setNewPassword('');
      setNewRole('viewer');
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.msg || 'Failed to create user');
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setFormError('');
    try {
      await axios.delete(`/auth/users/${userToDelete}`);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.msg || 'Failed to delete user');
    } finally {
      setUserToDelete(null);
    }
  };

  return (
    <section>
      <ConfirmDialog
        open={userToDelete != null}
        title="Delete User"
        message="Delete this user? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />
      <div className="mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <User className="text-accent-purple" size={20} />
          User Management
        </h3>
        <p className="text-sm text-muted mt-1">Add or remove system users.</p>
      </div>

      {error && (
        <div role="alert" className="mb-4 text-danger bg-danger-muted p-4 rounded-xl border border-danger/30">
          {error}
        </div>
      )}
      {formError && (
        <div role="alert" className="mb-4 text-danger bg-danger-muted p-4 rounded-xl border border-danger/30">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-panel p-6 h-fit">
          <h4 className="text-base font-bold mb-6 flex items-center gap-2">
            <UserPlus className="text-accent-cyan" size={20} />
            Create User
          </h4>
          <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
            <Field id="user-new-name" label="Username" value={newUsername} onChange={setNewUsername} required />
            <Field id="user-new-pwd" label="Password" type="password" value={newPassword} onChange={setNewPassword} required />
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-2">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="input-field appearance-none"
              >
                <option value="viewer">Viewer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <Button type="submit" variant="primary" className="mt-4">
              Add User
            </Button>
          </form>
        </div>

        <div className="lg:col-span-2 glass-panel p-6">
          <h4 className="text-base font-bold mb-6">Active Users</h4>
          {loading ? (
            <p className="text-muted">Loading users…</p>
          ) : (
            <div className="flex flex-col gap-3">
              {users.map((u) => (
                <div key={u.id} className="bg-slate-50 dark:bg-black/20 border border-border p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-800 flex items-center justify-center">
                      {u.role === 'admin' ? (
                        <Shield size={18} className="text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <User size={18} className="text-muted" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold">{u.username}</p>
                      <p className="text-xs text-muted uppercase tracking-widest">{u.role}</p>
                    </div>
                  </div>
                  {u.id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => setUserToDelete(u.id)}
                      className="p-2 text-muted hover:text-danger hover:bg-danger-muted rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
                      aria-label={`Delete user ${u.username}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({ id, label, type = 'text', value, onChange, required }) {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <div>
      <label htmlFor={fieldId} className="text-xs text-muted uppercase tracking-wider block mb-2">
        {label}
      </label>
      <input
        id={fieldId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
        required={required}
      />
    </div>
  );
}
