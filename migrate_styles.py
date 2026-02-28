import re

with open("src/styles.css", "r", "utf-8") as f:
    css = f.read()

# 1. Add Geist Sans import
if "family=Geist+Sans" not in css:
    css = css.replace(
        "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans",
        "@import url('https://fonts.googleapis.com/css2?family=Geist+Sans:wght@400;500;600;700&display=swap');\n@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans"
    )

# 2. Add the new tokens block
new_tokens = """
:root {
  /* NEW GEIST DESIGN TOKENS */
  --color-background-base: #FAFAF9;
  --color-background-elevated: #FFFFFF;
  --color-background-subtle: #F5F4F3;
  --color-text-primary: #18181B;
  --color-text-secondary: #52525B;
  --color-text-tertiary: #A1A1AA;
  --color-border-base: rgba(0, 0, 0, 0.06);
  --color-border-strong: rgba(0, 0, 0, 0.12);
  --color-border-accent: rgba(0, 0, 0, 0.08);
  --color-accent-base: #0070F3;
  --color-accent-hover: #0761D1;
  --color-accent-subtle: rgba(0, 112, 243, 0.10);
  --color-accent-text: #0070F3;
  --color-success-bg: rgba(5, 150, 105, 0.10);
  --color-success-border: #059669;
  --color-success-text: #059669;
  --color-warning-bg: rgba(217, 119, 6, 0.10);
  --color-warning-border: #D97706;
  --color-warning-text: #D97706;
  --color-danger-bg: rgba(220, 38, 38, 0.10);
  --color-danger-border: #DC2626;
  --color-danger-text: #DC2626;
  --color-info-bg: rgba(0, 112, 243, 0.10);
  --color-info-border: #0070F3;
  --color-info-text: #0070F3;
  --font-family-base: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --line-height-xs: 16px;
  --line-height-sm: 20px;
  --line-height-base: 24px;
  --line-height-lg: 28px;
  --line-height-xl: 28px;
  --line-height-2xl: 32px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --letter-spacing-tight: -0.01em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.05em;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-focus: 0 0 0 3px rgba(0, 112, 243, 0.20);
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
  --ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0.0, 1, 1);
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}

body.dark-mode {
  --color-background-base: #0A0A0A;
  --color-background-elevated: #151515;
  --color-background-subtle: #1F1F1F;
  --color-text-primary: #FAFAF9;
  --color-text-secondary: #A1A1AA;
  --color-text-tertiary: #71717A;
  --color-border-base: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.15);
  --color-border-accent: rgba(255, 255, 255, 0.12);
  --color-accent-base: #3291FF;
  --color-accent-hover: #5BA3FF;
  --color-accent-subtle: rgba(50, 145, 255, 0.15);
  --color-accent-text: #3291FF;
  --color-success-bg: rgba(16, 185, 129, 0.15);
  --color-success-border: #10B981;
  --color-success-text: #10B981;
  --color-warning-bg: rgba(245, 158, 11, 0.15);
  --color-warning-border: #F59E0B;
  --color-warning-text: #F59E0B;
  --color-danger-bg: rgba(239, 68, 68, 0.15);
  --color-danger-border: #EF4444;
  --color-danger-text: #EF4444;
  --color-info-bg: rgba(50, 145, 255, 0.15);
  --color-info-border: #3291FF;
  --color-info-text: #3291FF;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.8), 0 2px 6px rgba(0, 0, 0, 0.4);
  --shadow-focus: 0 0 0 3px rgba(50, 145, 255, 0.30);
}
"""
css = new_tokens + "\n\n" + css

# 3. Modify base styles
base_styles = """
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-primary);
  background-color: var(--color-background-base);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html {
  scroll-behavior: smooth;
}

button, a, input, select, textarea {
  transition: all var(--duration-fast) var(--ease-standard);
}
"""
css += "\n\n/* OVERRIDDEN VERCEL BASE STYLES */\n" + base_styles

# 4. Container layout
layout_styles = """
.app-main,
.page,
.main-content,
[class*="content-wrapper"] {
  max-width: 1200px !important;
  margin: 0 auto;
  padding: var(--space-12) var(--space-6) !important;
}
@media (max-width: 768px) {
  .app-main,
  .page,
  .main-content,
  [class*="content-wrapper"] {
    padding: var(--space-6) var(--space-4) !important;
  }
}
"""
css += "\n\n/* OVERRIDDEN LAYOUT */\n" + layout_styles

# 5. Global components
component_styles = """
/* Buttons */
button[class*="primary"],
.btn-primary,
button[class*="accent"] {
  background-color: var(--color-accent-base) !important;
  color: #FFFFFF !important;
  border: none !important;
  border-radius: var(--radius-md) !important;
  padding: 10px 20px !important;
  font-size: var(--font-size-sm) !important;
  font-weight: var(--font-weight-medium) !important;
  cursor: pointer;
}
button[class*="primary"]:hover,
.btn-primary:hover,
button[class*="accent"]:hover {
  background-color: var(--color-accent-hover) !important;
  transform: translateY(-1px);
}
button[class*="primary"]:active,
.btn-primary:active,
button[class*="accent"]:active {
  transform: translateY(0);
}

button[class*="secondary"],
.btn-secondary {
  background-color: transparent !important;
  color: var(--color-text-primary) !important;
  border: 1px solid var(--color-border-strong) !important;
  border-radius: var(--radius-md) !important;
  padding: 10px 20px !important;
  font-size: var(--font-size-sm) !important;
  font-weight: var(--font-weight-medium) !important;
}
button[class*="secondary"]:hover,
.btn-secondary:hover {
  background-color: var(--color-background-subtle) !important;
}

button[class*="ghost"],
.btn-ghost {
  background-color: transparent !important;
  color: var(--color-text-secondary) !important;
  border: none !important;
  border-radius: var(--radius-md) !important;
  padding: 10px 20px !important;
  font-size: var(--font-size-sm) !important;
  font-weight: var(--font-weight-medium) !important;
}
button[class*="ghost"]:hover,
.btn-ghost:hover {
  background-color: var(--color-background-subtle) !important;
  color: var(--color-text-primary) !important;
}

button[class*="icon"]:not(.twc-nav-btn):not(.today-geist-ghost-btn),
.btn-icon {
  background-color: transparent;
  color: var(--color-text-secondary);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
}
button[class*="icon"]:not(.twc-nav-btn):not(.today-geist-ghost-btn):hover,
.btn-icon:hover {
  background-color: var(--color-background-subtle);
  color: var(--color-text-primary);
}

button[class*="danger"],
.btn-danger {
  background-color: var(--color-danger-text) !important;
  color: #FFFFFF !important;
  border: none !important;
  border-radius: var(--radius-md) !important;
  padding: 10px 20px !important;
  font-size: var(--font-size-sm) !important;
  font-weight: var(--font-weight-medium) !important;
}
button[class*="danger"]:hover,
.btn-danger:hover {
  background-color: #B91C1C !important;
  transform: translateY(-1px);
}
button:disabled {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
  transform: none !important;
}

/* Cards */
[class*="card"]:not(.spo-card):not(.twc-card):not(.hsc-card),
.card {
  background-color: var(--color-background-elevated) !important;
  border: 1px solid var(--color-border-base) !important;
  border-radius: var(--radius-lg) !important;
  padding: var(--space-6);
  box-shadow: var(--shadow-sm) !important;
}
[class*="card"][class*="interactive"]:not(.spo-card):not(.twc-card):not(.hsc-card),
.card-interactive {
  cursor: pointer;
}
[class*="card"][class*="interactive"]:not(.spo-card):not(.twc-card):not(.hsc-card):hover,
.card-interactive:hover {
  border-color: var(--color-border-strong) !important;
  box-shadow: var(--shadow-md) !important;
  transform: translateY(-2px);
}

/* Inputs */
input[type="text"]:not(.search-input),
input[type="email"],
input[type="password"],
input[type="number"],
input[type="url"],
input[type="date"],
textarea,
select {
  background-color: var(--color-background-base) !important;
  border: 1px solid var(--color-border-base) !important;
  border-radius: var(--radius-md) !important;
  padding: var(--space-3) var(--space-4) !important;
  font-family: var(--font-family-base) !important;
  font-size: var(--font-size-base) !important;
  color: var(--color-text-primary) !important;
  width: 100%;
}
input[type="text"]:focus,
input[type="email"]:focus,
input[type="password"]:focus,
input[type="number"]:focus,
input[type="url"]:focus,
input[type="date"]:focus,
textarea:focus,
select:focus {
  outline: none !important;
  border-color: var(--color-accent-base) !important;
  box-shadow: var(--shadow-focus) !important;
}
input::placeholder,
textarea::placeholder {
  color: var(--color-text-tertiary) !important;
}

input[type="checkbox"]:not(.hsc-checkbox),
input[type="radio"] {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
input[type="radio"] {
  border-radius: 50%;
}
input[type="checkbox"]:checked:not(.hsc-checkbox),
input[type="radio"]:checked {
  background-color: var(--color-accent-base) !important;
  border-color: var(--color-accent-base) !important;
}

/* Badges */
[class*="badge"]:not(.spo-trend-badge):not(.hsc-streak-badge),
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-sm) !important;
  font-size: var(--font-size-xs) !important;
  font-weight: var(--font-weight-semibold) !important;
  line-height: var(--line-height-xs) !important;
}
[class*="badge"][class*="success"],
.badge-success {
  background-color: var(--color-success-bg) !important;
  color: var(--color-success-text) !important;
}
[class*="badge"][class*="warning"],
.badge-warning {
  background-color: var(--color-warning-bg) !important;
  color: var(--color-warning-text) !important;
}
[class*="badge"][class*="danger"],
.badge-danger {
  background-color: var(--color-danger-bg) !important;
  color: var(--color-danger-text) !important;
}
[class*="badge"][class*="info"],
.badge-info {
  background-color: var(--color-info-bg) !important;
  color: var(--color-info-text) !important;
}
"""
css += "\n\n/* OVERRIDDEN COMPONENTS */\n" + component_styles

# 6. Sidebar & Header
nav_styles = """
.app-sidebar {
  background-color: var(--color-background-base) !important;
  border-right: 1px solid var(--color-border-base) !important;
}
.app-sidebar-nav-item {
  gap: var(--space-3) !important;
  padding: 10px 12px !important;
  border-radius: var(--radius-md) !important;
  font-size: var(--font-size-sm) !important;
  font-weight: var(--font-weight-medium) !important;
  color: var(--color-text-secondary) !important;
}
.app-sidebar-nav-item:hover {
  background-color: var(--color-background-subtle) !important;
  color: var(--color-text-primary) !important;
}
.app-sidebar-nav-item.active {
  background-color: var(--color-accent-subtle) !important;
  color: var(--color-accent-text) !important;
  font-weight: var(--font-weight-semibold) !important;
  border: none !important;
  box-shadow: none !important;
}
.app-sidebar-quick-btn {
  background-color: var(--color-accent-base) !important;
  color: #FFFFFF !important;
  border: none !important;
  margin-bottom: var(--space-4);
}
.app-sidebar-quick-btn:hover {
  background-color: var(--color-accent-hover) !important;
}

.app-content-header {
  background-color: transparent !important;
  padding: var(--space-4) 0 !important;
}
.app-content-header-actions button:not(.today-geist-ghost-btn) {
  background-color: transparent !important;
  color: var(--color-text-secondary) !important;
  border-radius: var(--radius-md) !important;
}
.app-content-header-actions button:hover:not(.today-geist-ghost-btn) {
  background-color: var(--color-background-subtle) !important;
  color: var(--color-text-primary) !important;
}
"""
css += "\n\n/* OVERRIDDEN NAVIGATION */\n" + nav_styles

# 7. Typography Helpers
type_helpers = """
.text-2xl { font-size: var(--font-size-2xl); line-height: var(--line-height-2xl); font-weight: var(--font-weight-bold); letter-spacing: var(--letter-spacing-tight); }
.text-xl { font-size: var(--font-size-xl); line-height: var(--line-height-xl); font-weight: var(--font-weight-semibold); letter-spacing: var(--letter-spacing-tight); }
.text-lg { font-size: var(--font-size-lg); line-height: var(--line-height-lg); font-weight: var(--font-weight-medium); }
.text-base { font-size: var(--font-size-base); line-height: var(--line-height-base); font-weight: var(--font-weight-regular); }
.text-sm { font-size: var(--font-size-sm); line-height: var(--line-height-sm); font-weight: var(--font-weight-regular); }
.text-xs { font-size: var(--font-size-xs); line-height: var(--line-height-xs); font-weight: var(--font-weight-regular); }
.text-primary { color: var(--color-text-primary) !important; }
.text-secondary { color: var(--color-text-secondary) !important; }
.text-tertiary { color: var(--color-text-tertiary) !important; }
.text-accent { color: var(--color-accent-text) !important; }
"""
css += "\n\n/* TYPOGRAPHY HELPERS */\n" + type_helpers

# Replace old coral colors globally in CSS
css = css.replace("#FF4D38", "var(--color-accent-base)")
css = css.replace("#E63522", "var(--color-accent-hover)")
css = css.replace("#FF705F", "var(--color-accent-hover)")
css = css.replace("#FFA296", "var(--color-accent-subtle)")
css = css.replace("rgba(255, 77, 56", "rgba(0, 112, 243")

with open("src/styles.css", "w", "utf-8") as f:
    f.write(css)
