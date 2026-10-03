import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata={title:'CheatFile — Share. Code. Download.',description:'Send files up to 5GB with a simple 4-digit code. Transfers expire after 1 hour.',robots:{index:true,follow:true},openGraph:{title:'CheatFile — Share. Code. Download.',description:'Temporary file transfer with a 4-digit code.'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
