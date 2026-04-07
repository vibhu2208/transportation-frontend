'use client';

import { VendorManagement } from '@/modules/vendors/VendorManagement';
import ShipperManagement from '@/components/admin/ShipperManagement';
import { Users, Truck } from 'lucide-react';

export type SettingsSubTab = 'vendors' | 'shippers';

type AdminSettingsPanelProps = {
  subTab: SettingsSubTab;
  onSubTabChange: (tab: SettingsSubTab) => void;
};

export function AdminSettingsPanel({ subTab, onSubTabChange }: AdminSettingsPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
        <p className="mt-1 text-sm text-slate-600">
          Manage transport vendors and shipper accounts.
        </p>
      </div>

      <div className="inline-flex max-w-full flex-wrap rounded-xl border border-slate-200 bg-white p-1 shadow-sm gap-1">
        <button
          type="button"
          onClick={() => onSubTabChange('vendors')}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors flex-1 min-w-[8rem] sm:flex-initial sm:min-w-0 ${
            subTab === 'vendors'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Truck className="h-4 w-4" />
          Vendors
        </button>
        <button
          type="button"
          onClick={() => onSubTabChange('shippers')}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 sm:px-4 py-2.5 text-sm font-medium transition-colors flex-1 min-w-[8rem] sm:flex-initial sm:min-w-0 ${
            subTab === 'shippers'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4 w-4" />
          Shippers
        </button>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-md">
        {subTab === 'vendors' ? (
          <VendorManagement onEdit={(vendor) => console.log('Edit vendor:', vendor)} />
        ) : (
          <ShipperManagement />
        )}
      </div>
    </div>
  );
}
