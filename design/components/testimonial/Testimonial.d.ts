/**
 * Client quote with a 4px saffron rule on the inline-start edge. The saffron moment of its screen area.
 * @startingPoint section="Content" subtitle="Quote with saffron start-edge rule" viewport="700x260"
 */
export interface TestimonialProps {
  quote: React.ReactNode;
  /** Real person's name (with permission). */
  name: React.ReactNode;
  /** Role and company. */
  role?: React.ReactNode;
  sample?: boolean;
  className?: string;
  style?: React.CSSProperties;
}
export declare function Testimonial(props: TestimonialProps): JSX.Element;
