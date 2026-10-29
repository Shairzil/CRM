import React from 'react';

interface PageHeaderProps {
  title?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title }) => {
  return (
    <div className="w-full flex flex-col items-center justify-center py-6 mb-6">
      <h1 className="text-3xl font-extrabold text-[#bd6655] tracking-wider select-none uppercase">
        NextEd Advisors
      </h1>
      {title && (
        <h2 className="text-xl font-bold text-[#535568] mt-1 select-none">
          {title}
        </h2>
      )}
    </div>
  );
};
