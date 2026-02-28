import re

with open("src/styles.css", "r", "utf-8") as f:
    css = f.read()

# Fix layout squeezing: Change max-width from 1200px to 100% or 1400px but wait,
# the user says EVERYTHING is squeezed. Let's look at `.today-geist-container` (720px),
# `.page` (1240px)
css = css.replace("max-width: 720px;", "max-width: 1000px;")
css = css.replace("max-width: 1200px !important;", "max-width: 1400px !important;")
css = css.replace("max-width: 880px;", "max-width: 1000px;")

# Fix remaining coral / red tones in root and dark mode
css = css.replace("#FFE1DE", "var(--color-info-bg)")
css = css.replace("#FFC4BE", "var(--color-accent-subtle)")
css = css.replace("#C026D3", "var(--color-accent-hover)") # accent-violet

# Dark mode red overrides
css = css.replace("#4A1A17", "var(--color-info-bg)")
css = css.replace("#8A2B23", "var(--color-accent-subtle)")
css = css.replace("#D84234", "var(--color-accent-hover)")
css = css.replace("#FF5A4A", "var(--color-accent-base)")
css = css.replace("#FF8578", "var(--color-accent-hover)")
css = css.replace("#D946EF", "var(--color-accent-hover)")

# Also replace day-0 explicitly which was ruby:
css = css.replace("--day-0: #F43F5E;", "--day-0: var(--color-accent-base);")
css = css.replace("--day-0-bg: #FFE4E6;", "--day-0-bg: var(--color-accent-subtle);")
css = css.replace("--day-0: #FB7185;", "--day-0: var(--color-accent-base);")
css = css.replace("--day-0-bg: rgba(244, 63, 94, 0.15);", "--day-0-bg: var(--color-accent-subtle);")

with open("src/styles.css", "w", "utf-8") as f:
    f.write(css)
