# Software Architecture

![MeepleWood Banner](img/Meeplewood_Banner.png)

## Table of Contents

- [Introduction](#introduction)
- [Used Frameworks](#used-frameworks)
- [System Architecture Overview](#system-architecture-overview)
- [Component Diagram](#component-diagram)
- [Class diagram](#class-diagram)
- [Interface design](#interface-design)
- [References](#references)

---

## Introduction

Where to start when a vision is in your mind and you want everything at the same time leading to nothing? Right.. In this day and age, you ask our friendly helper Claude.

This is the question and answer:
"This is a hobby project. I have a vision in mind, but not sure what I really want or where to start to code. Can you help me figure it out using text from MeepleWood_General Design.md?"

Absolutely! I'd be happy to help you figure out your vision and guide the development. Let me read your design document first:

Great! I've read through your design documents. You've done excellent work documenting your vision! Let me help you figure out the next steps.

### What You Have So Far

✅ Vision: Create a playful, data-driven tool for board game enthusiasts that improves on BGG/BGStats limitations
✅ Structure: Modular pages (Dashboard, Games, Stats, Groups, Settings)
✅ Foundation: Import/export framework in Settings
✅ Theme: "Meeplewood" - playful woodland/board game theme

### Key Pain Points You Want to Solve

Based on your analysis:

- BGG is too text-heavy and cluttered
- BGStats has basic charts that don't combine data meaningfully
- Spiel Preview management needs better workflow
- Need to answer: "What should I play next?"

### Let's Prioritize: What Should We Build First?

I suggest we tackle this in phases. Which of these sounds most exciting/useful to you right now?

- Option 1: Start with Data Import & Dashboard (Most logical)
  - Import BGStats JSON (you have sample data in /data/BGStatsExport-250319002343.json)
  - Parse and display basic stats on Dashboard
  - Show: Total games played, recent plays, most played game
  - Why: Gets real data flowing, immediate satisfaction
- Option 2: Build Games Library First (Visual satisfaction)
  - Create a visual game collection view (cards with images)
  - Filter by owned/wishlist/previously owned
  - Search and categorize
  - Why: Addresses the "BGG is ugly" problem first
- Option 3: Stats & Visualizations (Your teaching strength)
  - Create D3.js charts for play patterns
  - Win rates by player
  - Games over time
  - Play frequency heatmaps
  - Why: Showcases your data visualization expertise
- Option 4: Spiel Preview Manager (Unique feature)
  - Import Spiel preview CSV
  - Prioritize games (Must See / Interested / Pass)
  - Match against owned collection
  - Export shopping list
  - Why: Solves a real problem, unique to your use case

My recommendation: Start with Option 1 (get data flowing), then move to Option 3 (your strength area), then Option 2 (polish the UI).

Which option excites you most? Or would you prefer to break down one of these into smaller, concrete tasks?

"Nice breakdown. I think option 4 has the highest priority, since the new spiel-previewlist for 2026 starts soon."

Perfect! Spiel Preview Manager is a great choice - it's time-sensitive, solves a real problem, and has a clear scope. Let me break this down into concrete, achievable tasks:

### Spiel Preview Manager - Implementation Plan

#### Phase 1: Core Functionality (Start here)

Goal: Import and display Spiel preview data
Tasks:

- Import CSV file
  - Add file upload in Settings page (already has import structure)
  - Parse Spiel preview CSV format
  - Store in localStorage
  - Create Spiel Preview page
- New page: pages/spiel-preview.html
  - Add nav button to banner (maybe under Games dropdown later?)
  - Display games as cards with:
  - Game name
  - Publisher/designer
  - Hall/booth location
  - BGG rating (if available)
- Basic filtering
  - Search by game name
  - Filter by hall number
  - Sort by rating/name

#### Phase 2: Prioritization System

Goal: Let you mark and organize games
Features:

- Priority tags
  - Must See (red/gold)
  - Interested (green)
  - Maybe (yellow)
  - Pass/Not Interested (gray)
  - Click to change priority
  - Personal notes
    - Add notes per game
    - Show notes in card view
  - Priority view
    - Filter by priority level
    - "My Must-See List" quick view

#### Phase 3: Enhanced Features

Goal: Make convention planning easier
Features:

- Collection matching
  - Compare against owned games
  - Highlight games by designers you own
  - Show similar games in collection
  - Export for convention
  - Export prioritized list as PDF/CSV
  - Organized by hall for efficient walking route
  - Include booth numbers and notes

Let's Start: First Concrete Step
I can help you:
A. Create the Spiel Preview page structure right now (HTML/CSS/JS files)
B. Start with the CSV import functionality in Settings
C. Look at your existing Spiel CSV data to understand the format

Which would you like to tackle first? Or would you like me to read one of your Spiel CSV files to understand the exact data structure?

## Used Frameworks

*AI helped setting up the basics and to explain it.*

## System Architecture Overview

## Component Diagram

- Purpose and responsibilities
- Input and output specifications
- Algorithms and processing logic
- Dependencies on other components or external systems

## Class diagram

- If useful

## Interface design

- API specifications and protocols
- Message formats and data structures
- How errors and exceptions will be handled
- Security and authentication methods

## References

- BoardGameGeek. (n.d.). Retrieved from https://boardgamegeek.com/
- Boumans, R. (2026). Github repository. Retrieved from https://github.com/Excali8ur/Meeplewood
- Cross, L., Piovesan, A., Sousa, M., Wright, P., & Atherton, G. (2023). *Your move: An open access dataset of over 1500 board gamer’s demographics, preferences and motivations.* Simulation & Gaming, 54(5), pp. 554-575.
- Eerko. (n.d.). Board Game Stats. Retrieved from https://www.bgstatsapp.com/
- Gen Con. (n.d.). Retrieved from https://www.gencon.com/
- LinkedIn. (n.d.). Retrieved from https://www.linkedin.com/in/rianneverheijen/
- Spiel. (n.d.). Retrieved from https://www.spiel-essen.de/en/
- Woodward, P., & Woodward, S. (2019, October). *Mining the Boardgamegeek.* Significance, pp. 24-29.
- Xiao, T. (2025). *Analysis of Factors Influencing Board Game Ownership Based on A Gradient Boosting Model.* Theoretical and Natural Science, pp. 16-24.
