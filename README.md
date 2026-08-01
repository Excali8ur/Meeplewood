# Project Philosophy

> Building something useful, being creative, learning new things and make board game data fun to explore.</br>
> In other words: 'Because I can'-project ;)

![MeepleWoodBanner](/Design/img/Meeplewood_Banner.png)

## Project Overview & Motivation

**Meeplewood** is designed around several board game data sources, mainly logged plays from [Board Game Stats](https://www.bgstatsapp.com/) and collection data exports from [BoardGameGeek](https://boardgamegeek.com/). The goal is to bring these data sources together in one place and turn them into useful insights and playful decision support for board game enthusiasts.

The application focuses on two main areas:

### 1. Play Data Exploration

Meeplewood offers several ways to explore data about logged plays, such as:

- Identifying the most played games
- Discovering play patterns with specific people
- Analyzing winners by game category or genre
- Supporting the question **"What should we play?"** by suggesting games based on different criteria

### 2. Board Game Collection Management

Meeplewood helps organize a board game collection by showing:

- Which games are owned
- Which games may already be covered by other people’s collections
- Which games are on the wanted list

This also includes data from Spiel preview lists that are announced via BoardGameGeek every year before [Spiel](https://www.spiel-essen.de/en/).

---

## Intended Audience

Meeplewood is a personal **"because I can"** project — a playful software experiment built to explore programming concepts and try out fun ideas on both a creative and software engineering level. The first version is primarily intended for personal use and ongoing development.

### Future Vision

In the future, Meeplewood may evolve into a broader tool for:

- Board game enthusiasts who want to upload and analyze their own data in a playful way
- Local board game stores that want to work with collection data, preview lists, or related board game information
- Anyone interested in gaining insights from board game statistics and collections

---

## Technical Notes

### BGG API Integration
Meeplewood can automatically fetch detailed game information from BoardGameGeek (ratings, complexity, player counts, etc.) when importing preview lists. 

**Important**: Due to browser CORS restrictions, the app uses a free CORS proxy service (allorigins.win) to access the BGG API. This means:
- Your BGG API requests are routed through a third-party service
- Only game IDs are sent (no personal data)
- First imports may take a few minutes for large lists (rate-limited to 1 request/second)
- Fetched data is cached locally to avoid repeated requests

The CORS proxy can be configured or disabled in `scripts/game-database.js`.

---

For more details, see [MeepleWood Design](Design/MeepleWood_General%20Design.md)
