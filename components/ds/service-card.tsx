import { Icon, type IconName } from "./icon";

export type ServiceCardProps = {
  icon: IconName;
  title: string;
  /** One or two sentences; no numbers or claims that cannot be proven. */
  children: React.ReactNode;
  /** Persian index shown opposite the icon, e.g. "۰۱". Omit to hide it. */
  index?: string;
  headingLevel?: 2 | 3 | 4;
  className?: string;
  style?: React.CSSProperties;
};

/** One service: icon tile, Persian index, title, a short text. A list item: place it inside <ServiceGrid>. Not a link, so it has no hover state. */
export function ServiceCard({ icon, title, children, index, headingLevel = 3, className = "", style }: ServiceCardProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <li className={["gw-service", className].filter(Boolean).join(" ")} style={style}>
      <div className="gw-service__top">
        <span className="gw-service__icon">
          <Icon name={icon} />
        </span>
        {index && (
          <span className="gw-service__no" aria-hidden="true">
            {index}
          </span>
        )}
      </div>
      <Heading className="gw-service__title">{title}</Heading>
      <p className="gw-service__text">{children}</p>
    </li>
  );
}

export type ServiceGridProps = {
  /** Accessible name of the list when the section heading is not directly above it. */
  label?: string;
  className?: string;
  children?: React.ReactNode;
};

/** Two columns from 760px up, one below. */
export function ServiceGrid({ label, className = "", children }: ServiceGridProps) {
  return (
    <ul className={["gw-service-grid", className].filter(Boolean).join(" ")} aria-label={label}>
      {children}
    </ul>
  );
}
