'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Edit2, Trash2, RefreshCw, Users, Mail, Phone, MapPin } from 'lucide-react';
import { partiesApi } from './api';
import { Party, CreatePartyRequest } from './types';

export default function PartyManagement() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentParty, setCurrentParty] = useState<Partial<Party> | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      setLoading(true);
      const data = await partiesApi.getParties();
      setParties(data);
    } catch (err) {
      setError('Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await partiesApi.syncParties();
      await loadParties();
      setSuccess('Parties synced from trips successfully');
    } catch (err) {
      setError('Failed to sync parties');
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentParty?.name) return;

    try {
      setLoading(true);
      if (isEditing && currentParty.id) {
        // Only send fields that are allowed to be updated
        const updateData = {
          name: currentParty.name,
          gstIn: currentParty.gstIn,
          address: currentParty.address,
          phone: currentParty.phone,
          email: currentParty.email,
        };
        await partiesApi.updateParty(currentParty.id, updateData as any);
        setSuccess('Party updated successfully');
      } else {
        await partiesApi.createParty(currentParty as CreatePartyRequest);
        setSuccess('Party created successfully');
      }
      setShowForm(false);
      setCurrentParty(null);
      setIsEditing(false);
      await loadParties();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save party');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (party: Party) => {
    setCurrentParty(party);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this party?')) return;
    try {
      setLoading(true);
      await partiesApi.deleteParty(id);
      setSuccess('Party deleted successfully');
      await loadParties();
    } catch (err) {
      setError('Failed to delete party');
    } finally {
      setLoading(false);
    }
  };

  if (loading && parties.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Party Management</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2">
          <Button onClick={handleSync} variant="outline" disabled={syncing} className="w-full sm:w-auto">
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync from Trips
          </Button>
          <Button onClick={() => { setShowForm(true); setIsEditing(false); setCurrentParty(null); }} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Party
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Party' : 'Add New Party'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Party Name *</Label>
                  <Input
                    id="name"
                    value={currentParty?.name || ''}
                    onChange={(e) => setCurrentParty({ ...currentParty, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstIn">GSTIN</Label>
                  <Input
                    id="gstIn"
                    value={currentParty?.gstIn || ''}
                    onChange={(e) => setCurrentParty({ ...currentParty, gstIn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={currentParty?.phone || ''}
                    onChange={(e) => setCurrentParty({ ...currentParty, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={currentParty?.email || ''}
                    onChange={(e) => setCurrentParty({ ...currentParty, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={currentParty?.address || ''}
                  onChange={(e) => setCurrentParty({ ...currentParty, address: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isEditing ? 'Update Party' : 'Create Party'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parties.map((party) => (
          <Card key={party.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">{party.name}</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(party)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(party.id)} className="text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {party.gstIn && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">GST: {party.gstIn}</Badge>
                  </div>
                )}
                {party.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {party.phone}
                  </div>
                )}
                {party.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {party.email}
                  </div>
                )}
                {party.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-3 w-3 mt-1" />
                    <span className="line-clamp-2">{party.address}</span>
                  </div>
                )}
                <div className="flex gap-4 mt-4 pt-4 border-t border-border">
                  <div className="text-center flex-1">
                    <div className="font-bold">{party._count?.trips || 0}</div>
                    <div className="text-xs text-muted-foreground uppercase">Trips</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="font-bold">{party._count?.invoices || 0}</div>
                    <div className="text-xs text-muted-foreground uppercase">Invoices</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="font-bold">
                      ₹{(party.remainingBalance ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">Remaining</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
