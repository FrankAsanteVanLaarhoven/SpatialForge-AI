#!/usr/bin/env python3
"""Case Assistant with strict citation grounding and explicit abstention.

Blueprint requirement:
'How AI earns a place:
First ship deterministic rules. Then test a case assistant that can retrieve only permitted
observations, cites an evidence ID and time for each factual assertion, and can explicitly
abstain. Evaluate it against templated explanations. Reserve any learned confidence estimate
for a separately calibrated held-out set.'
"""
import re
from port_case import evaluate, export_bundle


def generate_case_briefing(case, cutoff):
    """Generate a structured, evidence-cited case briefing adhering to strict factual grounding."""
    bundle_export = export_bundle(case, cutoff)
    bundle = bundle_export["bundle"]
    disposition = bundle["disposition"]
    decision = disposition["decision"]
    reason = disposition["reason"]
    origins = bundle["origin_groups"]
    admitted_records = {r["id"]: r for r in bundle["admitted_records"]}
    excluded = bundle["excluded_records"]
    citations = []

    lines = []
    lines.append(f"CASE BRIEFING: {bundle['case_id']}")
    lines.append(f"Target Instant: {bundle['target_time']} (window: {bundle['time_window']['start']} to {bundle['time_window']['end']})")
    lines.append(f"Adjudication Cutoff: {bundle['decision_cutoff']}")
    lines.append(f"Policy: {bundle['policy_version']} (requires >= 2 independent origins)\n")

    # 1. Strict Abstention Handling
    if decision == "insufficient evidence":
        lines.append("DECISION STATUS: [ABSTENTION] - Insufficient Evidence")
        lines.append(f"RATIONALE: {reason}. Verified independent origins: {disposition['independent_origins']} / 2.\n")
    elif decision == "confirmed":
        lines.append("DECISION STATUS: [CONFIRMED] - Zone Occupancy Adjudicated Inside")
        lines.append(f"RATIONALE: {reason}. Verified independent origins: {disposition['independent_origins']}.\n")
    elif decision == "contradicted":
        lines.append("DECISION STATUS: [CONTRADICTED] - Zone Occupancy Adjudicated Outside")
        lines.append(f"RATIONALE: {reason}. Verified independent origins: {disposition['independent_origins']}.\n")

    # 2. Factual Evidence Assertions with Mandatory [ID @ TIME] Citations
    lines.append("SUPPORTING EVIDENCE:")
    if not origins:
        lines.append("- No eligible independent observations were admitted prior to the decision cutoff.")
    else:
        for root, fixes in origins.items():
            lines.append(f"- Origin Root '{root}':")
            for pos, record_ids in fixes.items():
                for rec_id in record_ids:
                    rec = admitted_records[rec_id]
                    citation = f"[{rec_id} @ {rec['captured']}]"
                    citations.append((rec_id, rec["captured"]))
                    lines.append(
                        f"  * Fix {citation}: Subject '{rec['subject']}' located '{pos}' {bundle['zone']} "
                        f"via provider '{rec['via']}' (admitted at {rec['available']}, SHA-256: {rec['record_sha256'][:16]}...)."
                    )

    # 3. Excluded Observations & Failure Analysis
    if excluded:
        lines.append("\nEXCLUDED OBSERVATIONS:")
        for rec_id, excl_reason in excluded.items():
            lines.append(f"- Record [{rec_id}]: Excluded from admission — {excl_reason}.")

    # 4. Canonical Cryptographic Digest
    lines.append(f"\nEVIDENCE BUNDLE DIGEST (SHA-256): {bundle_export['evidence_bundle_sha256']}")

    briefing_text = "\n".join(lines)
    return {
        "decision": decision,
        "is_abstained": decision == "insufficient evidence",
        "briefing_text": briefing_text,
        "citations": citations,
        "bundle_sha256": bundle_export["evidence_bundle_sha256"],
    }


def verify_briefing_factual_grounding(briefing_result, bundle_export):
    """Verify that every citation in the briefing strictly maps to an admitted record."""
    text = briefing_result["briefing_text"]
    admitted_lookup = {r["id"]: r["captured"] for r in bundle_export["bundle"]["admitted_records"]}

    # Extract all [ID @ TIME] citations from prose
    matches = re.findall(r"\[([A-Za-z0-9\-_]+)\s*@\s*([0-9TZ:\-]+)\]", text)

    for rec_id, cap_time in matches:
        if rec_id not in admitted_lookup:
            return False, f"Hallucinated or unadmitted citation: {rec_id}"
        if admitted_lookup[rec_id] != cap_time:
            return False, f"Timestamp mismatch in citation {rec_id}: cited {cap_time} but admitted {admitted_lookup[rec_id]}"

    # Verify abstention logic consistency
    if bundle_export["bundle"]["disposition"]["decision"] == "insufficient evidence":
        if not briefing_result["is_abstained"]:
            return False, "Case engine verdict was insufficient evidence, but briefing did not abstain."

    return True, "All factual assertions strictly grounded in admitted evidence bundle."

