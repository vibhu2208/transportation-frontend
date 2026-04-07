'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Truck, Calendar, MapPin, Users, FileText, Download, Loader2 } from 'lucide-react';
import { invoicesApi } from './api';
import { partiesApi } from '../parties/api';
import {
  PendingTripsByParty,
  CreateInvoiceRequest,
  Invoice,
  InvoiceTemplate,
} from './types';
import { Party } from '../parties/types';

export default function InvoiceManagement() {
  const [pendingTrips, setPendingTrips] = useState<PendingTripsByParty[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [selectedTrips, setSelectedTrips] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('classic');
  const [customTemplateHtml, setCustomTemplateHtml] = useState<string>('');
  const [moneyReceiptOpenFor, setMoneyReceiptOpenFor] = useState<string | null>(null);
  const [mrPaymentType, setMrPaymentType] = useState<'PARTIAL' | 'FULL'>('PARTIAL');
  const [mrAmount, setMrAmount] = useState('');
  const [mrPaymentMode, setMrPaymentMode] = useState('');
  const [mrReferenceNo, setMrReferenceNo] = useState('');
  const [mrNotes, setMrNotes] = useState('');
  const [mrPaymentDate, setMrPaymentDate] = useState('');
  const [creatingMr, setCreatingMr] = useState(false);
  const [downloadingMr, setDownloadingMr] = useState<string | null>(null);
  
  // Form state
  const [partyGstIn, setPartyGstIn] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [gstRate, setGstRate] = useState('12');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [pendingTripsData, invoicesData, partiesData] = await Promise.all([
        invoicesApi.getPendingTripsByParty(),
        invoicesApi.getInvoices(),
        partiesApi.getParties()
      ]);
      const templateData = await invoicesApi.getInvoiceTemplates();
      setPendingTrips(pendingTripsData);
      setInvoices(invoicesData);
      setParties(partiesData);
      setTemplates(templateData);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePartySelect = (partyName: string) => {
    setSelectedParty(partyName);
    setSelectedTrips([]);
    setShowCreateForm(false);
    
    // Pre-fill party details from Parties master if available
    const partyMaster = parties.find(p => p.name === partyName);
    if (partyMaster) {
      setPartyGstIn(partyMaster.gstIn || '');
      setPartyAddress(partyMaster.address || '');
    } else {
      setPartyGstIn('');
      setPartyAddress('');
    }
  };

  const handleTripToggle = (tripId: string) => {
    setSelectedTrips(prev => 
      prev.includes(tripId) 
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId]
    );
  };

  const handleCreateInvoice = async () => {
    if (!selectedParty || selectedTrips.length === 0) {
      setError('Please select a party and at least one trip');
      return;
    }

    setCreatingInvoice(true);
    setError(null);

    try {
      const partyMaster = parties.find(p => p.name === selectedParty);
      const invoiceData: CreateInvoiceRequest = {
        tripIds: selectedTrips,
        partyId: partyMaster?.id,
        partyName: selectedParty,
        partyGstIn: partyGstIn || undefined,
        partyAddress: partyAddress || undefined,
        gstRate: parseFloat(gstRate) || 12,
        notes: notes || undefined,
      };

      const invoice = await invoicesApi.createInvoice(invoiceData);
      setSuccess(`Invoice ${invoice.invoiceNo} created successfully!`);
      
      // Reset form
      setSelectedParty('');
      setSelectedTrips([]);
      setPartyGstIn('');
      setPartyAddress('');
      setGstRate('12');
      setNotes('');
      setShowCreateForm(false);
      
      // Reload data
      await loadInitialData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const getPaidTotal = (inv: Invoice) =>
    (inv.moneyReceipts || []).reduce((s, r) => s + r.amount, 0);

  const getRemaining = (inv: Invoice) =>
    Math.max(0, Math.round((inv.grandTotal - getPaidTotal(inv)) * 100) / 100);

  const toggleMoneyReceiptSection = (invoiceId: string) => {
    if (moneyReceiptOpenFor === invoiceId) {
      setMoneyReceiptOpenFor(null);
      return;
    }
    setMoneyReceiptOpenFor(invoiceId);
    setMrPaymentType('PARTIAL');
    setMrAmount('');
    setMrPaymentMode('');
    setMrReferenceNo('');
    setMrNotes('');
    setMrPaymentDate('');
  };

  const handleCreateMoneyReceipt = async (invoiceId: string) => {
    if (mrPaymentType === 'PARTIAL' && (!mrAmount || parseFloat(mrAmount) <= 0)) {
      setError('Enter a valid amount for partial payment');
      return;
    }
    setCreatingMr(true);
    setError(null);
    try {
      await invoicesApi.createMoneyReceipt(invoiceId, {
        paymentType: mrPaymentType,
        amount: mrPaymentType === 'PARTIAL' ? parseFloat(mrAmount) : undefined,
        paymentMode: mrPaymentMode || undefined,
        referenceNo: mrReferenceNo || undefined,
        notes: mrNotes || undefined,
        paymentDate: mrPaymentDate || undefined,
      });
      setSuccess('Money receipt recorded successfully');
      setMoneyReceiptOpenFor(null);
      await loadInitialData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create money receipt');
    } finally {
      setCreatingMr(false);
    }
  };

  const handleDownloadMoneyReceipt = async (
    invoiceId: string,
    receiptId: string,
    receiptNo: string,
  ) => {
    const key = `${invoiceId}:${receiptId}`;
    setDownloadingMr(key);
    try {
      const blob = await invoicesApi.downloadMoneyReceiptPdf(invoiceId, receiptId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `money-receipt-${receiptNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download money receipt');
    } finally {
      setDownloadingMr(null);
    }
  };

  const handleDownloadPdf = async (invoiceId: string, invoiceNo: string) => {
    setDownloadingPdf(invoiceId);
    try {
      const blob = await invoicesApi.downloadInvoicePdf(invoiceId, {
        templateKey: selectedTemplate,
        customHtmlTemplate: selectedTemplate === 'custom' ? customTemplateHtml : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const selectedPartyData = pendingTrips.find(p => p.partyName === selectedParty);
  const selectedTripsData = selectedPartyData?.trips.filter(trip => 
    selectedTrips.includes(trip.id)
  ) || [];
  const getTripAmount = (trip: { effectiveFreight?: number; freight?: number | null }) =>
    trip.effectiveFreight ?? trip.freight ?? 0;
  const totalFreight = selectedTripsData.reduce((sum, trip) => sum + getTripAmount(trip), 0);
  const gstAmount = (totalFreight * parseFloat(gstRate)) / 100;
  const grandTotal = totalFreight + gstAmount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invoice Management</h1>
        <Badge variant="outline" className="text-sm">
          {pendingTrips.reduce((sum, p) => sum + p.tripCount, 0)} Pending Trips
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Template Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Select Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {templates.find((template) => template.key === selectedTemplate)?.description}
              </p>
            </div>
            {selectedTemplate === 'custom' && (
              <div>
                <Label>Custom HTML Template</Label>
                <Textarea
                  value={customTemplateHtml}
                  onChange={(e) => setCustomTemplateHtml(e.target.value)}
                  placeholder="<html>...</html>"
                  rows={8}
                />
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded border">
            Available variables: <code>{'{{invoiceNo}}'}</code>, <code>{'{{invoiceDate}}'}</code>, <code>{'{{partyName}}'}</code>, <code>{'{{partyAddress}}'}</code>, <code>{'{{partyGstIn}}'}</code>, <code>{'{{subTotal}}'}</code>, <code>{'{{gstRate}}'}</code>, <code>{'{{gstAmount}}'}</code>, <code>{'{{grandTotal}}'}</code>, <code>{'{{notes}}'}</code>, <code>{'{{tripCount}}'}</code>, <code>{'{{tripsRows}}'}</code>.
          </div>
        </CardContent>
      </Card>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Trips Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pending Trips by Party
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingTrips.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No pending trips available for invoicing
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="party-select">Select Party</Label>
                    <Select value={selectedParty} onValueChange={handlePartySelect}>
                      <SelectTrigger id="party-select">
                        <SelectValue placeholder="Choose a party..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingTrips
                          .filter(party => parties.some(p => p.name === party.partyName))
                          .map((party) => (
                          <SelectItem key={party.partyName} value={party.partyName}>
                            {party.partyName} ({party.tripCount} trips)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedParty && (
                    <div className="space-y-2 ml-6">
                      {selectedPartyData?.trips.map((trip) => (
                        <div key={trip.id} className="flex items-start gap-2 p-2 border rounded">
                          <Checkbox
                            checked={selectedTrips.includes(trip.id)}
                            onCheckedChange={() => handleTripToggle(trip.id)}
                          />
                          <div className="flex-1 text-sm">
                            <div className="flex items-center gap-2 font-medium">
                              <span>{trip.tripNo}</span>
                              <Badge variant="outline" className="text-xs">
                                ₹{getTripAmount(trip).toLocaleString('en-IN')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(trip.date).toLocaleDateString('en-IN')}
                              <MapPin className="h-3 w-3 ml-2" />
                              {trip.fromLocation} → {trip.toLocation}
                              <Truck className="h-3 w-3 ml-2" />
                              {trip.vehicleNumber}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {selectedTrips.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <Button
                            onClick={() => setShowCreateForm(true)}
                            className="w-full"
                          >
                            Create Invoice ({selectedTrips.length} trips selected)
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Creation Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Create Invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Party Name</Label>
                <Input value={selectedParty} disabled />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gstIn">GSTIN (Optional)</Label>
                  <Input
                    id="gstIn"
                    value={partyGstIn}
                    onChange={(e) => setPartyGstIn(e.target.value)}
                    placeholder="27AAAPL1234C1ZV"
                  />
                </div>
                <div>
                  <Label htmlFor="gstRate">GST Rate</Label>
                  <Select value={gstRate} onValueChange={setGstRate}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Party Address (Optional)</Label>
                <Textarea
                  id="address"
                  value={partyAddress}
                  onChange={(e) => setPartyAddress(e.target.value)}
                  placeholder="Enter party address"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any notes for the invoice"
                  rows={2}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold">Selected Trips ({selectedTrips.length})</h4>
                {selectedTripsData.map((trip) => (
                  <div key={trip.id} className="flex justify-between text-sm p-2 border rounded">
                    <span>{trip.tripNo} - {trip.fromLocation} → {trip.toLocation}</span>
                    <span>₹{getTripAmount(trip).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sub Total:</span>
                  <span>₹{totalFreight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST @ {gstRate}%:</span>
                  <span>₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Grand Total:</span>
                  <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateInvoice}
                  disabled={creatingInvoice}
                  className="flex-1"
                >
                  {creatingInvoice ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Invoice'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Existing Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No invoices created yet
            </p>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex flex-col gap-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{invoice.invoiceNo}</h3>
                        <Badge variant={invoice.status === 'DRAFT' ? 'secondary' : 'default'}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {invoice.partyName} • {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                      </p>
                      <p className="text-sm">
                        {invoice.trips.length} trips • Invoice total: ₹
                        {invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Paid: ₹{getPaidTotal(invoice).toLocaleString('en-IN', { minimumFractionDigits: 2 })} · Due: ₹
                        {getRemaining(invoice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMoneyReceiptSection(invoice.id)}
                      >
                        Money receipts
                      </Button>
                      <Button
                        onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNo)}
                        disabled={downloadingPdf === invoice.id}
                        variant="outline"
                        size="sm"
                      >
                        {downloadingPdf === invoice.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {moneyReceiptOpenFor === invoice.id && (
                    <div className="border rounded-md p-4 bg-muted/40 space-y-4">
                      <h4 className="font-medium text-sm">Record payment</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label>Payment</Label>
                          <Select
                            value={mrPaymentType}
                            onValueChange={(v) => setMrPaymentType(v as 'PARTIAL' | 'FULL')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PARTIAL">Partial</SelectItem>
                              <SelectItem value="FULL">Full (remaining balance)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {mrPaymentType === 'PARTIAL' && (
                          <div>
                            <Label>Amount (₹)</Label>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={mrAmount}
                              onChange={(e) => setMrAmount(e.target.value)}
                              placeholder="Amount"
                            />
                          </div>
                        )}
                        <div>
                          <Label>Payment date (optional)</Label>
                          <Input
                            type="date"
                            value={mrPaymentDate}
                            onChange={(e) => setMrPaymentDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Mode (Cash / Bank / UPI)</Label>
                          <Input
                            value={mrPaymentMode}
                            onChange={(e) => setMrPaymentMode(e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <Label>Reference no.</Label>
                          <Input
                            value={mrReferenceNo}
                            onChange={(e) => setMrReferenceNo(e.target.value)}
                            placeholder="Cheque / txn id"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={mrNotes}
                            onChange={(e) => setMrNotes(e.target.value)}
                            rows={2}
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCreateMoneyReceipt(invoice.id)}
                        disabled={creatingMr || getRemaining(invoice) <= 0}
                      >
                        {creatingMr ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          'Save money receipt'
                        )}
                      </Button>

                      {(invoice.moneyReceipts?.length ?? 0) === 0 && (
                        <p className="text-sm text-muted-foreground">No money receipts yet.</p>
                      )}

                      {(invoice.moneyReceipts?.length ?? 0) > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 pr-2">Receipt</th>
                                <th className="text-left py-2 pr-2">Date</th>
                                <th className="text-left py-2 pr-2">Type</th>
                                <th className="text-right py-2 pr-2">Amount</th>
                                <th className="text-right py-2">PDF</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(invoice.moneyReceipts || []).map((r) => (
                                <tr key={r.id} className="border-b border-muted">
                                  <td className="py-2 pr-2 font-mono text-xs">{r.receiptNo}</td>
                                  <td className="py-2 pr-2">
                                    {new Date(r.paymentDate).toLocaleDateString('en-IN')}
                                  </td>
                                  <td className="py-2 pr-2">{r.paymentType}</td>
                                  <td className="py-2 pr-2 text-right">
                                    ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2 text-right">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2"
                                      disabled={downloadingMr === `${invoice.id}:${r.id}`}
                                      onClick={() =>
                                        handleDownloadMoneyReceipt(invoice.id, r.id, r.receiptNo)
                                      }
                                    >
                                      {downloadingMr === `${invoice.id}:${r.id}` ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Download className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
