const faIndex = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });

/** One line of the services list: index, name, a sentence. Static: a service has no page of its own, so the row does not look clickable. */
export function ServiceRow({ index, title, summary }: { index: number; title: string; summary: string }) {
  return (
    <li className="lm-service">
      <span className="lm-service__index">{faIndex.format(index)}</span>
      <h3 className="lm-service__title">{title}</h3>
      <p className="lm-service__text">{summary}</p>
    </li>
  );
}
