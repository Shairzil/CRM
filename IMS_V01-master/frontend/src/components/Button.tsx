import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'back' | 'dashboard' | 'action';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'action', children, className = '', ...props }) => {
  let colorClasses = '';

  if (variant === 'back') {
    colorClasses = 'bg-red-500 hover:bg-red-600';
  } else if (variant === 'dashboard') {
    colorClasses = 'bg-[#202132] hover:bg-[#303248]';
  } else {
    colorClasses = 'bg-[#ff9a7e] hover:bg-[#f28d7e] !text-[#202132]';
  }

  return (
    <button
      className={`btn-pop px-6 py-2.5 rounded-lg font-bold text-white text-center select-none shadow-md outline-none transition-all duration-200 ease-in-out cursor-pointer ${colorClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
