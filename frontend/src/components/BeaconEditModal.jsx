import React, { useState, useEffect, useRef } from 'react';
import axios from '../api/axiosSetup';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';

export const BeaconEditModal = ({ beacon, open, onClose, onSaved, onDeleted }) => {
  const [nickname, setNickname] = useState('');
  const [gatewayName, setGatewayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);

  useFocusTrap(dialogRef, open && beacon != null && !confirmDelete);

  useEffect(() => {
    if (!beacon) return;
    setNickname(beacon.nickname || '');
    setGatewayName(beacon.gateway_name || '');
    setError('');
    setConfirmDelete(false);
  }, [beacon, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmDelete) {
          setConfirmDelete(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, confirmDelete]);

  if (!open || !beacon) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await axios.patch(`/beacons/${encodeURIComponent(beacon.mac_addr)}/labels`, {
        nickname: nickname.trim(),
        gatewayName: gatewayName.trim(),
      });
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to save labels');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setError('');
    try {
      const res = await axios.delete(`/beacons/${encodeURIComponent(beacon.mac_addr)}`);
      onDeleted?.(res.data?.mac_addr || beacon.mac_addr);
      setConfirmDelete(false);
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to delete beacon');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const displayLabel = beacon.nickname || beacon.name || beacon.mac_addr;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        onClick={onClose}
        role="presentation"
      >
        <div
          ref={dialogRef}
          className="glass-panel w-full max-w-md p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="beacon-edit-title"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 id="beacon-edit-title" className="text-lg font-bold">
              Edit Labels
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-muted hover:text-foreground rounded-lg hover:bg-[var(--color-panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-xs text-muted font-mono mb-4 break-all">{beacon.mac_addr}</p>

          {error && (
            <p className="text-sm text-danger mb-4" role="alert">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="beacon-edit-nickname" className="text-xs text-muted uppercase tracking-wider block mb-2">
                Beacon display name
              </label>
              <input
                id="beacon-edit-nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="input-field"
                placeholder="e.g. Cold room A-01"
                maxLength={255}
              />
              <p className="text-[10px] text-muted mt-1">
                Saved as nickname; BLE broadcast name is not changed.
              </p>
            </div>

            <div>
              <label htmlFor="beacon-edit-gateway" className="text-xs text-muted uppercase tracking-wider block mb-2">
                Gateway display name
              </label>
              <input
                id="beacon-edit-gateway"
                type="text"
                value={gatewayName}
                onChange={(e) => setGatewayName(e.target.value)}
                className="input-field"
                placeholder="e.g. Floor 1 checkpoint"
                maxLength={255}
                required
              />
              {beacon.gateway_mac_addr && (
                <p className="text-[10px] text-muted font-mono mt-1 break-all">
                  Gateway MAC: {beacon.gateway_mac_addr}
                </p>
              )}
              <p className="text-[10px] text-muted mt-1">
                Applies to all beacons on this gateway.
              </p>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving || deleting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={saving || deleting}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
              <Button
                type="button"
                variant="danger"
                className="w-full"
                disabled={saving || deleting}
                onClick={() => setConfirmDelete(true)}
              >
                Delete beacon
              </Button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Beacon"
        message={`Delete "${displayLabel}"? This removes it from the system and cannot be undone.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setConfirmDelete(false);
        }}
      />
    </>
  );
};
