# Gamification

## Purpose
Make daily practice sticky. The user should feel a pull to come back every day, see progress, and not want to break their streak.

## Streak

### Definition
- A streak is the number of consecutive days with **at least 1 exercise completed**
- Streak resets to 0 if a full day passes with no activity
- Grace period: none (keep it simple and honest)

### Display
- Shown prominently on the dashboard: "🔥 12 days" (or equivalent icon)
- Current streak is the hero metric
- "Longest streak" shown smaller nearby

## Daily Progress

### Progress Bar
- On the dashboard, a visual indicator of how many exercises are done today
- Shows "3/5 completed" with filled segments
- When all 5 are done: completion state with a satisfying visual (checkmark, color change, confetti — keep it classy)

### Per-Exercise Status
- Each exercise card on the dashboard shows its state:
  - Available: neutral card
  - Completed: shows score badge (e.g., "4/5"), card is visually marked done

## Activity Graph

### 16-Week Heatmap
- GitHub-style contribution graph
- Each cell = one day
- Color intensity based on daily total score (sum of all exercises that day)
  - Empty: no activity
  - Light: 1-8 points
  - Medium: 9-16 points
  - Dark: 17-21 points (max possible: 5+2+6+5+3 = 21)
- Shows last 16 weeks (112 days)
- Current day highlighted

## Total Score

- Each day has a maximum of 21 points (5+2+6+5+3)
- Daily total shown after completing all exercises
- Running total or average not needed — keep it about the daily habit, not cumulative numbers

## What NOT to Include (Keep it Simple)
- No levels or XP
- No badges or achievements
- No leaderboards
- No notifications beyond the daily email
- No penalties for wrong answers beyond the score
