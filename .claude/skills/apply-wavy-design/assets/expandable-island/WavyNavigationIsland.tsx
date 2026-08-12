import * as React from "react";

export type WavyNavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onSelect?: () => void;
};

type Props = {
  items: WavyNavItem[];
  activeId: string;
  brand: React.ReactNode;
  footer?: React.ReactNode;
  initiallyExpanded?: boolean;
};

export function WavyNavigationIsland({items,activeId,brand,footer,initiallyExpanded=false}: Props) {
  const [expanded,setExpanded]=React.useState(initiallyExpanded);
  return (
    <div className="wavy-shell" data-nav-expanded={expanded}>
      <aside className="wavy-nav-island wavy-glass-island" data-expanded={expanded} aria-label="Navegação principal">
        <div className="wavy-nav-island__brand">{brand}</div>
        <button className="wavy-nav-toggle wavy-focusable" type="button" aria-expanded={expanded} aria-label={expanded ? "Recolher menu" : "Expandir menu"} onClick={()=>setExpanded(v=>!v)}>
          <span aria-hidden="true">{expanded ? "‹" : "›"}</span>
        </button>
        <nav className="wavy-nav-list">
          {items.map(item => {
            const active=item.id===activeId;
            const content=<><span className="wavy-nav-item__icon" aria-hidden="true">{item.icon}</span><span className="wavy-nav-island__label">{item.label}</span></>;
            return item.href ? <a key={item.id} href={item.href} className="wavy-nav-item wavy-focusable" aria-current={active ? "page" : undefined} data-active={active}>{content}</a> : <button key={item.id} type="button" className="wavy-nav-item wavy-focusable" aria-pressed={active} data-active={active} onClick={item.onSelect}>{content}</button>;
          })}
        </nav>
        {footer && <div className="wavy-nav-island__footer">{footer}</div>}
      </aside>
    </div>
  );
}
