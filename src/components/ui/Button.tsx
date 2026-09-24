import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) => {
  const variantClasses = {
    primary:
      'bg-rentify-navy text-white shadow-sm hover:bg-rentify-lightNavy hover:shadow-md',
    secondary:
      'bg-rentify-purpleLight text-rentify-navy shadow-sm hover:bg-rentify-purpleLight2',
    ghost: 'text-rentify-navy hover:bg-rentify-purpleLight2',
    outline:
      'border border-rentify-navy/30 bg-white text-rentify-navy hover:border-rentify-navy hover:bg-rentify-purpleLight',
  }

  const sizeStyles = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-10 px-5 text-sm',
    lg: 'h-12 px-7 text-base',
  }

  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

  const sizeClass = sizeStyles[size] || sizeStyles.md

  const mergedClassName = `${baseClasses} ${variantClasses[variant]} ${sizeClass} ${className || ''}`.trim()

  return (
    <button type={type} className={mergedClassName} {...props} />
  )
}

export { Button }
export type { ButtonProps }
