import React from 'react'
import { formatWhatsAppUrl } from '../utils/whatsapp.js'

function WhatsAppIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M17.507 14.307l-.009.075c-.244.978-.853 1.768-1.744 2.261-.634.351-1.36.529-2.115.52-1.04-.012-2.096-.282-3.082-.825-1.921-1.057-3.486-2.616-4.545-4.536-.543-.986-.813-2.043-.825-3.083-.009-.755.169-1.481.52-2.115.493-.891 1.283-1.5 2.261-1.744l.075-.009c.319-.079.658-.028.938.143l1.83 1.121c.361.221.57.618.539 1.042l-.176 2.378c-.027.362-.234.68-.553.847l-.768.404c.548 1.157 1.488 2.096 2.645 2.645l.404-.768c.167-.319.485-.526.847-.553l2.378-.176c.424-.031.821.178 1.042.539l1.121 1.83c.171.28.222.619.143.938z" fill="none" stroke="currentColor" strokeWidth="0" />
      <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.947.558 3.766 1.527 5.309L2.1 22.036l4.869-1.408c1.493.896 3.238 1.412 5.035 1.412 5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm0 18.257c-1.614 0-3.178-.456-4.533-1.32l-.326-.208-2.885.834.835-2.836-.226-.351c-.961-1.492-1.47-3.234-1.47-5.012 0-4.664 3.795-8.459 8.605-8.459 4.81 0 8.605 3.795 8.605 8.459 0 4.664-3.795 8.459-8.605 8.459zm4.721-6.287c-.259-.13-1.533-.757-1.771-.843-.238-.087-.411-.13-.584.13-.173.259-.67 8.43-.822 1.016-.151.173-.303.195-.562.065-.259-.13-1.096-.404-2.088-1.288-.772-.688-1.293-1.538-1.444-1.797-.151-.259-.016-.399.113-.528.117-.116.259-.303.389-.454.13-.151.173-.259.259-.432.087-.173.043-.325-.022-.454-.065-.13-.584-1.406-.8-1.926-.211-.507-.425-.438-.584-.446l-.497-.008c-.173 0-.454.065-.692.325-.238.259-.908.887-.908 2.164 0 1.277.93 2.51 1.06 2.683.13.173 1.83 2.795 4.433 3.92.619.268 1.103.428 1.48.548.622.198 1.189.17 1.636.103.499-.074 1.533-.627 1.749-1.233.216-.606.216-1.125.151-1.233-.065-.108-.238-.173-.497-.303z" />
    </svg>
  )
}

/**
 * Reusable WhatsApp button that directs the user straight to WhatsApp (wa.me)
 * with a pre-filled contextual message.
 */
export default function WhatsAppButton({
  phone,
  message = '',
  label = 'WhatsApp',
  title = 'Chat on WhatsApp',
  variant = 'solid', // 'solid' | 'outline' | 'compact' | 'pill'
  size = 'sm', // 'xs' | 'sm' | 'md'
  className = '',
  disabled = false,
}) {
  const url = formatWhatsAppUrl(phone, message)

  function handleClick(e) {
    e.stopPropagation()
    if (!url || disabled) {
      e.preventDefault()
    }
  }

  const sizeClasses = {
    xs: 'px-2 py-1 text-[11px] gap-1',
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
  }[size] || 'px-2.5 py-1.5 text-xs gap-1.5'

  const iconSizes = {
    xs: 12,
    sm: 14,
    md: 16,
  }[size] || 14

  let variantClasses = ''
  if (variant === 'solid') {
    variantClasses = 'bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1da850] text-white shadow-sm font-semibold'
  } else if (variant === 'outline') {
    variantClasses = 'border border-[#25D366]/40 text-[#1da850] hover:bg-[#25D366]/10 active:bg-[#25D366]/20 font-medium'
  } else if (variant === 'compact') {
    variantClasses = 'bg-[#25D366]/10 text-[#1da850] hover:bg-[#25D366]/20 font-semibold rounded-md p-1.5'
  } else if (variant === 'pill') {
    variantClasses = 'bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full font-semibold shadow-sm'
  }

  if (!url || disabled) {
    return (
      <span
        title={!phone ? 'Phone number not available' : title}
        className={`inline-flex items-center justify-center rounded-md opacity-40 cursor-not-allowed select-none ${sizeClasses} ${variantClasses} ${className}`}
      >
        <WhatsAppIcon size={iconSizes} />
        {variant !== 'compact' && <span>{label}</span>}
      </span>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      title={title}
      className={`inline-flex items-center justify-center rounded-md transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
    >
      <WhatsAppIcon size={iconSizes} />
      {variant !== 'compact' && <span>{label}</span>}
    </a>
  )
}
