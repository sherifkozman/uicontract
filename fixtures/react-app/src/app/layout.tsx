import NavigationMenu from '../components/NavigationMenu';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavigationMenu />
        <main>{children}</main>
      </body>
    </html>
  );
}
