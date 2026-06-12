import type * as React from 'react';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={className}>
      {icon}
      <p>{title}</p>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export { EmptyState };
