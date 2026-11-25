# PowerBank clickable mobile app (front-end prototype)

A tappable mobile-style app in emerald green and white, using sample data only. No real money, sign-in, or payments.

## Screens (each its own page)
- `/login` Login, `/signup` Sign Up — curved green header, white floating card, fields as described, links between them.
- `/` Home — welcome "Riyaj Khan", green balance card ₹0.00, stats, Add Funds / Withdraw buttons, empty transactions.
- `/plans` — gift banner, filter pills (All, Popular, Premium), Basic/Silver/Gold/Diamond cards with Invest Now.
- `/tasks` — checklist banner, category tabs, 5 daily tasks with Go buttons.
- `/team` — avatar banner, member counter, 3 stats, ₹50 invite banner with copy code, Team Benefits list.
- `/wallet` — balance card, All/Deposits/Withdrawals tabs, empty state, action list.
- `/me` — curved header, avatar, User ID PB123456, Active Member badge, stats, settings menu, Logout to login.
- `/deposit` — Rupee coin header, payment method selector, Proceed to Pay, secure badge.
- `/withdraw` — available balance, amount input (min ₹100), quick chips, bank dropdown, Request Withdrawal.

Bottom 6-tab bar (Home, Plans, Task, Team, Wallet, Me) on main pages. Buttons show friendly toasts (e.g. "Demo only").

## Look
- Emerald green + white tokens, lime accent for logo, soft card shadows, rounded corners, Plus Jakarta Sans font.
- Content centered in a phone-width column (max ~430px) on desktop.
- Generated glossy 3D icons (wallet & coins, gift box, checklist, avatar group, rupee coin, wallet & cash, empty state) hosted as app assets.

## Technical
- TanStack routes per screen with own head() metadata; shared MobileShell + BottomNav components.
- Sample data in `src/lib/demo-data.ts`; validation of withdraw min amount with a small test.
- Sonner Toaster mounted in root.
