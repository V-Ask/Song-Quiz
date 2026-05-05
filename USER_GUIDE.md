# Song Quiz - Admin User Guide

```
    ___                    ___       _
   / __| ___  _ _   __ _ / _ \ _  _(_)___
   \__ \/ _ \| ' \ / _` | (_) | || | |_ /
   |___/\___/|_||_|\__, |\__\_\\_,_|_/__|
                   |___/
           ~ The Ultimate Song Voting Platform ~
```

Welcome, quiz master! This guide will walk you through everything you need to
know to create and run awesome song quizzes for your friends, colleagues, or
audience. Let's get started!

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [The Dashboard](#2-the-dashboard)
3. [Creating a Quiz](#3-creating-a-quiz)
4. [Sharing with Voters](#4-sharing-with-voters)
5. [Running Your Quiz (The 4 Phases)](#5-running-your-quiz-the-4-phases)
6. [The Presentation View](#6-the-presentation-view)
7. [Statistics & Charts](#7-statistics--charts)
8. [The Badge System](#8-the-badge-system)
9. [Tips & Tricks](#9-tips--tricks)

---

## 1. Getting Started

### Creating Your Account

Head to **`/dashboard`** in your browser. You'll see a login screen with two tabs.

```
  +--------------------------------------+
  |    [  Login  ]  [ Register ]         |
  |--------------------------------------|
  |                                      |
  |   Display Name:  [  DJ Awesome    ]  |
  |   Username:      [  djawesome     ]  |
  |   Email:         [  dj@awesome.co ]  |
  |   Password:      [  ************  ]  |
  |                                      |
  |        [ Create Account ]            |
  |                                      |
  +--------------------------------------+
```

Click the **Register** tab and fill in:

| Field | Rules | Example |
|---|---|---|
| Display Name | Required, shown in the header | `DJ Awesome` |
| Username | 3-30 characters, must be unique | `djawesome` |
| Email | Valid email, must be unique | `dj@awesome.co` |
| Password | At least 6 characters | `s3cur3Pass!` |

Hit **Create Account** and you're in! You'll be logged in automatically.

### Logging In Later

Already have an account? Just use the **Login** tab with your username and
password. Your session lasts **7 days** before you need to log in again.

```
        .---.
       /     \       "Welcome back,
      | () () |       DJ Awesome!"
       \  ^  /
        '---'
```

---

## 2. The Dashboard

Once logged in, the dashboard is your command center. Here's what you'll see:

```
  +----------------------------------------------------------+
  |  Welcome, DJ Awesome          [ All Stats ] [ Logout ]   |
  +----------------------------------------------------------+
  |                                                          |
  |  +----------------------------------------------------+  |
  |  |  CREATE NEW QUIZ                                   |  |
  |  |  Theme: [________________________]                 |  |
  |  |  Image: [ Choose File ]  Timer: [___] sec          |  |
  |  |                        [ Create Quiz ]             |  |
  |  +----------------------------------------------------+  |
  |                                                          |
  |  +----------------------------------------------------+  |
  |  |  YOUR QUIZZES                                      |  |
  |  |                                                    |  |
  |  |  +----------------------------------------------+  |  |
  |  |  |  "80s Power Ballads"     [ Voting ]          |  |  |
  |  |  |  Created: Jan 15, 2026                       |  |  |
  |  |  |  [Copy Link] [Presentation] [Delete]         |  |  |
  |  |  |  ----------------------------------------    |  |  |
  |  |  |              [ Show Results ]                |  |  |
  |  |  +----------------------------------------------+  |  |
  |  |                                                    |  |
  |  |  +----------------------------------------------+  |  |
  |  |  |  "Summer Vibes 2026"     [ Results ]         |  |  |
  |  |  |  Created: Jan 10, 2026                       |  |  |
  |  |  |  [Copy Link] [Presentation] [Stats] [Delete] |  |  |
  |  |  +----------------------------------------------+  |  |
  |  +----------------------------------------------------+  |
  +----------------------------------------------------------+
```

### Dashboard Buttons

| Button | What It Does |
|---|---|
| **All Stats** | Opens the cross-quiz leaderboard and overview |
| **Logout** | Ends your session and returns to the login screen |
| **Copy Link** | Copies the voter link to your clipboard |
| **Presentation** | Opens the big-screen presentation view in a new tab |
| **View Stats** | Opens per-quiz statistics (only on completed quizzes) |
| **Delete** | Permanently deletes the quiz (asks for confirmation first!) |

---

## 3. Creating a Quiz

Time to set the stage! Fill in the **Create New Quiz** form:

### Theme (Required)

This is the prompt your voters will see. Make it fun and specific!

```
  Good themes:                    Meh themes:
  +-------------------------+    +-------------------+
  | "Guilty Pleasure Songs" |    | "Songs"           |
  | "Best 90s One-Hit       |    | "Music"           |
  |  Wonders"               |    | "Whatever"        |
  | "Songs That Make You    |    |                   |
  |  Cry in the Shower"     |    |                   |
  +-------------------------+    +-------------------+

        *                  *
       /|\    Great        |     "Songs"... really?
      / | \   choice!     -+-     Come on, you can
     /  |  \              / \     do better!
```

### Theme Image (Optional)

Upload an image or **GIF** to set the mood! It'll be displayed during the
submission phase on both the voter view and the presentation screen.

- Maximum file size: **5 MB**
- Accepted formats: Any image type (JPG, PNG, GIF, etc.)
- A preview appears after selecting the file
- Click **Remove** to clear the selection

```
  +------------------+
  |   +-----------+  |
  |   |           |  |
  |   |   .----.  |  |   <-- Your theme image
  |   |   | :) |  |  |       appears here as
  |   |   '----'  |  |       a preview!
  |   |           |  |
  |   +-----------+  |
  |    [ Remove ]    |
  +------------------+
```

### Timer (Optional)

Set an auto-advance timer **in seconds**. When the timer runs out, the quiz
automatically moves to the next phase. Leave it blank for full manual control.

```
  Manual Mode:                Timer Mode (e.g. 300 = 5 min):

     YOU decide                  The CLOCK decides
     when to move                when to move
     to the next       vs.       to the next
     phase!                      phase!

      [Click!]                   [Tick... Tick... DING!]
       __|__                          .--.
      |     |                        /    \
      | YOU |                       | 0:00 |
      |_____|                        \    /
                                      '--'
```

### Hit "Create Quiz"

Your quiz is created and **immediately enters Phase 1** (Submissions). It
appears in your quiz list right away!

---

## 4. Sharing with Voters

Your voters don't need an account - they just need a link!

### Getting the Link

Click **Copy Link** on any quiz card. The voter URL looks like:

```
  http://localhost:3001/?quiz=a1b2c3d4-e5f6-7890-abcd-ef1234567890
                                 |
                                 +-- This is the unique quiz ID
```

Share this link however you like - chat, email, carrier pigeon, etc.

```
       Sharing Methods:

       +---------+    +-------+    +--------+
       |  Chat   |    | Email |    | Shout  |
       |  App    |    |       |    | Very   |
       | [Link!] |    |[Link!]|    | Loudly |
       +---------+    +-------+    +--------+
            |              |            |
            v              v            v
       +------+       +------+    +------+
       | :D   |       | :D   |    | ???  |
       +------+       +------+    +------+
          Voter 1       Voter 2    Voter 3
```

### What Voters See

When voters open the link, they're **automatically tracked** via a browser
cookie (no login needed). This means:

- They can close the browser and come back later
- Their submission is remembered
- They can only vote once

---

## 5. Running Your Quiz (The 4 Phases)

A quiz flows through **4 phases** in order. You control when each phase
advances from the dashboard (or let the timer do it).

```
  The Quiz Lifecycle:

  Phase 0        Phase 1         Phase 2         Phase 3
  (Setup)     (Submissions)     (Voting)       (Results)

    [ ]  ------>  [+]  -------->  [*]  -------->  [!]
  Created      Songs come in    Votes cast     Winner
               from voters      by voters      revealed!

              "Start          "Start          "Show
              Submissions"     Voting"         Results"
```

### Phase 0 - Setup

This phase is **skipped automatically** when you create a quiz from the
dashboard. But if a voter somehow arrives early, they'll see a friendly
waiting message.

```
  +-----------------------------------+
  |                                   |
  |    Waiting for the next round...  |
  |                                   |
  |    The quiz host will start       |
  |    submissions soon!              |
  |                                   |
  |          .  .  .                  |
  |         (waiting)                 |
  +-----------------------------------+
```

### Phase 1 - Submissions

This is where the magic begins! Voters submit their songs.

**What voters see:**

```
  +-------------------------------------------+
  |                                           |
  |   Theme: "Guilty Pleasure Songs"          |
  |                                           |
  |   +-----------------------------------+   |
  |   |       [Theme Image / GIF]         |   |
  |   +-----------------------------------+   |
  |                                           |
  |   SUBMIT YOUR SONG                        |
  |   Your Name:  [  __________________  ]    |
  |   Song Title: [  __________________  ]    |
  |   Artist:     [  __________________  ]    |
  |   Link:       [  __________________  ]    |
  |                                           |
  |           [ Submit Song ]                 |
  |                                           |
  +-------------------------------------------+
```

**Important details:**
- Links must be from **Spotify**, **YouTube**, or **SoundCloud** only
- Voters can **edit** their submission any time during Phase 1 (the form
  pre-fills with their previous entry and the button says "Update Song")
- The theme image/GIF is only shown during this phase

**As the admin, you can see the submission count on the presentation view.**

When everyone has submitted, click **Start Voting** on your dashboard to
advance to Phase 2!

### Phase 2 - Voting

Now the fun really begins. Voters assign points to their favorite songs.

**What voters see:**

```
  +-------------------------------------------+
  |                                           |
  |   Theme: "Guilty Pleasure Songs"          |
  |                                           |
  |   +-----------------------------------+   |
  |   |  "Barbie Girl" - Aqua             |   |
  |   |  [Listen]                         |   |
  |   |  ( 3 pts )  ( 2 pts )  ( 1 pt )  |   |
  |   +-----------------------------------+   |
  |                                           |
  |   +-----------------------------------+   |
  |   |  "MMMBop" - Hanson                |   |
  |   |  [Listen]                         |   |
  |   |  ( 3 pts )  ( 2 pts )  ( 1 pt )  |   |
  |   +-----------------------------------+   |
  |                                           |
  |   +-----------------------------------+   |
  |   |  "Never Gonna Give You Up"        |   |
  |   |  - Rick Astley                    |   |
  |   |  [Listen]                         |   |
  |   |  ( 3 pts )  ( 2 pts )  ( 1 pt )  |   |
  |   +-----------------------------------+   |
  |                                           |
  |         [ Submit Votes ]  (disabled)      |
  +-------------------------------------------+
```

**Voting rules:**
- Each voter gives out **3 points**, **2 points**, and **1 point** (one each)
- Each point value goes to a **different** song
- Voters **cannot** vote for their own song
- Votes are **final** - no take-backs!
- The button enables only after all 3 point values are assigned
- **Submitter names are hidden** to prevent bias

```
  How voting works:

  You have 3 "coins" to distribute:

      [3]  [2]  [1]
       |    |    |
       v    v    v
    Song A  Song B  Song C

  Give your favorite song 3 points,
  your second favorite 2 points,
  and your third favorite 1 point!

       +-----------+
       |   CAN'T   |
       |  vote for  |
       | your OWN  |
       |   song!   |
       +-----------+
```

When voting is done, click **Show Results** on your dashboard!

### Phase 3 - Results

The grand reveal! Submitter names are shown and songs are ranked.

```
  +-------------------------------------------+
  |                                           |
  |   Theme: "Guilty Pleasure Songs"          |
  |                                           |
  |   +-----------------------------------+   |
  |   |  #1  "MMMBop" - Hanson            |   |
  |   |       Submitted by: Sarah         |   |
  |   |       Points: 8                   |   |
  |   |       [People's Champion]         |   |
  |   +-----------------------------------+   |
  |                                           |
  |   +-----------------------------------+   |
  |   |  #2  "Barbie Girl" - Aqua         |   |
  |   |       Submitted by: Mike          |   |
  |   |       Points: 5                   |   |
  |   |       [Photo Finish]              |   |
  |   +-----------------------------------+   |
  |                                           |
  |   +-----------------------------------+   |
  |   |  #3  "Never Gonna Give You Up"    |   |
  |   |       - Rick Astley               |   |
  |   |       Submitted by: Alex          |   |
  |   |       Points: 4                   |   |
  |   |       [Photo Finish] [Polarizing] |   |
  |   +-----------------------------------+   |
  |                                           |
  +-------------------------------------------+
```

This is the final phase. The quiz is now **completed** and locked in. The
**View Stats** button appears on the dashboard card, and the quiz data is
included in the all-time leaderboard.

---

## 6. The Presentation View

The presentation view is your **big screen companion**. Open it by clicking
**Presentation** on any quiz card - it opens in a new tab.

**URL:** `/presentation?quiz=<uuid>`

```
  +===========================================================+
  |                                                           |
  |              Perfect for:                                 |
  |                                                           |
  |    +------------+   +-----------+   +-----------+         |
  |    | Projector  |   |    TV     |   |  Shared   |         |
  |    |            |   |          |   |  Screen   |         |
  |    |   .----.   |   |  .----.  |   |  .----.   |         |
  |    |   |    |   |   |  |    |  |   |  |    |   |         |
  |    |   '----'   |   |  '----'  |   |  '----'   |         |
  |    +------------+   +-----------+   +-----------+         |
  |                                                           |
  +===========================================================+
```

### What it shows at each phase:

| Phase | Presentation Shows |
|---|---|
| **Phase 1** | "Submission Phase" + theme + image + live song count |
| **Phase 2** | "Voting Phase" + all songs with submitter names visible |
| **Phase 3** | Ranked results with an **animated highlight** that cycles through each song every 3 seconds |

**Key features:**
- **No interaction needed** - it's fully read-only
- **Auto-updates** every 3 seconds via polling
- **No login required** - anyone with the link can view it
- **Phase 3 animation** - results cards highlight one by one in a continuous loop, auto-scrolling to the current highlight

> **Pro tip:** Open the presentation view on a shared screen and keep the
> dashboard on your personal device. You control the phases from the dashboard
> while everyone watches the presentation!

---

## 7. Statistics & Charts

After a quiz is completed (Phase 3), you unlock detailed statistics!

### Per-Quiz Stats

Click **View Stats** on a completed quiz card, or go to `/stats?quiz=<uuid>`.

```
  +----------------------------------------------------------+
  |  QUIZ STATS: "Guilty Pleasure Songs"                     |
  +----------------------------------------------------------+
  |                                                          |
  |  +----------+  +----------+  +----------+               |
  |  | 6 Songs  |  | 5 Voters |  | Top: 8   |               |
  |  +----------+  +----------+  +----------+               |
  |                                                          |
  |  TOTAL POINTS BY SONG                                    |
  |  |                                                       |
  |  |  ####                                                 |
  |  |  ####  ####                                           |
  |  |  ####  ####  ###                                      |
  |  |  ####  ####  ###   ##                                 |
  |  |  ####  ####  ###   ##    #                            |
  |  +-------------------------------------------            |
  |   MMMBop Barbie Never  Bye   My              |
  |                Gonna  Bye   Heart            |
  |                                                          |
  |  VOTE DISTRIBUTION (Stacked)                             |
  |  Shows how many 3/2/1 point votes each song got          |
  |  [Gold = 3pts] [Silver = 2pts] [Bronze = 1pt]            |
  |                                                          |
  |  SONG DETAILS TABLE                                      |
  |  +----+------------+-----------+-----+--+--+--+          |
  |  | #  | Song       | Submitter | Pts | 3| 2| 1|          |
  |  +----+------------+-----------+-----+--+--+--+          |
  |  | 1  | MMMBop     | Sarah     |  8  | 2| 1| 0|          |
  |  | 2  | Barbie Girl| Mike      |  5  | 1| 1| 0|          |
  |  | 3  | Never Gonna| Alex      |  4  | 0| 2| 0|          |
  |  +----+------------+-----------+-----+--+--+--+          |
  +----------------------------------------------------------+
```

### Cross-Quiz Overview

Click **All Stats** in the dashboard header, or go to `/stats` (no quiz ID).

This gives you the big picture across **all completed quizzes**:

```
  +----------------------------------------------------------+
  |  ALL-TIME STATISTICS                                     |
  +----------------------------------------------------------+
  |                                                          |
  |  +------------------+  +---------------------+          |
  |  | 12 Total Quizzes |  | 34 Total Participants|          |
  |  +------------------+  +---------------------+          |
  |                                                          |
  |  PARTICIPATION TRENDS (Line Chart)                       |
  |  Shows songs submitted and voters per quiz over time     |
  |                                                          |
  |    ^                                                     |
  |  8 |       *                                             |
  |  6 |   *       *   *       Songs (purple)                |
  |  4 | *   *       *   *     Voters (pink)                 |
  |  2 |                                                     |
  |    +---+---+---+---+---+--->                             |
  |      Q1  Q2  Q3  Q4  Q5                                  |
  |                                                          |
  |  ALL-TIME LEADERBOARD                                    |
  |  +------+-----------+--------+--------+-------+         |
  |  | Rank | Name      | Points | Quizzes| Songs |         |
  |  +------+-----------+--------+--------+-------+         |
  |  |  1   | Sarah     |   42   |   8    |   8   |         |
  |  |  2   | Mike      |   38   |   7    |   7   |         |
  |  |  3   | Alex      |   31   |   9    |   9   |         |
  |  +------+-----------+--------+--------+-------+         |
  |                                                          |
  |  TOP SUBMITTERS (Bar Chart, top 10)                      |
  |                                                          |
  |  COMPLETED QUIZZES (clickable list)                      |
  +----------------------------------------------------------+
```

> **Note:** The leaderboard matches voters by the **name they typed** when
> submitting. If someone uses different names across quizzes, they'll appear
> as separate entries. Encourage your regulars to use the same name each time!

---

## 8. The Badge System

Songs earn badges automatically based on voting patterns. These appear as
colorful pills on the results page. There are **13 possible badges**!

```
  +----------------------------------------------------------+
  |                    BADGE COLLECTION                       |
  +----------------------------------------------------------+

          The Podium Badges
          ~~~~~~~~~~~~~~~~~~

    [Crown] PEOPLE'S CHAMPION
    Most unique voters gave this song points.
    At least 2 voters needed.
    "The crowd has spoken!"

    [Trophy] SWEEPING VICTORY
    Won 1st place by 3+ points over 2nd place.
    "Not even close!"

    [Camera] PHOTO FINISH
    1st and 2nd (or 2nd and 3rd) separated by just 1 point.
    Both songs earn this badge!
    "Down to the wire..."

          The Extreme Badges
          ~~~~~~~~~~~~~~~~~~

    [Purple Heart] UNANIMOUS LOVE
    Every single vote received was 3 points (min 2 votes).
    "Nothing but love!"

    [Theater Masks] POLARIZING
    Got both 3-point AND 1-point votes.
    "Love it or hate it!"

    [Scales] THE STEADY ONE
    Every vote was exactly 2 points (min 2 votes).
    "Always the bridesmaid, never the bride."

          The Underdog Badges
          ~~~~~~~~~~~~~~~~~~~~

    [Horse] DARK HORSE
    Finished top 3 without receiving any 3-point votes.
    "Consistent support carried the day!"

    [Diamond] HIDDEN GEM
    Only 1-2 votes total, but none were 1-point votes.
    "Small audience, big love."

    [Dog] UNDERDOG
    Lowest scorer that still got a 3-point vote (4th+ place).
    "Someone's guilty pleasure!"

          The Heartbreak Badges
          ~~~~~~~~~~~~~~~~~~~~~

    [Broken Heart] HEARTBREAKER
    2nd place had MORE 3-point votes than 1st place.
    "More fans, but not enough friends."

          The Timing Badges
          ~~~~~~~~~~~~~~~~~

    [Party] FIRST TO THE PARTY
    First song to receive any vote.
    "Early bird gets the points!"

    [Blossom] LATE BLOOMER
    Last song to receive its first vote (min 3 songs voted on).
    "Saved the best for last?"

          The Fan Favorite
          ~~~~~~~~~~~~~~~~

    [Star] CROWD FAVORITE
    Highest percentage of 3-point votes (min 2 votes).
    "X% of voters gave it top marks!"
```

> **Fun fact:** Songs can earn **multiple badges** at once! Imagine a song
> winning "People's Champion", "Sweeping Victory", AND "Unanimous Love" -
> now THAT's a crowd pleaser!

---

## 9. Tips & Tricks

### Running a Great Quiz Night

```
  THE PERFECT QUIZ NIGHT SETUP:

     Your Device               Shared Screen
    +------------+            +------------------+
    |            |            |                  |
    | Dashboard  |   ----->   |  Presentation    |
    | (control)  |            |  View            |
    |            |            |                  |
    +------------+            +------------------+
         |
         |  You control
         |  the phases!
         v
    "Start Voting!"
```

1. **Before the event**: Create your quiz with a fun theme and an eye-catching
   GIF. Share the voter link with participants ahead of time.

2. **Phase 1 - Submissions**: Put the presentation view on the big screen so
   everyone can see the theme and the live submission count. Give people
   enough time to find the perfect song.

3. **Phase 2 - Voting**: Encourage everyone to **listen** to the songs before
   voting! The "Listen" links open directly to Spotify/YouTube/SoundCloud.

4. **Phase 3 - The Big Reveal**: The presentation view highlights each result
   one by one with a cycling animation. Build the suspense!

### Quick Reference Card

```
  +----------------------------------------------------+
  |             QUICK REFERENCE                        |
  |----------------------------------------------------|
  |                                                    |
  |  CREATE:  Dashboard > Fill form > "Create Quiz"    |
  |  SHARE:   Click "Copy Link" > Send to voters       |
  |  ADVANCE: Click phase button on quiz card           |
  |  PRESENT: Click "Presentation" > Put on big screen |
  |  STATS:   Click "View Stats" (after Phase 3)       |
  |  DELETE:   Click "Delete" (permanent!)              |
  |                                                    |
  |  VOTER LINK:  /?quiz=<uuid>                        |
  |  DASHBOARD:   /dashboard                           |
  |  PRESENT:     /presentation?quiz=<uuid>            |
  |  STATS:       /stats?quiz=<uuid>  or  /stats       |
  +----------------------------------------------------+
```

### Common Questions

**Q: Can I run multiple quizzes at the same time?**
Yes! Each quiz is independent. Create as many as you want.

**Q: What happens to old quizzes?**
They stay forever! Old quizzes are preserved for historical statistics and
the all-time leaderboard.

**Q: Can a voter change their song after submitting?**
Yes, during Phase 1! They just revisit the link and the form pre-fills with
their previous submission. They can update it as many times as they want
before voting starts.

**Q: Can voters change their votes?**
No. Votes are final once submitted. Choose wisely!

**Q: What music links are accepted?**
Only **Spotify**, **YouTube** (youtube.com & youtu.be), and **SoundCloud**.

**Q: Do voters need an account?**
Nope! Voters are tracked by a browser cookie. No signup required.

**Q: Can I use the timer for some phases and manual control for others?**
The timer set at creation applies to the first phase. After that, you
manually advance phases (unless you set a new timer via the API).

**Q: What if I accidentally delete a quiz?**
Unfortunately, deletion is **permanent**. The confirmation dialog is your
safety net - read it carefully!

---

```
  +------------------------------------------------------+
  |                                                      |
  |   That's it! You're ready to host an amazing         |
  |   song quiz. Now go create something awesome!        |
  |                                                      |
  |          .---.                                       |
  |         /     \      "Let the music                  |
  |        | ^   ^ |      play!"                         |
  |        |  \_/  |                                     |
  |         \_____/                                      |
  |           | |                                        |
  |          /   \                                       |
  |                                                      |
  |                         Song Quiz v2.0.0             |
  +------------------------------------------------------+
```
