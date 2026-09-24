import React from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  if (!isOpen) return null

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        bg-black/40 p-4 backdrop-blur-sm
        ${className}
      `}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="
          max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl
          border border-rentify-grayLight bg-white p-6 shadow-xl
        "
      >
        {title && (
          <div className="mb-4 flex items-center justify-between border-b border-rentify-grayLight pb-3">
            <h3 className="font-display text-lg font-semibold text-rentify-navy">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-rentify-deepNavy transition-colors hover:bg-rentify-purpleLight2 hover:text-rentify-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy"
              aria-label="Close modal"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        <div>{children}</div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-full bg-rentify-purpleLight px-4 text-sm font-semibold text-rentify-navy transition-colors hover:bg-rentify-purpleLight2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rentify-navy focus-visible:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export { Modal }
export type { ModalProps }
