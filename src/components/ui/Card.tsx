import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

const Card: React.FC<CardProps> = ({
  header,
  footer,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`
        ${className}
        rounded-2xl border border-rentify-grayLight bg-white p-6 shadow-sm
      `}
      {...props}
    >
      {header && <div className="mb-4 flex flex-col gap-2">{header}</div>}
      {footer && <div className="mt-4 flex flex-col gap-2">{footer}</div>}
      <div className="flex-1">{props.children}</div>
    </div>
  )
}

export { Card }
export type { CardProps }
