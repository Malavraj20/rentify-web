import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'outline' | 'underlined'
  type?: HTMLInputElement['type']
}

const Input: React.FC<InputProps> = ({
  variant = 'default',
  type = 'text',
  className,
  ...props
}) => {
  const baseClasses =
    'block w-full rounded-xl border border-rentify-borderDefault bg-white px-4 py-2.5 text-base text-rentify-navy shadow-sm transition-colors placeholder:text-rentify-grayMuted/60 hover:border-rentify-lightNavy focus:border-rentify-navy focus:outline-none focus:ring-2 focus:ring-rentify-purpleLight disabled:cursor-not-allowed disabled:opacity-50'

  const outlineClasses = 'border-rentify-navy/40'

  const underlinedClasses =
    'rounded-none border-0 border-b-2 border-rentify-borderDefault px-0 shadow-none focus:border-rentify-navy focus:ring-0'

  const classes = {
    default: baseClasses,
    outline: `${baseClasses} ${outlineClasses}`,
    underlined: `${baseClasses} ${underlinedClasses}`,
  }[variant]

  return (
    <input
      type={type}
      className={`${classes} ${className || ''}`}
      {...props}
    />
  )
}

export { Input }
export type { InputProps }
