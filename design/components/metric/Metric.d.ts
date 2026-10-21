/**
 * Result figure: stat numeral, label, source line, hairline top rule. Never ship without a real source.
 * @startingPoint section="Content" subtitle="Stat numeral + label + source" viewport="700x240"
 */
export interface MetricProps {
  /** The number, in Persian digits, with unit (e.g. «۴۰٪»). */
  value: React.ReactNode;
  label: React.ReactNode;
  /** Where the number comes from (client, period). */
  source?: React.ReactNode;
  /** Show the «نمونه» badge. */
  sample?: boolean;
  className?: string;
  style?: React.CSSProperties;
}
export declare function Metric(props: MetricProps): JSX.Element;
