// hooks/usePurchases.tsx
import React from "react";
import PurchasesContext, {
  PurchasesContextProps,
} from "@/context/PurchasesContext";

/**
 * Custom hook pirkimams su RevenueCat valdyti.
 * @returns Objektas, turintis šias savybes:
 *  - currentOffering - Dabartinis pasiūlymas
 *  - purchasePackage - Įsigyti paketą
 *  - customerInfo - Kliento informacija
 *  - isSubscribed - Vėliavėlė, nurodanti, ar vartotojas yra prenumeravęs bet kurį pasiūlymą
 *  - getNonSubscriptionPurchase - Gauti ne prenumeratos pirkimą pagal identifikatorių
 */
export const usePurchases = () =>
  React.useContext(PurchasesContext as React.Context<PurchasesContextProps>);
