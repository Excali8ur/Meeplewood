# Software Architecture

## Table of Contents
- [Introduction](#introduction)
- [Used Frameworks](#used-frameworks)
- [System Architecture Overview](#system-architecture-overview)
- [Component Diagram](#component-diagram)
- [Class diagram](#class-diagram)
- [Interface design](#interface-design)
- [References](#references)
- [Appendix I: Chatlogs CoPilot](#appendix-i-chatlogs-copilot)
  - [14-04-2026 Setting up basic framework](#14-04-2026-setting-up-basic-framework)
  - [Project structure](#project-structure)
  - [Key decisions](#key-decisions)
  - [How this app is structured](#how-this-app-is-structured)
  - [Folder-by-folder breakdown](#folder-by-folder-breakdown)
  - [TypeScript vs JavaScript](#typescript-vs-javascript)
  - [How data flows — a full example (Import)](#how-data-flows--a-full-example-import)
  - [How to make a change — practical examples](#how-to-make-a-change--practical-examples)
  - [Running the app](#running-the-app)

---

# Introduction

# Used Frameworks

*AI helped me setup the basics and asked to explain it to me afterwards, see appendix for full log.*

## Understanding Next.js and Tailwind

- https://medium.com/@elanaolson/a-beginners-guide-to-building-a-react-nextjs-app-7463120389f0
- https://nextjs.org/docs/app/getting-started/project-structure
- https://nextjs.org/docs/pages/building-your-application/routing/pages-and-layouts

# System Architecture Overview

# Component Diagram

- Purpose and responsibilities
- Input and output specifications
- Algorithms and processing logic
- Dependencies on other components or external systems

# Class diagram

- If useful

# Interface design

- API specifications and protocols
- Message formats and data structures
- How errors and exceptions will be handled
- Security and authentication methods

# References

- BoardGameGeek. (n.d.). Retrieved from https://boardgamegeek.com/
- Boumans, R. (2026). Github repository. Retrieved from https://github.com/Excali8ur/Meeplewood
- Cross, L., Piovesan, A., Sousa, M., Wright, P., & Atherton, G. (2023). *Your move: An open access dataset of over 1500 board gamer’s demographics, preferences and motivations.* Simulation & Gaming, 54(5), pp. 554-575.
- Eerko. (n.d.). Board Game Stats. Retrieved from https://www.bgstatsapp.com/
- Gen Con. (n.d.). Retrieved from https://www.gencon.com/
- LinkedIn. (n.d.). Retrieved from https://www.linkedin.com/in/rianneverheijen/
- Spiel. (n.d.). Retrieved from https://www.spiel-essen.de/en/
- Woodward, P., & Woodward, S. (2019, October). *Mining the Boardgamegeek.* Significance, pp. 24-29.
- Xiao, T. (2025). *Analysis of Factors Influencing Board Game Ownership Based on A Gradient Boosting Model.* Theoretical and Natural Science, pp. 16-24.

---

# Appendix I: Chatlogs CoPilot

## 14-04-2026 Setting up basic framework

**User:** Create a basic structure for the webapplication using Next.js + D3.Js. Data will be handled via excel and json.

**GitHub Copilot:**

Created 8 todos:

- Starting: Init Next.js project with TypeScript (1/8)
- Starting: Install D3.js and SheetJS dependencies (2/8)
- The xlsx (SheetJS community) package has unpatched Prototype Pollution and ReDoS vulnerabilities. Replacing it with exceljs, which is actively maintained and has no known critical issues.
- Good — 0 vulnerabilities. Now let me build the project structure.
- Starting: Create app layout and global styles (3/8)
- Starting: Create NavBar component (4/8)
- Starting: Create home page (5/8)
- Starting: Create import/export pages and API routes (6/8)
- All dirs exist. Now create all the files:
- Starting: Create D3 visualisation page and component (7/8)
- Starting: Create data management page (8/8)
- Now verify the build has no TypeScript errors:
- No errors. Start the dev server:
- Checked terminal output
- Completed: Create data management page (8/8)

Dev server is running at `http://localhost:3000`.

### Project structure

### Key decisions

| Choice | Reason |
|---|---|
| ExcelJS instead of SheetJS (xlsx) | SheetJS community has unpatched Prototype Pollution + ReDoS (CVSS high) |
| Flat JSON file for storage | No database setup required for a basic structure; easy to swap for a DB later |
| D3.js rendered in a useEffect inside a `"use client"` component | D3 needs DOM access; SSR-safe pattern |

---

**User:** Help me understand the structure and how to use.

**GitHub Copilot:** Let me look at the current files to give you an accurate picture.

# How this app is structured

Think of it like a C# MVC web project, but where the folder structure itself defines the routes.

## The mental model

Next.js blends the frontend (what the user sees) and backend (API logic, file reading) into one project. In C# terms: it's like having your Razor pages and your Web API controllers in the same project.

# Folder-by-folder breakdown

## `app/` — Pages & API (the router)

This is the heart of the app. Every folder inside `app/` becomes a URL.

| Folder | URL in browser | What it does |
|---|---|---|
| `app/page.tsx` | `/` | Home page |
| `app/data/page.tsx` | `/data` | View table, add rows |
| `app/import/page.tsx` | `/import` | Upload Excel or JSON |
| `app/export/page.tsx` | `/export` | Download buttons |
| `app/visualise/page.tsx` | `/visualise` | D3 bar chart |
| `app/api/data/route.ts` | `/api/data` | Backend — reads/writes records |
| `app/api/import/route.ts` | `/api/import` | Backend — parses uploaded file |
| `app/api/export/route.ts` | `/api/export` | Backend — streams file download |

The `api/` routes are your Web API controllers. They only run on the server and never send HTML — just JSON or file data.

## `components/` — Reusable UI pieces

Like user controls in C# WebForms, or React components. They render HTML but have no URL of their own.

- `NavBar.tsx` — the navigation bar used on every page
- `BarChart.tsx` — the D3.js chart, reusable anywhere

## `lib/` — Shared server-side logic

Like a C# service class. `dataStore.ts` contains the functions `readRecords()` and `writeRecords()` — any API route imports and calls these instead of duplicating file-reading code.

## `data/records.json` — The data store

Currently a flat JSON file acting as the database.

# TypeScript vs JavaScript

TypeScript is JavaScript with types. If you know JS, you already know most of it.

# How data flows — a full example (Import)

1. Browser — user picks `boardgames.xlsx` on `/import`
2. `app/import/page.tsx` — JavaScript sends the file to `/api/import` via `fetch()`
3. `app/api/import/route.ts` — server receives it, ExcelJS parses the Excel rows into objects
4. `lib/dataStore.ts` — `writeRecords()` saves those objects to `data/records.json`
5. Browser — shows `Imported 12 records`

The same flow works in reverse for Export, and a simple GET fetch for the Data and Visualise pages.

# How to make a change — practical examples

## Add a new page (e.g. `/about`)

1. Create folder `app/about/`
2. Create file `app/about/page.tsx` with:

```tsx
export default function AboutPage() {
  return <h1>About</h1>;
}
```

3. That's it — it's live at `http://localhost:3000/about`

## Add a new column to your data

Just import an Excel/JSON file that has that column — the app stores whatever fields exist on the objects. No schema changes needed.

## Change a chart

Edit `components/BarChart.tsx` — D3 code lives in the `useEffect` hook. If you know D3, it's standard D3 v7 API.

# Running the app

Go to `.\Meeplewood\Code\src` in terminal and run commands.

---

**Author:** Rianne Boumans  
**Last change:** 14/04/2026  
**Git Repository:** https://github.com/Excali8ur/Meeplewood

