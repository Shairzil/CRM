import React from 'react';

interface PhoneInputProps {
  label: string;
  countryCodeVal: string;
  onChangeCountryCode: (val: string) => void;
  phoneNumberVal: string;
  onChangePhoneNumber: (val: string) => void;
  error?: string;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  countryCodeVal,
  onChangeCountryCode,
  phoneNumberVal,
  onChangePhoneNumber,
  error,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="flex gap-2">
        {/* Country code selector */}
        <select
          value={countryCodeVal}
          onChange={(e) => onChangeCountryCode(e.target.value)}
          className="w-[110px] px-2 py-2 border border-gray-300 rounded-lg bg-white shadow-sm outline-none transition-all duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
        >
          <option value="+880">BD (+880)</option>
          <option value="+1">USA (+1)</option>
          <option value="+44">UK (+44)</option>
          <option value="+1">CAN (+1)</option>
          <option value="+61">AUS (+61)</option>
          <option value="+91">IND (+91)</option>
        </select>
        {/* Numeric phone input */}
        <input
          type="text"
          value={phoneNumberVal}
          onChange={(e) => {
            const val = e.target.value;
            // Force numeric validation
            if (val === '' || /^[0-9]+$/.test(val)) {
              onChangePhoneNumber(val);
            }
          }}
          placeholder="Phone Number (e.g. 1712345678)"
          className={`flex-1 px-3 py-2 border rounded-lg bg-white shadow-sm outline-none transition-all duration-150 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
      </div>
      {error && <span className="text-xs font-bold text-red-500 mt-0.5">{error}</span>}
    </div>
  );
};
