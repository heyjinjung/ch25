🔧 Project Structure Overview

The ch25 repository is a React 18 + Vite project written in TypeScript. It uses Tailwind CSS for styling, React Router DOM for routing and @tanstack/react‑query for client‑side API calls. The project is already configured for Christmas with snow and music toggles. Understanding the structure makes it easier to add new features and improvements.

Main directories
Directory	Purpose
src/pages	Top‑level pages such as HomePage, RoulettePage, DicePage, LotteryPage, RankingPage, SeasonPassPage, TeamBattlePage, plus admin pages.
src/components/game	UI components for games, e.g., RouletteWheel.tsx, DiceView.tsx, LotteryCard.tsx.
src/hooks	React Query hooks wrapping API calls (e.g., useRoulette, useDice, useLottery, useSeasonPass). These hooks call functions in src/api and handle caching/invalidation.
src/api	Functions that call the backend (/api/roulette/status, /api/roulette/play, etc.) via axios. Fallback data is used when the isDemoFallbackEnabled flag is set.
src/router	Configures the app’s routes. The UserRoutes map /home, /roulette, /dice, /lottery, /ranking, /season-pass, /team-battle to their respective pages.
src/types	Shared TypeScript interfaces and enums, such as GameTokenType, RouletteSegmentDto, DicePlayResponse, etc.
How pages use hooks and APIs

Each game page imports a hook to fetch its status and a mutation to play:

RoulettePage.tsx calls useRouletteStatus() to get remaining spins, token balance and segments, then uses usePlayRoulette() when the user presses the spin button. After play, the hook invalidates the status query so the remaining spins are refreshed automatically. Errors are mapped to user‑friendly messages.

DicePage.tsx uses useDiceStatus() and usePlayDice() similarly. Dice results (arrays of numbers) are displayed by DiceView.tsx, which shakes the dice while rolling.

LotteryPage.tsx uses useLotteryStatus() to show available tickets and prizes and usePlayLottery() to reveal a prize. LotteryCard.tsx handles the scratch interface.

SeasonPassPage.tsx combines several hooks (useSeasonPassStatus, useInternalWinStatus, useTodayRanking) and useClaimSeasonReward() to display current XP, claimable rewards and tasks. Adding a stamp calls addSeasonPassStamp() which posts to the API.

The API functions in src/api simply perform axios.get or axios.post calls and map the backend fields to front‑end DTOs. For example playRoulette() posts to /api/roulette/play and maps the backend response to {selected_index, segment, remaining_spins, reward_type, reward_value}
github.com
.

Running the project locally

Clone the repo and install dependencies:

git clone <repo-url>
cd ch25
npm install


Run development server:

npm run dev


The app runs on http://localhost:5173 by default. Use a modern browser; the site is mobile‑responsive thanks to Tailwind’s utility classes.

📈 Designing for Retention & Long Engagement

To increase player retention and encourage longer sessions, the experience needs to feel premium, responsive, and rewarding. The core ideas are:

Immediate feedback with delight – each action should feel tactile and rewarding (animations, sound, haptics).

Progression & milestones – visible XP progress, daily tasks and season‑pass stamps encourage daily visits.

Fairness & transparency – clear results and logs build trust; highlight social proof via rankings.

Mobile‑first design – most users play on phones, so design for small screens first
tailwindcss.com
.

Below are specific enhancements, organized by game and feature.

🎡 Roulette: 3D Wheel & Enhanced Motion

Use React Three Fiber (R3F) – transform the flat SVG wheel into a 3D cylinder that spins around its Y‑axis. R3F is a React renderer for three.js; it lets you declare a scene using JSX. You can build a cylinder mesh divided into segments with unique materials (colors and textures).

Each segment’s rotation angle can be computed from its weight and order; use R3F’s <mesh> with rotation and animate it using the useFrame hook.

Add lights and shadows for depth; ambient plus point lights make the wheel glow.

For spinning, apply a rotation animation via react-spring or Framer Motion’s animate property; decelerate smoothly (ease‑out). At spin end, highlight the selected segment by increasing its scale or brightness.

Physical sound/vibration – play a short “click” sound as the wheel spins; on mobile, call navigator.vibrate(20) when the wheel stops (if permitted). Add a toggle in settings for sound/vibration.

Reward animations – when a prize is won, display a 3D coin or token flying into the header; implement with R3F or lottie-react for quick vector animations.

🎲 Dice: 3D dice roll

3D dice model – use a low‑poly 3D model (GLTF) of a die; load via @react-three/drei’s <useGLTF> hook.

Physics for realism – integrate @react-three/cannon to simulate the dice roll. Give each die a rigid body, drop them onto a plane and let them bounce/settle. Once the physics engine reports rest, read the top face to determine the result.

Fallback for lightweight devices – if device performance is low, fall back to existing 2D dice with animate-shake but add depth via drop shadows and scaling.

🎟 Lottery: Scratch Card with Canvas

The current LotteryCard.tsx covers the prize with a div that shrinks on click. A more immersive scratch experience uses the HTML5 canvas. The GeeksforGeeks tutorial explains how to implement it:

Initialize a canvas with a gradient overlay and hidden prize text. Use createLinearGradient to draw the scratch area
geeksforgeeks.org
.

Detect touch or mouse movement to know when the user is dragging
geeksforgeeks.org
.

On each drag event, call scratch(x, y) which draws small circles using the destination‑out composite operation, erasing the overlay to reveal the prize
geeksforgeeks.org
.

Use useEffect to set up the canvas and clean up event listeners when unmounted
geeksforgeeks.org
.

You can encapsulate this logic in a custom ScratchCard component. For mobile performance, limit the canvas size and throttle the mousemove/touchmove handler.

🏆 Ranking: Animated Leaderboard

Ranking lists update frequently; animations help users track changes and make the experience lively.

Framer Motion list animations – use <AnimatePresence> and <motion.li> to animate entries as they appear, move and disappear. For each list item, specify initial, animate and exit properties for opacity and position. A basic example from the Framer Motion guide:

<AnimatePresence>
  {players.map(player => (
    <motion.li
      key={player.id}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      {/* ranking row */}
    </motion.li>
  ))}
</AnimatePresence>


This approach makes the ranking board feel alive and makes re‑ordering clear
tillitsdone.com
.

Staggered animations – delay each entry by a small amount so that they animate in sequence; set delay: index * 0.05 in the transition
tillitsdone.com
.

Highlighting – emphasize the user’s row with a glowing border or badge. Use CSS animation (e.g., pulsing drop shadow) or a small icon to draw attention.

🎫 Season Pass: Interactive Stamps & Progress

The Season Pass page already shows XP and levels; adding interactions increases retention:

Stamp animation – when the user earns a stamp, animate the stamp icon popping up and the XP progress bar filling. Using Framer Motion or CSS transform to scale the stamp from 0.8 to 1.2 and back provides a satisfying “pop”.

Confetti effect – fire confetti (canvas-confetti library) after leveling up. This encourages progression.

Daily streak indicator – show how many days in a row the user has claimed a stamp. Use a row of small dots that fill sequentially.

📱 Mobile‑First & Responsive Design

Tailwind’s responsive utilities make it simple to build adaptive layouts. Remember these principles:

Mobile first – unprefixed classes apply to all sizes; add md: lg: etc. for larger screens. Use unprefixed utilities to style mobile, and override at breakpoints
tailwindcss.com
.

Viewport meta tag – include <meta name="viewport" content="width=device-width, initial-scale=1.0"> in index.html so the layout scales properly on mobile
tailwindcss.com
.

Breakpoints – Tailwind’s default breakpoints (sm ≥ 640 px, md ≥ 768 px, lg ≥ 1024 px, etc.) allow you to adjust widths, padding and grid layouts at each size
tailwindcss.com
. Use grid-cols-1 md:grid-cols-2 to switch from single‑column on mobile to two columns on desktop.

Touch‑friendly elements – enlarge buttons (py-4 px-6), use gap-4 to separate elements and avoid placing interactive elements too close together. Add aria-labels for accessibility.

🔊 Audio & Haptics

Sound effects and haptic feedback can increase immersion. Implement them thoughtfully:

Play short audio clips when spinning the roulette, rolling dice or scratching. Load audio lazily to avoid increasing initial bundle size. Provide a user toggle in settings to mute/unmute audio.

On mobile, call navigator.vibrate() for 20–30 ms at moment of reward; check for API availability.

🌐 API/State Considerations

Optimistic updates – the current hooks invalidate queries after successful plays. For a snappier feel, you could optimistically reduce the remaining_spins/remaining_plays immediately, then correct it when the response returns. Use onMutate and onError in useMutation to implement rollback logic.

Error handling – the mapErrorMessage function in RoulettePage.tsx maps backend error codes to Korean messages. Extend this pattern for other games; show toasts rather than silently failing.

Preloading assets – large 3D models or textures should be preloaded (e.g., via useGLTF.preload) so that the spin/dice action doesn’t stutter.

✅ Summary & Next Steps

Become familiar with the codebase by exploring src/pages, src/components/game, src/hooks and src/api. The game pages use React Query hooks to fetch status and play the games. Functions in src/api map backend responses to front‑end DTOs.

To improve retention, focus on tactile, delightful feedback: 3D roulette and dice with R3F, canvas‑based scratch cards, animated ranking lists and interactive season‑pass stamps. Add audio/haptic feedback and confetti for rewards.

Design for mobile first: adopt responsive Tailwind utilities, enlarge hit targets and test on various devices. Tailwind’s breakpoint system lets you adjust styles at sm, md, lg, etc. breakpoints
tailwindcss.com
.

Enhance user progression by adding daily streak indicators, tasks and visible milestones. Provide clear social proof via an animated ranking board and highlight the user’s position.

By combining these UI/UX enhancements with existing game logic, the app can deliver a premium, casino‑like experience that encourages users to return, play longer and engage with seasonal content.