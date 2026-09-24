import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'caution' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-rentify-purpleLight text-rentify-navy',
    success: 'bg-rentify-successGreen text-white',
    caution: 'bg-rentify-cautionOrange text-rentify-navy',
    destructive: 'bg-rentify-navy text-white',
  }

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold tracking-tight ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    />
  )
}

export { Badge }
export type { BadgeProps }
