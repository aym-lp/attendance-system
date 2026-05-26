"use client";

import { useRef } from "react";

type LoginPanelProps = {
  pin: string;
  message: string;
  onPinChange: (value: string) => void;
  onLogin: (pinValue?: string) => void;
};

export function LoginPanel({ pin, message, onPinChange, onLogin }: LoginPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePinChange = (value: string) => {
    const normalized = value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
    onPinChange(normalized.replace(/\D/g, "").slice(0, 4));
  };

  const digits = pin.split("");
  const focusInput = () => inputRef.current?.focus();

  return (
    <section className="flex justify-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-center text-2xl font-bold text-[#6d4c41]">勤怠管理ログイン</h2>
        <div className="relative mt-6 flex justify-center gap-3" onClick={focusInput}>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`flex h-14 w-14 select-none items-center justify-center rounded-2xl border-2 text-2xl font-bold transition-colors ${
                index < digits.length
                  ? "border-[#6d4c41] bg-[#faf8f5] text-[#3e2723]"
                  : "border-[#d7ccc8] bg-white text-[#d7ccc8]"
              }`}
            >
              {digits[index] ? "●" : "-"}
            </div>
          ))}
          <input
            ref={inputRef}
            value={pin}
            onChange={(event) => handlePinChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onLogin(pin);
              }
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            maxLength={4}
          />
        </div>
        <button
          type="button"
          onClick={() => onLogin(pin)}
          onTouchEnd={(event) => {
            event.preventDefault();
            onLogin(pin);
          }}
          className="mt-4 h-16 w-full rounded-2xl bg-[#6d4c41] px-8 text-lg font-bold text-white shadow-sm active:scale-[0.99]"
        >
          ログイン
        </button>
        <p className="mt-4 text-center text-sm font-medium text-[#3e2723]">{message}</p>
      </div>
    </section>
  );
}
