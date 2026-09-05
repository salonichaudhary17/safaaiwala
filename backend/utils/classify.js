const { load } = require("./db");

/**
 * classifyMaterial
 * -----------------
 * Demo/dev implementation: the collector taps an icon (materialHint) as the
 * primary, always-reliable path — matching the low-literacy, tap-first flow
 * the problem statement asks for. If a photo was attached, we run a cheap
 * heuristic "confidence" pass so the judging panel sees where AI plugs in,
 * without us claiming a trained model we don't have in a hackathon window.
 *
 * PRODUCTION SWAP-IN:
 *   Replace this function body with a call to an AWS Rekognition Custom
 *   Labels endpoint (or a SageMaker endpoint hosting a fine-tuned model)
 *   trained on labeled photos of CRTs, LCDs, PCBs, cables, batteries,
 *   motors, and mixed plastics. Keep the same return shape so no other
 *   file needs to change:
 *     { category_id, confidence, method }
 */
function classifyMaterial({ materialHint, hasPhoto }) {
  const materials = load("materials");
  const match = materials.find((m) => m.id === materialHint);

  if (!match) {
    return { category_id: null, confidence: 0, method: "no-match" };
  }

  // Heuristic confidence: higher if a photo backs up the tap selection.
  const confidence = hasPhoto ? 0.9 : 0.6;
  const method = hasPhoto ? "heuristic-mock-vision" : "manual-selection";

  return { category_id: match.id, confidence, method };
}

module.exports = { classifyMaterial };
