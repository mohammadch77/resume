/**
 * Case-study dialog: tags, title, crop-marked cover, challenge / solution / outcome in three columns, primary + secondary actions. Traps focus, closes on Escape and scrim click.
 * @startingPoint section="Overlays" subtitle="Case-study dialog over scrim" viewport="1280x900"
 */
export interface ModalProps {
  open?: boolean;
  onClose?: () => void;
  title: string;
  tags?: string[];
  art?: 1 | 2 | 3 | 4;
  image?: string;
  alt?: string;
  sample?: boolean;
  challenge: React.ReactNode;
  solution: React.ReactNode;
  outcome: React.ReactNode;
  /** Override column headings (default چالش / راه‌حل / نتیجه). */
  labels?: { challenge?: string; solution?: string; outcome?: string };
  /** Same label as the site-wide primary CTA. */
  primaryLabel?: string;
  primaryHref?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Position the scrim inside the nearest positioned parent instead of the viewport (for previews/artboards). */
  contained?: boolean;
  className?: string;
}
export declare function Modal(props: ModalProps): JSX.Element;
