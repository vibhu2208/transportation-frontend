'use client';

import { Button } from '@/components/ui/Button';
import { Save, Trash2, Printer, Search } from 'lucide-react';

type Props = {
  onSave: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onFind: () => void;
  saving: boolean;
  disabledSave?: boolean;
  disabledDelete?: boolean;
};

export function HeaderActions({
  onSave,
  onDelete,
  onPrint,
  onFind,
  saving,
  disabledSave,
  disabledDelete,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        className="rounded-lg bg-emerald-600 hover:bg-emerald-700"
        onClick={onSave}
        disabled={saving || disabledSave}
      >
        {saving ? (
          'Saving…'
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save
          </>
        )}
      </Button>
      <Button type="button" variant="outline" className="rounded-lg" onClick={onDelete} disabled={disabledDelete}>
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
      <Button type="button" variant="outline" className="rounded-lg" onClick={onPrint}>
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
      <Button type="button" variant="outline" className="rounded-lg" onClick={onFind}>
        <Search className="mr-2 h-4 w-4" />
        Find
      </Button>
    </div>
  );
}
