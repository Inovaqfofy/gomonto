/**
 * Configuration des frais CinetPay et GoMonto Smart Deposit
 * 
 * Sources: https://cinetpay.com/pricing
 * - PayIn: 2% à 3.5% selon l'opérateur
 * - PayOut: 1.3% à 2% selon l'opérateur
 */

export const CINETPAY_FEES = {
  // Frais PayIn (collecte) par opérateur - estimations
  payIn: {
    visa_mastercard: 0.035, // 3.5%
    orange_money: 0.03,     // 3%
    mtn_momo: 0.022,        // 2.2%
    wave: 0.02,             // 2%
    moov_money: 0.025,      // 2.5%
    free_money: 0.025,      // 2.5%
    default: 0.03,          // Moyenne pour estimation
  },
  
  // Frais PayOut (remboursement) par opérateur - estimations
  payOut: {
    orange_money: 0.018,    // 1.8%
    mtn_momo: 0.013,        // 1.3%
    wave: 0.02,             // 2%
    moov_money: 0.015,      // 1.5%
    default: 0.018,         // Moyenne pour estimation
  },
};

/**
 * Frais de service GoMonto pour Smart Deposit
 * Ce taux couvre: PayIn (~3%) + PayOut (~2%) + marge opérationnelle
 */
export const SMART_DEPOSIT_FEE_RATE = 0.05; // 5%

/**
 * Calcule les frais pour un dépôt Smart Deposit
 */
export const calculateDepositFees = (depositAmount: number) => {
  const serviceFee = Math.ceil(depositAmount * SMART_DEPOSIT_FEE_RATE);
  
  return {
    depositAmount,           // Montant de la caution
    serviceFee,              // Frais de service (5%)
    totalToPay: depositAmount + serviceFee, // Total à payer par le locataire
    refundableAmount: depositAmount, // Montant remboursable (hors frais)
    feePercentage: SMART_DEPOSIT_FEE_RATE * 100, // 5%
  };
};

/**
 * Formate les frais pour l'affichage
 */
export const formatDepositFeesBreakdown = (depositAmount: number, currency: string = 'FCFA') => {
  const fees = calculateDepositFees(depositAmount);
  
  return {
    ...fees,
    formatted: {
      depositAmount: `${fees.depositAmount.toLocaleString('fr-FR')} ${currency}`,
      serviceFee: `${fees.serviceFee.toLocaleString('fr-FR')} ${currency}`,
      totalToPay: `${fees.totalToPay.toLocaleString('fr-FR')} ${currency}`,
      refundableAmount: `${fees.refundableAmount.toLocaleString('fr-FR')} ${currency}`,
    }
  };
};
