'use strict';
// LEGACY ONLY: preserves already approved day-based records. New shares use
// the authenticated points ledger; do not apply this calculator to new awards.
const POLICY=Object.freeze({version:'FC-TESTIMONIAL-2026-10-v1',daysPerShare:1,annualCap:15,redeemAfterPaidRenewal:true});
// Reference calculator for staff tests/documentation. It is not a trusted
// entitlement service and never edits LearnWorlds membership or payment records.
function summarize(reviews,{memberId,termId}={}){
 const rows=reviews.filter(r=>r.memberId===memberId&&r.termId===termId);
 const ids=new Map();for(const r of reviews)if(r.commentId)ids.set(r.commentId,(ids.get(r.commentId)||0)+1);
 const approved=rows.filter(r=>r.decision==='Approved'&&r.annualVerified===true&&r.authorVerified===true&&r.originalVerified===true&&r.reviewedBy&&r.reviewedOn&&r.commentId&&ids.get(r.commentId)===1);
 return{verifiedShares:approved.length,earnedDays:Math.min(POLICY.annualCap,approved.length),pending:rows.filter(r=>!['Approved','Rejected','Cancelled'].includes(r.decision)).length,cap:POLICY.annualCap};
}
function redemption(summary,{renewalVerified=false,approvedDays,alreadyRedeemed=false}={}){
 if(!renewalVerified)return{ready:false,reason:'renewal_required'};
 if(alreadyRedeemed)return{ready:false,reason:'already_redeemed'};
 if(!Number.isSafeInteger(approvedDays)||approvedDays<1||approvedDays>Math.min(POLICY.annualCap,summary.earnedDays))return{ready:false,reason:'invalid_days'};
 return{ready:true,days:approvedDays,applied:false};
}
module.exports={POLICY,summarize,redemption};
