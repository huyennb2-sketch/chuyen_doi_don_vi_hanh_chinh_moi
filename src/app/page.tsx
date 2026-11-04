"use client";

import { useState, useCallback } from "react";

interface ConvertResult {
  input: string;
  direction: "new_to_old" | "old_to_new";
  result: {
    commune_code: string;
    commune: string;
    district?: string;
    province: string;
  } | null;
  original: {
    commune: string;
    district?: string;
    province: string;
  } | null;
  candidates?: Array<{
    commune_code: string;
    commune: string;
    district?: string;
    province: string;
    score: number;
  }>;
  error?: string;
}

export default function Home() {
  const [direction, setDirection] = useState<"new_to_old" | "old_to_new">(
    "new_to_old"
  );
  const [input, setInput] = useState("");
  const [results, setResults] = useState<ConvertResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const handleConvert = useCallback(async () => {
    if (!input.trim()) return;

    setLoading(true);
    setResults([]);

    const lines = input
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    try {
      const promises = lines.map((line) =>
        fetch(
          `/api/convert?text=${encodeURIComponent(line)}&direction=${direction}`
        ).then((r) => r.json())
      );
      const data = await Promise.all(promises);
      setResults(data);
    } catch {
      setResults([
        {
          input,
          direction,
          result: null,
          original: null,
          error: "Lỗi kết nối server",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, direction]);

  const copyResult = useCallback((idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const formatResult = (r: ConvertResult): string => {
    if (!r.result) return "Không tìm thấy";
    if (r.result.district) {
      return `${r.result.commune}, ${r.result.district}, ${r.result.province}`;
    }
    return `${r.result.commune}, ${r.result.province}`;
  };

  return (
    <>
      <header className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Chuyển đổi Địa chỉ Hành chính Việt Nam
          </h1>
          <p className="mt-2" style={{ color: "var(--muted)" }}>
            Chuyển đổi giữa hệ <strong>2 cấp mới</strong> (34 tỉnh, từ
            01/07/2025) và hệ <strong>3 cấp cũ</strong> (63 tỉnh). Hỗ trợ
            paste nhiều dòng.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 flex-1">
        {/* Direction Toggle */}
        <section aria-label="Chọn chiều chuyển đổi">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setDirection("new_to_old")}
              className="flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-colors cursor-pointer"
              style={{
                background:
                  direction === "new_to_old"
                    ? "var(--primary)"
                    : "var(--secondary)",
                color:
                  direction === "new_to_old" ? "#fff" : "var(--foreground)",
                border: `1px solid ${direction === "new_to_old" ? "var(--primary)" : "var(--border)"}`,
              }}
            >
              2 cấp → 3 cấp (Mới → Cũ)
            </button>
            <button
              onClick={() => setDirection("old_to_new")}
              className="flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-colors cursor-pointer"
              style={{
                background:
                  direction === "old_to_new"
                    ? "var(--primary)"
                    : "var(--secondary)",
                color:
                  direction === "old_to_new" ? "#fff" : "var(--foreground)",
                border: `1px solid ${direction === "old_to_new" ? "var(--primary)" : "var(--border)"}`,
              }}
            >
              3 cấp → 2 cấp (Cũ → Mới)
            </button>
          </div>
        </section>

        {/* Input */}
        <section aria-label="Nhập địa chỉ">
          <label htmlFor="address-input" className="block font-medium mb-2">
            {direction === "new_to_old"
              ? "Nhập địa chỉ 2 cấp mới (VD: Phường Cẩm Phả, Quảng Ninh)"
              : "Nhập địa chỉ 3 cấp cũ (VD: Phường Cẩm Trung, TP Cẩm Phả, Quảng Ninh)"}
          </label>
          <textarea
            id="address-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              direction === "new_to_old"
                ? "Phường Cẩm Phả, Quảng Ninh\nPhường Đông Triều, Quảng Ninh\n..."
                : "Phường Cẩm Trung, TP Cẩm Phả, Quảng Ninh\nTT Mạo Khê, Đông Triều, Quảng Ninh\n..."
            }
            rows={5}
            className="w-full rounded-lg p-3 text-sm resize-y"
            style={{
              background: "var(--secondary)",
              border: "1px solid var(--border)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleConvert();
              }
            }}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              Mỗi dòng = 1 địa chỉ. Nhấn Ctrl+Enter để chuyển đổi.
            </span>
            <button
              onClick={handleConvert}
              disabled={loading || !input.trim()}
              className="px-6 py-2.5 rounded-lg font-medium text-white text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--primary)" }}
            >
              {loading ? "Đang xử lý..." : "Chuyển đổi"}
            </button>
          </div>
        </section>

        {/* Results */}
        {results.length > 0 && (
          <section aria-label="Kết quả chuyển đổi" className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Kết quả</h2>
            <div className="space-y-3">
              {results.map((r, idx) => (
                <div
                  key={idx}
                  className="rounded-lg p-4"
                  style={{
                    background: "var(--secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs mb-1"
                        style={{ color: "var(--muted)" }}
                      >
                        Đầu vào
                      </div>
                      <div className="text-sm mb-2">{r.input}</div>

                      {r.error ? (
                        <div
                          className="text-sm font-medium"
                          style={{ color: "var(--error)" }}
                        >
                          {r.error}
                        </div>
                      ) : r.result ? (
                        <>
                          <div
                            className="text-xs mb-1"
                            style={{ color: "var(--muted)" }}
                          >
                            Kết quả ({r.result.commune_code})
                          </div>
                          <div
                            className="text-sm font-semibold"
                            style={{ color: "var(--success)" }}
                          >
                            {formatResult(r)}
                          </div>
                        </>
                      ) : (
                        <div
                          className="text-sm"
                          style={{ color: "var(--error)" }}
                        >
                          Không tìm thấy kết quả phù hợp
                        </div>
                      )}
                    </div>

                    {r.result && (
                      <button
                        onClick={() => copyResult(idx, formatResult(r))}
                        className="shrink-0 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer"
                        style={{
                          background:
                            copied === idx
                              ? "var(--success)"
                              : "var(--primary)",
                          color: "#fff",
                        }}
                      >
                        {copied === idx ? "Đã copy!" : "Copy"}
                      </button>
                    )}
                  </div>

                  {r.candidates && r.candidates.length > 1 && (
                    <details className="mt-3">
                      <summary
                        className="text-xs cursor-pointer"
                        style={{ color: "var(--muted)" }}
                      >
                        Xem {r.candidates.length} kết quả gần đúng khác
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {r.candidates.slice(1).map((c, ci) => (
                          <li
                            key={ci}
                            className="text-xs"
                            style={{ color: "var(--muted)" }}
                          >
                            [{c.commune_code}] {c.commune}
                            {c.district ? `, ${c.district}` : ""},{" "}
                            {c.province}{" "}
                            <span className="opacity-60">({c.score}%)</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ))}
            </div>

            {results.length > 1 && results.some((r) => r.result) && (
              <button
                onClick={() => {
                  const text = results.map((r) => formatResult(r)).join("\n");
                  navigator.clipboard.writeText(text);
                  setCopied(-1);
                  setTimeout(() => setCopied(null), 2000);
                }}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
                style={{
                  background:
                    copied === -1 ? "var(--success)" : "var(--primary)",
                }}
              >
                {copied === -1 ? "Đã copy tất cả!" : "Copy tất cả kết quả"}
              </button>
            )}
          </section>
        )}

        {/* API Documentation */}
        <section className="mt-16" aria-label="Tài liệu API">
          <h2 className="text-xl font-bold mb-4">API cho nhà phát triển</h2>
          <p className="mb-4" style={{ color: "var(--muted)" }}>
            Tích hợp chuyển đổi địa chỉ vào hệ thống của bạn (vận chuyển,
            TMĐT, ERP...) với các endpoint sau:
          </p>

          <div className="space-y-4">
            <ApiEndpoint
              method="GET"
              path="/api/convert?text=...&direction=new_to_old"
              desc="Chuyển đổi địa chỉ. direction: new_to_old hoặc old_to_new"
            />
            <ApiEndpoint
              method="GET"
              path="/api/lookup?code=06793"
              desc="Tra cứu theo mã xã — trả về thông tin cả 2 hệ"
            />
            <ApiEndpoint
              method="GET"
              path="/api/search?q=Cẩm+Phả"
              desc="Tìm kiếm fuzzy trong cả 2 hệ"
            />
            <ApiEndpoint
              method="GET"
              path="/api/provinces?system=new"
              desc="Danh sách tỉnh. system: new (34 tỉnh), old (63 tỉnh), both"
            />
          </div>

          <div
            className="mt-6 rounded-lg p-4"
            style={{
              background: "var(--secondary)",
              border: "1px solid var(--border)",
            }}
          >
            <h3 className="font-semibold text-sm mb-2">Ví dụ response</h3>
            <pre
              className="text-xs overflow-x-auto"
              style={{ fontFamily: "var(--font-mono), monospace" }}
            >
              {JSON.stringify(
                {
                  input: "phường Cẩm Phả, Quảng Ninh",
                  direction: "new_to_old",
                  result: {
                    commune_code: "06793",
                    commune: "Phường Cẩm Trung",
                    district: "Thành phố Cẩm Phả",
                    province: "Tỉnh Quảng Ninh",
                  },
                  original: {
                    commune: "Phường Cẩm Phả",
                    province: "Tỉnh Quảng Ninh",
                  },
                },
                null,
                2
              )}
            </pre>
          </div>
        </section>

        {/* SEO Content */}
        <section className="mt-16" aria-label="Giới thiệu">
          <h2 className="text-xl font-bold mb-4">
            Về cải cách địa chỉ hành chính 2025
          </h2>
          <div style={{ color: "var(--muted)" }}>
            <p>
              Từ ngày <strong>01/07/2025</strong>, Việt Nam chính thức thực hiện
              cải cách hành chính, sáp nhập từ <strong>63 tỉnh/thành</strong>{" "}
              xuống <strong>34 tỉnh/thành</strong>, đồng thời chuyển từ hệ
              thống <strong>3 cấp</strong> (Tỉnh → Huyện → Xã) sang hệ thống{" "}
              <strong>2 cấp</strong> (Tỉnh → Xã/Phường).
            </p>
            <p className="mt-3">
              Tuy nhiên, hầu hết các hệ thống vận chuyển và thương mại điện tử
              (GHTK, GHN, Shopee, TikTok Shop, SuperAI...) vẫn sử dụng hệ 3
              cấp cũ. Điều này gây ra vấn đề khi khách hàng gửi địa chỉ theo
              hệ mới nhưng hệ thống yêu cầu địa chỉ cũ.
            </p>
            <p className="mt-3">
              Công cụ này giúp chuyển đổi tự động giữa 2 hệ thống, hỗ trợ cả
              giao diện web lẫn API để tích hợp vào phần mềm quản lý bán hàng,
              hệ thống tạo đơn vận chuyển và các ứng dụng TMĐT.
            </p>
          </div>
        </section>
      </main>

      <footer
        className="border-t mt-auto py-6"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="max-w-4xl mx-auto px-4 text-center text-xs"
          style={{ color: "var(--muted)" }}
        >
          <p>
            Dữ liệu từ{" "}
            <a
              href="https://danhmuchanhchinh.nso.gov.vn"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--primary)" }}
            >
              Cục Thống kê Việt Nam
            </a>{" "}
            qua Cas AddressKit API. Cập nhật tự động.
          </p>
        </div>
      </footer>
    </>
  );
}

function ApiEndpoint({
  method,
  path,
  desc,
}: {
  method: string;
  path: string;
  desc: string;
}) {
  return (
    <div
      className="rounded-lg p-3 flex items-start gap-3"
      style={{
        background: "var(--secondary)",
        border: "1px solid var(--border)",
      }}
    >
      <span
        className="shrink-0 px-2 py-0.5 rounded text-xs font-bold"
        style={{ background: "var(--primary)", color: "#fff" }}
      >
        {method}
      </span>
      <div>
        <code
          className="text-sm break-all"
          style={{ fontFamily: "var(--font-mono), monospace" }}
        >
          {path}
        </code>
        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          {desc}
        </p>
      </div>
    </div>
  );
}
