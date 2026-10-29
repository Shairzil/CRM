import React from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, message, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6 flex flex-col gap-4 border border-gray-100 animate-in fade-in zoom-in duration-200">
        <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-3">{title}</h3>
        <p className="text-sm font-semibold text-gray-600 leading-relaxed">{message}</p>
        <div className="flex justify-end mt-2">
          <Button variant="action" onClick={onConfirm} className="px-8 py-2">
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};
