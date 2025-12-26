# Mail Header Container Spec (from Figma)

Raw values (literal Figma export):
- Display: flex; flex-direction: column; align-items: center
- Padding: 50px 40px
- Gap: 50px
- Width: 760px; Height: 414px
- Background: #FFFFFF
- Notes: flex: none; order: 0; align-self: stretch; flex-grow: 0

Header image block:
- Size: 624px x 348px
- Background image: banner01.png
- Border radius: 20px
- Notes: flex: none; order: 0; flex-grow: 0

Tailwind-ready mapping (non-responsive, literal):
- Container: `flex flex-col items-center gap-[50px] px-[40px] py-[50px] w-[760px] h-[414px] bg-white`
- Image placeholder: `w-[624px] h-[348px] rounded-[20px] bg-[url('/path/to/banner01.png')] bg-cover bg-center`
- If you need stretch behavior removed: add `flex-none` (and `self-stretch` if you mirror align-self: stretch)

Recommendation:
- For responsive layouts, prefer `w-full max-w-[760px]` and set padding via `px-10`/`py-12` equivalents.
- Use an actual `<img>` tag with `className="w-[624px] h-[348px] rounded-[20px] object-cover"` instead of CSS background if you need alt text and better loading control.
