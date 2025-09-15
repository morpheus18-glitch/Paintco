export default function FeatureCards() {
  const items = [
    { title: 'Interior & Exterior', text: 'Walls, ceilings, trim, doors, cabinets, decks, fences.' },
    { title: 'Surface Prep', text: 'Patch, skim, sand, caulk, stain-block, correct primers for the surface.' },
    { title: 'Premium Materials', text: 'We spec paints that match the use-case, not just the label.' }
  ];

  const Icon = ({i}:{i:number}) => (
    <div style={{
      width:36, height:36, borderRadius:10,
      background:'linear-gradient(180deg, #5aa1ff, #387ef2)', display:'grid', placeItems:'center',
      boxShadow:'0 6px 16px rgba(17,43,120,.45)'
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        {i===0 && <path d="M3 21h18M6 12l5 5 8-8" stroke="#071226" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
        {i===1 && <path d="M4 14l6 6M20 4l-6 6M4 10l6-6M20 20l-6-6" stroke="#071226" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
        {i===2 && <path d="M5 12h14M5 7h14M5 17h14" stroke="#071226" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
      </svg>
    </div>
  );

  return (
    <>
      {items.map((x,i)=>(
        <div className="card" key={i} style={{display:'grid', gridTemplateColumns:'auto 1fr', gap:14, alignItems:'start'}}>
          <Icon i={i}/>
          <div>
            <h3>{x.title}</h3>
            <p style={{color:'var(--muted)', margin:0}}>{x.text}</p>
          </div>
        </div>
      ))}
    </>
  );
}
