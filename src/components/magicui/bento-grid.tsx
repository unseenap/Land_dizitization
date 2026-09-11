import type { HTMLAttributes, ReactNode } from "react";

export function BentoGrid({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bento-grid ${className}`.trim()} {...props} />;
}

export function BentoCard({
  className = "",
  eyebrow,
  title,
  icon,
  children,
}: HTMLAttributes<HTMLElement> & {
  eyebrow?: string;
  title: string;
  icon?: ReactNode;
}) {
  return (
    <section className={`panel bento-card ${className}`.trim()}>
      <div className="bento-card-heading">
        <div>
          {eyebrow && <p className="bento-eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {icon && <span className="bento-icon">{icon}</span>}
      </div>
      {children}
    </section>
  );
}
