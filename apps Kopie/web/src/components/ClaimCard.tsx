/* @ts-nocheck */
export default function ClaimCard({ claim, onImpact }:{ claim:any; onImpact:(n:number)=>void }) {
    return (
      <div className="border rounded-lg p-3 bg-white">
        <div className="font-semibold">Aussage</div>
        <div className="mt-1">{claim.text}</div>
        <div className="text-gray-500 text-sm mt-1">Thema: <b>{claim.categoryMain ?? "—"}</b></div>
        <div className="mt-2">
          {[1,2,3,4,5].map(star => (
            <button key={star}
              onClick={()=>onImpact(star)}
              className="text-xl"
              style={{color: (claim.impact ?? 3) >= star ? "#f59e0b" : "#e5e7eb"}}
            >★</button>
          ))}
        </div>
      </div>
    );
  }
  