/**
 * Unit Economics Assessment Model
 * Compares earnings through informal pathways vs. SafaaiWala formal route.
 */

function calculateUnitEconomics(weightKg, materialCategory) {
  // Baseline benchmark prices (INR per kg)
  const rates = {
    'PCBs': { informal: 140, formal: 210 },
    'Cables': { informal: 90, formal: 130 },
    'Batteries': { informal: 35, formal: 55 },
    'CRTs': { informal: 10, formal: 22 },
    'Default': { informal: 30, formal: 45 }
  };

  const currentRate = rates[materialCategory] || rates['Default'];

  // Baseline Informal Earnings
  const informalGross = weightKg * currentRate.informal;
  const informalHealthAndRiskDeduction = informalGross * 0.10; // Invisible health/loss overheads
  const informalNetEarnings = informalGross - informalHealthAndRiskDeduction;

  // Platform Formal Route Earnings
  const formalGross = weightKg * currentRate.formal;
  const platformFeePercentage = 0.03; // 3% platform commission paid by recycler, zero burden on collector
  const collectorPayout = formalGross; // Collector gets full gross amount
  
  const earningsGainINR = collectorPayout - informalGross;
  const percentageIncrease = ((earningsGainINR / informalGross) * 100).toFixed(2);

  return {
    materialCategory,
    weightKg,
    informalModel: {
      ratePerKg: currentRate.informal,
      grossEarningsINR: informalGross,
      netValueRealizedINR: informalNetEarnings
    },
    safaaiWalaFormalModel: {
      ratePerKg: currentRate.formal,
      grossPayoutINR: collectorPayout,
      platformFeeEarnedBySystemINR: Math.round(formalGross * platformFeePercentage)
    },
    impact: {
      netEarningsGainINR: earningsGainINR,
      percentageGain: `${percentageIncrease}%`,
      sustainabilityNote: "Platform operations are sustained via a 3% transaction fee levied on authorized recyclers who save on raw material aggregation costs."
    }
  };
}

module.exports = { calculateUnitEconomics };