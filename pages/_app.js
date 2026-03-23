import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export default function MyApp({ Component, pageProps }) {
  return (
    <div className={inter.className}>
      <style jsx global>{`
        .faqSummary {
          cursor: pointer;
          font-weight: 700;
          color: #1e3a8a;
          font-size: 15px;
          line-height: 1.35;
          list-style: none;
          position: relative;
          padding-left: 25px;
          transition: all 0.2s ease-in-out;
        }
        
        .faqSummary::before {
          content: "+";
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          font-weight: bold;
          color: #2563eb;
          transition: transform 0.2s ease-in-out;
        }
        
        details[open] .faqSummary::before {
          content: "−";
          transform: translateY(-50%) rotate(0deg);
        }
        
        .faqSummary::-webkit-details-marker {
          display: none;
        }
      `}</style>
      <Component {...pageProps} />
    </div>
  );
}
