import { poppinsFont, linoirritFont } from "../lib/fonts";
import "./globals.css";

export const metadata = {
  title: "Luxo Dashboard",
  description: "Admin and seller dashboard platform",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${poppinsFont.variable} ${linoirritFont.variable} h-full antialiased`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
