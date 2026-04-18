export interface ExpenseItem {
  expenseType: string;
  amount?: string;
  narration?: string;
}

export interface GoodsItem {
  noOfBoxes?: string;
  packageType?: string;
  rate?: string;
  description?: string;
  actualWeight?: string;
  chargedWeight?: string;
  unit?: string;
}

export interface GRFileItem {
  fileUrl: string;
  fileType?: string;
}

export interface GoodsReceipt {
  id: string;
  tripId?: string;
  shipperId: string;
  branchId: string;

  billedAtBranch: string;
  cnType: string;
  deliveryAt: string;
  grDate: string;
  cnTime: string;

  consignor: string;
  chargedParty: string;
  consigneeName: string;

  fromStation: string;
  toStation: string;
  partySlab?: string;
  distanceKm?: string;

  netInvValue?: string;

  truckLorryNo: string;
  agentTruck: string;
  capacity?: string;
  vehicleType: string;
  comm?: string;
  rate?: string;

  goods?: GoodsItem[];
  package?: string;
  typeOfPkg?: string;
  goodsDescription?: string;
  actualWt?: string;
  chargedWt?: string;
  unit?: string;

  freight?: string;
  gstPercent?: string;
  gstMovementType?: 'INTRA_STATE' | 'INTER_STATE';
  basicFreight?: number;
  gstAmount?: number;
  advanceAmount?: number;
  advanceDate?: string;
  totalFreight?: number;
  netPayable?: number;
  gstPaidBy: string;

  toll?: string;

  grNo?: string;
  detentionLoading?: string;
  detentionUL?: string;
  loadingCharges?: string;
  unloadingCharges?: string;
  labourCharges?: string;
  otherCharges?: string;

  expenses?: ExpenseItem[];
  files?: GRFileItem[];
  grPhotoUrl?: string;
  grBiltyImages?: string[];

  invoiceNo?: string;
  partyBillNo?: string;
  acType?: string;
  poNumber?: string;
  shipmentId?: string;
  cbm?: string;
  remarks?: string;
  transportRoute?: string;
  consignorGst?: string;
  consigneeGst?: string;

  podImages?: string[];
  podReceived?: boolean;
  podReceivedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateGoodsReceiptDto {
  tripId?: string;
  shipperId: string;
  branchId: string;

  billedAtBranch?: string;
  cnType?: string;
  deliveryAt?: string;
  grDate?: string;
  cnTime?: string;

  consignor?: string;
  chargedParty?: string;
  consigneeName?: string;

  fromStation?: string;
  toStation?: string;
  partySlab?: string;
  distanceKm?: string;

  netInvValue?: string;

  truckLorryNo?: string;
  agentTruck?: string;
  capacity?: string;
  vehicleType?: string;
  comm?: string;
  rate?: string;

  goods?: GoodsItem[];
  package?: string;
  typeOfPkg?: string;
  goodsDescription?: string;
  actualWt?: string;
  chargedWt?: string;
  unit?: string;

  freight?: string;
  gstPercent?: string;
  gstMovementType?: 'INTRA_STATE' | 'INTER_STATE';
  basicFreight?: number;
  gstAmount?: number;
  advanceAmount?: number;
  advanceDate?: string;
  totalFreight?: number;
  netPayable?: number;
  gstPaidBy?: string;

  toll?: string;

  grNo?: string;
  detentionLoading?: string;
  detentionUL?: string;
  loadingCharges?: string;
  unloadingCharges?: string;
  labourCharges?: string;
  otherCharges?: string;

  expenses?: ExpenseItem[];
  files?: GRFileItem[];
  grPhotoUrl?: string;
  grBiltyImages?: string[];

  invoiceNo?: string;
  partyBillNo?: string;
  acType?: string;
  poNumber?: string;
  shipmentId?: string;
  cbm?: string;
  remarks?: string;
  transportRoute?: string;
  consignorGst?: string;
  consigneeGst?: string;

  /**
   * Not stored on GR; server applies to linked trip (shipper flow).
   * Admin GR UI syncs e-way via PATCH /trips/:id/accounts instead.
   */
  tripEwaySync?: { billNumber?: string | null; date?: string | null };

  podImages?: string[];
}
