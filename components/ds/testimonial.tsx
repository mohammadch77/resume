export type TestimonialProps = {
  quote: React.ReactNode;
  /** Real person's name (with permission). */
  name: React.ReactNode;
  /** Role and company. */
  role?: React.ReactNode;
  sample?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/** Client quote with a 4px saffron rule on the inline-start edge. The saffron moment of its screen area. */
export function Testimonial({ quote, name, role, sample = false, className = "", style }: TestimonialProps) {
  return (
    <figure className={["gw-quote", className].filter(Boolean).join(" ")} style={style}>
      <blockquote className="gw-quote__text">
        <p style={{ margin: 0 }}>{quote}</p>
      </blockquote>
      <figcaption className="gw-quote__by">
        <span className="gw-quote__name">{name}</span>
        {role && <span className="gw-quote__role">{role}</span>}
        {sample && <span className="gw-sample">نمونه</span>}
      </figcaption>
    </figure>
  );
}
