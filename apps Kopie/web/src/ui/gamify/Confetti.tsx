"use client";
import React from "react";
export default function Confetti({go}:{go:boolean}) {
  const [show,setShow]=React.useState(false);
  React.useEffect(()=>{ if(go){ setShow(true); const t=setTimeout(()=>setShow(false),1200); return ()=>clearTimeout(t);} },[go]);
  if(!show) return null;
  const bits = Array.from({length:18}, (_,i)=>i);
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {bits.map(i=>(
        <span key={i}
          className="absolute text-2xl animate-[float_1.2s_ease-in-out_forwards]"
          style={{
            left: (5+Math.random()*90)+"%",
            top: "20%",
            transform: `translateY(-50%) rotate(${Math.random()*180}deg)`
          }}>
          {["🎉","✨","🎊","⭐️","💫"][i%5]}
        </span>
      ))}
      <style jsx>{`
        @keyframes float { from{ transform: translateY(-50%) scale(1); opacity:1;}
                           to  { transform: translateY(120%)  scale(0.9); opacity:0;} }
      `}</style>
    </div>
  );
}
