/**
 * Small dialog that drops in from the top, for a form or a short message (added by Grin Web). Same behaviour as Modal:
 * traps focus, closes on Escape and scrim click, locks page scroll, returns focus to the trigger.
 * @startingPoint section="Overlays" subtitle="Drop-in dialog for a form" viewport="1280x700"
 */
export interface DialogProps {
  open?: boolean;
  onClose?: () => void;
  title: string;
  /** Selector of the element that gets focus first (default: the close button). */
  initialFocus?: string;
  className?: string;
  children?: React.ReactNode;
}
export declare function Dialog(props: DialogProps): JSX.Element;
