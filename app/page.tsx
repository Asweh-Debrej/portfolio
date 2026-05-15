import { DesktopRoot } from "@/components/os/DesktopRoot";

/**
 * Root route - renders the desktop with no auto-opened window.
 * Visitors land on a clean wallpaper + taskbar.
 */
export default function HomePage() {
  return <DesktopRoot />;
}
