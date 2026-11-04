import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chuyển đổi Địa chỉ Hành chính Việt Nam | 2 cấp ↔ 3 cấp",
  description:
    "Công cụ chuyển đổi địa chỉ hành chính Việt Nam giữa hệ 2 cấp mới (34 tỉnh, từ 01/07/2025) và hệ 3 cấp cũ (63 tỉnh). Hỗ trợ tra cứu xã, phường, quận, huyện, tỉnh. API miễn phí cho tích hợp hệ thống.",
  keywords: [
    "chuyển đổi địa chỉ hành chính",
    "địa chỉ hành chính Việt Nam",
    "2 cấp sang 3 cấp",
    "3 cấp sang 2 cấp",
    "cải cách hành chính 2025",
    "sáp nhập tỉnh",
    "34 tỉnh mới",
    "63 tỉnh cũ",
    "tra cứu xã phường",
    "API địa chỉ Việt Nam",
    "chuyển đổi địa chính",
    "mapping địa chỉ",
    "GHTK GHN Shopee địa chỉ",
  ],
  openGraph: {
    title: "Chuyển đổi Địa chỉ Hành chính Việt Nam | 2 cấp ↔ 3 cấp",
    description:
      "Công cụ chuyển đổi địa chỉ hành chính Việt Nam giữa hệ 2 cấp mới và 3 cấp cũ. API miễn phí cho tích hợp hệ thống vận chuyển, TMĐT.",
    type: "website",
    locale: "vi_VN",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Chuyển đổi Địa chỉ Hành chính Việt Nam",
              description:
                "Công cụ chuyển đổi địa chỉ hành chính Việt Nam giữa hệ 2 cấp mới (34 tỉnh) và hệ 3 cấp cũ (63 tỉnh)",
              applicationCategory: "UtilityApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "VND",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
