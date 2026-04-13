export interface ExpenseItem {
  expense: string;
  amount: string;
  narration: string;
}

export interface GoodsReceipt {
  id: string;
  tripId: string;
  shipperId: string;

  billedAtBranch: string;
  cnType: string;
  deliveryAt: string;
  cnNo: string;
  cnDate: string;
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

  package: string;
  typeOfPkg: string;
  goodsDescription: string;
  actualWt?: string;
  chargedWt?: string;
  unit?: string;

  gstPaidBy: string;

  toll?: string;

  grNo?: string;
  detentionLoading?: string;
  detentionUL?: string;
  labourCharges?: string;
  otherCharges?: string;

  expenses?: ExpenseItem[];
  grPhotoUrl?: string;
  grBiltyImages?: string[];

  podImages?: string[];
  podReceived?: boolean;
  podReceivedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateGoodsReceiptDto {
  tripId: string;
  shipperId: string;

  branchName?: string;
  ewayDate?: string;

  billedAtBranch?: string;
  cnType?: string;
  deliveryAt?: string;
  cnNo?: string;
  cnDate?: string;
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

  package?: string;
  typeOfPkg?: string;
  goodsDescription?: string;
  actualWt?: string;
  chargedWt?: string;
  unit?: string;

  gstPaidBy?: string;

  toll?: string;

  grNo?: string;
  detentionLoading?: string;
  detentionUL?: string;
  labourCharges?: string;
  otherCharges?: string;

  expenses?: ExpenseItem[];
  grPhotoUrl?: string;
  grBiltyImages?: string[];

  podImages?: string[];
}
