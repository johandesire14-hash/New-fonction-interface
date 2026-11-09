import React, { Component, ErrorInfo, ReactNode, StrictMode } from "react";
import { getAppTheme, setAppTheme, THEME_CHANGE_EVENT } from "./utils/theme";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class RootErrorBoundary extends React.Component<Props, State> {
  override state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#2A2929] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-2xl bg-[#0e1015] border border-white/10 space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Une erreur est survenue</h2>
            <p className="text-sm text-white/60">
              L'application a rencontré un imprévu lors du chargement.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-[#00D26A] text-black font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ViewportMetrics() {
  React.useEffect(() => {
    const root = document.documentElement;
    const updateViewportMetrics = () => {
      const viewport = window.visualViewport;
      const height = viewport?.height || window.innerHeight;
      const keyboardOffset = Math.max(0, window.innerHeight - height - (viewport?.offsetTop || 0));
      root.style.setProperty("--mansa-viewport-height", `${height}px`);
      root.style.setProperty("--mansa-keyboard-offset", `${keyboardOffset}px`);
    };

    updateViewportMetrics();
    window.addEventListener("resize", updateViewportMetrics, { passive: true });
    window.visualViewport?.addEventListener("resize", updateViewportMetrics, { passive: true });
    window.visualViewport?.addEventListener("scroll", updateViewportMetrics, { passive: true });
    return () => {
      window.removeEventListener("resize", updateViewportMetrics);
      window.visualViewport?.removeEventListener("resize", updateViewportMetrics);
      window.visualViewport?.removeEventListener("scroll", updateViewportMetrics);
    };
  }, []);

  return null;
}

export default function MansaRoot({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = React.useState(true);

  React.useEffect(() => {
    const applyTheme = (theme: "dark" | "light") => {
      const dark = theme === "dark";
      const background = dark ? "#0f1012" : "#ffffff";
      setIsDark(dark);
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.style.colorScheme = theme;
      document.documentElement.style.backgroundColor = background;
      document.body.style.backgroundColor = background;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", background);
    };
    applyTheme(getAppTheme());
    const handleThemeChange = (event: Event) => {
      const theme = (event as CustomEvent<"dark" | "light">).detail;
      applyTheme(theme === "light" ? "light" : "dark");
    };
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  }, []);

  return (
    <RootErrorBoundary>
      <div
        className={`mansa-palette min-h-screen${isDark ? " mansa-dark" : ""}`}
        style={{ minHeight: "100dvh", backgroundColor: isDark ? "#0f1012" : "#ffffff" }}
      >
        <ViewportMetrics />
        {children}
      </div>
    </RootErrorBoundary>
  );
}
