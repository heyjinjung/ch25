# Sidebar Container Spec (from Figma)

Raw values provided (Figma export):

- Display: flex
- Direction: column
- Align items: flex-start
- Padding: 30px 0px (top/bottom 30, left/right 0)
- Gap: 49px
- Position: absolute
- Width: 491px
- Height: 550px
- Left: 15px
- Top: 0px
- Notes: 내부 오토레이아웃 flex:none; order:2; flex-grow:0; z-index:2

Tailwind-ready mapping (non-responsive, literal):
- `flex flex-col items-start gap-[49px] pt-[30px] pb-[30px]` (no px on x-axis)
- `w-[491px] h-[550px]` (consider `max-w` + `w-full` for responsive)
- For absolute placement: `absolute left-[15px] top-0`
- If z needed: `z-[2]`
- If you keep the “내부 오토레이아웃” notes: add `flex-none order-2 flex-grow-0`

Recommendation: avoid hard px widths for production. Prefer `w-full max-w-[491px]` and relative positioning unless this container overlays another fixed canvas.
