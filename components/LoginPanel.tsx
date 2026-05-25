"use client";

type LoginPanelProps = {
  pin: string;
  message: string;
  onPinChange: (value: string) => void;
  onLogin: (pinValue?: string) => void;
};

export function LoginPanel({ pin, message, onPinChange, onLogin }: LoginPanelProps) {
  const handlePinChange = (value: string) => {
    const normalized = value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
    onPinChange(normalized.replace(/\D/g, "").slice(0, 6));
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-[#6d4c41]">PINログイン</h2>
        <p className="mt-2 text-[#8d6e63]">スタッフ別の4桁PINでログインします。</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
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
            className="h-16 flex-1 rounded-2xl border border-[#d7ccc8] px-5 text-center text-3xl font-bold tracking-[0.35em] outline-none focus:border-[#6d4c41] focus:ring-4 focus:ring-[#d7ccc8] text-[#3e2723]"
            placeholder="----"
          />
          <button
            type="button"
            onClick={() => onLogin(pin)}
            onTouchEnd={(event) => {
              event.preventDefault();
              onLogin(pin);
            }}
            className="h-16 rounded-2xl bg-[#6d4c41] px-8 text-lg font-bold text-white shadow-sm active:scale-[0.99]"
          >
            ログイン
          </button>
        </div>
        <div className="mt-4 rounded-2xl bg-[#d7ccc8] px-4 py-3 text-sm text-[#3e2723]">
          <p>{message}</p>
          <p className="mt-1 font-semibold text-[#3e2723]">入力中PIN：{pin || "未入力"}</p>
        </div>
      </div>

      <div className="rounded-3xl bg-[#6d4c41] p-6 text-white shadow-sm sm:p-8">
        <h2 className="text-xl font-bold">デモPIN</h2>
        <div className="mt-4 space-y-3 text-sm">
          <p className="rounded-2xl bg-white/20 p-4">スタッフ：1111 / 2222</p>
          <p className="rounded-2xl bg-white/20 p-4">管理者：9999</p>
        </div>
      </div>
    </section>
  );
}
