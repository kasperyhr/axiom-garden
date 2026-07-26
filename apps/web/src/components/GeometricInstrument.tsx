const orbitNodes = [
  { className: "instrument__node instrument__node--north" },
  { className: "instrument__node instrument__node--east" },
  { className: "instrument__node instrument__node--south" },
  { className: "instrument__node instrument__node--west" },
];

export function GeometricInstrument() {
  return (
    <div className="instrument" aria-hidden="true">
      <div className="instrument__rail instrument__rail--horizontal" />
      <div className="instrument__rail instrument__rail--vertical" />
      <div className="instrument__orbit instrument__orbit--outer" />
      <div className="instrument__orbit instrument__orbit--middle" />
      <div className="instrument__orbit instrument__orbit--inner" />
      <div className="instrument__core" />
      {orbitNodes.map(({ className }) => (
        <span key={className} className={className} />
      ))}
      <div className="instrument__square instrument__square--terracotta" />
      <div className="instrument__square instrument__square--ochre" />
      <div className="instrument__matrix">
        {Array.from({ length: 16 }, (_, index) => (
          <span key={index} className={index === 11 ? "is-accent" : undefined} />
        ))}
      </div>
    </div>
  );
}
