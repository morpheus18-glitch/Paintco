export default function FeatureCards() {
  const items = [
    { title: 'Interior & Exterior', text: 'Walls, ceilings, trim, doors, cabinets, decks, fences.' },
    { title: 'Surface Prep', text: 'Patch, skim, sand, caulk, stain-blocking, primer selection.' },
    { title: 'Premium Materials', text: 'We spec paints that actually match the use-case, not just the brand.' }
  ];
  return (
    <>
      {items.map((x,i)=>(
        <div className="card" key={i}>
          <h3 style={{marginTop:0}}>{x.title}</h3>
          <p style={{marginBottom:0}}>{x.text}</p>
        </div>
      ))}
    </>
  );
}
