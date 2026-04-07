export interface ExpenseItem {
  expense: string;
  amount: string;
  narration: string;
}

export interface GoodsReceipt {
  id: string;
  tripId: string;
  shipperId: string;
  
  branchName: string;
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
  
  partyBillDate?: string;
  netInvValue?: string;
  
  truckLorryNo: string;
  agentTruck: string;
  capacity?: string;
  vehicleType: string;
  comm?: string;
  rate?: string;
  freight: string;
  
  package: string;
  typeOfPkg: string;
  goodsDescription: string;
  actualWt?: string;
  chargedWt?: string;
  unit?: string;
  
  loadingChg?: string;
  unloadingChg?: string;
  pMarkaAwbGr?: string;
  
  gstPaidBy: string;
  
  account: string;
  basicFreight?: string;
  totalFreight?: string;
  gst?: string;
  advanceDate?: string;
  ewayDate?: string;
  toll?: string;
  netPayable?: string;
  
  fromStationUp?: string;
  toStationUp?: string;
  driverName?: string;
  poNo?: string;
  shipmentId?: string;
  
  grNo?: string;
  detentionLoading?: string;
  detentionUL?: string;
  labourCharges?: string;
  otherCharges?: string;
  
  expenses?: ExpenseItem[];
  grPhotoUrl?: string;
  grBiltyImages?: string[];
  
  // POD (Proof of Delivery) fields
  podImages?: string[];
  podReceived?: boolean;
  podReceivedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoodsReceiptDto {
  tripId: string;
  shipperId: string;
  
  branchName: string;
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
  
  partyBillDate?: string;
  netInvValue?: string;
  
  truckLorryNo: string;
  agentTruck: string;
  capacity?: string;
  vehicleType: string;
  comm?: string;
  rate?: string;
  freight: string;
  
  package: string;
  typeOfPkg: string;
  goodsDescription: string;
  actualWt?: string;
  chargedWt?: string;
  unit?: string;
  
  loadingChg?: string;
  unloadingChg?: string;
  pMarkaAwbGr?: string;
  
  gstPaidBy: string;
  
  account: string;
  basicFreight?: string;
  totalFreight?: string;
  gst?: string;
  advanceDate?: string;
  ewayDate?: string;
  toll?: string;
  netPayable?: string;
  
  fromStationUp?: string;
  toStationUp?: string;
  driverName?: string;
  poNo?: string;
  shipmentId?: string;
  
  grNo?: string;
  detentionLoading?: string;
  detentionUL?: string;
  labourCharges?: string;
  otherCharges?: string;
  
  expenses?: ExpenseItem[];
  grPhotoUrl?: string;
  grBiltyImages?: string[];
  
  // POD (Proof of Delivery) fields
  podImages?: string[];
}
