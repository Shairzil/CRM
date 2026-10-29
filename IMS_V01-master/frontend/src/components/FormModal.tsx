'use client';

import React from 'react';
import { X } from 'lucide-react';

interface FormModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}

/** A modal that holds a form or any custom content (the existing Modal only shows a message). */
export const FormModal: React.FC<FormModalProps> = ({ isOpen, title, onClose, children, wide = false }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto border border-gray-100 animate-in fade-in zoom-in duration-200`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
