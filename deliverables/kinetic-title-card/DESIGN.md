# Kinetic Title Card Design

## Style Prompt

Maximalist Type: loud, kinetic, launch-card energy inspired by Paula Scher. Text is the primary visual system, filling most of the frame with stacked scales, hard angles, and high-contrast blocks. Motion should feel fast, confident, and editorial: words slam in, snap to a grid, then break apart with controlled force.

## Colors

- Background: `#0E0D0B` warm black
- Foreground: `#FFF7D6` paper white
- Primary accent: `#E63946` signal red
- Secondary accent: `#FFD60A` saturated yellow
- Support tone: `#1B1A17` lifted black for depth bands

## Typography

- Headlines: Montserrat, sans-serif
- Labels: Inter, Arial, sans-serif
- Use uppercase text, heavy weights, and dense line-height.

## Motion Rules

- Use snappy entrances with `expo.out` and `back.out(1.8)`.
- Keep every loop finite and deterministic.
- Layer scale, x/y, rotation, and opacity; do not animate layout properties.
- Hold the hero frame briefly before the final punch-out.

## What NOT To Do

- Do not use soft gradients, muted pastel palettes, or gentle floating motion.
- Do not make the title feel centered and static.
- Do not introduce stock imagery or decorative cards.
- Do not use purple-blue neon defaults.
