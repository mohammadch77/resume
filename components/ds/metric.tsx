export type MetricProps = {
  /** The number, in Persian digits, with unit (e.g. «۴۰٪»). */
  value: React.ReactNode;
  label: React.ReactNode;
  /** Where the number comes from (client, period). */
  source?: React.ReactNode;
  /** Show the «نمونه» badge. */
  sample?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/** Result figure: stat numeral, label, source line, hairline top rule. Never ship without a real source. */
export function Metric({ value, label, source, sample = false, className = "", style }: MetricProps) {
  return (
    <div className={["gw-metric", className].filter(Boolean).join(" ")} style={style}>
      <p className="gw-metric__value">{value}</p>
      <p className="gw-metric__label">{label}</p>
      {(source || sample) && (
        <p className="gw-metric__source">
          {sample && <span className="gw-sample">نمونه</span>}
          {source}
        </p>
      )}
    </div>
  );
}
