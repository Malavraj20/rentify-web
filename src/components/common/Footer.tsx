import React from 'react'

interface FooterProps {
  children?: React.ReactNode
  className?: string
}

const Footer: React.FC<FooterProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <footer
      className={`border-t border-rentify-grayLight bg-white py-10 text-sm text-rentify-grayMuted ${className}`}
      {...props}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </footer>
  )
}

export { Footer }
export type { FooterProps }
