/**
 * Service card (added by Grin Web). One service: icon tile, Persian index, title, one or two sentences. Place cards inside <ServiceGrid>.
 * @startingPoint section="Content" subtitle="Service card grid, 2 columns" viewport="1280x720"
 */
export interface ServiceCardProps {
  /** Lucide icon name (kebab-case). */
  icon: string;
  title: string;
  /** One or two sentences; no numbers or claims you cannot prove. */
  children: React.ReactNode;
  /** Persian index shown opposite the icon, e.g. "۰۱". Omit to hide it. */
  index?: string;
  headingLevel?: 2 | 3 | 4;
  className?: string;
  style?: React.CSSProperties;
}
export declare function ServiceCard(props: ServiceCardProps): JSX.Element;

export interface ServiceGridProps {
  /** Accessible name of the list when the section heading is not directly above it. */
  label?: string;
  className?: string;
  children?: React.ReactNode;
}
export declare function ServiceGrid(props: ServiceGridProps): JSX.Element;
