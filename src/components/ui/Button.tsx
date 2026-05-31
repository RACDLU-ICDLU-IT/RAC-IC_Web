import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'outline-dark';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:pointer-events-none rounded-[var(--radius-button)]';
    
    const variants = {
      // Pink bg, white text — works on both light and dark page backgrounds
      primary: 'bg-[var(--color-accent)] text-white hover:opacity-90 shadow-lg',

      // White bg, dark text — for use on colored/dark sections
      secondary: 'bg-white text-gray-900 hover:bg-gray-100',

      // For use ON DARK/PINK backgrounds (hero, footer, join page)
      // White border + white text, works on pink or dark bg
      outline: 'border-2 border-white/30 text-white hover:bg-white/10',

      // For use ON WHITE/LIGHT backgrounds (cards, content sections)
      // Pink border + pink text
      'outline-dark': 'border-2 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white',

      // For use ON DARK/PINK backgrounds only
      ghost: 'text-white hover:text-[var(--color-accent)]',
    };

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-12 px-6 text-base',
      lg: 'h-14 px-8 text-lg uppercase tracking-wide',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
